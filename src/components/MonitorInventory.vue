<template>
    <div class="monitor-inventory">
        <GizmoPanel class="inventory-panel" density="compact">
            <template #header>
                <div class="inventory-heading">
                    <h1>{{ $t("monitorInventory") }}</h1>
                    <p>{{ countLabel }}</p>
                </div>
            </template>
            <template #actions>
                <router-link to="/add" class="gizmo-native-button gizmo-native-button--primary add-monitor-action">
                    <font-awesome-icon icon="plus" />
                    {{ $t("Add New Monitor") }}
                </router-link>
            </template>

            <div class="inventory-toolbar">
                <div class="search-wrapper">
                    <font-awesome-icon icon="search" class="search-leading-icon" />
                    <button
                        v-if="searchText !== ''"
                        type="button"
                        class="search-clear"
                        :aria-label="$t('monitorInventoryClearSearch')"
                        @click="clearSearchText"
                    >
                        <font-awesome-icon icon="times" />
                    </button>
                    <form @submit.prevent>
                        <input
                            v-model="searchText"
                            class="gizmo-native-control search-input"
                            :placeholder="$t('Search...')"
                            :aria-label="$t('Search monitored sites')"
                            autocomplete="off"
                        />
                    </form>
                </div>

                <div class="filters-group">
                    <MonitorListFilter
                        :filterState="filterState"
                        :allCollapsed="allGroupsCollapsed"
                        :hasGroups="groupMonitors.length >= 2"
                        @update-filter="updateFilter"
                        @toggle-collapse-all="toggleCollapseAll"
                    />
                    <select
                        v-model="typeFilter"
                        class="gizmo-native-control gizmo-native-select type-filter"
                        :aria-label="$t('monitorInventoryTypeFilter')"
                    >
                        <option value="">{{ $t("monitorInventoryAllTypes") }}</option>
                        <option v-for="entry in typeOptions" :key="entry.type" :value="entry.type">
                            {{ entry.label }} ({{ entry.count }})
                        </option>
                    </select>
                    <div
                        v-if="$root.windowWidth > 960"
                        class="gizmo-action-group layout-toggle"
                        role="group"
                        :aria-label="$t('monitorInventoryLayout')"
                    >
                        <input
                            id="inventory-layout-table"
                            v-model="layoutPreference"
                            type="radio"
                            class="gizmo-choice-input"
                            name="monitorInventoryLayout"
                            value="table"
                            @change="persistLayout"
                        />
                        <label class="gizmo-native-button gizmo-native-button--outline" for="inventory-layout-table">
                            {{ $t("monitorInventoryLayoutTable") }}
                        </label>
                        <input
                            id="inventory-layout-compact"
                            v-model="layoutPreference"
                            type="radio"
                            class="gizmo-choice-input"
                            name="monitorInventoryLayout"
                            value="compact"
                            @change="persistLayout"
                        />
                        <label class="gizmo-native-button gizmo-native-button--outline" for="inventory-layout-compact">
                            {{ $t("monitorInventoryLayoutCompact") }}
                        </label>
                        <input
                            id="inventory-layout-grid"
                            v-model="layoutPreference"
                            type="radio"
                            class="gizmo-choice-input"
                            name="monitorInventoryLayout"
                            value="grid"
                            @change="persistLayout"
                        />
                        <label class="gizmo-native-button gizmo-native-button--outline" for="inventory-layout-grid">
                            {{ $t("monitorInventoryLayoutGrid") }}
                        </label>
                    </div>
                </div>
            </div>

            <div v-if="selectedMonitorCount > 0" class="selection-row">
                <span class="selected-count">
                    {{ $t("selectedMonitorCountMsg", selectedMonitorCount) }}
                </span>
                <button class="gizmo-native-button gizmo-native-button--secondary" @click="cancelSelectMode">
                    {{ $t("Cancel") }}
                </button>
                <GizmoMenu align="end">
                    <template #trigger>
                        <button
                            class="gizmo-native-button gizmo-native-button--secondary"
                            type="button"
                            :aria-label="$t('Actions')"
                            :disabled="bulkActionInProgress"
                        >
                            {{ $t("Actions") }}
                        </button>
                    </template>
                    <GizmoMenuItem @select="pauseDialog">
                        <font-awesome-icon icon="pause" />
                        {{ $t("Pause") }}
                    </GizmoMenuItem>
                    <GizmoMenuItem @select="resumeSelected">
                        <font-awesome-icon icon="play" />
                        {{ $t("Resume") }}
                    </GizmoMenuItem>
                    <GizmoMenuItem variant="danger" @select="$refs.confirmDelete.show()">
                        <font-awesome-icon icon="trash" />
                        {{ $t("Delete") }}
                    </GizmoMenuItem>
                </GizmoMenu>
            </div>

            <GizmoEmptyState
                v-if="Object.keys($root.monitorList).length === 0"
                :title="$t('No Monitors')"
                :description="$t('No Monitors, please')"
            >
                <template #actions>
                    <router-link to="/add" class="gizmo-native-button gizmo-native-button--primary">
                        {{ $t("add one") }}
                    </router-link>
                </template>
            </GizmoEmptyState>

            <GizmoEmptyState v-else-if="sortedMonitorList.length === 0" :title="$t('monitorInventoryEmpty')" />

            <div v-else data-testid="monitor-inventory" class="inventory-results">
                <GizmoTable v-if="effectiveLayout === 'table'">
                    <thead>
                        <tr>
                            <th class="col-select">
                                <input
                                    class="gizmo-native-check__input"
                                    type="checkbox"
                                    :checked="allVisibleSelected"
                                    :aria-label="$t('selectAllMonitorsAria')"
                                    @change="onToggleSelectAll"
                                />
                            </th>
                            <th class="col-status" :aria-sort="ariaSort('status')">
                                <button type="button" class="sort-button" @click="sortBy('status')">
                                    {{ $t("Status") }}
                                    <font-awesome-icon
                                        v-if="sortKey === 'status'"
                                        icon="chevron-down"
                                        :class="{ 'sort-asc': sortDir === 'asc' }"
                                    />
                                </button>
                            </th>
                            <th class="col-name" :aria-sort="ariaSort('name')">
                                <button type="button" class="sort-button" @click="sortBy('name')">
                                    {{ $t("Name") }}
                                    <font-awesome-icon
                                        v-if="sortKey === 'name'"
                                        icon="chevron-down"
                                        :class="{ 'sort-asc': sortDir === 'asc' }"
                                    />
                                </button>
                            </th>
                            <th v-if="showHeartbeatColumn" class="col-heartbeat">
                                {{ $t("monitorInventoryHeartbeat") }}
                            </th>
                            <th class="col-uptime" :aria-sort="ariaSort('uptime')">
                                <button type="button" class="sort-button" @click="sortBy('uptime')">
                                    {{ $t("Uptime") }}
                                    <font-awesome-icon
                                        v-if="sortKey === 'uptime'"
                                        icon="chevron-down"
                                        :class="{ 'sort-asc': sortDir === 'asc' }"
                                    />
                                </button>
                            </th>
                            <th class="col-checked" :aria-sort="ariaSort('time')">
                                <button type="button" class="sort-button" @click="sortBy('time')">
                                    {{ $t("monitorInventoryLastCheck") }}
                                    <font-awesome-icon
                                        v-if="sortKey === 'time'"
                                        icon="chevron-down"
                                        :class="{ 'sort-asc': sortDir === 'asc' }"
                                    />
                                </button>
                            </th>
                            <th class="col-interval" :aria-sort="ariaSort('interval')">
                                <button type="button" class="sort-button" @click="sortBy('interval')">
                                    {{ $t("monitorInventoryInterval") }}
                                    <font-awesome-icon
                                        v-if="sortKey === 'interval'"
                                        icon="chevron-down"
                                        :class="{ 'sort-asc': sortDir === 'asc' }"
                                    />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in visibleMonitorList"
                            :key="item.id"
                            :class="rowClass(item)"
                            @click="onRowClick($event, item)"
                        >
                            <td class="col-select" @click.stop>
                                <input
                                    class="gizmo-native-check__input"
                                    type="checkbox"
                                    :aria-label="$t('Check/Uncheck')"
                                    :checked="isSelected(item.id)"
                                    @change="toggleSelection(item.id)"
                                />
                            </td>
                            <td class="col-status">
                                <span v-if="!isActive(item)" class="gizmo-status gizmo-status--unknown">
                                    <span class="gizmo-status__dot" aria-hidden="true"></span>
                                    {{ $t("pauseDashboardHome") }}
                                </span>
                                <Status v-else :status="heartbeatStatus(item)" />
                            </td>
                            <td class="col-name">
                                <div class="inventory-identity-cell" :style="inventoryDepthStyle(item)">
                                    <button
                                        v-if="item._inventoryHasChildren"
                                        type="button"
                                        class="group-toggle"
                                        :aria-expanded="!isGroupCollapsedForDisplay(item)"
                                        :aria-label="groupToggleLabel(item)"
                                        @click.stop="toggleGroup(item.id)"
                                    >
                                        <font-awesome-icon
                                            icon="chevron-down"
                                            :class="{ collapsed: isGroupCollapsedForDisplay(item) }"
                                        />
                                    </button>
                                    <span v-else class="group-toggle-spacer" aria-hidden="true"></span>
                                    <div class="inventory-identity-content">
                                        <MonitorInventoryIdentity
                                            :monitor="item"
                                            :href="monitorURL(item.id)"
                                            :type-label="typeLabel(item)"
                                            :target="targetLabel(item)"
                                            :group-label="parentPath(item)"
                                        />
                                        <HeartbeatBar
                                            v-if="showHeartbeatBelow"
                                            size="small"
                                            class="heartbeat-below"
                                            :monitor-id="item.id"
                                        />
                                    </div>
                                </div>
                            </td>
                            <td v-if="showHeartbeatColumn" class="col-heartbeat">
                                <HeartbeatBar size="small" :monitor-id="item.id" />
                            </td>
                            <td class="col-uptime">
                                <Uptime :monitor="item" type="24" :pill="true" />
                            </td>
                            <td class="col-checked">
                                <template v-if="lastBeat(item)?.time">
                                    <span class="last-check" :title="$root.datetime(lastBeat(item).time)">
                                        {{ lastCheckLabel(item) }}
                                    </span>
                                    <span v-if="showPing(item)" class="ping-value" :title="$t('Ping')">
                                        {{ lastBeat(item).ping }}ms
                                    </span>
                                </template>
                                <span v-else class="empty-value">{{ $t("notAvailableShort") }}</span>
                            </td>
                            <td class="col-interval">
                                <span
                                    v-if="hasInterval(item)"
                                    class="interval-value"
                                    :title="$t('checkEverySecond', [item.interval])"
                                >
                                    {{ item.interval }}s
                                </span>
                                <span v-else class="empty-value">—</span>
                            </td>
                        </tr>
                    </tbody>
                </GizmoTable>

                <div
                    v-else
                    class="inventory-cards"
                    :class="{ 'inventory-cards--grid': effectiveLayout === 'grid' }"
                    role="list"
                >
                    <div class="inventory-cards__toolbar" @click.stop>
                        <label class="select-all">
                            <input
                                class="gizmo-native-check__input"
                                type="checkbox"
                                :checked="allVisibleSelected"
                                :aria-label="$t('selectAllMonitorsAria')"
                                @change="onToggleSelectAll"
                            />
                            {{ $t("selectAllMonitorsAria") }}
                        </label>
                    </div>
                    <article
                        v-for="item in visibleMonitorList"
                        :key="item.id"
                        class="inventory-card"
                        :class="[rowClass(item), { 'inventory-card--group': item.type === 'group' }]"
                        role="listitem"
                        @click="onRowClick($event, item)"
                    >
                        <div class="inventory-card__select" @click.stop>
                            <input
                                class="gizmo-native-check__input"
                                type="checkbox"
                                :aria-label="$t('Check/Uncheck')"
                                :checked="isSelected(item.id)"
                                @change="toggleSelection(item.id)"
                            />
                        </div>
                        <div class="inventory-card__body">
                            <div class="inventory-card__top">
                                <div class="inventory-identity-cell" :style="inventoryDepthStyle(item)">
                                    <button
                                        v-if="item._inventoryHasChildren"
                                        type="button"
                                        class="group-toggle"
                                        :aria-expanded="!isGroupCollapsedForDisplay(item)"
                                        :aria-label="groupToggleLabel(item)"
                                        @click.stop="toggleGroup(item.id)"
                                    >
                                        <font-awesome-icon
                                            icon="chevron-down"
                                            :class="{ collapsed: isGroupCollapsedForDisplay(item) }"
                                        />
                                    </button>
                                    <span v-else class="group-toggle-spacer" aria-hidden="true"></span>
                                    <div class="inventory-identity-content">
                                        <MonitorInventoryIdentity
                                            :monitor="item"
                                            :href="monitorURL(item.id)"
                                            :type-label="typeLabel(item)"
                                            :target="targetLabel(item)"
                                            :group-label="parentPath(item)"
                                        />
                                    </div>
                                </div>
                                <div class="inventory-card__status">
                                    <span v-if="!isActive(item)" class="gizmo-status gizmo-status--unknown">
                                        <span class="gizmo-status__dot" aria-hidden="true"></span>
                                        {{ $t("pauseDashboardHome") }}
                                    </span>
                                    <Status v-else :status="heartbeatStatus(item)" />
                                </div>
                            </div>
                            <HeartbeatBar
                                v-if="showHeartbeatBelow"
                                size="small"
                                class="heartbeat-below"
                                :monitor-id="item.id"
                            />
                            <div class="inventory-card__metrics">
                                <Uptime :monitor="item" type="24" :pill="true" />
                                <span
                                    v-if="lastBeat(item)?.time"
                                    class="last-check"
                                    :title="$root.datetime(lastBeat(item).time)"
                                >
                                    {{ lastCheckLabel(item) }}
                                    <span v-if="showPing(item)" class="ping-value">{{ lastBeat(item).ping }}ms</span>
                                </span>
                                <span v-else class="empty-value">{{ $t("notAvailableShort") }}</span>
                                <span
                                    v-if="hasInterval(item)"
                                    class="interval-value"
                                    :title="$t('checkEverySecond', [item.interval])"
                                >
                                    {{ item.interval }}s
                                </span>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </GizmoPanel>

        <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseSelected">
            {{ $t("pauseMonitorMsg") }}
        </Confirm>
        <Confirm
            ref="confirmDelete"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="deleteSelected"
        >
            {{ $t("deleteMonitorsMsg") }}
        </Confirm>
    </div>
