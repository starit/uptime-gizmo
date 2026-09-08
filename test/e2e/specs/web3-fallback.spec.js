import { expect, test } from "@playwright/test";
import http from "node:http";
import { login, restoreSqliteSnapshot } from "../util-test";

/**
 * Start the small part of Ethereum JSON-RPC needed by network setup and a
 * balance monitor.
 * @param {string} balance hex balance returned by eth_getBalance
 * @returns {Promise<{server: import("node:http").Server, url: string, calls: string[]}>} mock RPC
 */
async function startRpcServer(balance = "0x14") {
    const calls = [];
    const server = http.createServer((request, response) => {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
            body += chunk;
        });
        request.on("end", () => {
            const message = JSON.parse(body);
            calls.push(message.method);
            let result = "0x1";
            if (message.method === "eth_getBalance") {
                result = balance;
            }
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
        });
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    return { server, url: `http://127.0.0.1:${address.port}`, calls };
}

/**
 * Close a mock server once, including after a test already stopped it.
 * @param {import("node:http").Server} server mock RPC server
 * @returns {Promise<void>} nothing
 */
async function closeRpcServer(server) {
    if (!server.listening) {
        return;
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

/**
 * Add one Web3 Network through the administrator interface.
 * @param {import("@playwright/test").Page} page browser page
 * @param {string} name network name
 * @param {string} url RPC URL
 * @returns {Promise<void>} nothing
 */
async function addNetwork(page, name, url) {
    await page.getByRole("button", { name: "Setup Web3 Network" }).click();
    await page.getByLabel("Friendly Name").fill(name);
    await page.getByLabel("RPC URL").fill(url);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe("Web3 fallback network", () => {
    let primaryRpc;
    let fallbackRpc;

    test.beforeEach(async ({ page }) => {
        primaryRpc = await startRpcServer();
        fallbackRpc = await startRpcServer();
        await restoreSqliteSnapshot(page);
    });

    test.afterEach(async () => {
        await Promise.all([
            closeRpcServer(primaryRpc.server),
            closeRpcServer(fallbackRpc.server),
        ]);
    });

    test("selects and persists a compatible fallback", async ({ page }) => {
        await page.goto("./settings/web3");
        await login(page);
        await page.goto("./settings/web3");

        await addNetwork(page, "Primary Ethereum", primaryRpc.url);
        await addNetwork(page, "Fallback Ethereum", fallbackRpc.url);

        await page.goto("./add");
        await page.getByTestId("monitor-type-select").selectOption("web3-balance");
        const primaryValue = await page.locator("#web3-network option", { hasText: "Primary Ethereum" }).getAttribute("value");
        await page.getByLabel("Web3 Network").selectOption(primaryValue);

        const fallbackSelect = page.getByTestId("web3-fallback-network");
        await expect(fallbackSelect).toBeEnabled();
        const fallbackValue = await fallbackSelect.locator("option", { hasText: "Fallback Ethereum" }).getAttribute("value");
        await fallbackSelect.selectOption(fallbackValue);
        await expect(page.getByText(/Used only when the primary RPC/)).toBeVisible();

        await closeRpcServer(primaryRpc.server);

        await page.getByTestId("friendly-name-input").fill("Treasury with fallback");
        await page.getByLabel("Address").fill("0x0000000000000000000000000000000000000001");
        await page.getByTestId("save-button").click();
        await page.waitForURL(/\/dashboard\//);
        await expect(page.getByTestId("monitor-status")).toHaveText("Up", { timeout: 15000 });
        await expect(page.locator(".heartbeat-msg").first()).toContainText("used fallback Fallback Ethereum", { timeout: 15000 });

        await page.getByRole("link", { name: "Edit" }).click();
        await page.waitForURL(/\/edit\//);
        await expect(page.getByTestId("web3-fallback-network")).toHaveValue(/\d+/);

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByTestId("web3-fallback-network")).toBeVisible();
    });

    test("does not hide a valid threshold failure with fallback", async ({ page }) => {
        await page.goto("./settings/web3");
        await login(page);
        await page.goto("./settings/web3");

        await addNetwork(page, "Low Balance RPC", primaryRpc.url);
        await addNetwork(page, "Funded Fallback RPC", fallbackRpc.url);

        await page.goto("./add");
        await page.getByTestId("monitor-type-select").selectOption("web3-balance");
        const primaryValue = await page.locator("#web3-network option", { hasText: "Low Balance RPC" }).getAttribute("value");
        await page.getByLabel("Web3 Network").selectOption(primaryValue);
        const fallbackSelect = page.getByTestId("web3-fallback-network");
        const fallbackValue = await fallbackSelect.locator("option", { hasText: "Funded Fallback RPC" }).getAttribute("value");
        await fallbackSelect.selectOption(fallbackValue);

        await page.getByTestId("friendly-name-input").fill("Low treasury stays down");
        await page.getByLabel("Address").fill("0x0000000000000000000000000000000000000001");
        await page.getByLabel(/Minimum Balance/).fill("50");
        await page.getByTestId("save-button").click();
        await page.waitForURL(/\/dashboard\//);

        await expect(page.getByTestId("monitor-status")).toHaveText("Down", { timeout: 15000 });
        await expect(page.locator(".heartbeat-msg").first()).toContainText("below the minimum", { timeout: 15000 });
        expect(fallbackRpc.calls).not.toContain("eth_getBalance");
    });
});
