const { test } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { R } = require("redbean-node");
const { UP } = require("../../src/util");
const { Web3BalanceMonitorType } = require("../../server/monitor-types/web3-balance");
const { Web3RpcMonitorType } = require("../../server/monitor-types/web3-rpc");
const { Web3ContractMonitorType } = require("../../server/monitor-types/web3-contract");
const { web3SocketHandler } = require("../../server/socket-handlers/web3-socket-handler");

/**
 * A recent block, so a balance read against it never trips the staleness
 * guard in tests that are not about staleness at all.
 * @param {number} ageSeconds how far behind now the block's timestamp is
 * @returns {{number: string, timestamp: string}} eth_getBlockByNumber result
 */
function freshBlock(ageSeconds = 0) {
    const timestamp = Math.floor(Date.now() / 1000) - ageSeconds;
    return { number: "0x10", timestamp: `0x${timestamp.toString(16)}` };
}

test("all monitor reads and form previews reach the final fallback, but valid failures stop", async (t) => {
    const address = "0x" + "1".repeat(40);
    const word = "0x" + "12".padStart(64, "0");
    const calls = [];
    let failures = true;
    t.mock.method(R, "findOne", async (_table, _query, [id, owner]) => {
        if (owner !== undefined && owner !== 7) {
            return null;
        }
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        if (body.method !== "eth_chainId" && failures && !url.includes("rpc3")) {
            throw new Error("unavailable");
        }
        // 30s old: past the 10s limit the RPC Health case below configures,
        // but nowhere near the balance monitor's much coarser staleness guard.
        const result = body.method === "eth_chainId" ? "0x1"
            : body.method === "eth_getBlockByNumber" ? freshBlock(30)
                : body.method === "eth_getBalance" ? "0x12" : word;
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });
    const monitor = {
        web3_network_id: 1, web3_fallback_network_ids: "[2,3]", timeout: 10,
        web3_address: address, web3_call_to: address, web3_call_data: "0x12345678",
    };
    for (const [Type, extra, method] of [
        [Web3BalanceMonitorType, {}, "eth_getBalance"],
        [Web3BalanceMonitorType, { web3_token_contract: address }, "eth_call"],
        [Web3RpcMonitorType, {}, "eth_getBlockByNumber"],
        [Web3ContractMonitorType, {}, "eth_call"],
    ]) {
        calls.length = 0;
        const heartbeat = {};
        await new Type().check({ ...monitor, ...extra }, heartbeat);
        assert.match(heartbeat.msg, /used fallback RPC 3/);
        assert.strictEqual(calls.filter((entry) => entry[1] === method).length, 3);
    }

    const handlers = {};
    web3SocketHandler({ userID: 7, on: (event, handler) => {
        handlers[event] = handler;
    } });
    const selection = { networkId: 1, fallbackNetworkIds: [2, 3] };
    const decimals = await new Promise((resolve) => handlers.web3TokenDecimals(selection, address, resolve));
    assert.strictEqual(decimals.decimals, 18);
    assert.strictEqual(decimals.networkId, 3);
    const read = await new Promise((resolve) => handlers.web3ContractRead(selection, { to: address, data: "0x12345678", type: "uint256", blockTag: "latest" }, resolve));
    assert.strictEqual(read.value, "18");
    assert.strictEqual(read.networkId, 3);

    failures = false;
    for (const [Type, extra, message] of [
        [Web3BalanceMonitorType, { web3_min_balance: "100" }, /below the minimum/],
        [Web3RpcMonitorType, { web3_max_block_age: 10 }, /over the limit/],
        [Web3ContractMonitorType, { web3_value_operator: "gt", web3_value_threshold: "100" }, /is not/],
    ]) {
        calls.length = 0;
        await assert.rejects(new Type().check({ ...monitor, ...extra }, {}), message);
        assert.ok(calls.every(([url]) => url.includes("rpc1")));
    }
});

test("an empty native balance is an RPC failure, not a zero below the minimum", async (t) => {
    const address = "0x" + "1".repeat(40);
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        let result = "0x1";
        if (body.method === "eth_getBlockByNumber") {
            result = freshBlock();
        } else if (body.method === "eth_getBalance") {
            // Primary answers, but with empty DATA rather than QUANTITY 0x0.
            result = url.includes("rpc1") ? "0x" : "0xde0b6b3a7640000";
        }
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });

    const heartbeat = {};
    await new Web3BalanceMonitorType().check({
        web3_network_id: 1,
        web3_fallback_network_ids: "[2]",
        timeout: 10,
        web3_address: address,
        web3_min_balance: "0.05",
    }, heartbeat);

    assert.strictEqual(heartbeat.status, UP);
    assert.match(heartbeat.msg, /^Balance 1, minimum 0\.05/);
    assert.match(heartbeat.msg, /used fallback RPC 2/);
    assert.match(heartbeat.msg, /was not a hex quantity/);
    assert.doesNotMatch(heartbeat.msg, /below the minimum/);
    assert.ok(calls.some(([url, method]) => url.includes("rpc2") && method === "eth_getBalance"));
});

test("a native balance that reads zero everywhere in the pool stays a threshold failure", async (t) => {
    const address = "0x" + "1".repeat(40);
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        const result = body.method === "eth_chainId" ? "0x1"
            : body.method === "eth_getBlockByNumber" ? freshBlock()
                : "0x0";
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });

    await assert.rejects(
        new Web3BalanceMonitorType().check({
            web3_network_id: 1,
            web3_fallback_network_ids: "[2]",
            timeout: 10,
            web3_address: address,
            web3_min_balance: "0.05",
        }, {}),
        /Balance 0 is below the minimum of 0\.05/
    );
    // A zero is confirmed against the fallback before it is trusted, so both
    // networks in the pool were asked, and both agreeing is why it stands.
    assert.ok(calls.some(([url]) => url.includes("rpc1")));
    assert.ok(calls.some(([url]) => url.includes("rpc2")));
});