</template>

<script>
import Confirm from "./Confirm.vue";
import HeartbeatBar from "./HeartbeatBar.vue";
import MonitorInventoryIdentity from "./MonitorInventoryIdentity.vue";
import MonitorListFilter from "./MonitorListFilter.vue";
import Status from "./Status.vue";
import Uptime from "./Uptime.vue";
import GizmoEmptyState from "./gizmo/GizmoEmptyState.vue";
import GizmoMenu from "./gizmo/GizmoMenu.vue";
import GizmoMenuItem from "./gizmo/GizmoMenuItem.vue";
import GizmoPanel from "./gizmo/GizmoPanel.vue";
import GizmoTable from "./gizmo/GizmoTable.vue";
import {
    hasCheckInterval,
    hasPingSample,
    isMonitorActive,
    monitorSearchHaystack,
    monitorTargetLabel,
    monitorTypeLabel,
} from "../monitor-identity.js";
import { getMonitorRelativeURL } from "../util.ts";

const LAYOUT_STORAGE_KEY = "monitorInventoryLayout";
const COLLAPSE_STORAGE_KEY = "monitorCollapsed";

/**
 * Read the collapse state shared with the dashboard monitor rail.
 * @returns {Record<string, boolean>} Stored group states
 */
function storedCollapsedGroups() {
    try {
        return JSON.parse(localStorage.getItem(COLLAPSE_STORAGE_KEY) || "{}") || {};
    } catch (error) {
        return {};
    }
}

