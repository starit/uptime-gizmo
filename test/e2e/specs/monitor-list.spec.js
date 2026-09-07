import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot, screenshot } from "../util-test";

/**
 * @param {import("@playwright/test").Page} page Page
 * @param {{ name: string, url?: string, type?: string, groupLabel?: string }} options Monitor fields
 * @returns {Promise<void>}
 */
async function createMonitor(page, { name, url, type = "http", groupLabel }) {
    await page.goto("./add");
    await expect(page.getByTestId("monitor-type-select")).toBeVisible();
    await page.getByTestId("monitor-type-select").selectOption(type);
    await page.getByTestId("friendly-name-input").fill(name);

    if (type !== "group") {
        await page.getByTestId("url-input").fill(url);
    }

    if (groupLabel) {
        await page.getByLabel("Monitor Group").selectOption({ label: groupLabel });
    }

    await page.getByTestId("save-button").click();
    await page.waitForURL("/dashboard/*");
}

test.describe("Monitor list rail", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("expanded last group members can be scrolled into view", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 520 });
        await page.goto("./add");
        await login(page);

        await createMonitor(page, { name: "aaa-filler", url: "https://filler.example.com/" });
        await createMonitor(page, { name: "zzz-group", type: "group" });

        for (let index = 1; index <= 6; index += 1) {
            const suffix = String(index).padStart(2, "0");
            await createMonitor(page, {
                name: `zzz-member-${suffix}`,
                url: `https://member-${suffix}.example.com/`,
                groupLabel: "zzz-group",
            });
        }

        await page.goto("./dashboard");
        const list = page.getByTestId("monitor-list");
        await expect(list).toContainText("zzz-group");

        const groupRow = list.locator(".item").filter({ hasText: "zzz-group" }).first();
        const chevron = groupRow.locator(".collapse-padding");
        if (await chevron.locator(".collapsed").count()) {
            await chevron.click();
        }

        const lastMember = list.getByText("zzz-member-06", { exact: true });
        await expect(lastMember).toBeAttached();

        const lastMemberVisibleInList = await lastMember.evaluate((element) => {
            const listEl = element.closest("[data-testid='monitor-list']");
            if (!listEl) {
                return false;
            }

            element.scrollIntoView({ block: "end" });
            const listRect = listEl.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            return elementRect.top >= listRect.top - 1 && elementRect.bottom <= listRect.bottom + 1;
        });

        expect(lastMemberVisibleInList).toBe(true);
        await screenshot(testInfo, page);
    });
});
