let db;

// The SQLite database lives in memory (sql.js), so it is saved to
// localStorage after every write and restored on load.
const DB_STORAGE_KEY = "lawnMowing.clientsDb";

function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function loadSavedDatabase() {
    try {
        const saved = localStorage.getItem(DB_STORAGE_KEY);
        return saved ? base64ToBytes(saved) : null;
    } catch (e) {
        console.warn("Could not read saved database:", e);
        return null;
    }
}

// Returns true when the database was saved
function persistDatabase() {
    try {
        localStorage.setItem(DB_STORAGE_KEY, bytesToBase64(db.export()));
        return true;
    } catch (e) {
        console.warn("Could not save database:", e);
        return false;
    }
}

async function initDatabase() {
    // Load SQL.js
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` });
    const saved = loadSavedDatabase();
    try {
        db = saved ? new SQL.Database(saved) : new SQL.Database();
    } catch (e) {
        console.warn("Saved database is corrupt, starting a new one:", e);
        db = new SQL.Database();
    }
    // Create tables if they don't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            address TEXT,
            phone TEXT,
            lat REAL,
            lon REAL
        );
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            date TEXT,
            notes TEXT,
            FOREIGN KEY(client_id) REFERENCES clients(id)
        );
    `);
}

// Add a client and return its new id
function addClient(name, address, phone, lat = null, lon = null) {
    db.run("INSERT INTO clients (name, address, phone, lat, lon) VALUES (?, ?, ?, ?, ?)", [name, address, phone, lat, lon]);
    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    persistDatabase();
    return id;
}

// Log a service
function logService(clientId, date, notes) {
    db.run("INSERT INTO services (client_id, date, notes) VALUES (?, ?, ?)", [clientId, date, notes]);
    persistDatabase();
}

// Query clients: rows of [id, name, address, phone, lat, lon]
function getClients() {
    const res = db.exec("SELECT * FROM clients ORDER BY name");
    return res[0]?.values || [];
}

// Query one client by id, or null
function getClient(clientId) {
    const stmt = db.prepare("SELECT * FROM clients WHERE id = ?");
    stmt.bind([Number(clientId)]);
    const row = stmt.step() ? stmt.get() : null;
    stmt.free();
    return row;
}

// Query services for a client: rows of [id, client_id, date, notes]
function getServices(clientId) {
    const res = db.exec("SELECT * FROM services WHERE client_id = ? ORDER BY date DESC", [Number(clientId)]);
    return res[0]?.values || [];
}