/*
 * A preference is worth remembering and not worth failing over.
 *
 * Reading storage throws where it is disabled by policy or unavailable in a
 * private window, and writing throws on top of that when the quota is full. An
 * unguarded read sat in data(), so a browser that refuses storage did not lose
 * the layout choice — it failed to mount the component and left the page blank.
 */
/**
 * Read a stored preference, or nothing where storage cannot be reached.
 * @param {string} key Storage key
 * @returns {string|null} The stored value, or null when there is none to read
 */
function readStored(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

/**
 * Remember a preference where storage allows it, and carry on where it does not.
 * @param {string} key Storage key
 * @param {string} value What to remember
 * @returns {void}
 */
function writeStored(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        /* The choice stays for this session and is not carried to the next. */
    }
}

export default {
    components: {
        Confirm,
        GizmoEmptyState,
        GizmoMenu,
        GizmoMenuItem,
        GizmoPanel,
        GizmoTable,
        HeartbeatBar,
        MonitorInventoryIdentity,
        MonitorListFilter,
        Status,
        Uptime,
    },
    data() {
        const storedLayout = readStored(LAYOUT_STORAGE_KEY);
        return {
            searchText: "",
            selectedMonitors: {},
            bulkActionInProgress: false,
            typeFilter: "",
            sortKey: null,
            sortDir: "asc",
            layoutPreference: ["table", "compact", "grid"].includes(storedLayout) ? storedLayout : "table",
            collapsedGroups: storedCollapsedGroups(),
            filterState: {
                status: null,
                active: null,
                tags: null,
            },
        };
    },
    computed: {
        totalMonitorCount() {
            return Object.keys(this.$root.monitorList).length;
        },
        filtersActive() {
            return (
                this.searchText !== "" ||
                this.typeFilter !== "" ||
                (this.filterState.status != null && this.filterState.status.length > 0) ||
                (this.filterState.active != null && this.filterState.active.length > 0) ||
                (this.filterState.tags != null && this.filterState.tags.length > 0)
            );
        },
        countLabel() {
            if (this.filtersActive) {
                return this.$t("monitorInventoryCountFiltered", {
                    shown: this.sortedMonitorList.length,
                    total: this.totalMonitorCount,
                });
            }
            return this.$t("Monitors", this.totalMonitorCount);
        },
        typeOptions() {
            const counts = {};
            for (const monitor of Object.values(this.$root.monitorList)) {
                counts[monitor.type] = (counts[monitor.type] || 0) + 1;
            }
            return Object.keys(counts)
                .map((type) => ({
                    type,
                    count: counts[type],
                    label: monitorTypeLabel(type, this.$t.bind(this)),
                }))
                .sort((a, b) => a.label.localeCompare(b.label));
        },
        effectiveLayout() {
            if (this.$root.windowWidth <= 960) {
                return "compact";
            }
            return this.layoutPreference;
        },
        heartbeatMode() {
            return this.$root.userHeartbeatBar || "normal";
        },
        showHeartbeatColumn() {
            return this.effectiveLayout === "table" && this.heartbeatMode === "normal";
        },
        showHeartbeatBelow() {
            if (this.heartbeatMode === "none") {
                return false;
            }
            return this.effectiveLayout !== "table" || this.heartbeatMode === "bottom";
        },
        sortedMonitorList() {
            let result = Object.values(this.$root.monitorList).filter(this.filterFunc);

            result.sort(this.compareMonitors);

            return result;
        },
        groupMonitors() {
            const monitors = Object.values(this.$root.monitorList);
            return monitors.filter(
                (monitor) => monitor.type === "group" && monitors.some((child) => child.parent === monitor.id)
            );
        },
        allGroupsCollapsed() {
            return (
                this.groupMonitors.length === 0 ||
                this.groupMonitors.every((group) => this.collapsedGroups[`monitor_${group.id}`] !== false)
            );
        },
        visibleMonitorList() {
            const monitors = Object.values(this.$root.monitorList);
            const monitorById = new Map(monitors.map((monitor) => [String(monitor.id), monitor]));
            const includedIds = new Set(this.sortedMonitorList.map((monitor) => String(monitor.id)));

            for (const monitor of this.sortedMonitorList) {
                let parentId = monitor.parent;
                const visitedParents = new Set();

                while (parentId != null && monitorById.has(String(parentId))) {
                    const key = String(parentId);
                    if (visitedParents.has(key)) {
                        break;
                    }
                    visitedParents.add(key);
                    includedIds.add(key);
                    parentId = monitorById.get(key).parent;
                }
            }

            const childrenByParent = new Map();
            for (const monitor of monitors) {
                const parentKey = monitor.parent == null ? null : String(monitor.parent);
                if (!childrenByParent.has(parentKey)) {
                    childrenByParent.set(parentKey, []);
                }
                childrenByParent.get(parentKey).push(monitor);
            }
            for (const children of childrenByParent.values()) {
                children.sort(this.compareMonitors);
            }

            const result = [];
            const visited = new Set();
            const appendBranch = (monitor, depth) => {
                const key = String(monitor.id);
                if (!includedIds.has(key) || visited.has(key)) {
                    return;
                }
                visited.add(key);

                const includedChildren = (childrenByParent.get(key) || []).filter((child) =>
                    includedIds.has(String(child.id))
                );
                result.push({
                    ...monitor,
                    _inventoryDepth: depth,
                    _inventoryHasChildren: includedChildren.length > 0,
                });

                if (includedChildren.length > 0 && !this.isGroupCollapsedForDisplay(monitor)) {
                    includedChildren.forEach((child) => appendBranch(child, depth + 1));
                }
            };

            const roots = monitors
                .filter((monitor) => {
                    const parentKey = monitor.parent == null ? null : String(monitor.parent);
                    return includedIds.has(String(monitor.id)) && !includedIds.has(parentKey);
                })
                .sort(this.compareMonitors);
            roots.forEach((monitor) => appendBranch(monitor, 0));
            return result;
        },
        selectedMonitorCount() {
            return Object.keys(this.selectedMonitors).length;
        },
        allVisibleSelected() {
            return (
                this.visibleMonitorList.length > 0 &&
                this.visibleMonitorList.every((monitor) => this.isSelected(monitor.id))
            );
        },
    },
    methods: {
        persistLayout() {
            writeStored(LAYOUT_STORAGE_KEY, this.layoutPreference);
        },
        persistCollapsedGroups() {
            writeStored(COLLAPSE_STORAGE_KEY, JSON.stringify(this.collapsedGroups));
        },
        isGroupCollapsedForDisplay(monitor) {
            if (this.filtersActive) {
                return false;
            }
            return this.collapsedGroups[`monitor_${monitor.id}`] !== false;
        },
        toggleGroup(id) {
            const key = `monitor_${id}`;
            this.collapsedGroups = {
                ...this.collapsedGroups,
                [key]: this.collapsedGroups[key] === false,
            };
            this.persistCollapsedGroups();
        },
        toggleCollapseAll() {
            const shouldCollapse = !this.allGroupsCollapsed;
            const next = { ...this.collapsedGroups };
            this.groupMonitors.forEach((group) => {
                next[`monitor_${group.id}`] = shouldCollapse;
            });
            this.collapsedGroups = next;
            this.persistCollapsedGroups();
        },
        inventoryDepthStyle(monitor) {
            return {
                "--inventory-depth": monitor._inventoryDepth || 0,
            };
        },
        groupToggleLabel(monitor) {
            const key = this.isGroupCollapsedForDisplay(monitor)
                ? "monitorInventoryExpandGroup"
                : "monitorInventoryCollapseGroup";
            return this.$t(key, { name: monitor.name });
        },
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },
        isActive(monitor) {
            return isMonitorActive(monitor);
        },
        hasInterval(monitor) {
            return hasCheckInterval(monitor);
        },
        showPing(monitor) {
            return hasPingSample(monitor, this.lastBeat(monitor));
        },
        typeLabel(monitor) {
            return monitorTypeLabel(monitor.type, this.$t.bind(this));
        },
        targetContext(monitor) {
            const credential = this.llmCredential(monitor);
            const childCount = Array.isArray(monitor.childrenIDs) ? monitor.childrenIDs.length : 0;
            return {
                childCount,
                groupLabel: monitor.type === "group" && childCount > 0 ? this.$t("Monitors", childCount) : "",
                networkName: this.web3NetworkName(monitor),
                llmModel: monitor.llmModel || credential?.model || "",
                llmTarget: monitor.llmCredentialId ? credential?.name || this.$t("llmCredentialMissing") : undefined,
            };
        },
        targetLabel(monitor) {
            return monitorTargetLabel(monitor, this.targetContext(monitor));
        },
        llmCredential(monitor) {
            if (!monitor?.llmCredentialId) {
                return null;
            }
            return (this.$root.info?.aiCredentials ?? []).find((item) => item.id === monitor.llmCredentialId) ?? null;
        },
        web3NetworkName(monitor) {
            if (!monitor?.web3NetworkId) {
                return "";
            }
            return (
                (this.$root.web3NetworkList || []).find((network) => network.id === monitor.web3NetworkId)?.name || ""
            );
        },
        /**
         * Parent names only, so the identity cell does not repeat the row's own name.
         * @param {object} monitor Monitor row
         * @returns {string} Group path, or empty
         */
        parentPath(monitor) {
            if (!Array.isArray(monitor.path) || monitor.path.length < 2) {
                return "";
            }
            return monitor.path.slice(0, -1).join(" / ");
        },
        clearSearchText() {
            this.searchText = "";
        },
        updateFilter(newFilter) {
            this.filterState = newFilter;
        },
        lastBeat(monitor) {
            return this.$root.lastHeartbeatList[monitor.id] || null;
        },
        heartbeatStatus(monitor) {
            const beat = this.lastBeat(monitor);
            return beat ? beat.status : -1;
        },
        /**
         * Compact last-check label for scanning; full timestamp stays on the title.
         * @param {object} monitor Monitor row
         * @returns {string} Relative label
         */
        lastCheckLabel(monitor) {
            const beat = this.lastBeat(monitor);
            if (!beat?.time) {
                return this.$t("notAvailableShort");
            }

            const then = this.$root.toDayjs(beat.time);
            const seconds = Math.max(0, Math.round((Date.now() - then.valueOf()) / 1000));

            if (seconds < 45) {
                return this.$t("now");
            }
            if (seconds < 60 * 60) {
                return this.$t("time ago", [`${Math.round(seconds / 60)}m`]);
            }
            if (seconds < 60 * 60 * 48) {
                return this.$t("time ago", [`${Math.round(seconds / 3600)}h`]);
            }
            return this.$root.date(beat.time);
        },
        uptimeValue(monitor) {
            const key = `${monitor.id}_24`;
            const value = this.$root.uptimeList[key];
            return typeof value === "number" ? value : -1;
        },
        /**
         * Status class for the row, so down/maintenance can be found from the left edge.
         * @param {object} monitor Monitor row
         * @returns {string} Row class
         */
        rowClass(monitor) {
            if (!this.isActive(monitor)) {
                return "is-paused";
            }
            const status = this.heartbeatStatus(monitor);
            if (status === 0) {
                return "is-down";
            }
            if (status === 2) {
                return "is-pending";
            }
            if (status === 3) {
                return "is-maintenance";
            }
            return "";
        },
        /**
         * Open the monitor unless the click was on a control.
         * @param {MouseEvent} event Click
         * @param {object} monitor Monitor row
         * @returns {void}
         */
        onRowClick(event, monitor) {
            const target = event.target;
            if (
                target.closest("a, button, input, select, textarea, label, canvas") ||
                window.getSelection()?.toString()
            ) {
                return;
            }
            this.$router.push(this.monitorURL(monitor.id));
        },
        ariaSort(key) {
            if (this.sortKey !== key) {
                return "none";
            }
            return this.sortDir === "asc" ? "ascending" : "descending";
        },
        sortBy(key) {
            if (this.sortKey === key) {
                this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
            } else {
                this.sortKey = key;
                this.sortDir = key === "status" || key === "time" ? "desc" : "asc";
            }
        },
        defaultSort(m1, m2) {
            const active1 = this.isActive(m1);
            const active2 = this.isActive(m2);
            if (active1 !== active2) {
                return active1 ? -1 : 1;
            }

            if (m1.weight !== m2.weight) {
                if (m1.weight > m2.weight) {
                    return -1;
                }
                if (m1.weight < m2.weight) {
                    return 1;
                }
            }

            return m1.name.localeCompare(m2.name);
        },
        compareBySortKey(a, b) {
            const dir = this.sortDir === "asc" ? 1 : -1;
            let left;
            let right;

            switch (this.sortKey) {
                case "status":
                    left = this.isActive(a) ? this.heartbeatStatus(a) : -2;
                    right = this.isActive(b) ? this.heartbeatStatus(b) : -2;
                    break;
                case "name":
                    return dir * a.name.localeCompare(b.name);
                case "uptime":
                    left = this.uptimeValue(a);
                    right = this.uptimeValue(b);
                    break;
                case "interval":
                    left = this.hasInterval(a) ? a.interval : -1;
                    right = this.hasInterval(b) ? b.interval : -1;
                    break;
                case "time":
                    left = this.lastBeat(a)?.time || "";
                    right = this.lastBeat(b)?.time || "";
                    return dir * String(left).localeCompare(String(right));
                default:
                    return this.defaultSort(a, b);
            }

            if (left < right) {
                return -1 * dir;
            }
            if (left > right) {
                return 1 * dir;
            }
            return a.name.localeCompare(b.name);
        },
        compareMonitors(a, b) {
            return this.sortKey ? this.compareBySortKey(a, b) : this.defaultSort(a, b);
        },
        filterFunc(monitor) {
            let searchTextMatch = true;
            if (this.searchText !== "") {
                searchTextMatch = monitorSearchHaystack(
                    monitor,
                    this.targetContext(monitor),
                    this.$t.bind(this)
                ).includes(this.searchText.toLowerCase());
            }

            let statusMatch = true;
            if (this.filterState.status != null && this.filterState.status.length > 0) {
                statusMatch = this.filterState.status.includes(this.heartbeatStatus(monitor));
            }

            let activeMatch = true;
            if (this.filterState.active != null && this.filterState.active.length > 0) {
                activeMatch = this.filterState.active.includes(this.isActive(monitor));
            }

            let tagsMatch = true;
            if (this.filterState.tags != null && this.filterState.tags.length > 0) {
                tagsMatch =
                    (monitor.tags || [])
                        .map((tag) => tag.tag_id)
                        .filter((monitorTagId) => this.filterState.tags.includes(monitorTagId)).length > 0;
            }

            let typeMatch = true;
            if (this.typeFilter !== "") {
                typeMatch = monitor.type === this.typeFilter;
            }

            return searchTextMatch && statusMatch && activeMatch && tagsMatch && typeMatch;
        },
        /**
         * Select or clear every currently visible row.
         * @param {Event} event Change event from the header checkbox
         * @returns {void}
         */
        onToggleSelectAll(event) {
            if (event.target.checked) {
                const next = {};
                this.visibleMonitorList.forEach((item) => {
                    next[item.id] = true;
                });
                this.selectedMonitors = next;
            } else {
                this.selectedMonitors = {};
            }
        },
        deselect(id) {
            const next = { ...this.selectedMonitors };
            delete next[id];
            this.selectedMonitors = next;
        },
        select(id) {
            this.selectedMonitors = {
                ...this.selectedMonitors,
                [id]: true,
            };
        },
        isSelected(id) {
            return id in this.selectedMonitors;
        },
        toggleSelection(id) {
            if (this.isSelected(id)) {
                this.deselect(id);
            } else {
                this.select(id);
            }
        },
        cancelSelectMode() {
            this.selectedMonitors = {};
        },
        pauseDialog() {
            this.$refs.confirmPause.show();
        },
        pauseSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const activeMonitors = Object.keys(this.selectedMonitors).filter((id) =>
                this.isActive(this.$root.monitorList[id])
            );

            if (activeMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsPausedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            activeMonitors.forEach((id) => this.$root.getSocket().emit("pauseMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("pausedMonitorsMsg", activeMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        resumeSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const inactiveMonitors = Object.keys(this.selectedMonitors).filter(
                (id) => !this.isActive(this.$root.monitorList[id])
            );

            if (inactiveMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsResumedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            inactiveMonitors.forEach((id) => this.$root.getSocket().emit("resumeMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("resumedMonitorsMsg", inactiveMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        async deleteSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const monitorIds = Object.keys(this.selectedMonitors);

            this.bulkActionInProgress = true;
            let successCount = 0;
            let errorCount = 0;

            for (const id of monitorIds) {
                try {
                    await new Promise((resolve, reject) => {
                        this.$root.getSocket().emit("deleteMonitor", id, false, (res) => {
                            if (res.ok) {
                                successCount++;
                                resolve();
                            } else {
                                errorCount++;
                                reject();
                            }
                        });
                    });
                } catch (error) {
                    // Error already counted
                }
            }

            this.bulkActionInProgress = false;

            if (successCount > 0) {
                this.$root.toastSuccess(this.$t("deletedMonitorsMsg", successCount));
            }
            if (errorCount > 0) {
                this.$root.toastError(this.$t("bulkDeleteErrorMsg", errorCount));
            }

            this.cancelSelectMode();
        },
    },
};
</script>

<style lang="scss" scoped>
.monitor-inventory {
    min-width: 0;
}

.inventory-heading {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    min-width: 0;
}

.inventory-heading h1 {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.78rem;
    font-weight: var(--weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.inventory-heading p {
    margin: 0;
    color: var(--color-text-subtle);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
}

.inventory-panel {
    :deep(.gizmo-panel__body) {
        gap: 0;
        padding: 0;
    }

    :deep(.gizmo-table-wrap) {
        border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    :deep(.gizmo-table th),
    :deep(.gizmo-table td) {
        padding: 0.5rem 0.7rem;
    }

    :deep(thead th) {
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--color-surface-subtle);
        border-bottom: 1px solid var(--color-border);
    }

    :deep(tbody tr) {
        cursor: pointer;
    }

    :deep(tbody tr.is-down),
    :deep(.inventory-card.is-down) {
        box-shadow: inset 3px 0 0 var(--status-down);
    }

    :deep(tbody tr.is-pending),
    :deep(.inventory-card.is-pending) {
        box-shadow: inset 3px 0 0 var(--status-degraded);
    }

    :deep(tbody tr.is-maintenance),
    :deep(.inventory-card.is-maintenance) {
        box-shadow: inset 3px 0 0 var(--status-maintenance);
    }

    :deep(tbody tr.is-down:hover) {
        background: var(--status-down-bg);
    }

    :deep(tbody tr.is-pending:hover) {
        background: var(--status-degraded-bg);
    }

    :deep(tbody tr.is-maintenance:hover) {
        background: var(--status-maintenance-bg);
    }
}

.inventory-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem;
    background: var(--color-surface-subtle);
    border-bottom: 1px solid var(--color-border);
}

.search-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    flex: 1 1 16rem;
    min-width: 12rem;
    max-width: 28rem;

    form {
        width: 100%;
    }
}

.search-leading-icon {
    position: absolute;
    left: 0.7rem;
    color: var(--color-text-subtle);
    font-size: 0.8rem;
    pointer-events: none;
    z-index: 1;
}

/*
 * Sized to the control it sits in rather than to the glyph. At 1.5rem square
 * this was under the 2.5rem a pointer or touch target needs, and had no shape
 * to aim at until the cursor was already on it.
 */
.search-clear {
    position: absolute;
    right: 0.25rem;
    z-index: 1;
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background-color 140ms var(--easing-out), color 140ms var(--easing-out);

    &:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }
}

.search-input {
    width: 100%;
    padding-left: 2.25rem;
    padding-right: 2.5rem;
}

.filters-group {
    display: flex;
    flex: 0 1 auto;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.5rem;

    :deep(.monitor-list-filter) {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 0.5rem;
    }

    :deep(.filter-dropdown-status) {
        justify-content: space-between;
        width: 9rem;
    }

    :deep(.filter-dropdown-status > div) {
        flex: 1;
        min-width: 0;
    }
}

.type-filter {
    min-width: 11rem;
}

.layout-toggle {
    flex: 0 0 auto;
}

.selection-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-interactive-subtle);
    border-bottom: 1px solid var(--color-border);
}

