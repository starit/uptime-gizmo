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
    let lastRpc;

    test.beforeEach(async ({ page }) => {
        primaryRpc = await startRpcServer();
        fallbackRpc = await startRpcServer();
        lastRpc = await startRpcServer();
        await restoreSqliteSnapshot(page);
    });

    test.afterEach(async () => {
        await Promise.all([
            closeRpcServer(primaryRpc.server),
            closeRpcServer(fallbackRpc.server),
            closeRpcServer(lastRpc.server),
        ]);
    });

    test("selects and persists a compatible fallback", async ({ page }) => {
        await page.goto("./settings/web3");
        await login(page);
        await page.goto("./settings/web3");

        await addNetwork(page, "Primary Ethereum", primaryRpc.url);
        await addNetwork(page, "Fallback Ethereum", fallbackRpc.url);
        await addNetwork(page, "Last Ethereum", lastRpc.url);

        await page.goto("./add");
        await page.getByTestId("monitor-type-select").selectOption("web3-balance");
        await expect(page.getByTestId("web3-fallback-network")).toBeDisabled();
        const primaryValue = await page.locator("#web3-network option", { hasText: "Primary Ethereum" }).getAttribute("value");
        await page.getByLabel("Web3 Network").selectOption(primaryValue);

        const fallbackSelect = page.getByTestId("web3-fallback-network");
        await expect(fallbackSelect).toBeEnabled();
        const fallbackValue = await fallbackSelect.locator("option", { hasText: "Fallback Ethereum" }).getAttribute("value");
        await fallbackSelect.selectOption(fallbackValue);
        const secondFallback = page.getByTestId("web3-fallback-network-1");
        const lastValue = await secondFallback.locator("option", { hasText: "Last Ethereum" }).getAttribute("value");
        await secondFallback.selectOption(lastValue);
        await page.getByRole("button", { name: "Move up 2", exact: true }).click();
        await expect(fallbackSelect).toHaveValue(lastValue);
        await page.getByRole("button", { name: "Move up 2", exact: true }).click();
        await expect(fallbackSelect).toHaveValue(fallbackValue);
        await expect(page.getByText(/Used only when the primary RPC/)).toBeVisible();

        await closeRpcServer(primaryRpc.server);
        await closeRpcServer(fallbackRpc.server);

        await page.getByTestId("friendly-name-input").fill("Treasury with fallback");
        await page.getByLabel("Address").fill("0x0000000000000000000000000000000000000001");
        await page.getByTestId("save-button").click();
        await page.waitForURL(/\/dashboard\//);
        await expect(page.getByTestId("monitor-status")).toHaveText("Up", { timeout: 15000 });
        await expect(page.locator(".heartbeat-msg").first()).toContainText("used fallback Last Ethereum", { timeout: 15000 });

        await page.getByRole("link", { name: "Edit" }).click();
        await page.waitForURL(/\/edit\//);
        await expect(page.getByTestId("web3-fallback-network")).toHaveValue(/\d+/);
        await expect(page.getByTestId("web3-fallback-network-1")).toHaveValue(lastValue);
        for (const close of await page.locator(".Vue-Toastification__close-button").all()) {
            await close.click();
        }
        await expect(page.locator(".Vue-Toastification__toast")).toHaveCount(0);
        await page.screenshot({ path: "private/web3-fallback-desktop.png", fullPage: true });

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByTestId("web3-fallback-network")).toBeVisible();
        await expect(page.getByRole("button", { name: "Move up 2", exact: true })).toBeVisible();
        await page.screenshot({ path: "private/web3-fallback-mobile.png", fullPage: true });

        await page.goto("./settings/web3");
        const fallbackRow = page.getByRole("listitem").filter({ hasText: "Fallback Ethereum" });
        await fallbackRow.getByRole("link", { name: "Edit" }).click();
        const networkDialog = page.getByRole("dialog").filter({ hasText: "RPC URL" });
        await networkDialog.getByRole("button", { name: "Delete", exact: true }).click();
        const deleteDialog = page.getByRole("dialog").filter({ hasText: "Delete Web3 network?" });
        await expect(deleteDialog.getByTestId("web3-delete-impact")).toContainText(
            "1 monitor(s) currently use this network"
        );
        await expect(deleteDialog).toContainText("remove this network from their fallback list");
        expect(await deleteDialog.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
        await deleteDialog.screenshot({ path: "private/web3-delete-impact-mobile.png" });
        await deleteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
        await networkDialog.getByRole("button", { name: "Close", exact: true }).click();
        await page.goBack();
        await page.waitForURL(/\/edit\//);

        await page.getByTestId("web3-fallback-network-1").selectOption("");
        await expect(page.getByTestId("web3-fallback-network-1")).toHaveValue("");
        await page.getByRole("button", { name: "Remove Fallback network 1", exact: true }).click();
        await page.getByTestId("save-button").click();
        await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByTestId("web3-fallback-network")).toHaveValue("");
        await expect(page.getByTestId("web3-fallback-network-1")).toHaveCount(0);
    });

    test("does not hide a valid threshold failure with fallback", async ({ page }) => {
        await page.emulateMedia({ colorScheme: "dark" });
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
        await expect(page.locator("body")).toHaveClass(/dark/);
        await fallbackSelect.locator("../..").screenshot({ path: "private/web3-fallback-dark.png" });
        await page.getByLabel("Address").fill("0x0000000000000000000000000000000000000001");
        await page.getByLabel(/Minimum Balance/).fill("50");
        await page.getByTestId("save-button").click();
        await page.waitForURL(/\/dashboard\//);

        await expect(page.getByTestId("monitor-status")).toHaveText("Down", { timeout: 15000 });
        await expect(page.locator(".heartbeat-msg").first()).toContainText("below the minimum", { timeout: 15000 });
        expect(fallbackRpc.calls).not.toContain("eth_getBalance");
    });
});