test("a stale pool member's zero native balance is overruled by a fallback that reads the real one", async (t) => {
    const address = "0x" + "1".repeat(40);
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        let result = "0x1";
        if (body.method === "eth_getBlockByNumber") {
            result = freshBlock();
        } else if (body.method === "eth_getBalance") {
            // Primary answers with a well-formed but wrong QUANTITY 0x0, the
            // way a lagging member of a pooled RPC endpoint does for a
            // funded address, rather than failing outright.
            result = url.includes("rpc1") ? "0x0" : "0xde0b6b3a7640000";
        }
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });

    const heartbeat = {};
    await new Web3BalanceMonitorType().check({
        web3_network_id: 1,
        web3_fallback_network_ids: "[2]",
        timeout: 10,
        web3_address: address,
        web3_min_balance: "0.05",
    }, heartbeat);

    assert.strictEqual(heartbeat.status, UP);
    assert.match(heartbeat.msg, /^Balance 1, minimum 0\.05/);
    assert.match(heartbeat.msg, /used fallback RPC 2/);
    assert.match(heartbeat.msg, /read a zero balance/);
    assert.doesNotMatch(heartbeat.msg, /below the minimum/);
    assert.ok(calls.some(([url, method]) => url.includes("rpc2") && method === "eth_getBalance"));
});

test("a balance read against a stale block is overruled by a fallback that reads a fresher one", async (t) => {
    const address = "0x" + "1".repeat(40);
    // The account's balance before a top-up that has since landed, and its
    // current balance after — both nonzero, so the zero guard alone would
    // have let the stale one straight through.
    const staleBalance = 10n ** 16n;
    const freshBalance = 3n * 10n ** 17n;
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        if (body.method === "eth_chainId") {
            return { status: 200, data: { jsonrpc: "2.0", id: 1, result: "0x1" } };
        }
        if (body.method === "eth_getBlockByNumber") {
            // Primary's own view of "latest" is hours behind, the way a node
            // serving a rolled-back or long-cached state would answer.
            const age = url.includes("rpc1") ? 20000 : 5;
            return { status: 200, data: { jsonrpc: "2.0", id: 1, result: freshBlock(age) } };
        }
        const balance = url.includes("rpc1") ? staleBalance : freshBalance;
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result: `0x${balance.toString(16)}` } };
    });

    const heartbeat = {};
    await new Web3BalanceMonitorType().check({
        web3_network_id: 1,
        web3_fallback_network_ids: "[2]",
        timeout: 10,
        web3_address: address,
        web3_min_balance: "0.05",
    }, heartbeat);

    assert.strictEqual(heartbeat.status, UP);
    assert.match(heartbeat.msg, /^Balance 0\.3, minimum 0\.05/);
    assert.match(heartbeat.msg, /used fallback RPC 2/);
    assert.match(heartbeat.msg, /block \d+ minutes old/);
    assert.doesNotMatch(heartbeat.msg, /below the minimum/);
    assert.ok(calls.some(([url, method]) => url.includes("rpc2") && method === "eth_getBalance"));
});

test("short ERC-20 return data is an RPC failure, not a zero below the minimum", async (t) => {
    const address = "0x" + "1".repeat(40);
    const oneEth = "0x" + "de0b6b3a7640000".padStart(64, "0");
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        let result = "0x1";
        if (body.method === "eth_getBlockByNumber") {
            result = freshBlock();
        } else if (body.method === "eth_call") {
            result = url.includes("rpc1") ? "0x0" : oneEth;
        }
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });

    const heartbeat = {};
    await new Web3BalanceMonitorType().check({
        web3_network_id: 1,
        web3_fallback_network_ids: "[2]",
        timeout: 10,
        web3_address: address,
        web3_token_contract: address,
        web3_min_balance: "0.05",
    }, heartbeat);

    assert.strictEqual(heartbeat.status, UP);
    assert.match(heartbeat.msg, /^Balance 1, minimum 0\.05/);
    assert.match(heartbeat.msg, /used fallback RPC 2/);
    assert.doesNotMatch(heartbeat.msg, /below the minimum/);
    assert.ok(calls.some(([url, method]) => url.includes("rpc2") && method === "eth_call"));
});

test("an ERC-20 word that reads zero everywhere in the pool stays a threshold failure", async (t) => {
    const address = "0x" + "1".repeat(40);
    const calls = [];
    t.mock.method(R, "findOne", async (_table, _query, [id]) => {
        return { id, name: `RPC ${id}`, rpc_url: `https://rpc${id}.example`, active: 1, chain_id: "1", user_id: 7 };
    });
    t.mock.method(axios, "post", async (url, body) => {
        calls.push([url, body.method]);
        const result = body.method === "eth_chainId" ? "0x1"
            : body.method === "eth_getBlockByNumber" ? freshBlock()
                : "0x" + "0".repeat(64);
        return { status: 200, data: { jsonrpc: "2.0", id: 1, result } };
    });

    await assert.rejects(
        new Web3BalanceMonitorType().check({
            web3_network_id: 1,
            web3_fallback_network_ids: "[2]",
            timeout: 10,
            web3_address: address,
            web3_token_contract: address,
            web3_min_balance: "0.05",
        }, {}),
        /Balance 0 is below the minimum of 0\.05/
    );
    // A zero is confirmed against the fallback before it is trusted, so both
    // networks in the pool were asked, and both agreeing is why it stands.
    assert.ok(calls.some(([url]) => url.includes("rpc1")));
    assert.ok(calls.some(([url]) => url.includes("rpc2")));
});