.selected-count {
    margin-right: auto;
    white-space: nowrap;
    font-size: 0.875rem;
    color: var(--color-interactive);
}

.sort-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }
}

.sort-asc {
    transform: rotate(180deg);
}

.col-select {
    width: 2.5rem;
}

.col-status {
    white-space: nowrap;
}

.col-name {
    min-width: 14rem;
}

.inventory-identity-cell {
    display: flex;
    align-items: flex-start;
    min-width: 0;
    padding-inline-start: calc(var(--inventory-depth, 0) * 1.25rem);
}

.inventory-identity-content {
    flex: 1;
    min-width: 0;
}

.group-toggle,
.group-toggle-spacer {
    flex: 0 0 2.5rem;
    width: 2.5rem;
}

.group-toggle {
    display: inline-grid;
    place-items: center;
    min-height: 2.5rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;

    &:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }

    :deep(svg) {
        transition: transform 140ms var(--easing-out);
    }

    :deep(svg.collapsed) {
        transform: rotate(-90deg);
    }
}

.group-toggle-spacer {
    min-height: 1px;
}

.last-check,
.ping-value,
.interval-value {
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
}

.interval-value,
.ping-value {
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: 0.75rem;
}

.col-heartbeat {
    min-width: 9rem;
    max-width: 14rem;
    overflow: hidden;
}

