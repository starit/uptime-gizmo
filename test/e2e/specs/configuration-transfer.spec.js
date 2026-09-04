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

    test("fits Chinese mobile content and mirrors the settings shell in RTL", async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 700 });
        await page.evaluate(() => localStorage.setItem("locale", "zh-CN"));
        await page.goto("./settings/export-import");

        await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
        await expect(page.getByRole("heading", { name: "导出配置" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "导入配置" })).toBeVisible();
        await page.locator("#configuration-import-file").setInputFiles({
            name: `${"跨数据库状态页面配置-".repeat(8)}.ugbackup`,
            mimeType: "application/vnd.uptime-gizmo.configuration+json",
            buffer: Buffer.from("{}"),
        });

        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        ).toBe(true);
        const importButton = await page.getByRole("button", { name: "导入配置" }).boundingBox();
        expect(importButton).not.toBeNull();
        expect(importButton.x).toBeGreaterThanOrEqual(0);
        expect(importButton.x + importButton.width).toBeLessThanOrEqual(320);
        await page.locator("#configuration-import-password").fill("admin123");
        await page.getByRole("button", { name: "导入配置" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("下次启动时替换此实例的监控配置？")).toBeVisible();
        const dialogBounds = await dialog.boundingBox();
        expect(dialogBounds).not.toBeNull();
        expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
        expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(320);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        await page.setViewportSize({ width: 1024, height: 768 });
        await page.evaluate(() => localStorage.setItem("locale", "ar-SY"));
        await page.reload();

        await expect(page.locator("html")).toHaveAttribute("lang", "ar-SY");
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        const menuItem = page.getByRole("link", { name: "Export / Import", exact: true }).locator(".menu-item");
        await expect(menuItem).toBeVisible();
        expect(await menuItem.evaluate((element) => getComputedStyle(element).borderInlineStartWidth)).toBe("4px");
        const workspaceOverflow = await page.locator(".settings-workspace").evaluate((workspace) => {
            const bounds = workspace.getBoundingClientRect();
            return [...workspace.querySelectorAll("*")]
                .map((element) => {
                    const rect = element.getBoundingClientRect();
                    return { selector: element.className || element.tagName, left: rect.left, right: rect.right };
                })
                .filter(({ left, right }) => left < bounds.left - 1 || right > bounds.right + 1)
                .slice(0, 10);
        });
        expect(workspaceOverflow).toEqual([]);
    });
});
