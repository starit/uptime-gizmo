const { describe, test, mock } = require("node:test");
const assert = require("node:assert");
const StatusPage = require("../../server/model/status_page");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const {
    STATUS_PAGE_ALL_UP,
    STATUS_PAGE_ALL_DOWN,
    STATUS_PAGE_PARTIAL_DOWN,
    STATUS_PAGE_MAINTENANCE,
} = require("../../src/util");

dayjs.extend(utc);

describe("StatusPage", () => {
    describe("getStatusDescription()", () => {
        test("returns 'No Services' when status is -1", () => {
            const description = StatusPage.getStatusDescription(-1);
            assert.strictEqual(description, "No Services");
        });

        test("returns 'All Systems Operational' when all services are up", () => {
            const description = StatusPage.getStatusDescription(STATUS_PAGE_ALL_UP);
            assert.strictEqual(description, "All Systems Operational");
        });

        test("returns 'Partially Degraded Service' when some services are down", () => {
            const description = StatusPage.getStatusDescription(STATUS_PAGE_PARTIAL_DOWN);
            assert.strictEqual(description, "Partially Degraded Service");
        });

        test("returns 'Degraded Service' when all services are down", () => {
            const description = StatusPage.getStatusDescription(STATUS_PAGE_ALL_DOWN);
            assert.strictEqual(description, "Degraded Service");
        });

        test("returns 'Under maintenance' when status page is in maintenance", () => {
            const description = StatusPage.getStatusDescription(STATUS_PAGE_MAINTENANCE);
            assert.strictEqual(description, "Under maintenance");
        });

        test("returns '?' for unknown status values", () => {
            const description = StatusPage.getStatusDescription(999);
            assert.strictEqual(description, "?");
        });
    });

    describe("normalizeLogoSize()", () => {
        test("keeps allowed sizes", () => {
            assert.strictEqual(StatusPage.normalizeLogoSize("sm"), "sm");
            assert.strictEqual(StatusPage.normalizeLogoSize("md"), "md");
            assert.strictEqual(StatusPage.normalizeLogoSize("lg"), "lg");
        });

        test("falls back to medium, then to the supplied stored value", () => {
            assert.strictEqual(StatusPage.normalizeLogoSize(undefined), "md");
            assert.strictEqual(StatusPage.normalizeLogoSize("huge"), "md");
            assert.strictEqual(StatusPage.normalizeLogoSize("huge", "sm"), "sm");
            assert.strictEqual(StatusPage.normalizeLogoSize("huge", "nope"), "md");
        });
    });

    describe("normalizeLogoPosition()", () => {
        test("keeps allowed positions", () => {
            assert.strictEqual(StatusPage.normalizeLogoPosition("left"), "left");
            assert.strictEqual(StatusPage.normalizeLogoPosition("above"), "above");
            assert.strictEqual(StatusPage.normalizeLogoPosition("hidden"), "hidden");
        });

        test("falls back to left, then to the supplied stored value", () => {
            assert.strictEqual(StatusPage.normalizeLogoPosition(undefined), "left");
            assert.strictEqual(StatusPage.normalizeLogoPosition("center"), "left");
            assert.strictEqual(StatusPage.normalizeLogoPosition("center", "above"), "above");
            assert.strictEqual(StatusPage.normalizeLogoPosition("center", "nope"), "left");
        });
    });

    describe("normalizeTitleSize()", () => {
        test("keeps allowed sizes", () => {
            assert.strictEqual(StatusPage.normalizeTitleSize("sm"), "sm");
            assert.strictEqual(StatusPage.normalizeTitleSize("md"), "md");
            assert.strictEqual(StatusPage.normalizeTitleSize("lg"), "lg");
        });

        test("falls back to medium, then to the supplied stored value", () => {
            assert.strictEqual(StatusPage.normalizeTitleSize(undefined), "md");
            assert.strictEqual(StatusPage.normalizeTitleSize("huge"), "md");
            assert.strictEqual(StatusPage.normalizeTitleSize("huge", "sm"), "sm");
            assert.strictEqual(StatusPage.normalizeTitleSize("huge", "nope"), "md");
        });
    });

    describe("normalizeTitleFont()", () => {
        test("keeps allowed typefaces", () => {
            assert.strictEqual(StatusPage.normalizeTitleFont("sans"), "sans");
            assert.strictEqual(StatusPage.normalizeTitleFont("serif"), "serif");
            assert.strictEqual(StatusPage.normalizeTitleFont("mono"), "mono");
            assert.strictEqual(StatusPage.normalizeTitleFont("display"), "display");
        });

        test("falls back to sans, then to the supplied stored value", () => {
            assert.strictEqual(StatusPage.normalizeTitleFont(undefined), "sans");
            assert.strictEqual(StatusPage.normalizeTitleFont("comic"), "sans");
            assert.strictEqual(StatusPage.normalizeTitleFont("comic", "serif"), "serif");
            assert.strictEqual(StatusPage.normalizeTitleFont("comic", "nope"), "sans");
        });
    });

    describe("normalizeFont()", () => {
        test("is the page typeface, shared by title and body", () => {
            assert.strictEqual(StatusPage.normalizeFont("serif"), "serif");
            assert.strictEqual(StatusPage.FONTS, StatusPage.TITLE_FONTS);
        });
    });

    describe("normalizeTextSize()", () => {
        test("keeps allowed sizes", () => {
            assert.strictEqual(StatusPage.normalizeTextSize("sm"), "sm");
            assert.strictEqual(StatusPage.normalizeTextSize("md"), "md");
            assert.strictEqual(StatusPage.normalizeTextSize("lg"), "lg");
        });

        test("falls back to medium, then to the supplied stored value", () => {
            assert.strictEqual(StatusPage.normalizeTextSize(undefined), "md");
            assert.strictEqual(StatusPage.normalizeTextSize("huge"), "md");
            assert.strictEqual(StatusPage.normalizeTextSize("huge", "sm"), "sm");
            assert.strictEqual(StatusPage.normalizeTextSize("huge", "nope"), "md");
        });
    });

    describe("renderRSS()", () => {
        const MOCK_FEED_URL = "http://localhost:3001/status/test";

        test("pubDate uses UTC timezone for heartbeat.time without timezone info", async () => {
            const mockStatusPage = {
                title: "Test Status Page",
            };

            const mockIncidents = [
                {
                    title: "Test Monitor",
                    content: "Test content",
                    id: 1,
                    createdDate: "2026-05-21 15:07:35.600",
                },
            ];

            const mockHeartbeats = [
                {
                    name: "Test Monitor",
                    monitorID: 1,
                    time: "2026-01-24 13:16:25.400",
                },
            ];

            mock.method(StatusPage, "getRSSPageData", async () => ({
                incidents: mockIncidents,
                heartbeats: mockHeartbeats,
                statusDescription: "All Systems Operational",
            }));

            try {
                const rss = await StatusPage.renderRSS(mockStatusPage, MOCK_FEED_URL);

                assert.ok(rss.includes("<pubDate>Sat, 24 Jan 2026 13:16:25 GMT</pubDate>"));
            } finally {
                mock.restoreAll();
            }
        });
    });
});
