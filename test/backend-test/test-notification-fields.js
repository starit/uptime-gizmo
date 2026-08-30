const { describe, test, before } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { NOTIFICATION_FIELDS } = require("../../server/notification-fields");
const { build, render } = require("../../extra/generate-notification-fields");
const { Notification } = require("../../server/notification");

const PROVIDER_DIR = path.join(__dirname, "..", "..", "server", "notification-providers");
const OUT = path.join(__dirname, "..", "..", "server", "notification-fields.js");

/**
 * Every settings key a provider's own code reads.
 * @param {string} providerName The provider's registered name
 * @returns {Set<string>|null} Keys read, or null when no provider file matches
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

    /*
     * The file is generated, so the thing to guard is that it still matches
     * what it is generated from. Editing a form and forgetting to regenerate
     * would otherwise ship a form missing a field, silently.
     */
    test("the committed file is what the generator produces", () => {
        assert.equal(
            fs.readFileSync(OUT, "utf8"),
            render(build()),
            "run: node extra/generate-notification-fields.js"
        );
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
     * A field asking for something the provider never looks at is a question
     * with no purpose, and usually means a form and its provider disagree.
     */
    test("every field is a setting its provider reads", () => {
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            const read = keysProviderReads(name);
            assert.ok(read, `no provider file found for ${name}`);
            for (const field of fields) {
                assert.ok(read.has(field.key), `${name}.${field.key} is not read by the provider`);
            }
        }
    });

    /*
     * The failure this whole file exists to prevent: a credential entered
     * through HiddenInput being missed, leaving a form that creates a channel
     * which can never send. These are the ones worth naming outright.
     */
    test("the credential every common provider needs is offered and required", () => {
        const essential = {
            telegram: [ "telegramBotToken", "telegramChatID" ],
            slack: [ "slackwebhookURL" ],
            discord: [ "discordWebhookUrl" ],
            gotify: [ "gotifyapplicationToken", "gotifyserverurl" ],
            matrix: [ "accessToken", "homeserverUrl", "internalRoomId" ],
            pushover: [ "pushoveruserkey", "pushoverapptoken" ],
        };

        for (const [ name, keys ] of Object.entries(essential)) {
            const fields = NOTIFICATION_FIELDS[name];
            assert.ok(fields, `${name} lost its definitions`);
            for (const key of keys) {
                const field = fields.find((candidate) => candidate.key === key);
                assert.ok(field, `${name} no longer offers ${key}`);
                assert.equal(field.required, true, `${name}.${key} should be required`);
            }
        }
    });

    test("a secret is never described as an ordinary text field", () => {
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            for (const field of fields) {
                if (/token|password|secret|apikey|accesskey/i.test(field.key)) {
                    assert.equal(
                        field.type,
                        "secret",
                        `${name}.${field.key} looks like a credential but is typed ${field.type}`
                    );
                }
            }
        }
    });

    test("each field is shaped the way a client can render it", () => {
        const kinds = new Set([ "text", "secret", "url", "email", "number", "boolean", "select" ]);
        for (const [ name, fields ] of Object.entries(NOTIFICATION_FIELDS)) {
            const seen = new Set();
            for (const field of fields) {
                assert.ok(field.key, `${name} has a field with no key`);
                assert.ok(!seen.has(field.key), `${name} defines ${field.key} twice`);
                seen.add(field.key);
                assert.ok(field.label?.trim(), `${name}.${field.key} has no label`);
                assert.ok(kinds.has(field.type), `${name}.${field.key} has unknown type ${field.type}`);
                assert.equal(typeof field.required, "boolean", `${name}.${field.key} does not say whether it is required`);
                if (field.type === "select") {
                    assert.ok(field.options?.length, `${name}.${field.key} is a select with no options`);
                }
            }
        }
    });
});
