let db;

async function initDatabase() {
    // Load SQL.js
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` });
    db = new SQL.Database();
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

// Add a client (now with coords)
function addClient(name, address, phone, lat = null, lon = null) {
    db.run("INSERT INTO clients (name, address, phone, lat, lon) VALUES (?, ?, ?, ?, ?)", [name, address, phone, lat, lon]);
}

// Log a service
function logService(clientId, date, notes) {
    db.run("INSERT INTO services (client_id, date, notes) VALUES (?, ?, ?)", [clientId, date, notes]);
}

// Query clients
function getClients() {
    const res = db.exec("SELECT * FROM clients");
    return res[0]?.values || [];
}

// Query services for a client
function getServices(clientId) {
    const res = db.exec("SELECT * FROM services WHERE client_id = ?", [clientId]);
    return res[0]?.values || [];
}