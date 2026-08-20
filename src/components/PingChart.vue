<template>
    <div>
        <!--
            A segmented control instead of a dropdown floated over the plot. Five
            ranges is few enough to show at once, so switching costs one click
            rather than two, and the current range is readable without opening
            anything.
        -->
        <div class="chart-toolbar">
            <div class="gizmo-action-group chart-period" role="group" :aria-label="$t('chartPeriodLabel')">
                <template v-for="(item, key) in chartPeriodOptions" :key="key">
                    <input
                        :id="`chart-period-${monitorId}-${key}`"
                        v-model="chartPeriodHrs"
                        type="radio"
                        class="gizmo-choice-input"
                        :name="`chart-period-${monitorId}`"
                        :value="String(key)"
                    />
                    <label
                        class="gizmo-native-button gizmo-native-button--sm gizmo-native-button--light"
                        :for="`chart-period-${monitorId}-${key}`"
                    >
                        {{ item }}
                    </label>
                </template>
            </div>
        </div>

        <div class="chart-wrapper" :class="{ loading: loading }">
            <Line :data="chartData" :options="chartOptions" />
            <!-- The plot used to blur itself while fetching, which read as a
                 rendering fault rather than as work in progress. -->
            <div v-if="loading" class="chart-loading">
                <GizmoLoadingIndicator>{{ $t("Loading") }}</GizmoLoadingIndicator>
            </div>
        </div>
    </div>
</template>

<script lang="js">
import {
    BarController,
    BarElement,
    Chart,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    TimeScale,
    Tooltip,
    Legend,
} from "chart.js";
import "chartjs-adapter-dayjs-4";
import { Line } from "vue-chartjs";
import { UP, DOWN, PENDING, MAINTENANCE } from "../util.ts";
import GizmoLoadingIndicator from "./gizmo/GizmoLoadingIndicator.vue";

/* The chart draws on a canvas, so it cannot inherit the page's type. */
const CHART_FONT = {
    family: "'IBM Plex Sans', 'Noto Sans', sans-serif",
    size: 11,
};

Chart.register(
    LineController,
    BarController,
    LineElement,
    PointElement,
    TimeScale,
    BarElement,
    LinearScale,
    Tooltip,
    Filler,
    Legend
);

