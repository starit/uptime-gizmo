const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const { internals } = require("../../server/routers/v1-router");
const { R } = require("redbean-node");
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

describe("Notification.save() and the active column", () => {
    let stored = null;
    let restore = null;

    beforeEach(() => {
        Notification.init();
        stored = null;
        restore = { dispense: R.dispense, findOne: R.findOne, store: R.store };
        R.store = async (bean) => {
            stored = bean;
            return bean;
        };
    });

    afterEach(() => {
        if (restore) {
            R.dispense = restore.dispense;
            R.findOne = restore.findOne;
            R.store = restore.store;
        }
    });

    /**
     * Stand in for a freshly dispensed bean, which carries no columns yet.
     * @returns {void}
     */
    function dispensesEmptyBean() {
        R.dispense = () => ({});
    }

    /**
     * Stand in for a stored row the save is updating.
     * @param {object} row The row as the database holds it
     * @returns {void}
     */
    function findsExisting(row) {
        R.findOne = async () => row;
    }

    test("stores the state a channel was created with", async () => {
        dispensesEmptyBean();

        await Notification.save({ name: "Ops", type: "slack", active: false }, null, 1);

        // Without this the column keeps its default and the channel is live
        // despite having been created switched off.
        assert.equal(stored.active, false);
    });

    test("creates a channel live when nothing was said about it", async () => {
        dispensesEmptyBean();

        await Notification.save({ name: "Ops", type: "slack" }, null, 1);

        assert.equal(stored.active, true);
    });

    test("leaves a disabled channel disabled when an edit does not mention it", async () => {
        findsExisting({ id: 7, active: false, config: "{}" });

        // The interface's form does not carry this field, so a rename there
        // must not switch the channel back on.
        await Notification.save({ name: "Renamed", type: "slack" }, 7, 1);

        assert.equal(stored.active, false);
    });

    test("switches a channel back on when asked to", async () => {
        findsExisting({ id: 7, active: false, config: "{}" });

        await Notification.save({ name: "Ops", type: "slack", active: true }, 7, 1);

        assert.equal(stored.active, true);
    });
});
