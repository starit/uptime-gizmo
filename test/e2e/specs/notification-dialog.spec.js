import { expect, test } from "@playwright/test";
import { login } from "../util-test";

/*
 * Smoke cover for the dialog and the per-provider forms it mounts.
 *
 * Deliberately not claiming to guard the `<script setup>` form-host defect that
 * prompted it. That fault only appears in the development build; this suite is
 * served from dist, and the same broken component was verified to render fine
 * there. Dev-only Vue faults are structurally invisible to these tests, so this
 * spec covers that the dialog opens and each provider form mounts, nothing more.
 */
test.describe("Notification dialog", () => {
    test("provider forms bind to the shared notification object", async ({ page }) => {
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));

        await page.goto("./dashboard");
        await login(page);
        await expect(page.getByRole("link", { name: "Add New Monitor" })).toBeVisible({ timeout: 15000 });

        await page.goto("./add");
        const trigger = page.getByRole("button", { name: "Set Up Notification" }).first();
        await expect(trigger).toBeVisible({ timeout: 15000 });
        await trigger.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // The default provider renders its own fields only if the lookup worked.
        await expect(dialog.getByLabel("Friendly Name")).toBeVisible();

        // Switching provider remounts a different form against the same object.
        await dialog.locator("#notification-type").selectOption("webhook");
        await expect(dialog.getByText("Post URL")).toBeVisible();

        await dialog.locator("#notification-type").selectOption("slack");
        await expect(dialog.getByText("Webhook URL")).toBeVisible();

        expect(errors).toEqual([]);
    });
});