export default {
    components: { GizmoLoadingIndicator, Line },
    props: {
        /** ID of monitor */
        monitorId: {
            type: Number,
            required: true,
        },
    },
    data() {
        return {
            loading: false,

            // Time period for the chart to display, in hours
            // Initial value is 0 as a workaround for triggering a data fetch on created()
            chartPeriodHrs: "0",

            chartPeriodOptions: {
                0: this.$t("recent"),
                3: "3h",
                6: "6h",
                24: "24h",
                168: "1w",
            },

            chartRawData: null,
            chartDataFetchInterval: null,
        };
    },
    computed: {
        /**
         * Chart colours, read from the live token values rather than branched on
         * the theme name, so a custom themed.js theme repaints the plot too.
         * @returns {object} resolved canvas colours
         */
        chartPalette() {
            // Touched so the palette recomputes when either changes.
            void this.$root.theme;
            void this.$root.userTheme;

            return {
                grid: this.canvasColor("--color-border"),
                text: this.canvasColor("--color-text"),
                muted: this.canvasColor("--color-text-muted"),
                subtle: this.canvasColor("--color-text-subtle"),
                surface: this.canvasColor("--color-surface"),
            };
        },

        chartOptions() {
            const palette = this.chartPalette;

            return {
                responsive: true,
                maintainAspectRatio: false,
                onResize: (chart) => {
                    chart.canvas.parentNode.style.position = "relative";
                    if (screen.width < 576) {
                        chart.canvas.parentNode.style.height = "275px";
                    } else if (screen.width < 768) {
                        chart.canvas.parentNode.style.height = "320px";
                    } else if (screen.width < 992) {
                        chart.canvas.parentNode.style.height = "300px";
                    } else {
                        chart.canvas.parentNode.style.height = "250px";
                    }
                },
                layout: {
                    padding: {
                        left: 0,
                        right: 8,
                        top: 4,
                        bottom: 0,
                    },
                },

                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false,
                },

                elements: {
                    point: {
                        // Hide points on chart unless mouse-over
                        radius: 0,
                        hitRadius: 100,
                        hoverRadius: 4,
                        hoverBorderWidth: 0,
                    },
                    line: {
                        borderWidth: 2,
                    },
                },
                scales: {
                    x: {
                        type: "time",
                        time: {
                            minUnit: "minute",
                            round: "second",
                            tooltipFormat: "YYYY-MM-DD HH:mm:ss",
                            displayFormats: {
                                minute: "HH:mm",
                                hour: "MM-DD HH:mm",
                            },
                        },
                        ticks: {
                            sampleSize: 3,
                            maxRotation: 0,
                            autoSkipPadding: 30,
                            padding: 6,
                            color: palette.subtle,
                            font: CHART_FONT,
                        },
                        // Time is already read left to right; vertical rules only
                        // add ink. The horizontal ones stay, because they are what
                        // makes a latency figure readable off the axis.
                        border: { display: false },
                        grid: {
                            display: false,
                            offset: false,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        offset: false,
                        border: { display: false },
                        grid: {
                            color: palette.grid,
                            drawTicks: false,
                        },
                        // The unit rides on the ticks instead of a rotated axis
                        // title, which cost a column of width to say one word.
                        ticks: {
                            color: palette.subtle,
                            font: CHART_FONT,
                            padding: 8,
                            maxTicksLimit: 5,
                            callback: (value) => `${new Intl.NumberFormat().format(value)} ms`,
                        },
                    },
                    y1: {
                        display: false,
                        position: "right",
                        grid: {
                            drawOnChartArea: false,
                        },
                        min: 0,
                        max: 1,
                        offset: false,
                    },
                },
                bounds: "ticks",
                plugins: {
                    tooltip: {
                        mode: "nearest",
                        intersect: false,
                        padding: 10,
                        cornerRadius: 8,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        boxPadding: 4,
                        backgroundColor: palette.surface,
                        borderColor: palette.grid,
                        borderWidth: 1,
                        bodyColor: palette.muted,
                        titleColor: palette.text,
                        titleFont: { ...CHART_FONT, weight: 600 },
                        bodyFont: CHART_FONT,
                        // No longer rely solely on datasetIndex === 0; we want to hide tooltips only for the bars
                        filter: function (tooltipItem) {
                            const ds = tooltipItem?.chart?.data?.datasets?.[tooltipItem.datasetIndex];
                            return ds && ds.type !== "bar";
                        },
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label;
                                return `${label} ${new Intl.NumberFormat().format(context.parsed.y)} ms`;
                            },
                        },
                    },
                    legend: {
                        // Enable the legend and display only the non-bar datasets (the lines)
                        display: true,
                        position: "top",
                        align: "start",
                        // Indicates that the legend is clickable (cursor pointer)
                        onHover: function (event, legendItem, legend) {
                            if (legend && legend.chart && legend.chart.canvas) {
                                legend.chart.canvas.style.cursor = "pointer";
                            }
                        },
                        onLeave: function (event, legendItem, legend) {
                            if (legend && legend.chart && legend.chart.canvas) {
                                legend.chart.canvas.style.cursor = "";
                            }
                        },
                        labels: {
                            color: palette.muted,
                            font: CHART_FONT,
                            usePointStyle: true,
                            pointStyle: "circle",
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 12,
                            // Filter to display only the lines in the legend
                            filter: function (legendItem, data) {
                                const ds = data.datasets[legendItem.datasetIndex];
                                return ds && ds.type !== "bar";
                            },
                        },
                    },
                },
            };
        },
        chartData() {
            if (this.chartPeriodHrs === "0") {
                return this.getChartDatapointsFromHeartbeatList();
            } else {
                return this.getChartDatapointsFromStats();
            }
        },
    },
    watch: {
        // Update chart data when the selected chart period changes
        chartPeriodHrs: function (newPeriod) {
            if (this.chartDataFetchInterval) {
                clearInterval(this.chartDataFetchInterval);
                this.chartDataFetchInterval = null;
            }

            // eslint-disable-next-line eqeqeq
            if (newPeriod == "0") {
                this.heartbeatList = null;
                this.$root.storage()["chart-period"] = newPeriod;
            } else {
                this.loading = true;

                let period;
                try {
                    period = parseInt(newPeriod);
                } catch (e) {
                    // Invalid period
                    period = 24;
                }

                this.$root.getMonitorChartData(this.monitorId, period, (res) => {
                    if (!res.ok) {
                        this.$root.toastError(res.msg);
                    } else {
                        this.chartRawData = res.data;
                        this.$root.storage()["chart-period"] = newPeriod;
                    }
                    this.loading = false;
                });

                this.chartDataFetchInterval = setInterval(
                    () => {
                        this.$root.getMonitorChartData(this.monitorId, period, (res) => {
                            if (res.ok) {
                                this.chartRawData = res.data;
                            }
                        });
                    },
                    5 * 60 * 1000
                );
            }
        },
    },
    created() {
        // Load chart period from storage if saved
        let period = this.$root.storage()["chart-period"];
        if (period != null) {
            // Has this ever been not a string?
            if (typeof period !== "string") {
                period = period.toString();
            }
            this.chartPeriodHrs = period;
        } else {
            this.chartPeriodHrs = "0";
        }
    },
    beforeUnmount() {
        if (this.chartDataFetchInterval) {
            clearInterval(this.chartDataFetchInterval);
        }
    },
    methods: {
        // Get color of bar chart for this datapoint
        getBarColorForDatapoint(datapoint) {
            if (datapoint.maintenance != null) {
                // Target is in maintenance
                return this.canvasColor("--status-maintenance", 0.41);
            } else if (datapoint.down === 0) {
                // Target is up, no need to display a bar
                return "transparent";
            } else if (datapoint.up === 0) {
                // Target is down
                return this.canvasColor("--status-down", 0.41);
            } else {
                // Show degraded status for a mixed period.
                return this.canvasColor("--status-degraded", 0.41);
            }
        },
        /**
         * Resolve a theme token to a canvas-compatible CSS color.
         * @param {string} token CSS custom property name
         * @param {number} opacity Opacity between 0 and 1
         * @returns {string} CSS color
         */
        canvasColor(token, opacity = 1) {
            const color = getComputedStyle(document.body).getPropertyValue(token).trim();

            if (opacity === 1 || !color.startsWith("#")) {
                return color;
            }

            const hex = color.slice(1);
            const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
            const red = Number.parseInt(normalized.slice(0, 2), 16);
            const green = Number.parseInt(normalized.slice(2, 4), 16);
            const blue = Number.parseInt(normalized.slice(4, 6), 16);

            return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
        },
        // push datapoint to chartData
        pushDatapoint(datapoint, avgPingData, minPingData, maxPingData, downData, colorData) {
            const x = this.$root.unixToDateTime(datapoint.timestamp);

            // Show ping values if it was up in this period
            avgPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.avgPing : null,
            });
            minPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.minPing : null,
            });
            maxPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.maxPing : null,
            });
            downData.push({
                x,
                y: datapoint.down + (datapoint.maintenance || 0),
            });

            colorData.push(this.getBarColorForDatapoint(datapoint));
        },
        // get the average of a set of datapoints
        getAverage(datapoints) {
            const totalUp = datapoints.reduce((total, current) => total + current.up, 0);
            const totalDown = datapoints.reduce((total, current) => total + current.down, 0);
            const totalMaintenance = datapoints.reduce((total, current) => total + (current.maintenance || 0), 0);
            const totalPing = datapoints.reduce((total, current) => total + current.avgPing * current.up, 0);
            const minPing = datapoints.reduce((min, current) => Math.min(min, current.minPing), Infinity);
            const maxPing = datapoints.reduce((max, current) => Math.max(max, current.maxPing), 0);

            // Find the middle timestamp to use
            let midpoint = Math.floor(datapoints.length / 2);

            return {
                timestamp: datapoints[midpoint].timestamp,
                up: totalUp,
                down: totalDown,
                maintenance: totalMaintenance > 0 ? totalMaintenance : undefined,
                avgPing: totalUp > 0 ? totalPing / totalUp : 0,
                minPing,
                maxPing,
            };
        },
        getChartDatapointsFromHeartbeatList() {
            // Render chart using heartbeatList
            let lastHeartbeatTime;
            const monitorInterval = this.$root.monitorList[this.monitorId]?.interval;
            let pingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let downData = []; // Down Data for Bar Chart, y-axis is 1 if target is down (red color), under maintenance (blue color) or pending (orange color), 0 if target is up
            let colorData = []; // Color Data for Bar Chart

            let heartbeatList =
                (this.monitorId in this.$root.heartbeatList && this.$root.heartbeatList[this.monitorId]) || [];

            for (const beat of heartbeatList) {
                const beatTime = this.$root.toDayjs(beat.time);
                const x = beatTime.format("YYYY-MM-DD HH:mm:ss");

                // Insert empty datapoint to separate big gaps
                if (lastHeartbeatTime && monitorInterval) {
                    const diff = Math.abs(beatTime.diff(lastHeartbeatTime));
                    if (diff > monitorInterval * 1000 * 10) {
                        // Big gap detected
                        const gapX = [
                            lastHeartbeatTime.add(monitorInterval, "second").format("YYYY-MM-DD HH:mm:ss"),
                            beatTime.subtract(monitorInterval, "second").format("YYYY-MM-DD HH:mm:ss"),
                        ];

                        for (const x of gapX) {
                            pingData.push({
                                x,
                                y: null,
                            });
                            downData.push({
                                x,
                                y: null,
                            });
                            colorData.push("transparent");
                        }
                    }
                }

                pingData.push({
                    x,
                    y: beat.status === UP ? beat.ping : null,
                });
                downData.push({
                    x,
                    y: beat.status === DOWN || beat.status === MAINTENANCE || beat.status === PENDING ? 1 : 0,
                });
                switch (beat.status) {
                    case MAINTENANCE:
                        colorData.push(this.canvasColor("--status-maintenance", 0.41));
                        break;
                    case PENDING:
                        colorData.push(this.canvasColor("--status-degraded", 0.41));
                        break;
                    default:
                        colorData.push(this.canvasColor("--status-down", 0.41));
                }

                lastHeartbeatTime = beatTime;
            }

            return {
                datasets: [
                    {
                        // Line Chart
                        data: pingData,
                        fill: "origin",
                        tension: 0.2,
                        borderColor: this.canvasColor("--chart-ping-average"),
                        backgroundColor: this.canvasColor("--chart-ping-average", 0.22),
                        yAxisID: "y",
                        label: this.$t("avgPing"),
                    },
                    {
                        // Bar Chart
                        type: "bar",
                        data: downData,
                        borderColor: "transparent",
                        backgroundColor: colorData,
                        yAxisID: "y1",
                        barThickness: "flex",
                        barPercentage: 1,
                        categoryPercentage: 1,
                        inflateAmount: 0.05,
                        label: "status",
                    },
                ],
            };
        },
        getChartDatapointsFromStats() {
            // Render chart using UptimeCalculator data
            let lastHeartbeatTime;
            const monitorInterval = this.$root.monitorList[this.monitorId]?.interval;

            let avgPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let minPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let maxPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let downData = []; // Down Data for Bar Chart, y-axis is number of down datapoints in this period
            let colorData = []; // Color Data for Bar Chart

            const period = parseInt(this.chartPeriodHrs);
            let aggregatePoints = period > 6 ? 12 : 4;

            let aggregateBuffer = [];

            if (this.chartRawData) {
                for (const datapoint of this.chartRawData) {
                    // Empty datapoints are ignored
                    if (datapoint.up === 0 && datapoint.down === 0 && datapoint.maintenance === 0) {
                        continue;
                    }

                    const beatTime = this.$root.unixToDayjs(datapoint.timestamp);

                    // Insert empty datapoint to separate big gaps
                    if (lastHeartbeatTime && monitorInterval) {
                        const diff = Math.abs(beatTime.diff(lastHeartbeatTime));
                        const oneSecond = 1000;
                        const oneMinute = oneSecond * 60;
                        const oneHour = oneMinute * 60;
                        if (
                            (period <= 24 && diff > Math.max(oneMinute * 10, monitorInterval * oneSecond * 10)) ||
                            (period > 24 && diff > Math.max(oneHour * 10, monitorInterval * oneSecond * 10))
                        ) {
                            // Big gap detected
                            // Clear the aggregate buffer
                            if (aggregateBuffer.length > 0) {
                                const average = this.getAverage(aggregateBuffer);
                                this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                                aggregateBuffer = [];
                            }

                            const gapX = [
                                lastHeartbeatTime.subtract(monitorInterval, "second").format("YYYY-MM-DD HH:mm:ss"),
                                this.$root.unixToDateTime(datapoint.timestamp + 60),
                            ];

                            for (const x of gapX) {
                                avgPingData.push({
                                    x,
                                    y: null,
                                });
                                minPingData.push({
                                    x,
                                    y: null,
                                });
                                maxPingData.push({
                                    x,
                                    y: null,
                                });
                                downData.push({
                                    x,
                                    y: null,
                                });
                                colorData.push("transparent");
                            }
                        }
                    }

                    if (datapoint.up > 0 && this.chartRawData.length > aggregatePoints * 2) {
                        // Aggregate Up data using a sliding window
                        aggregateBuffer.push(datapoint);

                        if (aggregateBuffer.length === aggregatePoints) {
                            const average = this.getAverage(aggregateBuffer);
                            this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                            // Remove the first half of the buffer
                            aggregateBuffer = aggregateBuffer.slice(Math.floor(aggregatePoints / 2));
                        }
                    } else {
                        // datapoint is fully down or too few datapoints, no need to aggregate
                        // Clear the aggregate buffer
                        if (aggregateBuffer.length > 0) {
                            const average = this.getAverage(aggregateBuffer);
                            this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                            aggregateBuffer = [];
                        }

                        this.pushDatapoint(datapoint, avgPingData, minPingData, maxPingData, downData, colorData);
                    }

                    lastHeartbeatTime = beatTime;
                }
                // Clear the aggregate buffer if there are still datapoints
                if (aggregateBuffer.length > 0) {
                    const average = this.getAverage(aggregateBuffer);
                    this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                    aggregateBuffer = [];
                }
            }

            return {
                datasets: [
                    {
                        // minimum ping chart
                        data: minPingData,
                        fill: "origin",
                        tension: 0.2,
                        borderColor: this.canvasColor("--chart-ping-min"),
                        backgroundColor: this.canvasColor("--chart-ping-min", 0.08),
                        yAxisID: "y",
                        label: this.$t("minPing"),
                    },
                    {
                        // average ping chart
                        data: avgPingData,
                        fill: "origin",
                        tension: 0.2,
                        borderColor: this.canvasColor("--chart-ping-average"),
                        backgroundColor: this.canvasColor("--chart-ping-average", 0.03),
                        yAxisID: "y",
                        label: this.$t("avgPing"),
                    },
                    {
                        // maximum ping chart
                        data: maxPingData,
                        fill: "origin",
                        tension: 0.2,
                        borderColor: this.canvasColor("--chart-ping-max"),
                        backgroundColor: this.canvasColor("--chart-ping-max", 0.08),
                        yAxisID: "y",
                        label: this.$t("maxPing"),
                    },
                    {
                        // Bar Chart
                        type: "bar",
                        data: downData,
                        borderColor: "transparent",
                        backgroundColor: colorData,
                        yAxisID: "y1",
                        barThickness: "flex",
                        barPercentage: 1,
                        categoryPercentage: 1,
                        inflateAmount: 0.05,
                        label: "status",
                    },
                ],
            };
        },
    },
};
</script>

<style lang="scss" scoped>
.chart-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
}

.chart-period label {
    min-width: 3rem;
    font-variant-numeric: tabular-nums;
}

.chart-wrapper {
    position: relative;
    margin-bottom: 0.5em;

    &.loading {
        // Dimmed, not blurred: the plot stays legible while the next range loads.
        opacity: 0.45;
    }
}

.chart-loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
}
</style>
