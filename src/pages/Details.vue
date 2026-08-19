<template>
    <transition name="slide-fade" appear>
        <div v-if="monitor" class="monitor-detail">
            <router-link v-if="group !== ''" :to="monitorURL(monitor.parent)">
                {{ group }}
            </router-link>
            <h1 class="monitor-detail-title">
                {{ monitor.name }}
                <div class="monitor-id">
                    <div class="hash">#</div>
                    <div>{{ monitor.id }}</div>
                </div>
            </h1>
            <!-- eslint-disable-next-line vue/no-v-html-->
            <p v-if="monitor.description" v-html="descriptionHTML"></p>
            <div class="tw-flex">
                <div class="tags">
                    <Tag
                        v-for="tag in monitor.tags"
                        :key="tag.id"
                        :item="tag"
                        :size="'sm'"
                        :scrollable="true"
                        :constrained="true"
                    />
                </div>
            </div>
            <p class="url">
                <a
                    v-if="
                        monitor.type === 'http' ||
                        monitor.type === 'keyword' ||
                        monitor.type === 'json-query' ||
                        monitor.type === 'real-browser' ||
                        monitor.type === 'websocket-upgrade'
                    "
                    :href="monitor.url"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {{ filterPassword(monitor.url) }}
                </a>
                <span v-if="monitor.type === 'port'">TCP Port {{ monitor.hostname }}:{{ monitor.port }}</span>
                <span v-if="monitor.type === 'ping'">Ping: {{ monitor.hostname }}</span>
                <span v-if="monitor.type === 'globalping'">
                    <a v-if="monitor.subtype === 'http'" :href="monitor.url" target="_blank" rel="noopener noreferrer">
                        {{ filterPassword(monitor.url) }}
                    </a>
                    <span v-if="monitor.hostname">{{ monitor.hostname }}</span>
                    <br />
                    <span>{{ $t("Location") }}:</span>
                    <span class="keyword">{{ monitor.location }}</span>
                    <br />
                    <span v-if="monitor.subtype === 'dns'">
                        [{{ monitor.dns_resolve_type }}]
                        <br />
                        <span>{{ $t("Last Result") }}:</span>
                        <span class="keyword">{{ monitor.dns_last_result }}</span>
                    </span>
                </span>
                <span v-if="monitor.type === 'keyword'">
                    <br />
                    <span>{{ $t("Keyword") }}:</span>
                    <span class="keyword">{{ monitor.keyword }}</span>
                    <span v-if="monitor.invertKeyword" alt="Inverted keyword" class="keyword-inverted">↧</span>
                </span>
                <span v-if="monitor.type === 'json-query'">
                    <br />
                    <span>{{ $t("Json Query") }}:</span>
                    <span class="keyword">{{ monitor.jsonPath }}</span>
                    <br />
                    <span>{{ $t("Expected Value") }}:</span>
                    <span class="keyword">{{ monitor.expectedValue }}</span>
                </span>
                <span v-if="monitor.type === 'dns'">
                    [{{ monitor.dns_resolve_type }}] {{ monitor.hostname }}
                    <br />
                    <span>{{ $t("Last Result") }}:</span>
                    <span class="keyword">{{ monitor.dns_last_result }}</span>
                </span>
                <span v-if="monitor.type === 'docker'">Docker container: {{ monitor.docker_container }}</span>
                <span v-if="monitor.type === 'gamedig'">
                    Gamedig - {{ monitor.game }}: {{ monitor.hostname }}:{{ monitor.port }}
                </span>
                <span v-if="monitor.type === 'grpc-keyword'">
                    gRPC - {{ filterPassword(monitor.grpcUrl) }}
                    <br />
                    <span>{{ $t("Keyword") }}:</span>
                    <span class="keyword">{{ monitor.keyword }}</span>
                </span>
                <span v-if="monitor.type === 'mongodb'">{{ filterPassword(monitor.databaseConnectionString) }}</span>
                <span v-if="monitor.type === 'mqtt'">
                    MQTT: {{ monitor.hostname }}:{{ monitor.port }}/{{ monitor.mqttTopic }}
                </span>
                <span v-if="monitor.type === 'mysql'">{{ filterPassword(monitor.databaseConnectionString) }}</span>
                <span v-if="monitor.type === 'oracledb'">
                    {{
                        $t("oracledbConnectionString", {
                            connectionString: filterPassword(monitor.databaseConnectionString),
                        })
                    }}
                </span>
                <span v-if="monitor.type === 'postgres'">{{ filterPassword(monitor.databaseConnectionString) }}</span>
                <span v-if="monitor.type === 'push'">
                    Push:
                    <a :href="pushURL" target="_blank" rel="noopener noreferrer">{{ pushURL }}</a>
                </span>
                <span v-if="monitor.type === 'radius'">Radius: {{ filterPassword(monitor.hostname) }}</span>
                <span v-if="monitor.type === 'redis'">{{ filterPassword(monitor.databaseConnectionString) }}</span>
                <span v-if="monitor.type === 'sqlserver'">
                    SQL Server: {{ filterPassword(monitor.databaseConnectionString) }}
                </span>
                <span v-if="monitor.type === 'steam'">
                    Steam Game Server: {{ monitor.hostname }}:{{ monitor.port }}
                </span>
            </p>

            <div class="functions monitor-detail-actions">
                <div class="gizmo-action-group" role="group">
                    <button v-if="monitor.active" class="gizmo-native-button gizmo-native-button--secondary" @click="pauseDialog">
                        <font-awesome-icon icon="pause" />
                        {{ $t("Pause") }}
                    </button>
                    <button
                        v-if="!monitor.active"
                        class="gizmo-native-button gizmo-native-button--primary"
                        :disabled="monitor.forceInactive"
                        @click="resumeMonitor"
                    >
                        <font-awesome-icon icon="play" />
                        {{ $t("Resume") }}
                    </button>
                    <router-link :to="'/edit/' + monitor.id" class="gizmo-native-button gizmo-native-button--secondary">
                        <font-awesome-icon icon="edit" />
                        {{ $t("Edit") }}
                    </router-link>
                    <router-link :to="'/clone/' + monitor.id" class="gizmo-native-button gizmo-native-button--secondary">
                        <font-awesome-icon icon="clone" />
                        {{ $t("Clone") }}
                    </router-link>
                    <button class="gizmo-native-button gizmo-native-button--secondary tw-text-status-down-fg" @click="deleteDialog">
                        <font-awesome-icon icon="trash" />
                        {{ $t("Delete") }}
                    </button>
                </div>
            </div>

            <div class="gizmo-workspace-panel detail-card detail-card-health">
                <div class="monitor-health-grid">
                    <div class="monitor-health-grid__timeline">
                        <HeartbeatBar :monitor-id="monitor.id" />
                        <span class="word">
                            {{ $t("checkEverySecond", [monitor.interval]) }} ({{
                                secondsToHumanReadableFormat(monitor.interval)
                            }})
                        </span>
                    </div>
                    <div class="monitor-health-grid__status tw-text-center">
                        <span
                            class="monitor-status"
                            :class="`gizmo-status--${statusTone}`"
                            data-testid="monitor-status"
                        >
                            {{ status.text }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Push Examples -->
            <div v-if="monitor.type === 'push'" class="gizmo-workspace-panel detail-card detail-card--spacious">
                <a href="#" @click="pushMonitor.showPushExamples = !pushMonitor.showPushExamples">
                    {{ $t("pushViewCode") }}
                </a>

                <transition name="slide-fade" appear>
                    <div v-if="pushMonitor.showPushExamples" class="tw-mt-3">
                        <select id="push-current-example" v-model="pushMonitor.currentExample" class="gizmo-native-control gizmo-native-select">
                            <optgroup :label="$t('programmingLanguages')">
                                <option value="csharp">C#</option>
                                <option value="go">Go</option>
                                <option value="java">Java</option>
                                <option value="javascript-fetch">JavaScript (fetch)</option>
                                <option value="php">PHP</option>
                                <option value="python">Python</option>
                                <option value="typescript-fetch">TypeScript (fetch)</option>
                            </optgroup>
                            <optgroup :label="$t('pushOthers')">
                                <option value="bash-curl">Bash (curl)</option>
                                <option value="powershell">PowerShell</option>
                                <option value="docker">Docker</option>
                            </optgroup>
                        </select>

                        <prism-editor
                            v-model="pushMonitor.code"
                            class="css-editor tw-mt-3"
                            :highlight="pushExampleHighlighter"
                            line-numbers
                            readonly
                        ></prism-editor>
                    </div>
                </transition>
            </div>

            <!-- Stats -->
            <div class="gizmo-workspace-panel tw-text-center stats detail-card detail-card--spacious">
                <div class="monitor-stat-grid">
                    <div
                        v-if="monitor.type !== 'group'"
                        class="monitor-stat"
                    >
                        <h4>{{ pingTitle() }}</h4>
                        <p class="tw-mb-0">({{ $t("Current") }})</p>
                        <span class="num">
                            <a href="#" @click.prevent="showPingChartBox = !showPingChartBox">
                                <CountUp :value="ping" />
                            </a>
                        </span>
                    </div>
                    <div
                        v-if="monitor.type !== 'group'"
                        class="monitor-stat"
                    >
                        <h4>{{ pingTitle(true) }}</h4>
                        <p class="tw-mb-0">({{ $t("hours", 24) }})</p>
                        <span class="num">
                            <CountUp :value="avgPing" />
                        </span>
                    </div>

                    <!-- Uptime (24-hour) -->
                    <div class="monitor-stat">
                        <h4>{{ $t("Uptime") }}</h4>
                        <p class="tw-mb-0">({{ $t("hours", 24) }})</p>
                        <span class="num">
                            <Uptime :monitor="monitor" type="24" />
                        </span>
                    </div>

                    <!-- Uptime (30-day) -->
                    <div class="monitor-stat">
                        <h4>{{ $t("Uptime") }}</h4>
                        <p class="tw-mb-0">({{ $t("days", 30) }})</p>
                        <span class="num">
                            <Uptime :monitor="monitor" type="720" />
                        </span>
                    </div>

                    <!-- Uptime (1-year) -->
                    <div class="monitor-stat">
                        <h4>{{ $t("Uptime") }}</h4>
                        <p class="tw-mb-0">({{ $t("years", 1) }})</p>
                        <span class="num">
                            <Uptime :monitor="monitor" type="1y" />
                        </span>
                    </div>

                    <div v-if="tlsInfo" class="monitor-stat">
                        <h4>{{ $t("Cert Exp.") }}</h4>
                        <p class="tw-mb-0">
                            (
                            <Datetime :value="tlsInfo.certInfo.validTo" date-only />
                            )
                        </p>
                        <span class="num">
                            <a href="#" @click.prevent="toggleCertInfoBox = !toggleCertInfoBox">
                                {{ $t("days", tlsInfo.certInfo.daysRemaining) }}
                            </a>
                            <font-awesome-icon
                                v-if="tlsInfo.hostnameMatchMonitorUrl === false"
                                class="cert-info-warn"
                                icon="exclamation-triangle"
                                :title="$t('certHostnameMismatch')"
                            />
                        </span>
                    </div>
                    <div v-if="domainInfo" class="monitor-stat">
                        <h4>{{ $t("labelDomainExpiry") }}</h4>
                        <p class="tw-mb-0">
                            (
                            <Datetime :value="domainInfo.expiresOn" date-only />
                            )
                        </p>
                        <span class="num">
                            {{ $t("days", domainInfo.daysRemaining) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Cert Info Box -->
            <transition name="slide-fade" appear>
                <div v-if="showCertInfoBox" class="gizmo-workspace-panel tw-text-center detail-card detail-card--spacious">
                    <certificate-info :certInfo="tlsInfo.certInfo" :valid="tlsInfo.valid" />
                </div>
            </transition>

            <!-- Ping Chart -->
            <div v-if="showPingChartBox" class="gizmo-workspace-panel tw-text-center ping-chart-wrapper detail-card detail-card--spacious">
                <PingChart :monitor-id="monitor.id" />
            </div>

            <!-- Screenshot -->
            <div v-if="monitor.type === 'real-browser'" class="gizmo-workspace-panel detail-card">
                <div class="monitor-screenshot-grid">
                    <div class="zoom-cursor">
                        <img
                            :src="screenshotURL"
                            style="width: 100%"
                            alt="screenshot of the website"
                            @click="showScreenshotDialog"
                        />
                    </div>
                    <ScreenshotDialog ref="screenshotDialog" :imageURL="screenshotURL" />
                </div>
            </div>

            <div class="gizmo-workspace-panel detail-table-panel detail-card">
                <GizmoMenu align="end" class="dropdown-clear-data">
                    <template #trigger>
                        <button class="gizmo-native-button gizmo-native-button--sm gizmo-native-button--danger-outline" type="button">
                            <font-awesome-icon icon="trash" />
                            {{ $t("Clear Data") }}
                        </button>
                    </template>
                    <GizmoMenuItem @select="clearEventsDialog">
                        {{ $t("Events") }}
                    </GizmoMenuItem>
                    <GizmoMenuItem @select="clearHeartbeatsDialog">
                        {{ $t("Heartbeats") }}
                    </GizmoMenuItem>
                </GizmoMenu>
                <table class="gizmo-data-table">
                    <thead>
                        <tr>
                            <th>{{ $t("Status") }}</th>
                            <th>{{ $t("DateTime") }}</th>
                            <th>{{ $t("Message") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(beat, index) in displayedRecords" :key="index" style="padding: 10px">
                            <td><Status :status="beat.status" /></td>
                            <td :class="{ 'tw-border-0': !beat.msg }">
                                <Datetime :value="beat.time" />
                            </td>
                            <td class="tw-border-0">{{ beat.msg }}</td>
                        </tr>

                        <tr v-if="importantHeartBeatListLength === 0">
                            <td colspan="3">
                                {{ $t("No important events") }}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="tw-flex tw-justify-center">
                    <pagination
                        v-model="page"
                        :records="importantHeartBeatListLength"
                        :per-page="perPage"
                        :options="paginationConfig"
                    />
                </div>
            </div>

            <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseMonitor">
                {{ $t("pauseMonitorMsg") }}
            </Confirm>

            <Confirm
                ref="confirmDelete"
                btn-style="btn-danger"
                :yes-text="$t('Yes')"
                :no-text="$t('No')"
                @yes="deleteMonitor"
            >
                <div v-if="monitor && monitor.type === 'group'">
                    <div>{{ $t("deleteGroupMsg") }}</div>
                    <div v-if="hasChildren" class="gizmo-native-check">
                        <input
                            id="delete-children-checkbox"
                            v-model="deleteChildrenMonitors"
                            class="gizmo-native-check__input"
                            type="checkbox"
                        />
                        <label class="gizmo-native-check__label" for="delete-children-checkbox">
                            {{ $t("deleteChildrenMonitors", childrenCount) }}
                        </label>
                    </div>
                </div>
                <div v-else>
                    {{ $t("deleteMonitorMsg") }}
                </div>
            </Confirm>

            <Confirm
                ref="confirmClearEvents"
                btn-style="btn-danger"
                :yes-text="$t('Yes')"
                :no-text="$t('No')"
                @yes="clearEvents"
            >
                {{ $t("clearEventsMsg") }}
            </Confirm>

            <Confirm
                ref="confirmClearHeartbeats"
                btn-style="btn-danger"
                :yes-text="$t('Yes')"
                :no-text="$t('No')"
                @yes="clearHeartbeats"
            >
                {{ $t("clearHeartbeatsMsg") }}
            </Confirm>
        </div>
    </transition>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { useToast } from "vue-toastification";
const toast = useToast();
import Confirm from "../components/Confirm.vue";
import HeartbeatBar from "../components/HeartbeatBar.vue";
import Status from "../components/Status.vue";
import Datetime from "../components/Datetime.vue";
import CountUp from "../components/CountUp.vue";
import Uptime from "../components/Uptime.vue";
import Pagination from "v-pagination-3";
const PingChart = defineAsyncComponent(() => import("../components/PingChart.vue"));
import Tag from "../components/Tag.vue";
import CertificateInfo from "../components/CertificateInfo.vue";
import { getMonitorRelativeURL } from "../util.ts";
import { URL } from "whatwg-url";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { getResBaseURL, timeDurationFormatter } from "../util-frontend";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-css";
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css";
import ScreenshotDialog from "../components/ScreenshotDialog.vue";
import GizmoMenu from "../components/gizmo/GizmoMenu.vue";
import GizmoMenuItem from "../components/gizmo/GizmoMenuItem.vue";

export default {
    components: {
        GizmoMenu,
        GizmoMenuItem,
        Uptime,
        CountUp,
        Datetime,
        HeartbeatBar,
        Confirm,
        Status,
        Pagination,
        PingChart,
        Tag,
        CertificateInfo,
        PrismEditor,
        ScreenshotDialog,
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            heartBeatList: [],
            toggleCertInfoBox: false,
            showPingChartBox: true,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            cacheTime: Date.now(),
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            pushMonitor: {
                showPushExamples: false,
                currentExample: "javascript-fetch",
                code: "",
            },
            deleteChildrenMonitors: false,
        };
    },
    computed: {
        monitor() {
            let id = this.$route.params.id;
            return this.$root.monitorList[id];
        },

        /**
         * Get the count of children monitors for this group
         * @returns {number} Number of children monitors
         */
        childrenCount() {
            if (!this.monitor || this.monitor.type !== "group") {
                return 0;
            }
            const children = Object.values(this.$root.monitorList).filter((m) => m.parent === this.monitor.id);
            return children.length;
        },

        /**
         * Check if the monitor is a group and has children
         * @returns {boolean} True if monitor is a group with children
         */
        hasChildren() {
            return this.childrenCount > 0;
        },

        lastHeartBeat() {
            // Also trigger screenshot refresh here
            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.cacheTime = Date.now();

            if (this.monitor.id in this.$root.lastHeartbeatList && this.$root.lastHeartbeatList[this.monitor.id]) {
                return this.$root.lastHeartbeatList[this.monitor.id];
            }

            return {
                status: -1,
            };
        },

        ping() {
            if (this.lastHeartBeat.ping || this.lastHeartBeat.ping === 0) {
                return this.lastHeartBeat.ping;
            }

            return this.$t("notAvailableShort");
        },

        avgPing() {
            if (this.$root.avgPingList[this.monitor.id] || this.$root.avgPingList[this.monitor.id] === 0) {
                return this.$root.avgPingList[this.monitor.id];
            }

            return this.$t("notAvailableShort");
        },

        status() {
            if (this.$root.statusList[this.monitor.id]) {
                return this.$root.statusList[this.monitor.id];
            }

            return {};
        },

        statusTone() {
            return {
                primary: "up",
                danger: "down",
                warning: "degraded",
                maintenance: "maintenance",
                secondary: "unknown",
            }[this.status.color] || "unknown";
        },

        tlsInfo() {
            // Add: this.$root.tlsInfoList[this.monitor.id].certInfo
            // Fix: TypeError: Cannot read properties of undefined (reading 'validTo')
            // Reason: TLS Info object format is changed in 1.8.0, if for some reason, it cannot connect to the site after update to 1.8.0, the object is still in the old format.
            if (this.$root.tlsInfoList[this.monitor.id] && this.$root.tlsInfoList[this.monitor.id].certInfo) {
                return this.$root.tlsInfoList[this.monitor.id];
            }

            return null;
        },

        domainInfo() {
            return this.$root.domainInfoList[this.monitor.id] || null;
        },

        showCertInfoBox() {
            return this.tlsInfo != null && this.toggleCertInfoBox;
        },

        group() {
            return this.monitor.path.slice(0, -1).join(" / ");
        },

        pushURL() {
            return this.$root.baseURL + "/api/push/" + this.monitor.pushToken + "?status=up&msg=OK&ping=";
        },

        screenshotURL() {
            return getResBaseURL() + this.monitor.screenshot + "?time=" + this.cacheTime;
        },

        descriptionHTML() {
            if (this.monitor.description != null) {
                return DOMPurify.sanitize(marked(this.monitor.description));
            } else {
                return "";
            }
        },
    },

    watch: {
        page(to) {
            this.getImportantHeartbeatListPaged();
        },

        monitor(to) {
            this.getImportantHeartbeatListLength();
        },
        "monitor.type"() {
            if (this.monitor && this.monitor.type === "push") {
                this.loadPushExample();
            }
        },
        "pushMonitor.currentExample"() {
            this.loadPushExample();
        },
    },

    mounted() {
        this.getImportantHeartbeatListLength();

        this.$root.emitter.on("newImportantHeartbeat", this.onNewImportantHeartbeat);

        if (this.monitor && this.monitor.type === "push") {
            if (this.lastHeartBeat.status === -1) {
                this.pushMonitor.showPushExamples = true;
            }
            this.loadPushExample();
        }
    },

    beforeUnmount() {
        this.$root.emitter.off("newImportantHeartbeat", this.onNewImportantHeartbeat);
    },

    methods: {
        getResBaseURL,
        /**
         * Request a test notification be sent for this monitor
         * @returns {void}
         */
        testNotification() {
            this.$root.getSocket().emit("testNotification", this.monitor.id);
            this.$root.toastSuccess("Test notification is requested.");
        },

        /**
         * Show dialog to confirm pause
         * @returns {void}
         */
        pauseDialog() {
            this.$refs.confirmPause.show();
        },

        /**
         * Resume this monitor
         * @returns {void}
         */
        resumeMonitor() {
            this.$root.getSocket().emit("resumeMonitor", this.monitor.id, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Request that this monitor is paused
         * @returns {void}
         */
        pauseMonitor() {
            this.$root.getSocket().emit("pauseMonitor", this.monitor.id, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Show dialog to confirm deletion
         * @returns {void}
         */
        deleteDialog() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Show Screenshot Dialog
         * @returns {void}
         */
        showScreenshotDialog() {
            this.$refs.screenshotDialog.show();
        },

        /**
         * Show dialog to confirm clearing events
         * @returns {void}
         */
        clearEventsDialog() {
            this.$refs.confirmClearEvents.show();
        },

        /**
         * Show dialog to confirm clearing heartbeats
         * @returns {void}
         */
        clearHeartbeatsDialog() {
            this.$refs.confirmClearHeartbeats.show();
        },

        /**
         * Request that this monitor is deleted
         * @returns {void}
         */
        deleteMonitor() {
            this.$root.deleteMonitor(this.monitor.id, this.deleteChildrenMonitors, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$router.push("/dashboard");
                }
            });
        },

        /**
         * Request that this monitors events are cleared
         * @returns {void}
         */
        clearEvents() {
            this.$root.clearEvents(this.monitor.id, (res) => {
                if (res.ok) {
                    this.getImportantHeartbeatListLength();
                } else {
                    toast.error(res.msg);
                }
            });
        },

        /**
         * Request that this monitors heartbeats are cleared
         * @returns {void}
         */
        clearHeartbeats() {
            this.$root.clearHeartbeats(this.monitor.id, (res) => {
                if (!res.ok) {
                    toast.error(res.msg);
                }
            });
        },

        /**
         * Return the correct title for the ping stat
         * @param {boolean} average Is the statistic an average?
         * @returns {string} Title formatted dependent on monitor type
         */
        pingTitle(average = false) {
            let translationPrefix = "";
            if (average) {
                translationPrefix = "Avg. ";
            }

            if (this.monitor.type === "http" || this.monitor.type === "keyword" || this.monitor.type === "json-query") {
                return this.$t(translationPrefix + "Response");
            }

            return this.$t(translationPrefix + "Ping");
        },

        /**
         * Get URL of monitor
         * @param {number} id ID of monitor
         * @returns {string} Relative URL of monitor
         */
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },

        /**
         * Filter and hide password in URL for display
         * @param {string} urlString URL to censor
         * @returns {string} Censored URL
         */
        filterPassword(urlString) {
            try {
                let parsedUrl = new URL(urlString);
                if (parsedUrl.password !== "") {
                    parsedUrl.password = "******";
                }
                return parsedUrl.toString();
            } catch (e) {
                // Handle SQL Server
                return urlString.replaceAll(/Password=(.+);/gi, "Password=******;");
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for this monitor.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            if (this.monitor) {
                this.$root.getSocket().emit("monitorImportantHeartbeatListCount", this.monitor.id, (res) => {
                    if (res.ok) {
                        this.importantHeartBeatListLength = res.count;
                        this.getImportantHeartbeatListPaged();
                    }
                });
            }
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            if (this.monitor) {
                const offset = (this.page - 1) * this.perPage;
                this.$root
                    .getSocket()
                    .emit("monitorImportantHeartbeatListPaged", this.monitor.id, offset, this.perPage, (res) => {
                        if (res.ok) {
                            this.displayedRecords = res.data;
                        }
                    });
            }
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (heartbeat.monitorID === this.monitor?.id) {
                if (this.page === 1) {
                    this.displayedRecords.unshift(heartbeat);
                    if (this.displayedRecords.length > this.perPage) {
                        this.displayedRecords.pop();
                    }
                    this.importantHeartBeatListLength += 1;
                }
            }
        },

        /**
         * Highlight the example code
         * @param {string} code Code
         * @returns {string} Highlighted code
         */
        pushExampleHighlighter(code) {
            return highlight(code, languages.js);
        },

        loadPushExample() {
            this.pushMonitor.code = "";
            this.$root.getSocket().emit("getPushExample", this.pushMonitor.currentExample, (res) => {
                let code = res.code
                    .replace("60", this.monitor.interval)
                    .replace("https://example.com/api/push/key?status=up&msg=OK&ping=", this.pushURL);
                this.pushMonitor.code = code;
            });
        },

        secondsToHumanReadableFormat(seconds) {
            return timeDurationFormatter.secondsToHumanReadableFormat(seconds);
        },
    },
};
</script>

<style lang="scss" scoped>
.monitor-detail {
    max-width: 1120px;
    padding-bottom: 2rem;
}

.monitor-detail-title {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    letter-spacing: -0.035em;
}

@media (max-width: 550px) {
    .ping-chart-wrapper {
        padding: 10px !important;
    }

    .dropdown-clear-data {
        margin-bottom: 10px;
    }
}

@media (max-width: 450px) {
    .gizmo-native-button {
        padding-top: 10px;
        font-size: 0.9em;
    }

    .gizmo-action-group {
        width: 100%;

        .gizmo-native-button,
        a.gizmo-native-button {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding-left: 10px;
            padding-right: 10px;
        }
    }
}

@media (max-width: 400px) {
    .dropdown-clear-data {
        button {
            display: block;
            padding-top: 4px;
        }
    }
}

.url {
    color: var(--color-interactive);
    margin-bottom: 1.25rem;
    font-weight: var(--weight-bold);

    a {
        color: var(--color-interactive);
    }
}

.detail-card {
    padding: 1.25rem;
    margin-top: 1.25rem;
    border: 1px solid var(--color-border);
}

.detail-card--spacious { padding: 1.25rem; }

.monitor-health-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
}
.monitor-health-grid__timeline { min-width: 0; }

.monitor-status {
    display: inline-flex;
    min-width: 7rem;
    min-height: 3rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.875rem;
    border: 1px solid;
    border-radius: var(--radius-pill);
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.25rem;
    font-weight: var(--weight-bold);
    letter-spacing: 0.04em;
}

.monitor-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
}

.monitor-stat {
    display: grid;
    align-content: center;
    gap: 0.15rem;
    min-height: 6.5rem;
    padding: 0.75rem;
    border-inline-end: 1px solid var(--color-border);
}
.monitor-stat:last-child { border-inline-end: 0; }

.monitor-stat h4 {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
}

.monitor-stat .num {
    font-size: clamp(1.1rem, 2vw, 1.5rem);
    font-weight: var(--weight-bold);
    font-variant-numeric: tabular-nums;

    /*
     * Some of these numbers open something — the response time opens its chart,
     * the certificate its details — and they were link-coloured to say so. In a
     * row of six figures that reads as a different kind of data rather than as
     * an affordance: the same 792ms appeared twice, once blue and once not, and
     * the difference was whether it opened a chart.
     *
     * The colour goes back to the data. The invitation is an underline, dotted
     * until pointed at, which says "there is more here" without claiming the
     * number means something different.
     */
    a {
        color: inherit;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-color: var(--color-border-strong);
        text-underline-offset: 0.2em;

        &:hover,
        &:focus-visible {
            text-decoration-style: solid;
            text-decoration-color: var(--color-interactive);
        }
    }
}

.monitor-screenshot-grid {
    display: grid;
    grid-template-columns: minmax(0, 36rem);
    justify-content: center;
}
.detail-table-panel { overflow-x: auto; }

@media (max-width: 640px) {
    .monitor-health-grid { grid-template-columns: 1fr; }
    .monitor-health-grid__status { text-align: start; }

    .monitor-stat-grid {
        grid-template-columns: 1fr;
        text-align: start;
    }

    .monitor-stat {
        grid-template-columns: minmax(0, 1fr) auto auto;
        min-height: 0;
        align-items: baseline;
        border-inline-end: 0;
        border-bottom: 1px solid var(--color-border);
    }
    .monitor-stat:last-child { border-bottom: 0; }
}

.detail-card-health {
    background: linear-gradient(135deg, var(--color-surface), var(--color-surface-subtle));
}

.monitor-detail-actions {
    margin-top: 1rem;
}

.word {
    color: var(--color-text-muted);
    font-size: 14px;
}

table {
    font-size: 14px;

    tr {
        transition: all ease-in-out 0.2ms;
    }
}

.stats p {
    font-size: 13px;
    color: var(--color-text-muted);
}

.stats {
    padding: 10px;
}

.keyword {
    color: var(--color-text);
}

.dropdown-clear-data {
    float: right;
}

.tags {
    margin-bottom: 0.5rem;
    max-width: 95vw;
}

.tags > div:first-child {
    margin-left: 0 !important;
}

.monitor-id {
    display: inline-flex;
    font-size: 0.7em;
    margin-left: 0.3em;
    color: var(--color-text-muted);
    flex-direction: row;
    flex-wrap: nowrap;

    .hash {
        user-select: none;
    }

}

.cert-info-warn {
    margin-left: 4px;
    opacity: 0.5;
}

</style>
