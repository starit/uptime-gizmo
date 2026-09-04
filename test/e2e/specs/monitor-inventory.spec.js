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
        await expect(page.getByRole("radio", { name: "List" })).toBeChecked();
        await expect(page.getByRole("radio", { name: "Compact" })).toHaveCount(0);
        await screenshot(testInfo, page);

        await page.locator('label[for="inventory-layout-grid"]').click();
        await expect(inventory.locator(".inventory-cards--grid")).toBeVisible();
        await expect(inventory.locator(".inventory-cards--columns-4")).toBeVisible();
        const renderedColumnCount = () =>
            inventory
                .locator(".inventory-cards")
                .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
        await expect.poll(renderedColumnCount).toBe(4);
        await expect(inventory.locator(".inventory-card")).toHaveCount(1);
        await expect(inventory.locator(".inventory-card__metric-label")).toHaveText(["Uptime", "Last Check"]);
        await expect(inventory.locator(".inventory-card__signal")).toHaveCount(0);
        await expect(inventory.locator(".heartbeat-below")).toHaveCount(0);
        await expect(inventory.locator(".inventory-cards__toolbar .select-all")).toBeVisible();
        await page.locator('label[for="inventory-columns-2"]').click();
        await expect(page.getByRole("radio", { name: "Comfortable" })).toBeChecked();
        await expect(inventory.locator(".inventory-cards--columns-2")).toBeVisible();
        await expect.poll(renderedColumnCount).toBe(2);
        await screenshot(testInfo, page);

        await page.locator('label[for="inventory-layout-cards"]').click();
        await expect(inventory.locator(".inventory-cards--cards")).toBeVisible();
        await expect(inventory.locator(".inventory-cards--columns-2")).toBeVisible();
        await expect(inventory.locator(".inventory-cards--grid")).toHaveCount(0);
        await expect(inventory.locator(".inventory-card__metric-label")).toHaveText([
            "Uptime",
            "Last Check",
            "Interval",
        ]);
        await expect(inventory.locator(".heartbeat-below")).toBeVisible();
        await expect(inventory.locator(".inventory-card__signal")).toContainText("Heartbeat");
        await page.locator('label[for="inventory-columns-4"]').click();
        await expect(page.getByRole("radio", { name: "Dense" })).toBeChecked();
        await expect(inventory.locator(".inventory-cards--columns-4")).toBeVisible();
        await expect.poll(renderedColumnCount).toBe(4);
        await page.locator('label[for="inventory-layout-grid"]').click();
        await expect(inventory.locator(".inventory-cards--columns-2")).toBeVisible();
        await page.locator('label[for="inventory-layout-cards"]').click();
        await expect(inventory.locator(".inventory-cards--columns-4")).toBeVisible();
        await page.setViewportSize({ width: 1024, height: 800 });
        await expect(inventory.locator(".inventory-cards--cards")).toBeVisible();
        await expect
            .poll(async () =>
                page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
            )
            .toBe(true);
        await screenshot(testInfo, page);

        const cardLink = inventory.getByRole("link", { name: "Open monitor inventory.example" });
        await expect(cardLink).toBeVisible();
        await expect(inventory.getByRole("link", { name: "inventory.example", exact: true })).toHaveCount(0);
        const cardCheckbox = inventory.getByRole("checkbox", { name: "Check/Uncheck" });
        await cardCheckbox.check();
        await expect(page).toHaveURL(/\/list$/);
        await cardCheckbox.uncheck();
        await cardLink.focus();
        await expect(cardLink).toBeFocused();
        await cardLink.click();
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

        await page.locator('label[for="inventory-layout-grid"]').click();
        const groupCard = inventory.locator(".inventory-card--group");
        const childCard = inventory.locator(".inventory-card:not(.inventory-card--group)");
        const groupName = inventory.locator(".monitor-name-link").filter({ hasText: "Inventory Group" });
        const childName = inventory.locator(".monitor-name-link").filter({ hasText: "Grouped Monitor" });
        const sameTrackLayout = async () => {
            const [groupBox, childBox, groupNameBox, childNameBox] = await Promise.all([
                groupCard.boundingBox(),
                childCard.boundingBox(),
                groupName.boundingBox(),
                childName.boundingBox(),
            ]);
            return {
                childIndented: childNameBox.x - childBox.x > groupNameBox.x - groupBox.x,
                sameRow: Math.abs(groupBox.y - childBox.y) <= 1,
                sameWidth: Math.abs(groupBox.width - childBox.width) <= 1,
            };
        };
        await expect(groupCard).toBeVisible();
        await expect(childCard).toBeVisible();
        await expect(groupCard.locator(".inventory-card__group-context")).toHaveCount(0);
        await expect(childCard.locator(".inventory-card__group-context")).toHaveText("Inventory Group");
        await expect.poll(sameTrackLayout).toEqual({ childIndented: true, sameRow: true, sameWidth: true });

        await page.locator('label[for="inventory-layout-cards"]').click();
        await expect(inventory.locator(".inventory-cards--cards")).toBeVisible();
        await expect(childCard.locator(".inventory-card__group-context")).toHaveText("Inventory Group");
        await expect.poll(sameTrackLayout).toEqual({ childIndented: true, sameRow: true, sameWidth: true });
        await groupToggle.click();
        await expect(childCard).toBeHidden();
        await groupToggle.click();
        await expect(childCard).toBeVisible();
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
        await page.locator('label[for="inventory-layout-cards"]').click();
        await expect(inventory.locator(".inventory-cards--cards")).toBeVisible();

        for (const width of [960, 768, 390, 320]) {
            await test.step(`${width}px uses compact layout without horizontal overflow`, async () => {
                await page.setViewportSize({ width, height: 844 });
                await expect(page.locator(".layout-toggle")).toBeHidden();
                await expect(inventory.locator(".inventory-cards")).toBeVisible();
                await expect(inventory.locator(".inventory-cards--grid")).toHaveCount(0);
                await expect(inventory.locator(".inventory-cards--cards")).toHaveCount(0);
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
