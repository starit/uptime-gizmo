import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot, screenshot } from "../util-test";

test.describe("Monitor inventory", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("desktop inventory lists a monitor and opens its detail", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("./add");
        await login(page);

        await expect(page.getByTestId("monitor-type-select")).toBeVisible();
        await page.getByTestId("monitor-type-select").selectOption("http");
        await page.getByTestId("friendly-name-input").fill("inventory.example");
        await page.getByTestId("url-input").fill("https://www.example.com/");
        await page.getByTestId("save-button").click();
        await page.waitForURL("/dashboard/*");

        await page.getByRole("link", { name: "Monitors", exact: true }).click();
        await page.waitForURL("/list");

        const inventory = page.getByTestId("monitor-inventory");
        await expect(inventory).toBeVisible();
        await expect(inventory).toContainText("inventory.example");
        await expect(inventory).toContainText("HTTP(s)");
        await expect(inventory).toContainText("https://www.example.com/");
        await expect(page.getByRole("heading", { name: "Monitors", exact: true })).toBeVisible();
        await screenshot(testInfo, page);

        await page.locator('label[for="inventory-layout-grid"]').click();
        await expect(inventory.locator(".inventory-cards--grid")).toBeVisible();
        await expect(inventory.locator(".inventory-card")).toHaveCount(1);
        await screenshot(testInfo, page);

        await inventory.getByRole("link", { name: "inventory.example" }).click();
        await page.waitForURL("/dashboard/*");
        await expect(page.getByRole("heading", { name: /inventory\.example/ })).toBeVisible();
        await screenshot(testInfo, page);
    });

    test("desktop inventory keeps group hierarchy collapsible", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("./add");
        await login(page);

        await page.getByTestId("monitor-type-select").selectOption("group");
        await page.getByTestId("friendly-name-input").fill("Inventory Group");
        await page.getByTestId("save-button").click();
        await page.waitForURL("/dashboard/*");

        await page.goto("./add");
        await page.getByTestId("monitor-type-select").selectOption("http");
        await page.getByTestId("friendly-name-input").fill("Grouped Monitor");
        await page.getByTestId("url-input").fill("https://grouped.example.com/");
        await page.getByLabel("Monitor Group").selectOption({ label: "Inventory Group" });
        await page.getByTestId("save-button").click();
        await page.waitForURL("/dashboard/*");

        await page.getByRole("link", { name: "Monitors", exact: true }).click();
        await page.waitForURL("/list");

        const inventory = page.getByTestId("monitor-inventory");
        const groupToggle = inventory.getByRole("button", { name: /group Inventory Group$/ });
        await expect(groupToggle).toBeVisible();

        if ((await groupToggle.getAttribute("aria-expanded")) === "true") {
            await groupToggle.click();
        }
        await expect(inventory.getByRole("link", { name: "Grouped Monitor" })).toBeHidden();

        await groupToggle.click();
        await expect(inventory.getByRole("link", { name: "Grouped Monitor" })).toBeVisible();
        await expect(groupToggle).toHaveAttribute("aria-expanded", "true");
        await screenshot(testInfo, page);

        await page.setViewportSize({ width: 320, height: 844 });
        await expect(inventory.locator(".inventory-cards")).toBeVisible();
        await expect(inventory.getByRole("link", { name: "Grouped Monitor" })).toBeVisible();
        await expect
            .poll(async () =>
                page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
            )
            .toBe(true);
        await screenshot(testInfo, page);
    });

    test("mobile inventory uses the compact list and opens detail", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("./add");
        await login(page);

        await expect(page.getByTestId("monitor-type-select")).toBeVisible();
        await page.getByTestId("monitor-type-select").selectOption("http");
        await page.getByTestId("friendly-name-input").fill("inventory.example");
        await page.getByTestId("url-input").fill("https://www.example.com/");
        await page.getByTestId("save-button").click();
        await page.waitForURL("/dashboard/*");

        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "List" }).click();
        await page.waitForURL("/list");

        const inventory = page.getByTestId("monitor-inventory");
        await expect(inventory).toBeVisible();
        await expect(inventory).toContainText("inventory.example");
        await expect(inventory).toContainText("HTTP(s)");
        await expect(inventory).toContainText("https://www.example.com/");
        await expect(page.getByRole("heading", { name: "Monitors", exact: true })).toBeVisible();
        await screenshot(testInfo, page);

        await page.setViewportSize({ width: 1280, height: 800 });
        await page.locator('label[for="inventory-layout-grid"]').click();
        await expect(inventory.locator(".inventory-cards--grid")).toBeVisible();

        for (const width of [960, 768, 390, 320]) {
            await test.step(`${width}px uses compact layout without horizontal overflow`, async () => {
                await page.setViewportSize({ width, height: 844 });
                await expect(page.locator(".layout-toggle")).toBeHidden();
                await expect(inventory.locator(".inventory-cards")).toBeVisible();
                await expect(inventory.locator(".inventory-cards--grid")).toHaveCount(0);
                await expect
                    .poll(async () =>
                        page.evaluate(() => {
                            const viewportWidth = document.documentElement.clientWidth;
                            const overflow = Math.max(0, document.documentElement.scrollWidth - viewportWidth);
                            const offenders = [...document.body.querySelectorAll("*")]
                                .filter((element) => element.getBoundingClientRect().right > viewportWidth + 1)
                                .map((element) => ({
                                    className: element.className?.toString() || "",
                                    right: Math.round(element.getBoundingClientRect().right),
                                    tagName: element.tagName,
                                }))
                                .slice(0, 10);

                            return {
                                offenders: overflow > 0 ? offenders : [],
                                overflow,
                            };
                        })
                    )
                    .toEqual({ offenders: [], overflow: 0 });
                if (width >= 360 && width < 768) {
                    await expect
                        .poll(async () =>
                            page.locator(".inventory-toolbar").evaluate((toolbar) => {
                                const controls = [
                                    toolbar.querySelector(".search-wrapper"),
                                    ...toolbar.querySelectorAll(".filter-dropdown-status"),
                                ];
                                const tops = controls.map((control) => Math.round(control.getBoundingClientRect().top));
                                return Math.max(...tops) - Math.min(...tops) <= 1;
                            })
                        )
                        .toBe(true);
                }
            });
        }
        await screenshot(testInfo, page);

        await inventory.getByRole("checkbox", { name: "Check/Uncheck" }).check();
        await expect(page.locator(".selection-row")).toBeVisible();
        await expect
            .poll(async () =>
                page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
            )
            .toBe(true);
        await page.getByRole("button", { name: "Cancel" }).click();

        await inventory.getByRole("link", { name: "inventory.example" }).click();
        await page.waitForURL("/dashboard/*");
        await expect(page.getByRole("heading", { name: /inventory\.example/ })).toBeVisible();
        await screenshot(testInfo, page);
    });
});
