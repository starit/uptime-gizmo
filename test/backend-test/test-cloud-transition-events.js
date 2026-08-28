const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
    CloudTransitionEventSender,
    signTransitionBody,
    transitionEvent,
} = require("../../server/cloud-transition-events");
const { DOWN, UP, PENDING } = require("../../src/util");

describe("Cloud transition events", () => {
    test("creates deterministic down and recovery IDs and ignores pending", () => {
        const input = {
            instanceId: "instance-a",
            monitorId: 42,
            occurredAt: "2026-08-28 12:00:00",
        };
        const down = transitionEvent({ ...input, status: DOWN });
        assert.equal(down.state, "down");
        assert.equal(down.eventId, transitionEvent({ ...input, status: DOWN }).eventId);
        assert.equal(transitionEvent({ ...input, status: UP }).state, "recovery");
        assert.equal(transitionEvent({ ...input, status: PENDING }), null);
    });

    test("signs the timestamp and exact body", () => {
        assert.equal(
            signTransitionBody("secret", "123", "{\"ok\":true}"),
            "12f14ade5e7e737164d9ae20ea4e070056a3045b2c8f42f5f216008eae4684dd"
        );
    });

    test("retries transient responses with one stable idempotent body", async () => {
        const requests = [];
        const sender = new CloudTransitionEventSender({
            endpoint: "https://cloud.example.test/api/internal/gizmo-events/instance-a",
            instanceId: "instance-a",
            secret: "a".repeat(32),
            fetchImplementation: async (_url, options) => {
                requests.push(options);
                return { ok: requests.length === 3, status: requests.length === 3 ? 200 : 503 };
            },
            sleepImplementation: async () => {},
        });
        const event = transitionEvent({
            instanceId: "instance-a",
            monitorId: 42,
            occurredAt: "2026-08-28T12:00:00.000Z",
            status: DOWN,
        });
        await sender.send(event);
        assert.equal(requests.length, 3);
        assert.equal(new Set(requests.map((request) => request.body)).size, 1);
        assert.ok(requests.every((request) => request.headers["X-Gizmo-Signature"].startsWith("v1=")));
    });
});
