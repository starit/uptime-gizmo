import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot } from "../util-test";

test.describe("Dialog primitives", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
        await page.goto("./dashboard");
        await login(page);
    });

    test("confirmation dialog manages keyboard focus and dismissals", async ({ page }) => {
        const trigger = page.getByRole("button", { name: "Clear All Events" });
        await trigger.click();

        const dialog = page.getByRole("dialog", { name: "Confirm" });
        const closeButton = dialog.getByRole("button", { name: "Close" });
        const cancelButton = dialog.getByRole("button", { name: "No", exact: true });
        const confirmButton = dialog.getByRole("button", { name: "Yes", exact: true });

        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute("aria-labelledby", /reka-dialog-title/);
        await expect(dialog).toHaveAttribute("aria-describedby", /reka-dialog-description/);
        await expect(cancelButton).toBeFocused();
        await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

        await page.keyboard.press("Tab");
        await expect(confirmButton).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(closeButton).toBeFocused();

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

        await trigger.click();
        await page.locator(".gizmo-dialog__overlay").click({ position: { x: 8, y: 8 } });
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();

        await trigger.click();
        await cancelButton.click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });
});
