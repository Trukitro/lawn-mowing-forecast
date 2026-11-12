import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, orderRoute, routeUrl, distanceKm, MAX_ROUTE_STOPS } from "../js/planner.js";

const day = (date, score, extra = {}) => ({
    date, isToday: false, score, ranges: score >= 70 ? [{ start: 8, end: 11 }] : [],
    remainingScore: score, remainingRanges: [], ...extra
});
const forecast = scores => ({ days: [day("2026-11-12", scores[0], { isToday: true, remainingScore: null }), day("2026-11-13", scores[1])] });
const client = (id, lastService, coords = { lat: 18.2, lon: -66 }) => ({
    id, ...coords, services: lastService ? [{ date: lastService }] : []
});

test("buildPlan groups clients by the day's level", () => {
    const clients = [client("a", "2026-11-01"), client("b", "2026-11-10"), client("c", null), client("d", null, { lat: null, lon: null }), client("e", null)];
    const forecasts = { a: forecast([90, 85]), b: forecast([90, 60]), c: forecast([90, 20]) };
    const plan = buildPlan(clients, id => forecasts[id], "2026-11-13");
    assert.deepEqual(plan.good.map(i => i.client.id), ["a"]);
    assert.deepEqual(plan.fair.map(i => i.client.id), ["b"]);
    assert.deepEqual(plan.bad.map(i => i.client.id), ["c"]);
    assert.deepEqual(plan.noLocation.map(c => c.id), ["d"]);
    assert.deepEqual(plan.loading.map(c => c.id), ["e"]);
    assert.equal(plan.good[0].daysSince, 12);
    assert.equal(plan.bad[0].daysSince, null);
});

test("today uses the remaining hours, so a finished day is not good", () => {
    const plan = buildPlan([client("a", null)], () => forecast([90, 90]), "2026-11-12");
    assert.equal(plan.good.length, 0);
    assert.equal(plan.bad[0].level, "none");
});

test("most overdue clients come first, never serviced before all", () => {
    const clients = [client("recent", "2026-11-11"), client("old", "2026-10-20"), client("never", null)];
    const plan = buildPlan(clients, () => forecast([0, 95]), "2026-11-13");
    assert.deepEqual(plan.good.map(i => i.client.id), ["never", "old", "recent"]);
});

test("orderRoute visits the nearest stop next", () => {
    const start = { lat: 18.23, lon: -65.92 };            // Juncos
    const far = { id: "ponce", lat: 18.01, lon: -66.61 };
    const near = { id: "gurabo", lat: 18.25, lon: -65.98 };
    const mid = { id: "caguas", lat: 18.23, lon: -66.04 };
    assert.deepEqual(orderRoute(start, [far, near, mid]).map(s => s.id), ["gurabo", "caguas", "ponce"]);
    assert.ok(Math.abs(distanceKm(start, far) - 77) < 5);
});

test("routeUrl ends at the last stop and caps the number of stops", () => {
    assert.equal(routeUrl([]), null);
    const one = routeUrl([{ lat: 18.25, lon: -65.98 }]);
    assert.ok(one.includes("destination=18.25000,-65.98000"));
    assert.ok(!one.includes("waypoints"));
    const many = Array.from({ length: 14 }, (_, i) => ({ lat: 18 + i / 100, lon: -66 }));
    const url = new URL(routeUrl(many));
    assert.equal(url.searchParams.get("waypoints").split("|").length, MAX_ROUTE_STOPS - 1);
    assert.equal(url.searchParams.get("destination"), "18.09000,-66.00000");
});
