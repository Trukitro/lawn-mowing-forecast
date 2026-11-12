import { test } from "node:test";
import assert from "node:assert/strict";
import { reminderKind } from "../js/backup.js";

const DAY = 86400000;
const now = Date.parse("2026-11-12T12:00:00Z");
const ago = days => new Date(now - days * DAY).toISOString();
const client = days => ({ createdAt: ago(days) });

test("no reminder without clients", () => {
    assert.equal(reminderKind({ clients: [], now }), null);
});

test("never backed up: wait a week after the first client", () => {
    assert.equal(reminderKind({ clients: [client(3)], now }), null);
    assert.equal(reminderKind({ clients: [client(3), client(8)], now }), "never");
});

test("old backup: remind after 30 days", () => {
    assert.equal(reminderKind({ clients: [client(90)], lastExport: ago(10), now }), null);
    assert.equal(reminderKind({ clients: [client(90)], lastExport: ago(31), now }), "old");
});

test("snoozed reminders stay hidden until the snooze ends", () => {
    const future = new Date(now + 2 * DAY).toISOString();
    assert.equal(reminderKind({ clients: [client(90)], lastExport: ago(40), snoozeUntil: future, now }), null);
    assert.equal(reminderKind({ clients: [client(90)], lastExport: ago(40), snoozeUntil: ago(1), now }), "old");
});
