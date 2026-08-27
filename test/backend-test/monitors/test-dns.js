const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { DnsMonitorType, DNS_RESOLVE_TYPES } = require("../../../server/monitor-types/dns");
const { UP } = require("../../../src/util");

/*
 * The record type decides which branch reads the answer, and a type with no
 * branch used to fall out of the switch with conditionsResult still at its
 * initial true — so the lookup succeeded, nothing was read, no condition was
 * evaluated, and the monitor reported UP with an empty message.
 *
 * Only a value that Node's resolver accepts can get that far: ANY, NAPTR and
 * TLSA resolve fine and have no branch. Garbage like "BANANA" throws out of the
 * resolver first and was never the dangerous case.
 *
 * The lookup is stubbed. What is under test is the branching, not DNS.
 */

/**
 * A monitor type whose lookup answers without touching the network.
 * @param {any} answer what the stubbed lookup returns
 * @returns {DnsMonitorType} the stubbed type
 */
function stubbedType(answer = [ "192.0.2.1" ]) {
    const type = new DnsMonitorType();
    type.resolveDnsResolverServers = async () => [ "1.1.1.1" ];
    type.dnsResolve = async () => answer;
    return type;
}

/**
 * The monitor row a check reads.
 * @param {string} resolveType stored dns_resolve_type
 * @param {object} extra overrides, typically dns_last_result so the check skips
 *   the redbean UPDATE that would otherwise need a database
 * @returns {object} monitor-shaped object
 */
function monitorFor(resolveType, extra = {}) {
    return {
        id: 1,
        hostname: "example.com",
        port: 53,
        dns_resolve_server: "1.1.1.1",
        dns_resolve_type: resolveType,
        dns_last_result: extra.dns_last_result ?? null,
        conditions: "[]",
    };
}

describe("dns resolve types", () => {
    /*
     * The regression. Before the default branch existed this assertion failed by
     * resolving instead of throwing, and heartbeat.status came back UP.
     */
    it("refuses a type it resolved but cannot read, rather than reporting up", async () => {
        for (const unreadable of [ "ANY", "NAPTR", "TLSA" ]) {
            const heartbeat = {};
            await assert.rejects(
                () => stubbedType().check(monitorFor(unreadable), heartbeat, null),
                (error) => {
                    assert.match(error.message, new RegExp(`Cannot read ${unreadable} records`));
                    assert.match(error.message, /supported types are/);
                    return true;
                },
                `${unreadable} did not fail the check`
            );
            assert.notStrictEqual(heartbeat.status, UP, `${unreadable} reported up`);
        }
    });

    it("names the supported types in the failure, so the fix is in the message", async () => {
        await assert.rejects(
            () => stubbedType().check(monitorFor("ANY"), {}, null),
            (error) => {
                for (const supported of DNS_RESOLVE_TYPES) {
                    assert.ok(error.message.includes(supported), `${supported} missing from the message`);
                }
                return true;
            }
        );
    });

    /*
     * The other direction: a type added to the list without a branch to read it
     * would reach the default at check time and fail every check. The list and
     * the switch have to move together, so that is asserted here rather than
     * discovered in production.
     */
    it("has a branch for every type the list offers", () => {
        const source = fs.readFileSync(
            path.join(__dirname, "..", "..", "..", "server", "monitor-types", "dns.js"),
            "utf8"
        );
        const branch = source.slice(source.indexOf("switch (monitor.dns_resolve_type)"));
        const handled = [ ...branch.matchAll(/case "([A-Z]+)":/g) ].map((match) => match[1]);

        assert.deepStrictEqual(
            DNS_RESOLVE_TYPES.filter((type) => !handled.includes(type)),
            [],
            "a type is offered but has no branch to read it"
        );
    });

    /*
     * The default branch must not fire for a type the list actually offers.
     * dns_last_result is pre-set to the expected message so the check skips
     * writing the monitor row — there is no database here.
     */
    it("reports up when it can read the answer", async () => {
        const cases = [
            { type: "A", answer: [ "192.0.2.1" ], msg: "Records: 192.0.2.1" },
            { type: "AAAA", answer: [ "2001:db8::1" ], msg: "Records: 2001:db8::1" },
            { type: "PTR", answer: [ "example.com" ], msg: "Records: example.com" },
            { type: "TXT", answer: [ [ "v=spf1" ] ], msg: "Records: v=spf1" },
            { type: "CNAME", answer: [ "alias.example.com" ], msg: "alias.example.com" },
            { type: "CAA", answer: [ { issue: "letsencrypt.org" } ], msg: "Records: letsencrypt.org" },
            {
                type: "MX",
                answer: [ { exchange: "mail.example.com", priority: 10 } ],
                msg: "Hostname: mail.example.com - Priority: 10",
            },
            { type: "NS", answer: [ "ns.example.com" ], msg: "Servers: ns.example.com" },
            {
                type: "SOA",
                answer: {
                    nsname: "ns.example.com",
                    hostmaster: "host.example.com",
                    serial: 1,
                    refresh: 2,
                    retry: 3,
                    expire: 4,
                    minttl: 5,
                },
                msg: "NS-Name: ns.example.com | Hostmaster: host.example.com | Serial: 1 | Refresh: 2 | Retry: 3 | Expire: 4 | MinTTL: 5",
            },
            {
                type: "SRV",
                answer: [ { name: "sip.example.com", port: 5060, priority: 10, weight: 5 } ],
                msg: "Name: sip.example.com | Port: 5060 | Priority: 10 | Weight: 5",
            },
        ];

        assert.deepStrictEqual(
            cases.map((entry) => entry.type).sort(),
            [ ...DNS_RESOLVE_TYPES ].sort(),
            "a supported type has no happy-path case"
        );

        for (const { type, answer, msg } of cases) {
            const heartbeat = {};
            await stubbedType(answer).check(monitorFor(type, { dns_last_result: msg }), heartbeat, null);
            assert.strictEqual(heartbeat.status, UP, `${type} did not report up`);
            assert.strictEqual(heartbeat.msg, msg, `${type} wrote the wrong message`);
        }
    });
});
