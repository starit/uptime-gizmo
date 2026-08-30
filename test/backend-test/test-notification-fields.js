const { describe, test, before } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { NOTIFICATION_FIELDS } = require("../../server/notification-fields");
const { Notification } = require("../../server/notification");

const PROVIDER_DIR = path.join(__dirname, "..", "..", "server", "notification-providers");

/**
 * Every settings key a provider's own code reads.
 * @param {string} providerName The provider's registered name
 * @returns {Set<string>} Keys read from the notification object
 */
function keysProviderReads(providerName) {
    for (const file of fs.readdirSync(PROVIDER_DIR)) {
        const text = fs.readFileSync(path.join(PROVIDER_DIR, file), "utf8");
        const named = text.match(/^\s*name\s*=\s*"([^"]+)"/m);
        if (named?.[1] === providerName) {
            return new Set([ ...text.matchAll(/notification\.([A-Za-z0-9_]+)/g) ].map((m) => m[1]));
        }
    }
    return null;
}

describe("notification field definitions", () => {
    before(() => {
        Notification.init();
    });

    test("every definition names a provider this server has", () => {
        for (const name of Object.keys(NOTIFICATION_FIELDS)) {
            assert.ok(
                Notification.providerList[name],
                `${name} has field definitions but is not a registered provider`
            );
        }
    });

    /*
     * The definitions are written by hand, so the thing worth guarding is that
     * they name settings the provider actually looks at. A key that no longer
     * exists is a field asking for something nothing reads.
     */
    test("every field is a setting its provider reads", () => {
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            const read = keysProviderReads(name);
            assert.ok(read, `no provider file found for ${name}`);
            for (const field of fields) {
                assert.ok(
                    read.has(field.key),
                    `${name}.${field.key} is not read by the provider`
                );
            }
        }
    });

    test("every required field is one the provider cannot work without", () => {
        // A guard against marking something required that has a default: the
        // credential-bearing keys below are the ones with no sensible fallback.
        const mustBeRequired = {
            telegram: [ "telegramBotToken", "telegramChatID" ],
            slack: [ "slackwebhookURL" ],
            discord: [ "discordWebhookUrl" ],
            webhook: [ "webhookURL" ],
            gotify: [ "gotifyserverurl", "gotifyapplicationToken" ],
            matrix: [ "homeserverUrl", "internalRoomId", "accessToken" ],
        };

        for (const [ name, keys ] of Object.entries(mustBeRequired)) {
            const fields = NOTIFICATION_FIELDS[name];
            assert.ok(fields, `${name} lost its definitions`);
            for (const key of keys) {
                const field = fields.find((candidate) => candidate.key === key);
                assert.ok(field, `${name} no longer offers ${key}`);
                assert.equal(field.required, true, `${name}.${key} should be required`);
            }
        }
    });

    test("each field is shaped the way a client can render it", () => {
        const kinds = new Set([ "text", "secret", "url", "number", "boolean" ]);
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            const seen = new Set();
            for (const field of fields) {
                assert.ok(field.key && typeof field.key === "string", `${name} has a field with no key`);
                assert.ok(!seen.has(field.key), `${name} defines ${field.key} twice`);
                seen.add(field.key);
                assert.ok(field.label && typeof field.label === "string", `${name}.${field.key} has no label`);
                assert.ok(kinds.has(field.type), `${name}.${field.key} has an unknown type ${field.type}`);
                assert.equal(typeof field.required, "boolean", `${name}.${field.key} does not say whether it is required`);
            }
        }
    });

    test("a credential is never described as an ordinary text field", () => {
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            for (const field of fields) {
                if (/token|secret|key|password/i.test(field.key) && field.key !== "webhookURL") {
                    assert.equal(
                        field.type,
                        "secret",
                        `${name}.${field.key} looks like a credential but is not marked secret`
                    );
                }
            }
        }
    });
});