.heartbeat-below {
    display: block;
    margin-top: 0.35rem;
    max-width: 22rem;
}

.col-uptime,
.col-checked,
.col-interval {
    white-space: nowrap;
}

.ping-value::before {
    content: " · ";
    color: var(--color-text-subtle);
    font-family: inherit;
}

.empty-value {
    color: var(--color-text-subtle);
}

:deep(.is-paused .monitor-name-link) {
    color: var(--color-text-muted);
    font-weight: var(--weight-medium);
}

.inventory-cards {
    display: flex;
    flex-direction: column;
}

.inventory-cards--grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-surface-subtle);

    .inventory-cards__toolbar,
    .inventory-card--group {
        grid-column: 1 / -1;
    }

    .inventory-cards__toolbar {
        padding: 0;
        border-bottom: 0;
        background: transparent;
    }

    .inventory-card {
        align-self: stretch;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
    }
}

.inventory-cards__toolbar {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
}

.select-all {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
}

.inventory-card {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: 0.25rem 0.35rem;
    padding: 0.75rem 0.75rem 0.75rem 0.35rem;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;

    &:hover {
        background: var(--color-surface-hover);
    }

    &.is-down:hover {
        background: var(--status-down-bg);
    }

    &.is-pending:hover {
        background: var(--status-degraded-bg);
    }

    &.is-maintenance:hover {
        background: var(--status-maintenance-bg);
    }
}

