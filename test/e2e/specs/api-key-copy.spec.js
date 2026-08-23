import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("API key copy", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("copy stays clickable after generating a key on a mobile viewport", async ({ page }) => {
        await page.goto("./dashboard");
        await login(page);

        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("./settings/api-keys");

        await page.getByRole("button", { name: "Add API Key" }).click();

        const createDialog = page.getByRole("dialog", { name: "Add API Key" });
        await createDialog.getByLabel("Name").fill("mobile-copy");
        await createDialog.getByLabel("Don't expire").check();
        await createDialog.getByRole("button", { name: "Generate" }).click();

        const addedDialog = page.getByRole("dialog", { name: "Key Added" });
        await expect(addedDialog).toBeVisible();

        const copyButton = addedDialog.getByRole("button", { name: "Copy to Clipboard" });
        await expect(copyButton).toBeEnabled();
        await expect(copyButton.locator("[data-icon='copy']")).toBeVisible();

        await copyButton.click();

        await expect(copyButton.locator("[data-icon='check']")).toBeVisible();
    });
});
