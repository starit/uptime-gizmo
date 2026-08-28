import { expect, test } from "@playwright/test";
import { login, restoreSqliteSnapshot, screenshot } from "../util-test";

/*
 * The llm type shares three fields with the HTTP types — url, timeout and
 * keyword — and adds four of its own. Those shared fields are the ones a
 * regression would silently remove from the form, since nothing about the type
 * itself would break, so each is asserted visible here.
 *
 * The endpoint used is a closed loopback port. The monitor will go down on its
 * first check, which is fine: what is under test is the form and the detail
 * page, not a completion.
 */

/** A port nothing listens on, so no request leaves the machine. */
const CLOSED_ENDPOINT = "http://127.0.0.1:1/v1/chat/completions";

/**
 * Choose the monitor type in the add form.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} monitorType the type to select
 * @returns {Promise<void>}
 */
async function selectMonitorType(page, monitorType) {
    const select = page.getByTestId("monitor-type-select");
    await expect(select).toBeVisible();
    await select.selectOption(monitorType);
    expect(await select.evaluate((element) => element.value)).toBe(monitorType);
}

test.describe("LLM monitor", () => {
    test.beforeEach(async ({ page }) => {
        await restoreSqliteSnapshot(page);
    });

    test("the form offers the type and its own fields", async ({ page }, testInfo) => {
        await page.goto("./add");
        await login(page);
        await selectMonitorType(page, "llm");

        await expect(page.getByTestId("llm-model-input")).toBeVisible();
        // HiddenInput sets inheritAttrs: false, so it is located by the id it forwards.
        await expect(page.locator("#llm-api-key")).toBeVisible();
        await expect(page.getByTestId("llm-prompt-input")).toBeVisible();
        await expect(page.getByTestId("llm-max-tokens-input")).toBeVisible();
        await expect(page.getByTestId("llm-max-latency-input")).toBeVisible();

        // Shared with the HTTP types, and the ones a regression would drop.
        await expect(page.getByTestId("url-input")).toBeVisible();
        await expect(page.getByTestId("timeout-input")).toBeVisible();
        await expect(page.getByTestId("keyword-input")).toBeVisible();

        await screenshot(testInfo, page);
    });

    test("the token cap is prefilled and the keyword is optional", async ({ page }) => {
        await page.goto("./add");
        await login(page);
        await selectMonitorType(page, "llm");

        // Low by default: every check spends tokens.
        await expect(page.getByTestId("llm-max-tokens-input")).toHaveValue("16");

        // The keyword is required for the keyword type and optional here.
        await expect(page.getByTestId("keyword-input")).not.toHaveAttribute("required", /.*/);

        await selectMonitorType(page, "keyword");
        await expect(page.getByTestId("keyword-input")).toHaveAttribute("required", /.*/);
    });

    test("saving one shows the model and endpoint on its detail page", async ({ page }, testInfo) => {
        await page.goto("./add");
        await login(page);
        await selectMonitorType(page, "llm");

        await page.getByTestId("friendly-name-input").fill("Local inference");
        await page.getByTestId("url-input").fill(CLOSED_ENDPOINT);
        await page.getByTestId("llm-model-input").fill("llama3.2");
        await page.getByTestId("llm-prompt-input").fill("Reply with the single word: ok");
        await page.getByTestId("keyword-input").fill("ok");
        await page.getByTestId("llm-max-latency-input").fill("5000");

        await page.getByTestId("save-button").click();

        // The detail page is where the type's target is rendered; before the
        // type had a branch there it showed an empty line.
        const target = page.getByTestId("llm-target");
        await expect(target).toBeVisible();
        await expect(target).toContainText("llama3.2");
        await expect(target).toContainText("127.0.0.1:1");

        await screenshot(testInfo, page);
    });

    test("an endpoint the URL policy refuses is reported, not stored silently", async ({ page }, testInfo) => {
        await page.goto("./add");
        await login(page);
        await selectMonitorType(page, "llm");

        await page.getByTestId("friendly-name-input").fill("Plain http to the internet");
        // Allowed by the field pattern, refused by the policy that sends the key.
        await page.getByTestId("url-input").fill("http://example.com/v1/chat/completions");
        await page.getByTestId("llm-model-input").fill("gpt-4o-mini");
        await page.getByTestId("save-button").click();

        // Saving succeeds; the endpoint is rejected when the check runs, so the
        // monitor reports why rather than appearing healthy.
        await expect(page.getByTestId("llm-target")).toBeVisible();
        await expect(page.getByText(/must use HTTPS/i).first()).toBeVisible({ timeout: 30000 });

        await screenshot(testInfo, page);
    });
});
