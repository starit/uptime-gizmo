const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert");
const { internals } = require("../../server/routers/v1-router");
const { Notification } = require("../../server/notification");

const { parseNotificationBody, notificationToAPI } = internals;

describe("parseNotificationBody()", () => {
    beforeEach(() => {
        // The registry is populated at server start; these run without one.
        Notification.init();
    });

    test("keeps the provider's own settings alongside name and type", () => {
        const settings = parseNotificationBody({
            name: "  Ops Slack  ",
            type: "slack",
            config: { slackwebhookURL: "https://hooks.slack.test/x", slackchannel: "#ops" },
        }, false);

        assert.deepEqual(settings, {
            slackwebhookURL: "https://hooks.slack.test/x",
            slackchannel: "#ops",
            name: "Ops Slack",
            type: "slack",
        });
    });

    test("refuses a provider this server does not have", () => {
        assert.throws(
            () => parseNotificationBody({ name: "x", type: "not-a-provider", config: {} }, false),
            /type must name a provider/
        );
    });

    test("requires a name and a type when creating", () => {
        assert.throws(() => parseNotificationBody({ type: "slack" }, false), /name is required/);
        assert.throws(() => parseNotificationBody({ name: "x" }, false), /type must name a provider/);
        assert.throws(() => parseNotificationBody({ name: "   ", type: "slack" }, false), /name is required/);
    });

    test("allows either to be absent when patching", () => {
        assert.deepEqual(parseNotificationBody({ name: "Renamed" }, true), { name: "Renamed" });
        assert.deepEqual(parseNotificationBody({ config: { slackchannel: "#other" } }, true), {
            slackchannel: "#other",
        });
    });

    test("refuses a body, config or flag of the wrong shape", () => {
        for (const body of [ null, "a string", [] ]) {
            assert.throws(() => parseNotificationBody(body, false), /must be an object/);
        }
        assert.throws(
            () => parseNotificationBody({ name: "x", type: "slack", config: [] }, false),
            /config must be an object/
        );
        assert.throws(
            () => parseNotificationBody({ name: "x", type: "slack", isDefault: "yes" }, false),
            /isDefault must be a boolean/
        );
        assert.throws(
            () => parseNotificationBody({ name: "x", type: "slack", active: 1 }, false),
            /active must be a boolean/
        );
    });

    test("carries isDefault and active only when they were given", () => {
        assert.deepEqual(
            parseNotificationBody({ name: "x", type: "slack", isDefault: true, active: false }, false),
            { name: "x", type: "slack", isDefault: true, active: false }
        );
        assert.deepEqual(parseNotificationBody({ name: "x", type: "slack" }, false), {
            name: "x",
            type: "slack",
        });
    });
});

describe("notificationToAPI()", () => {
    test("reports which provider a channel uses and never its settings", () => {
        const projected = notificationToAPI({
            id: 4,
            name: "Ops Slack",
            active: true,
            is_default: false,
            config: JSON.stringify({
                type: "slack",
                name: "Ops Slack",
                slackwebhookURL: "https://hooks.slack.test/secret",
            }),
        });

        assert.equal(projected.type, "slack");
        assert.equal(projected.name, "Ops Slack");
        assert.equal(
            JSON.stringify(projected).includes("secret"),
            false,
            "the credential must not survive projection"
        );
        assert.equal("config" in projected, false);
    });

    test("reports no provider for a channel whose settings cannot be read", () => {
        assert.equal(notificationToAPI({ id: 1, name: "x", config: "{ broken" }).type, null);
    });
});