.inventory-card__select {
    display: flex;
    align-items: flex-start;
    padding-top: 0.15rem;
}

/*
 * A column, not a grid of auto rows.
 *
 * A stretched card left the body with more height than its content, and a grid
 * of auto-sized rows distributes that between the rows — so a card opened a gap
 * down its middle, and the more content it had the smaller the gap, which is
 * why no two cards in a row lined up.
 */
.inventory-card__body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.inventory-card__top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: start;
}

.inventory-card__status {
    justify-self: end;
}

/*
 * Held at the bottom so the same reading sits at the same height in every card
 * of a row, whatever each one carries above it.
 */
.inventory-card__metrics {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-top: auto;
    padding-top: 0.15rem;
    gap: 0.35rem 0.75rem;
}

:deep(.gizmo-empty-state) {
    margin: 0.75rem;
}

@media (max-width: 1100px) {
    .col-interval {
        display: none;
    }
}

@media (max-width: 960px) {
    .col-heartbeat {
        display: none;
    }
}

@media (max-width: 767.98px) {
    .add-monitor-action {
        display: none;
    }

    .inventory-toolbar {
        display: flex;
    }

    /*
     * Search and the filters share the row here rather than stacking.
     *
     * Both were given a 100% basis, and a flex line wraps before it shrinks, so
     * the second one always fell to its own row and the toolbar took two. The
     * search field takes what is left after the filters, down to nothing, which
     * keeps them level and the toolbar one row deep.
     */
    .search-wrapper {
        flex: 1 1 6rem;
        max-width: none;
        min-width: 0;
    }

    .filters-group {
        /*
         * A basis small enough for the line to hold both, because wrapping is
         * decided on the basis and only then is anything shrunk. Left at auto
         * the group asks for its content width, which never leaves room for the
         * search field beside it.
         *
         * The width is capped as well: a basis only sets where the line breaks,
         * and the children were free to lay themselves out wider than the group
         * and push past the viewport edge.
         */
        flex: 0 1 12rem;
        max-width: 12rem;
        min-width: 0;
        overflow: hidden;

        :deep(.filter-dropdown-status) {
            width: auto;
            min-width: 4.75rem;
        }

        .type-filter {
            flex: 1 1 4rem;
            min-width: 0;
        }

        :deep(.monitor-list-filter > .filter-dropdown:last-of-type .filter-dropdown-menu) {
            inset-inline: auto 0;
        }
    }

    .type-filter {
        flex: 1 1 8rem;
        min-width: 8rem;
        width: 100%;
    }

    .inventory-heading {
        flex-wrap: wrap;
        gap: 0.25rem 0.75rem;
    }
}

@media (max-width: 359.98px) {
    .filters-group {
        flex-wrap: wrap;
    }
}
</style>
