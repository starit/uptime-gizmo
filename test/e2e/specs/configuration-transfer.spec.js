import { expect, test } from "@playwright/test";
import fs from "fs";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Configuration export and import", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
        await page.goto("./dashboard");
        await login(page);
    });

    test("exports a configuration-only archive and stages it for next start", async ({ page }) => {
        await page.goto("./settings/export-import");

        await expect(page.getByText("Configuration export — this is not a full backup")).toBeVisible();
        await expect(page.getByText(/It does not contain users, login password hashes/)).toBeVisible();
        await expect(page.getByText(/Import only an archive you created or trust/)).toBeVisible();

        await page.locator("#configuration-export-password").fill("admin123");
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export configuration", exact: true }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^uptime-gizmo-configuration-\d{4}-\d{2}-\d{2}\.ugbackup$/);

        const downloadPath = await download.path();
        const archive = JSON.parse(fs.readFileSync(downloadPath, "utf8"));
        expect(archive.format).toBe("uptime-gizmo-configuration");
        expect(archive.scope).toBe("configuration");
        expect(Array.isArray(archive.resources.monitors)).toBe(true);
        expect(archive.resources).not.toHaveProperty("users");
        expect(archive.resources).not.toHaveProperty("heartbeats");

        await page.locator("#configuration-import-file").setInputFiles(downloadPath);
        await page.locator("#configuration-import-password").fill("admin123");
        await page.getByRole("button", { name: "Import configuration" }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("Replace this instance's monitoring configuration on next start?")).toBeVisible();
        await dialog.getByRole("button", { name: "Stage replacement" }).click();

        await expect(page.getByText("Configuration import staged", { exact: true })).toBeVisible();
        await expect(
            page.getByText("Restart Uptime Gizmo to apply this configuration before monitors start.")
        ).toBeVisible();
        await expect(
            page.getByText("Configuration validated and staged. Restart Uptime Gizmo to apply it.")
        ).toBeVisible();
    });

    test("keeps the actions usable on a narrow viewport", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("./settings/export-import");

        await expect(page.getByRole("heading", { name: "Export configuration" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Import configuration" })).toBeVisible();
        await page.locator("#configuration-export-password").fill("admin123");
        await expect(page.getByRole("button", { name: "Export configuration", exact: true })).toBeEnabled();
        await expect(page.locator("#configuration-import-file")).toBeVisible();
        await expect(page.getByRole("button", { name: "Import configuration" })).toBeVisible();
    });

    test("redirects the previous settings URL", async ({ page }) => {
        await page.goto("./settings/configuration-transfer");
        await expect(page).toHaveURL(/\/settings\/export-import$/);
        await expect(page.getByRole("link", { name: "Export / Import", exact: true })).toBeVisible();
    });
});
