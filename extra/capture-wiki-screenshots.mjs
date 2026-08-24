/**
 * Capture product screenshots for docs/wiki.
 *
 * Starts an isolated instance on port 3011, walks through setup, and writes
 * PNGs into docs/wiki/images. Safe to re-run; it wipes data/wiki-shots first.
 *
 *   pnpm exec node extra/capture-wiki-screenshots.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs/wiki/images");
const dataDir = path.join(root, "data/wiki-shots");
const port = 3011;
const base = `http://127.0.0.1:${port}`;

/**
 * @param {number} ms Delay
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @returns {Promise<void>}
 */
async function waitForServer() {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(base, { redirect: "manual" });
            if (res.status > 0) {
                return;
            }
        } catch {
            // still booting
        }
        await sleep(400);
    }
    throw new Error("Server did not start on " + base);
}

/**
 * @param {import('@playwright/test').Page} page Page
 * @param {string} name File stem
 * @param {{ fullPage?: boolean }} [opts] Screenshot options
 * @returns {Promise<void>}
 */
async function shot(page, name, opts = {}) {
    await sleep(400);
    await page.screenshot({
        path: path.join(outDir, `${name}.png`),
        fullPage: Boolean(opts.fullPage),
        animations: "disabled",
    });
}

/**
 * @param {import('@playwright/test').Page} page Page
 * @param {string} name Monitor name
 * @param {string} url Target URL
 * @returns {Promise<void>}
 */
async function addHttpMonitor(page, name, url) {
    await page.goto(`${base}/add`);
    await page.getByTestId("monitor-type-select").waitFor();
    await page.getByTestId("monitor-type-select").selectOption("http");
    await page.getByTestId("friendly-name-input").fill(name);
    await page.getByTestId("url-input").fill(url);
    await page.getByTestId("save-button").click();
    await page.waitForURL(/\/dashboard\//);
}

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
    path.join(dataDir, "db-config.json"),
    JSON.stringify({
        type: "sqlite",
        port: 3306,
        hostname: "",
        username: "",
        password: "",
        dbName: "kuma",
        ssl: false,
        ca: "",
    })
);

const child = spawn(process.execPath, ["server/server.js", `--port=${port}`, `--data-dir=${dataDir}`], {
    cwd: root,
    env: {
        ...process.env,
        NODE_ENV: "production",
        UPTIME_GIZMO_WS_ORIGIN_CHECK: "bypass",
    },
    stdio: "inherit",
});

let exiting = false;
const stop = () => {
    if (exiting) {
        return;
    }
    exiting = true;
    child.kill("SIGTERM");
};

process.on("exit", stop);
process.on("SIGINT", () => {
    stop();
    process.exit(1);
});

try {
    await waitForServer();

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: "en-US",
        colorScheme: "light",
        reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.goto(`${base}/dashboard`);
    await page.getByPlaceholder("Username").waitFor({ timeout: 20_000 });
    await page.getByPlaceholder("Username").fill("admin");
    await page.getByPlaceholder("Password", { exact: true }).fill("admin123");
    await page.getByPlaceholder("Repeat Password").fill("admin123");
    await page.getByRole("button", { name: "Create" }).click();
    await page.getByRole("link", { name: "Add New Monitor" }).first().waitFor({ timeout: 20_000 });

    await page.goto(`${base}/dashboard`);
    await shot(page, "dashboard-empty");

    await addHttpMonitor(page, "Website", "https://example.com");
    await addHttpMonitor(page, "GitHub", "https://github.com");
    await addHttpMonitor(page, "Cloudflare", "https://www.cloudflare.com");

    await page.goto(`${base}/dashboard`);
    await page.getByText("Website").first().waitFor();
    await sleep(8000);
    await shot(page, "dashboard-light");

    await page.goto(`${base}/settings/appearance`);
    await page.locator("label[for='btncheck2']").click();
    await page.goto(`${base}/dashboard`);
    await page.getByText("Website").first().waitFor();
    await sleep(600);
    await shot(page, "dashboard-dark");

    await page.locator("label[for='btncheck1']").click().catch(() => {});
    await page.goto(`${base}/settings/appearance`);
    await page.locator("label[for='btncheck1']").click();

    await page.goto(`${base}/add-status-page`);
    await page.getByTestId("name-input").fill("Example Status");
    await page.getByTestId("slug-input").fill("example");
    await page.getByTestId("submit-button").click();
    await page.waitForURL(/\/status\/example/);
    await page.getByTestId("add-group-button").click();
    await page.getByTestId("group-name").fill("Services");
    for (const name of ["Website", "GitHub", "Cloudflare"]) {
        await page.getByTestId("monitor-select").click();
        await page.getByTestId("monitor-select").getByRole("option", { name }).click();
    }
    await page.getByTestId("save-button").click();
    await page.waitForEvent("load");

    const visitor = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: "en-US",
        colorScheme: "light",
        reducedMotion: "reduce",
    });
    const publicPage = await visitor.newPage();
    await publicPage.goto(`${base}/status/example`);
    await publicPage.getByText("Services").waitFor();
    await sleep(800);
    await shot(publicPage, "status-page", { fullPage: true });
    await visitor.close();

    await page.goto(`${base}/dashboard`);
    await page.getByRole("button", { name: "User" }).click();
    await page.getByText("Log out", { exact: true }).click();
    await page.getByRole("button", { name: "Log in" }).waitFor();
    await shot(page, "login");

    await browser.close();
    console.log("Wrote screenshots to", outDir);
} finally {
    stop();
    await sleep(500);
}
