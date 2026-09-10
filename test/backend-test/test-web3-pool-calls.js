const { test } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { R } = require("redbean-node");
const { Web3BalanceMonitorType } = require("../../server/monitor-types/web3-balance");
const { Web3RpcMonitorType } = require("../../server/monitor-types/web3-rpc");
const { Web3ContractMonitorType } = require("../../server/monitor-types/web3-contract");
const { web3SocketHandler } = require("../../server/socket-handlers/web3-socket-handler");

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
        const result = body.method === "eth_chainId" ? "0x1"
            : body.method === "eth_getBlockByNumber" ? { number: "0x10", timestamp: "0x1" }
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
