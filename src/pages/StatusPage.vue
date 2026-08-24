<template>
    <div v-if="loadedTheme" class="status-page-shell">
        <!-- Sidebar for edit mode -->
        <div v-if="enableEditMode" class="sidebar" data-testid="edit-sidebar">
            <div class="sidebar-body">
                <div class="tw-my-3">
                    <label for="slug" class="gizmo-field-label">{{ $t("Slug") }}</label>
                    <div class="gizmo-input-group">
                        <span id="basic-addon3" class="gizmo-input-group__text">/status/</span>
                        <input id="slug" v-model="config.slug" type="text" class="gizmo-native-control" />
                    </div>
                </div>

                <!-- Title, logo, typeface, and body size share this group.
                     Typeface applies to the whole public page, not only the title. -->
                <section class="sidebar-header-appearance" data-testid="header-appearance">
                    <p class="sidebar-header-appearance__title">{{ $t("statusPageHeaderAppearance") }}</p>

                    <div class="tw-my-3">
                        <label for="title" class="gizmo-field-label">{{ $t("Title") }}</label>
                        <input id="title" v-model="config.title" type="text" class="gizmo-native-control" />
                    </div>

                    <div class="tw-my-3">
                        <label for="logo-size" class="gizmo-field-label">{{ $t("statusPageLogoSize") }}</label>
                        <select
                            id="logo-size"
                            v-model="config.iconSize"
                            class="gizmo-native-control gizmo-native-select"
                            data-testid="logo-size-select"
                        >
                            <option value="sm">{{ $t("statusPageLogoSizeSmall") }}</option>
                            <option value="md">{{ $t("statusPageLogoSizeMedium") }}</option>
                            <option value="lg">{{ $t("statusPageLogoSizeLarge") }}</option>
                        </select>
                    </div>

                    <div class="tw-my-3">
                        <label for="title-size" class="gizmo-field-label">{{ $t("statusPageTitleSize") }}</label>
                        <select
                            id="title-size"
                            v-model="config.titleSize"
                            class="gizmo-native-control gizmo-native-select"
                            data-testid="title-size-select"
                        >
                            <option value="sm">{{ $t("statusPageTitleSizeSmall") }}</option>
                            <option value="md">{{ $t("statusPageTitleSizeMedium") }}</option>
                            <option value="lg">{{ $t("statusPageTitleSizeLarge") }}</option>
                        </select>
                    </div>

                    <div class="tw-my-3">
                        <label for="text-size" class="gizmo-field-label">{{ $t("statusPageTextSize") }}</label>
                        <select
                            id="text-size"
                            v-model="config.textSize"
                            class="gizmo-native-control gizmo-native-select"
                            data-testid="text-size-select"
                        >
                            <option value="sm">{{ $t("statusPageTitleSizeSmall") }}</option>
                            <option value="md">{{ $t("statusPageTitleSizeMedium") }}</option>
                            <option value="lg">{{ $t("statusPageTitleSizeLarge") }}</option>
                        </select>
                    </div>

                    <div class="tw-my-3">
                        <label for="status-font" class="gizmo-field-label">{{ $t("statusPageFont") }}</label>
                        <select
                            id="status-font"
                            v-model="config.font"
                            class="gizmo-native-control gizmo-native-select"
                            data-testid="font-select"
                        >
                            <option value="sans">{{ $t("statusPageTitleFontSans") }}</option>
                            <option value="serif">{{ $t("statusPageTitleFontSerif") }}</option>
                            <option value="mono">{{ $t("statusPageTitleFontMono") }}</option>
                            <option value="display">{{ $t("statusPageTitleFontDisplay") }}</option>
                        </select>
                    </div>

                    <div class="tw-my-3">
                        <label for="logo-position" class="gizmo-field-label">{{ $t("statusPageLogoPosition") }}</label>
                        <select
                            id="logo-position"
                            v-model="config.iconPosition"
                            class="gizmo-native-control gizmo-native-select"
                            data-testid="logo-position-select"
                        >
                            <option value="left">{{ $t("statusPageLogoPositionLeft") }}</option>
                            <option value="above">{{ $t("statusPageLogoPositionAbove") }}</option>
                            <option value="hidden">{{ $t("statusPageLogoPositionHidden") }}</option>
                        </select>
                    </div>
                </section>

                <!-- Description -->
                <div class="tw-my-3">
                    <label for="description" class="gizmo-field-label">{{ $t("Description") }}</label>
                    <textarea
                        id="description"
                        v-model="config.description"
                        class="gizmo-native-control"
                        data-testid="description-input"
                    ></textarea>
                    <div class="gizmo-field-help">{{ $t("markdownSupported") }}</div>
                </div>

                <!-- Footer Text -->
                <div class="tw-my-3">
                    <label for="footer-text" class="gizmo-field-label">{{ $t("Footer Text") }}</label>
                    <textarea
                        id="footer-text"
                        v-model="config.footerText"
                        class="gizmo-native-control"
                        data-testid="footer-text-input"
                    ></textarea>
                    <div class="gizmo-field-help">{{ $t("markdownSupported") }}</div>
                </div>

                <div class="tw-my-3">
                    <label for="auto-refresh-interval" class="gizmo-field-label">{{ $t("Refresh Interval") }}</label>
                    <input
                        id="auto-refresh-interval"
                        v-model="config.autoRefreshInterval"
                        type="number"
                        class="gizmo-native-control"
                        :min="5"
                        data-testid="refresh-interval-input"
                    />
                    <div class="gizmo-field-help">
                        {{ $t("Refresh Interval Description", [config.autoRefreshInterval]) }}
                    </div>
                </div>

                <div class="tw-my-3">
                    <label for="switch-theme" class="gizmo-field-label">{{ $t("Theme") }}</label>
                    <select id="switch-theme" v-model="config.theme" class="gizmo-native-control gizmo-native-select" data-testid="theme-select">
                        <option value="auto">{{ $t("Auto") }}</option>
                        <option value="light">{{ $t("Light") }}</option>
                        <option value="dark">{{ $t("Dark") }}</option>
                        <option v-for="theme in $root.info?.customThemes ?? []" :key="theme.id" :value="theme.id">
                            {{ theme.name }}
                        </option>
                    </select>
                </div>

                <div class="tw-my-3 gizmo-native-check gizmo-native-switch">
                    <input
                        id="showTags"
                        v-model="config.showTags"
                        class="gizmo-native-check__input"
                        type="checkbox"
                        data-testid="show-tags-checkbox"
                    />
                    <label class="gizmo-native-check__label" for="showTags">{{ $t("Show Tags") }}</label>
                </div>

                <!-- Show Powered By -->
                <div class="tw-my-3 gizmo-native-check gizmo-native-switch">
                    <input
                        id="show-powered-by"
                        v-model="config.showPoweredBy"
                        class="gizmo-native-check__input"
                        type="checkbox"
                        data-testid="show-powered-by-checkbox"
                    />
                    <label class="gizmo-native-check__label" for="show-powered-by">{{ $t("Show Powered By") }}</label>
                </div>

                <!-- Show certificate expiry -->
                <div class="tw-my-3 gizmo-native-check gizmo-native-switch">
                    <input
                        id="show-certificate-expiry"
                        v-model="config.showCertificateExpiry"
                        class="gizmo-native-check__input"
                        type="checkbox"
                        data-testid="show-certificate-expiry-checkbox"
                    />
                    <label class="gizmo-native-check__label" for="show-certificate-expiry">
                        {{ $t("showCertificateExpiry") }}
                    </label>
                </div>

                <!-- Show only last heartbeat -->
                <div class="tw-my-3 gizmo-native-check gizmo-native-switch">
                    <input
                        id="show-only-last-heartbeat"
                        v-model="config.showOnlyLastHeartbeat"
                        class="gizmo-native-check__input"
                        type="checkbox"
                    />
                    <label class="gizmo-native-check__label" for="show-only-last-heartbeat">
                        {{ $t("showOnlyLastHeartbeat") }}
                    </label>
                </div>

                <!-- Domain Name List -->
                <div class="tw-my-3">
                    <label class="gizmo-field-label">
                        {{ $t("Domain Names") }}
                        <button
                            class="tw-p-0 tw-bg-transparent tw-border-0"
                            :aria-label="$t('Add a domain')"
                            @click="addDomainField"
                        >
                            <font-awesome-icon icon="plus-circle" class="action tw-text-interactive" />
                        </button>
                    </label>

                    <ul class="gizmo-list-group domain-name-list">
                        <li v-for="(domain, index) in config.domainNameList" :key="index" class="gizmo-list-group__item">
                            <input
                                v-model="config.domainNameList[index]"
                                type="text"
                                class="no-bg domain-input"
                                placeholder="example.com"
                            />
                            <button
                                class="tw-p-0 tw-bg-transparent tw-border-0"
                                :aria-label="$t('Remove domain', [domain])"
                                @click="removeDomain(index)"
                            >
                                <font-awesome-icon icon="times" class="action remove tw-ms-2 tw-me-3 tw-text-status-down-fg" />
                            </button>
                        </li>
                    </ul>
                </div>

                <!-- Analytics -->

                <div class="tw-my-3">
                    <label for="analyticsType" class="gizmo-field-label">{{ $t("Analytics Type") }}</label>
                    <select
                        id="analyticsType"
                        v-model="config.analyticsType"
                        class="gizmo-native-control gizmo-native-select"
                        data-testid="analytics-type-select"
                    >
                        <option :value="null">{{ $t("None") }}</option>
                        <option value="google">Google</option>
                        <option value="umami">Umami</option>
                        <option value="plausible">Plausible</option>
                        <option value="matomo">Matomo</option>
                        <option value="rybbit">Rybbit</option>
                    </select>
                </div>

                <div v-if="!!config.analyticsType" class="tw-my-3">
                    <label for="analyticsId" class="gizmo-field-label">{{ $t("Analytics ID") }}</label>
                    <input
                        id="analyticsId"
                        v-model="config.analyticsId"
                        type="text"
                        class="gizmo-native-control"
                        data-testid="analytics-id-input"
                    />
                </div>

                <div v-if="!!config.analyticsType && config.analyticsType !== 'google'" class="tw-my-3">
                    <label for="analyticsScriptUrl" class="gizmo-field-label">{{ $t("Analytics Script URL") }}</label>
                    <input
                        id="analyticsScriptUrl"
                        v-model="config.analyticsScriptUrl"
                        type="url"
                        class="gizmo-native-control"
                        data-testid="analytics-script-url-input"
                    />
                </div>

                <!-- RSS Title -->
                <div class="tw-my-3">
                    <label for="rss-title" class="gizmo-field-label">{{ $t("RSS Title") }}</label>
                    <input
                        id="rss-title"
                        v-model="config.rssTitle"
                        type="text"
                        class="gizmo-native-control"
                        data-testid="rss-title-input"
                    />
                    <div class="gizmo-field-help">
                        {{ $t("Leave blank to use status page title") }}
                    </div>
                </div>

                <!-- Custom CSS -->
                <div class="tw-my-3">
                    <div class="tw-mb-1">{{ $t("Custom CSS") }}</div>
                    <prism-editor
                        v-model="config.customCSS"
                        class="css-editor"
                        data-testid="custom-css-input"
                        :highlight="highlighter"
                        line-numbers
                    ></prism-editor>
                </div>

                <div class="danger-zone">
                    <button class="gizmo-native-button gizmo-native-button--danger tw-me-2" @click="deleteDialog">
                        <font-awesome-icon icon="trash" />
                        {{ $t("Delete") }}
                    </button>
                </div>
            </div>

            <!-- Sidebar Footer -->
            <div class="sidebar-footer">
                <button class="gizmo-native-button gizmo-native-button--primary tw-me-2" :disabled="loading" data-testid="save-button" @click="save">
                    <font-awesome-icon icon="save" />
                    {{ $t("Save") }}
                </button>

                <button class="gizmo-native-button gizmo-native-button--danger tw-me-2" @click="discard">
                    <font-awesome-icon icon="undo" />
                    {{ $t("Discard") }}
                </button>
            </div>
        </div>

        <!-- Main Status Page -->
        <div class="main" :class="mainClass" data-testid="status-page-main">
            <h1 class="title-flex" :class="titleFlexClass" data-testid="status-page-title">
                <!-- Logo -->
                <span v-if="showStatusLogo" class="logo-wrapper" :class="logoWrapperClass" @click="showImageCropUploadMethod">
                    <button
                        v-if="editMode"
                        type="button"
                        class="tw-p-0 tw-bg-transparent tw-border-0 small-reset-btn reset-top-left"
                        @click.stop="resetToDefaultImage"
                    >
                        <font-awesome-icon icon="times" class="tw-text-status-down-fg" />
                    </button>
                    <img :src="logoURL" alt class="logo" :class="logoClass" />
                    <font-awesome-icon v-if="enableEditMode" class="icon-upload" icon="upload" />
                </span>

                <!-- Title -->
                <span class="status-page-heading">
                    <Editable
                        v-model="config.title"
                        class="status-page-title-text"
                        tag="span"
                        :contenteditable="editMode"
                        :noNL="true"
                    />
                </span>
            </h1>

            <!-- Uploader is out of the heading flex so it cannot sit between
                 the logo and the title. Absolute so .main's column gap skips it. -->
            <div class="status-page-cropper">
                <ImageCropUpload
                    v-model="showImageCropUpload"
                    field="img"
                    :width="256"
                    :height="256"
                    :langType="$i18n.locale"
                    img-format="png"
                    :noCircle="true"
                    :noSquare="false"
                    @crop-success="cropSuccess"
                />
            </div>

            <!-- Admin functions -->
            <div v-if="hasToken" class="status-page-admin">
                <div v-if="!enableEditMode">
                    <button class="gizmo-native-button gizmo-native-button--primary" data-testid="edit-button" @click="edit">
                        <font-awesome-icon icon="edit" />
                        {{ $t("Edit Status Page") }}
                    </button>

                    <a href="/manage-status-page" class="gizmo-native-button">
                        <font-awesome-icon icon="tachometer-alt" />
                        {{ $t("Go to Dashboard") }}
                    </a>
                </div>

                <div v-else>
                    <button
                        class="gizmo-native-button gizmo-native-button--primary btn-add-group"
                        data-testid="create-incident-button"
                        @click="createIncident"
                    >
                        <font-awesome-icon icon="bullhorn" />
                        {{ $t("Create Incident") }}
                    </button>
                </div>
            </div>

            <!-- Incident Edit Form -->
            <IncidentEditForm
                v-if="
                    editIncidentMode &&
                    incident !== null &&
                    (!incident.id || !activeIncidents.some((i) => i.id === incident.id))
                "
                v-model="incident"
                @post="postIncident"
                @cancel="cancelIncident"
            />

            <!-- Active Pinned Incidents -->

            <!-- Overall Status -->
            <div class="overall-status" :class="overallStatusToneClass" role="status">
                <div v-if="Object.keys($root.publicMonitorList).length === 0 && loadedData">
                    <font-awesome-icon icon="question-circle" />
                    {{ $t("No Services") }}
                </div>

                <template v-else>
                    <div v-if="allUp">
                        <font-awesome-icon icon="check-circle" />
                        {{ $t("All Systems Operational") }}
                    </div>

                    <div v-else-if="partialDown">
                        <font-awesome-icon icon="exclamation-circle" />
                        {{ $t("Partially Degraded Service") }}
                    </div>

                    <div v-else-if="allDown">
                        <font-awesome-icon icon="times-circle" />
                        {{ $t("Degraded Service") }}
                    </div>

                    <div v-else-if="isMaintenance">
                        <font-awesome-icon icon="wrench" />
                        {{ $t("maintenanceStatus-under-maintenance") }}
                    </div>

                    <div v-else>
                        <font-awesome-icon icon="question-circle" />
                    </div>
                </template>
            </div>

            <!-- Maintenance -->
            <template v-if="maintenanceList.length > 0">
                <div
                    v-for="maintenance in maintenanceList"
                    :key="maintenance.id"
                    class="status-notice status-notice--maintenance"
                    role="alert"
                >
                    <h4 class="status-notice__title">{{ maintenance.title }}</h4>
                    <!-- eslint-disable-next-line vue/no-v-html-->
                    <div class="content" v-html="maintenanceHTML(maintenance.description)"></div>
                    <MaintenanceTime :maintenance="maintenance" />
                </div>
            </template>

            <!-- Description -->
            <strong v-if="editMode">{{ $t("Description") }}:</strong>
            <Editable
                v-if="enableEditMode"
                v-model="config.description"
                :contenteditable="editMode"
                tag="div"
                class="status-page-description"
                data-testid="description-editable"
            />
            <!-- eslint-disable vue/no-v-html-->
            <div
                v-if="!enableEditMode && descriptionHTML"
                class="status-page-description"
                data-testid="description"
                v-html="descriptionHTML"
            ></div>
            <!-- eslint-enable vue/no-v-html-->

            <!--
                Incidents come after the headline and its description. Reading
                about one service before learning whether the platform as a whole
                is healthy answers the second question first.
            -->
            <template v-for="activeIncident in activeIncidents" :key="activeIncident.id">
                <!-- Edit mode for this specific incident -->
                <IncidentEditForm
                    v-if="editIncidentMode && incident !== null && incident.id === activeIncident.id"
                    v-model="incident"
                    @post="postIncident"
                    @cancel="cancelIncident"
                />
                <!-- Display mode for this incident -->
                <div
                    v-else
                    class="status-notice incident"
                    role="alert"
                    :class="incidentClass(activeIncident.style)"
                    data-testid="incident"
                >
                    <h4 class="status-notice__title" data-testid="incident-title">{{ activeIncident.title }}</h4>
                    <!-- eslint-disable vue/no-v-html -->
                    <div
                        class="content"
                        data-testid="incident-content"
                        v-html="getIncidentHTML(activeIncident.content)"
                    ></div>
                    <!-- eslint-enable vue/no-v-html -->
                    <!-- Incident Date -->
                    <div class="status-notice__meta date">
                        {{
                            $t("dateCreatedAtFromNow", {
                                date: $root.datetime(activeIncident.createdDate),
                                fromNow: dateFromNow(activeIncident.createdDate),
                            })
                        }}
                        <br />
                        <span v-if="activeIncident.lastUpdatedDate">
                            {{
                                $t("lastUpdatedAtFromNow", {
                                    date: $root.datetime(activeIncident.lastUpdatedDate),
                                    fromNow: dateFromNow(activeIncident.lastUpdatedDate),
                                })
                            }}
                        </span>
                    </div>
                    <div v-if="editMode" class="tw-mt-3">
                        <button class="gizmo-native-button gizmo-native-button--light tw-me-2" @click="resolveIncident(activeIncident)">
                            <font-awesome-icon icon="check" />
                            {{ $t("Resolve") }}
                        </button>
                        <button class="gizmo-native-button gizmo-native-button--light tw-me-2" @click="editIncident(activeIncident)">
                            <font-awesome-icon icon="edit" />
                            {{ $t("Edit") }}
                        </button>
                        <button
                            class="gizmo-native-button gizmo-native-button--light tw-me-2"
                            @click="$refs.incidentManageModal.showDelete(activeIncident)"
                        >
                            <font-awesome-icon icon="unlink" />
                            {{ $t("Delete") }}
                        </button>
                    </div>
                </div>
            </template>

            <div v-if="editMode" class="status-page-editor-tools">
                <div>
                    <button class="gizmo-native-button gizmo-native-button--primary btn-add-group tw-me-2" data-testid="add-group-button" @click="addGroup">
                        <font-awesome-icon icon="plus" />
                        {{ $t("Add Group") }}
                    </button>
                </div>

                <div class="tw-mt-3">
                    <div v-if="sortedMonitorList.length > 0 && loadedData">
                        <label>{{ $t("Add a monitor") }}:</label>
                        <VueMultiselect
                            v-model="selectedMonitor"
                            :options="sortedMonitorList"
                            :multiple="false"
                            :searchable="true"
                            :placeholder="$t('Add a monitor')"
                            label="name"
                            trackBy="name"
                            class="tw-mt-3"
                            data-testid="monitor-select"
                        >
                            <template #option="{ option }">
                                <div class="tw-inline-flex">
                                    <span>
                                        {{ option.pathName }}
                                        <Tag v-for="tag in option.tags" :key="tag" :item="tag" :size="'sm'" />
                                    </span>
                                </div>
                            </template>
                        </VueMultiselect>
                    </div>
                    <div v-else class="status-page-no-monitors">
                        <p>{{ $t("No monitors available.") }}</p>
                        <router-link to="/add" class="gizmo-native-button gizmo-native-button--primary gizmo-native-button--sm">
                            {{ $t("Add one") }}
                        </router-link>
                    </div>
                </div>
            </div>

            <div class="status-page-services">
                <div
                    v-if="enableEditMode && $root.publicGroupList.length === 0 && loadedData"
                    class="status-page-empty"
                >
                    {{ $t("statusPageNothing") }}
                </div>

                <PublicGroupList
                    :edit-mode="enableEditMode"
                    :show-tags="config.showTags"
                    :show-certificate-expiry="config.showCertificateExpiry"
                    :show-only-last-heartbeat="config.showOnlyLastHeartbeat"
                />
            </div>

            <!-- Past Incidents -->
            <div v-if="pastIncidentCount > 0" class="past-incidents-section">
                <h2 class="past-incidents-title">
                    {{ $t("Past Incidents") }}
                </h2>

                <div class="past-incidents-content">
                    <div
                        v-for="(dateGroup, dateKey) in groupedIncidentHistory"
                        :key="dateKey"
                        class="incident-date-group"
                    >
                        <h3 class="incident-date-header">{{ dateKey }}</h3>
                        <IncidentHistory
                            :incidents="dateGroup"
                            :edit-mode="enableEditMode"
                            :loading="incidentHistoryLoading"
                            @edit-incident="$refs.incidentManageModal.showEdit($event)"
                            @delete-incident="$refs.incidentManageModal.showDelete($event)"
                            @resolve-incident="resolveIncident"
                        />
                    </div>

                    <div v-if="incidentHistoryHasMore" class="load-more-controls">
                        <button
                            class="gizmo-native-button gizmo-native-button--sm"
                            :disabled="incidentHistoryLoading"
                            @click="loadMoreIncidentHistory"
                        >
                            <span
                                v-if="incidentHistoryLoading"
                                class="gizmo-spinner-inline gizmo-spinner-inline--sm tw-me-1"
                                role="status"
                            ></span>
                            {{ $t("Load More") }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Incident Manage Modal -->
            <IncidentManageModal
                v-if="enableEditMode"
                ref="incidentManageModal"
                :slug="slug"
                @incident-updated="loadIncidentHistory"
            />

            <footer class="status-page-footer">
                <img
                    class="status-page-mascot"
                    src="/images/gizmo-mascot-engineer-cutout.webp"
                    alt=""
                    width="448"
                    height="448"
                    loading="lazy"
                    decoding="async"
                >
                <div v-if="enableEditMode" class="custom-footer-text">
                    <strong>{{ $t("Custom Footer") }}:</strong>
                </div>
                <Editable
                    v-if="enableEditMode"
                    v-model="config.footerText"
                    tag="div"
                    :contenteditable="enableEditMode"
                    :noNL="false"
                    class="status-page-footer-text"
                    data-testid="custom-footer-editable"
                />
                <!-- eslint-disable vue/no-v-html-->
                <div
                    v-if="!enableEditMode && footerHTML"
                    class="status-page-footer-text"
                    data-testid="footer-text"
                    v-html="footerHTML"
                ></div>
                <!-- eslint-enable vue/no-v-html-->

                <p v-if="config.showPoweredBy" data-testid="powered-by">
                    {{ $t("Powered by") }}
                    <a
                        href="https://github.com/starit/uptime-gizmo"
                        target="_blank"
                        rel="noopener noreferrer"
                    >{{ $root.appName }}</a>
                </p>

                <div class="refresh-info">
                    <div>{{ $t("lastUpdatedAt", { date: lastUpdateTimeDisplay }) }}</div>
                    <div data-testid="update-countdown-text">
                        {{ $t("statusPageRefreshIn", [updateCountdownText]) }}
                    </div>
                </div>
            </footer>
        </div>

        <Confirm
            ref="confirmDelete"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="deleteStatusPage"
        >
            {{ $t("deleteStatusPageMsg") }}
        </Confirm>

        <component is="style" v-if="config.customCSS" type="text/css">
            {{ config.customCSS }}
        </component>
    </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import Favico from "favico.js";
// import highlighting library (you can use any library you want just return html string)
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-css";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles
import ImageCropUpload from "vue-image-crop-upload";
// import Prism Editor
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere
import { useToast } from "vue-toastification";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Confirm from "../components/Confirm.vue";
import PublicGroupList from "../components/PublicGroupList.vue";
import MaintenanceTime from "../components/MaintenanceTime.vue";
import IncidentHistory from "../components/IncidentHistory.vue";
import IncidentManageModal from "../components/IncidentManageModal.vue";
import IncidentEditForm from "../components/IncidentEditForm.vue";
import { getResBaseURL } from "../util-frontend";
import { loadStatusPageFont, prefetchStatusPageFonts } from "../util-status-page-fonts";
import {
    STATUS_PAGE_ALL_DOWN,
    STATUS_PAGE_ALL_UP,
    STATUS_PAGE_MAINTENANCE,
    STATUS_PAGE_PARTIAL_DOWN,
    UP,
    MAINTENANCE,
} from "../util.ts";
import Tag from "../components/Tag.vue";
import VueMultiselect from "vue-multiselect";

const toast = useToast();
dayjs.extend(duration);

const leavePageMsg = "Do you really want to leave? you have unsaved changes!";

// eslint-disable-next-line no-unused-vars
let feedInterval;

const favicon = new Favico({
    animation: "none",
});

export default {
    components: {
        PublicGroupList,
        ImageCropUpload,
        Confirm,
        PrismEditor,
        MaintenanceTime,
        Tag,
        VueMultiselect,
        IncidentHistory,
        IncidentManageModal,
        IncidentEditForm,
    },

    // Leave Page for vue route change
    beforeRouteLeave(to, from, next) {
        if (this.editMode) {
            const answer = window.confirm(leavePageMsg);
            if (answer) {
                next();
            } else {
                next(false);
            }
        }
        next();
    },

    props: {
        /** Override for the status page slug */
        overrideSlug: {
            type: String,
            required: false,
            default: null,
        },
    },

    data() {
        return {
            slug: null,
            enableEditMode: false,
            enableEditIncidentMode: false,
            hasToken: false,
            config: {
                analyticsType: null,
                iconSize: "md",
                iconPosition: "left",
                titleSize: "md",
                textSize: "md",
                font: "sans",
            },
            selectedMonitor: null,
            incident: null,
            previousIncident: null,
            showImageCropUpload: false,
            imgDataUrl: "/icon-512x512.png",
            loadedTheme: false,
            loadedData: false,
            baseURL: "",
            clickedEditButton: false,
            maintenanceList: [],
            lastUpdateTime: dayjs(),
            updateCountdown: null,
            updateCountdownText: null,
            loading: true,
            incidentHistory: [],
            incidentHistoryLoading: false,
            incidentHistoryNextCursor: null,
            incidentHistoryHasMore: false,
        };
    },
    computed: {
        logoURL() {
            if (this.imgDataUrl.startsWith("data:")) {
                return this.imgDataUrl;
            } else {
                return this.baseURL + this.imgDataUrl;
            }
        },

        /**
         * If the monitor is added to public list, which will not be in this list.
         * @returns {object[]} List of monitors
         */
        sortedMonitorList() {
            let result = [];

            for (let id in this.$root.monitorList) {
                if (this.$root.monitorList[id] && !(id in this.$root.publicMonitorList)) {
                    let monitor = this.$root.monitorList[id];
                    result.push(monitor);
                }
            }

            result.sort((m1, m2) => {
                if (m1.active !== m2.active) {
                    if (m1.active === 0) {
                        return 1;
                    }

                    if (m2.active === 0) {
                        return -1;
                    }
                }

                if (m1.weight !== m2.weight) {
                    if (m1.weight > m2.weight) {
                        return -1;
                    }

                    if (m1.weight < m2.weight) {
                        return 1;
                    }
                }

                return m1.pathName.localeCompare(m2.pathName);
            });

            return result;
        },

        editMode() {
            return this.enableEditMode && this.$root.socket.connected;
        },

        editIncidentMode() {
            return this.enableEditIncidentMode;
        },

        isPublished() {
            return this.config.published;
        },

        logoClass() {
            if (this.editMode) {
                return {
                    "edit-mode": true,
                };
            }
            return {};
        },

        /**
         * Display size for the header logo. Unknown values fall back to medium.
         * @returns {"sm"|"md"|"lg"} sm, md, or lg
         */
        logoSize() {
            const size = this.config.iconSize;
            return size === "sm" || size === "lg" ? size : "md";
        },

        /**
         * Placement for the header logo. Unknown values fall back to left of the title.
         * @returns {"left"|"above"|"hidden"} left, above, or hidden
         */
        logoPosition() {
            const position = this.config.iconPosition;
            return position === "above" || position === "hidden" ? position : "left";
        },

        /**
         * Display size for the page title. Unknown values fall back to medium.
         * @returns {"sm"|"md"|"lg"} sm, md, or lg
         */
        titleSize() {
            const size = this.config.titleSize;
            return size === "sm" || size === "lg" ? size : "md";
        },

        /**
         * Size for body copy. Unknown values fall back to medium.
         * @returns {"sm"|"md"|"lg"} sm, md, or lg
         */
        textSize() {
            const size = this.config.textSize;
            return size === "sm" || size === "lg" ? size : "md";
        },

        /**
         * Typeface for the public page (title and body). Unknown values fall back to sans.
         * @returns {"sans"|"serif"|"mono"|"display"} sans, serif, mono, or display
         */
        pageFont() {
            const font = this.config.font;
            return font === "serif" || font === "mono" || font === "display" ? font : "sans";
        },

        /**
         * Hide the logo for visitors when the operator chose Hidden; keep it
         * visible in edit mode so they can still replace it.
         * @returns {boolean} Whether the logo should render
         */
        showStatusLogo() {
            return this.logoPosition !== "hidden" || this.editMode;
        },

        titleFlexClass() {
            return {
                "title-flex--logo-sm": this.logoSize === "sm",
                "title-flex--logo-md": this.logoSize === "md",
                "title-flex--logo-lg": this.logoSize === "lg",
                "title-flex--above": this.logoPosition === "above",
                "title-flex--no-logo": !this.showStatusLogo,
                "title-flex--title-sm": this.titleSize === "sm",
                "title-flex--title-md": this.titleSize === "md",
                "title-flex--title-lg": this.titleSize === "lg",
            };
        },

        /**
         * Edit offset plus the public typeface and body size.
         * @returns {object} Class map for `.main`
         */
        mainClass() {
            return {
                edit: this.enableEditMode,
                "status-page-main--font-sans": this.pageFont === "sans",
                "status-page-main--font-serif": this.pageFont === "serif",
                "status-page-main--font-mono": this.pageFont === "mono",
                "status-page-main--font-display": this.pageFont === "display",
                "status-page-main--text-sm": this.textSize === "sm",
                "status-page-main--text-md": this.textSize === "md",
                "status-page-main--text-lg": this.textSize === "lg",
            };
        },

        logoWrapperClass() {
            return {
                "logo-wrapper--preview-hidden": this.logoPosition === "hidden" && this.editMode,
            };
        },

        overallStatus() {
            if (Object.keys(this.$root.publicLastHeartbeatList).length === 0) {
                return -1;
            }

            let status = STATUS_PAGE_ALL_UP;
            let hasUp = false;

            for (let id in this.$root.publicLastHeartbeatList) {
                let beat = this.$root.publicLastHeartbeatList[id];

                if (beat.status === MAINTENANCE) {
                    return STATUS_PAGE_MAINTENANCE;
                } else if (beat.status === UP) {
                    hasUp = true;
                } else {
                    status = STATUS_PAGE_PARTIAL_DOWN;
                }
            }

            if (!hasUp) {
                status = STATUS_PAGE_ALL_DOWN;
            }

            return status;
        },

        allUp() {
            return this.overallStatus === STATUS_PAGE_ALL_UP;
        },

        partialDown() {
            return this.overallStatus === STATUS_PAGE_PARTIAL_DOWN;
        },

        allDown() {
            return this.overallStatus === STATUS_PAGE_ALL_DOWN;
        },

        isMaintenance() {
            return this.overallStatus === STATUS_PAGE_MAINTENANCE;
        },

        /**
         * Token class for the overall-status banner. Empty and unknown share
         * the same plate; colour still comes with an icon and a label.
         * @returns {string} overall-status tone class
         */
        overallStatusToneClass() {
            if (Object.keys(this.$root.publicMonitorList).length === 0 && this.loadedData) {
                return "overall-status--unknown";
            }
            if (this.allUp) {
                return "overall-status--up";
            }
            if (this.partialDown) {
                return "overall-status--degraded";
            }
            if (this.allDown) {
                return "overall-status--down";
            }
            if (this.isMaintenance) {
                return "overall-status--maintenance";
            }
            return "overall-status--unknown";
        },

        incidentHTML() {
            if (this.incident && this.incident.content != null) {
                return DOMPurify.sanitize(marked(this.incident.content));
            } else {
                return "";
            }
        },

        descriptionHTML() {
            if (this.config.description == null || !String(this.config.description).trim()) {
                return "";
            }
            return DOMPurify.sanitize(marked(this.config.description));
        },

        footerHTML() {
            if (this.config.footerText == null || !String(this.config.footerText).trim()) {
                return "";
            }
            return DOMPurify.sanitize(marked(this.config.footerText));
        },

        lastUpdateTimeDisplay() {
            return this.$root.datetime(this.lastUpdateTime);
        },

        /**
         * Get all active pinned incidents for display at the top
         * @returns {object[]} List of active pinned incidents
         */
        activeIncidents() {
            return this.incidentHistory.filter((i) => i.active && i.pin);
        },

        /**
         * Count of past incidents (non-active or unpinned)
         * @returns {number} Number of past incidents
         */
        pastIncidentCount() {
            return this.incidentHistory.filter((i) => !(i.active && i.pin)).length;
        },

        /**
         * Group past incidents (non-active or unpinned) by date for display
         * Active+pinned incidents are shown separately at the top, not in this section
         * @returns {object} Incidents grouped by date string
         */
        groupedIncidentHistory() {
            const groups = {};
            const pastIncidents = this.incidentHistory.filter((i) => !(i.active && i.pin));
            for (const incident of pastIncidents) {
                const dateKey = this.formatDateKey(incident.createdDate);
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(incident);
            }
            return groups;
        },
    },
    watch: {
        pageFont: {
            immediate: true,
            handler(font) {
                loadStatusPageFont(font);
            },
        },

        enableEditMode(editing) {
            if (editing) {
                prefetchStatusPageFonts();
            }
        },

        /**
         * If connected to the socket and logged in, request private data of this statusPage
         * @param {boolean} loggedIn Is the client logged in?
         * @returns {void}
         */
        "$root.loggedIn"(loggedIn) {
            if (loggedIn) {
                this.$root.getSocket().emit("getStatusPage", this.slug, (res) => {
                    if (res.ok) {
                        this.applyStatusPageConfig(res.config, { editor: true });
                    } else {
                        this.$root.toastError(res.msg);
                    }
                });
            }
        },

        /**
         * Selected a monitor and add to the list.
         * @param {object} monitor Monitor to add
         * @returns {void}
         */
        selectedMonitor(monitor) {
            if (monitor) {
                if (this.$root.publicGroupList.length === 0) {
                    this.addGroup();
                }

                const firstGroup = this.$root.publicGroupList[0];

                firstGroup.monitorList.push(monitor);
                this.selectedMonitor = null;
            }
        },

        // Set Theme
        "config.theme"() {
            this.$root.statusPageTheme = this.config.theme;
            this.loadedTheme = true;
        },

        "config.title"(title) {
            document.title = title;
        },

        "$root.monitorList"() {
            let count = Object.keys(this.$root.monitorList).length;

            // Since publicGroupList is getting from public rest api, monitors' tags may not present if showTags = false
            if (count > 0) {
                for (let group of this.$root.publicGroupList) {
                    for (let monitor of group.monitorList) {
                        if (monitor.tags === undefined && this.$root.monitorList[monitor.id]) {
                            monitor.tags = this.$root.monitorList[monitor.id].tags;
                        }
                    }
                }
            }
        },
    },
    async created() {
        this.hasToken = "token" in this.$root.storage();

        // Browser change page
        // https://stackoverflow.com/questions/7317273/warn-user-before-leaving-web-page-with-unsaved-changes
        window.addEventListener("beforeunload", (e) => {
            if (this.editMode) {
                (e || window.event).returnValue = leavePageMsg;
                return leavePageMsg;
            } else {
                return null;
            }
        });

        // Special handle for dev
        this.baseURL = getResBaseURL();
    },
    async mounted() {
        this.slug = this.overrideSlug || this.$route.params.slug;

        if (!this.slug) {
            this.slug = "default";
        }

        this.getData()
            .then((res) => {
                this.applyStatusPageConfig(res.data.config);

                if (this.config.icon) {
                    this.imgDataUrl = this.config.icon;
                }

                this.maintenanceList = res.data.maintenanceList;
                this.$root.publicGroupList = res.data.publicGroupList;

                this.loading = false;

                feedInterval = setInterval(
                    () => {
                        this.updateHeartbeatList();
                    },
                    Math.max(5, this.config.autoRefreshInterval) * 1000
                );

                this.incident = res.data.incident;
                this.maintenanceList = res.data.maintenanceList;
                this.$root.publicGroupList = res.data.publicGroupList;

                this.loading = false;

                // Configure auto-refresh loop
                feedInterval = setInterval(
                    () => {
                        this.updateHeartbeatList();
                    },
                    Math.max(5, this.config.autoRefreshInterval) * 1000
                );

                this.updateUpdateTimer();
            })
            .catch(function (error) {
                if (error.response.status === 404) {
                    location.href = "/page-not-found";
                }
                console.log(error);
            });

        this.updateHeartbeatList();
        this.loadIncidentHistory();

        // Go to edit page if ?edit present
        // null means ?edit present, but no value
        if (this.$route.query.edit || this.$route.query.edit === null) {
            this.edit();
        }
    },
    methods: {
        /**
         * Apply a status-page config payload and fill in display defaults.
         * @param {object} config Status page config from the API or socket
         * @param {{ editor?: boolean }} options When `editor` is set, empty custom CSS becomes a starter snippet
         * @returns {void}
         */
        applyStatusPageConfig(config, options = {}) {
            this.config = config || {};

            if (!this.config.domainNameList) {
                this.config.domainNameList = [];
            }

            if (options.editor && !this.config.customCSS) {
                this.config.customCSS = "body {\n" + "  \n" + "}\n";
            }

            const size = this.config.iconSize;
            this.config.iconSize = size === "sm" || size === "lg" ? size : "md";

            const position = this.config.iconPosition;
            this.config.iconPosition = position === "above" || position === "hidden" ? position : "left";

            const titleSize = this.config.titleSize;
            this.config.titleSize = titleSize === "sm" || titleSize === "lg" ? titleSize : "md";

            const textSize = this.config.textSize;
            this.config.textSize = textSize === "sm" || textSize === "lg" ? textSize : "md";

            const font = this.config.font ?? this.config.titleFont;
            this.config.font = font === "serif" || font === "mono" || font === "display" ? font : "sans";
        },

        /**
         * The banner class for an incident's chosen style.
         *
         * Written out rather than built from the value. The class used to be
         * concatenated, so the build never saw the literal name and dropped the
         * rule for every style except maintenance — which survived only because
         * a different element happens to spell it out. Incident banners reached
         * the public status page with no colour at all, and only in a production
         * build, where the unused-class sweep runs.
         * @param {string} style the style stored on the incident
         * @returns {string} a class the build can see
         */
        incidentClass(style) {
            return {
                info: "status-notice--info",
                warning: "status-notice--warning",
                danger: "status-notice--danger",
                primary: "status-notice--primary",
                light: "status-notice--light",
                dark: "status-notice--dark",
            }[style] ?? "status-notice--info";
        },

        /**
         * Get status page data
         * It should be preloaded in window.preloadData
         * @returns {Promise<any>} Status page data
         */
        getData: function () {
            if (window.preloadData) {
                return new Promise((resolve) =>
                    resolve({
                        data: window.preloadData,
                    })
                );
            } else {
                return axios.get("/api/status-page/" + this.slug);
            }
        },

        /**
         * Provide syntax highlighting for CSS
         * @param {string} code Text to highlight
         * @returns {string} Highlighted CSS
         */
        highlighter(code) {
            return highlight(code, languages.css);
        },

        /**
         * Update the heartbeat list and update favicon if necessary
         * @returns {void}
         */
        updateHeartbeatList() {
            // If editMode, it will use the data from websocket.
            if (!this.editMode) {
                axios.get("/api/status-page/heartbeat/" + this.slug).then((res) => {
                    const { heartbeatList, uptimeList } = res.data;

                    this.$root.heartbeatList = heartbeatList;
                    this.$root.uptimeList = uptimeList;

                    const heartbeatIds = Object.keys(heartbeatList);
                    const downMonitors = heartbeatIds.reduce((downMonitorsAmount, currentId) => {
                        const monitorHeartbeats = heartbeatList[currentId];
                        const lastHeartbeat = monitorHeartbeats.at(-1);

                        if (lastHeartbeat) {
                            return lastHeartbeat.status === 0 ? downMonitorsAmount + 1 : downMonitorsAmount;
                        } else {
                            return downMonitorsAmount;
                        }
                    }, 0);

                    favicon.badge(downMonitors);

                    this.loadedData = true;
                    this.lastUpdateTime = dayjs();
                    this.updateUpdateTimer();
                });
            }
        },

        /**
         * Setup timer to display countdown to refresh
         * @returns {void}
         */
        updateUpdateTimer() {
            clearInterval(this.updateCountdown);

            this.updateCountdown = setInterval(() => {
                // rounding here as otherwise we sometimes skip numbers in cases of time drift
                const countdown = dayjs.duration(
                    Math.round(
                        this.lastUpdateTime.add(Math.max(5, this.config.autoRefreshInterval), "seconds").diff(dayjs()) /
                            1000
                    ),
                    "seconds"
                );

                if (countdown.as("seconds") < 0) {
                    clearInterval(this.updateCountdown);
                } else {
                    this.updateCountdownText = countdown.format("mm:ss");
                }
            }, 1000);
        },

        /**
         * Enable editing mode
         * @returns {void}
         */
        edit() {
            if (this.hasToken) {
                this.$root.initSocketIO(true);
                this.enableEditMode = true;
                this.clickedEditButton = true;

                // Try to fix #1658
                this.loadedData = true;
            }
        },

        /**
         * Save the status page
         * @returns {void}
         */
        save() {
            this.loading = true;
            let startTime = new Date();
            this.config.slug = this.config.slug.trim().toLowerCase();

            this.$root
                .getSocket()
                .emit("saveStatusPage", this.slug, this.config, this.imgDataUrl, this.$root.publicGroupList, (res) => {
                    if (res.ok) {
                        this.enableEditMode = false;
                        this.$root.publicGroupList = res.publicGroupList;

                        // Add some delay, so that the side menu animation would be better
                        let endTime = new Date();
                        let time = 100 - (endTime - startTime) / 1000;

                        if (time < 0) {
                            time = 0;
                        }

                        setTimeout(() => {
                            this.loading = false;
                            location.href = "/status/" + this.config.slug;
                        }, time);
                    } else {
                        this.loading = false;
                        toast.error(res.msg);
                    }
                });
        },

        /**
         * Show dialog confirming deletion
         * @returns {void}
         */
        deleteDialog() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Request deletion of this status page
         * @returns {void}
         */
        deleteStatusPage() {
            this.$root.getSocket().emit("deleteStatusPage", this.slug, (res) => {
                if (res.ok) {
                    this.enableEditMode = false;
                    location.href = "/manage-status-page";
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },

        /**
         * Returns label for a specified monitor
         * @param {object} monitor Object representing monitor
         * @returns {string} Monitor label
         */
        monitorSelectorLabel(monitor) {
            return `${monitor.name}`;
        },

        /**
         * Add a group to the status page
         * @returns {void}
         */
        addGroup() {
            let groupName = this.$t("Untitled Group");

            if (this.$root.publicGroupList.length === 0) {
                groupName = this.$t("Services");
            }

            this.$root.publicGroupList.unshift({
                name: groupName,
                monitorList: [],
            });
        },

        /**
         * Add a domain to the status page
         * @returns {void}
         */
        addDomainField() {
            this.config.domainNameList.push("");
        },

        /**
         * Discard changes to status page
         * @returns {void}
         */
        discard() {
            location.href = "/status/" + this.slug;
        },

        /**
         * Set URL of new image after successful crop operation
         * @param {string} imgDataUrl URL of image in data:// format
         * @returns {void}
         */
        cropSuccess(imgDataUrl) {
            this.imgDataUrl = imgDataUrl;
        },

        /**
         * Show image crop dialog if in edit mode
         * @returns {void}
         */
        showImageCropUploadMethod() {
            if (this.editMode) {
                this.showImageCropUpload = true;
            }
        },

        /**
         * Reset logo image to the default Uptime Gizmo mark.
         * @returns {void}
         */
        resetToDefaultImage() {
            if (!this.editMode) {
                return;
            }

            this.imgDataUrl = "/icon-512x512.png";
            this.config.icon = this.imgDataUrl;
            toast.success(this.$t("imageResetConfirmation"));
        },

        /**
         * Create an incident for this status page
         * @returns {void}
         */
        createIncident() {
            this.enableEditIncidentMode = true;

            if (this.incident) {
                this.previousIncident = this.incident;
            }

            this.incident = {
                title: "",
                content: "",
                style: "primary",
            };
        },

        /**
         * Post the incident to the status page
         * @returns {void}
         */
        postIncident() {
            if (this.incident.title === "" || this.incident.content === "") {
                this.$root.toastError("Please input title and content");
                return;
            }

            this.$root.getSocket().emit("postIncident", this.slug, this.incident, (res) => {
                if (res.ok) {
                    this.enableEditIncidentMode = false;
                    this.incident = null;
                    this.loadIncidentHistory();
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },

        /**
         * Edit an incident inline
         * @param {object} incident - The incident to edit
         * @returns {void}
         */
        editIncident(incident) {
            this.previousIncident = this.incident;
            this.incident = { ...incident };
            this.enableEditIncidentMode = true;
        },

        /**
         * Cancel creation or editing of incident
         * @returns {void}
         */
        cancelIncident() {
            this.enableEditIncidentMode = false;

            if (this.previousIncident) {
                this.incident = this.previousIncident;
                this.previousIncident = null;
            }
        },

        /**
         * Unpin the incident
         * @returns {void}
         */
        unpinIncident() {
            this.$root.getSocket().emit("unpinIncident", this.slug, () => {
                this.incident = null;
            });
        },

        /**
         * Get HTML for incident content
         * @param {string} content - Markdown content
         * @returns {string} Sanitized HTML
         */
        getIncidentHTML(content) {
            if (content != null) {
                return DOMPurify.sanitize(marked(content));
            }
            return "";
        },

        /**
         * Get the relative time difference of a date from now
         * @param {any} date Date to get time difference
         * @returns {string} Time difference
         */
        dateFromNow(date) {
            return dayjs.utc(date).fromNow();
        },

        /**
         * Remove a domain from the status page
         * @param {number} index Index of domain to remove
         * @returns {void}
         */
        removeDomain(index) {
            this.config.domainNameList.splice(index, 1);
        },

        /**
         * Generate sanitized HTML from maintenance description
         * @param {string} description Text to sanitize
         * @returns {string} Sanitized HTML
         */
        maintenanceHTML(description) {
            if (description) {
                return DOMPurify.sanitize(marked(description));
            } else {
                return "";
            }
        },

        /**
         * Load incident history for the status page
         * @returns {void}
         */
        loadIncidentHistory() {
            this.loadIncidentHistoryWithCursor(null);
        },

        /**
         * Load incident history using cursor-based pagination
         * @param {string|null} cursor - Cursor for pagination (created_date of last item)
         * @param {boolean} append - Whether to append to existing list
         * @returns {void}
         */
        loadIncidentHistoryWithCursor(cursor, append = false) {
            this.incidentHistoryLoading = true;

            if (this.enableEditMode) {
                this.$root.getSocket().emit("getIncidentHistory", this.slug, cursor, (res) => {
                    this.incidentHistoryLoading = false;
                    if (res.ok) {
                        if (append) {
                            this.incidentHistory = [...this.incidentHistory, ...res.incidents];
                        } else {
                            this.incidentHistory = res.incidents;
                        }
                        this.incidentHistoryNextCursor = res.nextCursor;
                        this.incidentHistoryHasMore = res.hasMore;
                    } else {
                        console.error("Failed to load incident history:", res.msg);
                        this.$root.toastError(res.msg);
                    }
                });
            } else {
                const url = cursor
                    ? `/api/status-page/${this.slug}/incident-history?cursor=${encodeURIComponent(cursor)}`
                    : `/api/status-page/${this.slug}/incident-history`;
                axios
                    .get(url)
                    .then((res) => {
                        this.incidentHistoryLoading = false;
                        if (res.data.ok) {
                            if (append) {
                                this.incidentHistory = [...this.incidentHistory, ...res.data.incidents];
                            } else {
                                this.incidentHistory = res.data.incidents;
                            }
                            this.incidentHistoryNextCursor = res.data.nextCursor;
                            this.incidentHistoryHasMore = res.data.hasMore;
                        }
                    })
                    .catch((error) => {
                        this.incidentHistoryLoading = false;
                        console.error("Failed to load incident history:", error);
                    });
            }
        },

        /**
         * Load more incident history using cursor-based pagination
         * @returns {void}
         */
        loadMoreIncidentHistory() {
            if (this.incidentHistoryHasMore && this.incidentHistoryNextCursor) {
                this.loadIncidentHistoryWithCursor(this.incidentHistoryNextCursor, true);
            }
        },

        /**
         * Format date key for grouping (e.g., "December 8, 2025")
         * @param {string} dateStr - ISO date string
         * @returns {string} Formatted date key
         */
        formatDateKey(dateStr) {
            if (!dateStr) {
                return this.$t("Unknown");
            }
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        },

        /**
         * Resolve an incident
         * @param {object} incident - The incident to resolve
         * @returns {void}
         */
        resolveIncident(incident) {
            this.$root.getSocket().emit("resolveIncident", this.slug, incident.id, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadIncidentHistory();
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.status-page-shell {
    /* Wide enough for the service list and heartbeat, still a composed page
       rather than the private workspace's 1040px canvas. */
    position: relative;
    box-sizing: border-box;
    width: 100%;
    max-width: 68rem;
    margin-inline: auto;
    padding: 1.75rem 1.25rem 2.5rem;
}

@media (max-width: 40rem) {
    .status-page-shell {
        padding: 1.25rem 1rem 2rem;
    }
}

.main {
    --status-font: "IBM Plex Sans", "Noto Sans", "PingFang SC", "Hiragino Sans GB", sans-serif;
    --status-text-size: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    font-family: var(--status-font);
    font-size: var(--status-text-size);
    transition: margin 180ms ease;

    &.edit {
        margin-left: 300px;
    }
}

.status-page-main--font-sans {
    --status-font: "IBM Plex Sans", "Noto Sans", "PingFang SC", "Hiragino Sans GB", sans-serif;
}

.status-page-main--font-serif {
    --status-font: "IBM Plex Serif", "Noto Serif", "Songti SC", "Noto Serif SC", serif;
}

.status-page-main--font-mono {
    --status-font: "IBM Plex Mono", "Noto Sans Mono", ui-monospace, monospace;
}

.status-page-main--font-display {
    --status-font: "Fraunces", "IBM Plex Serif", "Noto Serif", "Songti SC", "Noto Serif SC", serif;
}

.status-page-main--text-sm {
    --status-text-size: 0.875rem;
}

.status-page-main--text-md {
    --status-text-size: 1rem;
}

.status-page-main--text-lg {
    --status-text-size: 1.125rem;
}

.status-page-admin > div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.status-page-editor-tools label {
    color: var(--color-text-muted);
    font-size: 0.875rem;
}

.status-page-no-monitors {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-text-muted);
    font-size: 0.875em;
    text-align: center;

    p {
        margin: 0;
    }
}

.status-notice :deep(.content) {
    font-size: 0.875em;
    line-height: 1.5;
}

/*
 * The sentence a visitor came for. A tinted plate, not a raised card: status
 * tokens do the work, same language as incident and maintenance notices.
 */
.overall-status {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    padding: 0.8125rem 1rem;
    border: 1px solid var(--color-border);
    border-inline-start-width: 3px;
    border-radius: var(--radius-md);
    font-size: 1.0625em;
    font-weight: var(--weight-semibold);
    letter-spacing: -0.015em;
    line-height: 1.3;

    > div {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.625rem;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    svg {
        flex: 0 0 auto;
        font-size: 0.95em;
    }
}

.overall-status--up {
    border-color: var(--status-up-border);
    border-inline-start-color: var(--status-up);
    background: var(--status-up-bg);
    color: var(--status-up-fg);
}

.overall-status--degraded {
    border-color: var(--status-degraded-border);
    border-inline-start-color: var(--status-degraded);
    background: var(--status-degraded-bg);
    color: var(--status-degraded-fg);
}

.overall-status--down {
    border-color: var(--status-down-border);
    border-inline-start-color: var(--status-down);
    background: var(--status-down-bg);
    color: var(--status-down-fg);
}

.overall-status--maintenance {
    border-color: var(--status-maintenance-border);
    border-inline-start-color: var(--status-maintenance);
    background: var(--status-maintenance-bg);
    color: var(--status-maintenance-fg);
}

.overall-status--unknown {
    border-color: var(--status-unknown-border);
    border-inline-start-color: var(--status-unknown);
    background: var(--status-unknown-bg);
    color: var(--status-unknown-fg);
}

.logo {
    display: block;
    height: var(--status-logo-size, 3.75rem);
    width: var(--status-logo-size, 3.75rem);
    object-fit: contain;
    transition: transform 200ms ease;

    &.edit-mode {
        cursor: pointer;

        &:hover {
            transform: scale(1.06);
        }
    }
}

.sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 300px;
    height: 100vh;

    color: var(--color-text);
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);

    .danger-zone {
        border-top: 1px solid var(--color-border);
        padding-top: 0.9375rem;
    }

    .sidebar-body {
        padding: 0 0.625rem 0.625rem;
        overflow-x: hidden;
        overflow-y: auto;
        height: calc(100% - 70px);
    }

    .sidebar-header-appearance {
        margin: 0.75rem 0;
        padding: 0.5rem 0.625rem 0.125rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface-subtle);
        font-size: 0.875rem;
        line-height: 1.25;
    }

    .sidebar-header-appearance__title {
        margin: 0.25rem 0 0.125rem;
        color: var(--color-text);
        font-size: 0.8125rem;
        font-weight: var(--weight-semibold);
        letter-spacing: -0.01em;
        line-height: 1.25;
    }

    .sidebar-footer {
        border-top: 1px solid var(--color-border);
        border-right: 1px solid var(--color-border);
        padding: 0.625rem;
        width: 300px;
        height: 70px;
        position: fixed;
        left: 0;
        bottom: 0;
        background-color: var(--color-surface);
        display: flex;
        align-items: center;
    }
}

@media (max-width: 40rem) {
    .sidebar {
        position: static;
        width: 100%;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--color-border);
    }

    .sidebar .sidebar-body {
        height: auto;
        overflow-y: visible;
    }

    .sidebar .sidebar-footer {
        position: static;
        width: 100%;
        height: auto;
        border-right: 0;
    }

    .main.edit {
        margin-left: 0;
    }
}

.description span {
    min-width: 50px;
}

.status-page-description {
    max-width: 40rem;
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9375em;
    font-weight: var(--weight-normal);
    line-height: 1.55;

    :deep(p) {
        margin: 0 0 0.5em;
    }

    :deep(p:last-child) {
        margin-bottom: 0;
    }

    :deep(h1),
    :deep(h2),
    :deep(h3) {
        color: var(--color-text);
        font-size: 1em;
        font-weight: var(--weight-semibold);
        letter-spacing: -0.01em;
        line-height: 1.35;
        margin: 0.7em 0 0.35em;
    }

    :deep(ul),
    :deep(ol) {
        margin: 0.35em 0 0.5em;
        padding-inline-start: 1.25rem;
    }
}

.status-page-footer-text {
    max-width: 36rem;
    margin: 0 auto 0.5rem;
    color: var(--color-text-subtle);
    font-size: 0.8125em;
    line-height: 1.55;

    :deep(p) {
        margin: 0 0 0.4em;
    }

    :deep(p:last-child) {
        margin-bottom: 0;
    }
}

/* Logo and title sit on one row. The h1 uses font-size 0 so its own
   line box cannot become a flex strut; the heading grows with wrapped
   title text and stays vertically centred against the mark. */
h1.title-flex {
    --status-logo-size: 3.75rem;
    --status-title-size: 1.5rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    max-width: 100%;
    min-width: 0;
    font-family: inherit;
    font-size: 0;
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
    line-height: 1;
}

h1.title-flex--logo-sm {
    --status-logo-size: 2.5rem;
}

h1.title-flex--logo-md {
    --status-logo-size: 3.75rem;
}

h1.title-flex--logo-lg {
    --status-logo-size: 6rem;
}

h1.title-flex--title-sm {
    --status-title-size: 1.125rem;
}

h1.title-flex--title-md {
    --status-title-size: 1.5rem;
}

h1.title-flex--title-lg {
    --status-title-size: 2.5rem;
}

h1.title-flex--above {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
}

h1.title-flex > .logo-wrapper {
    flex: none;
    align-self: center;
}

h1.title-flex > .status-page-heading {
    display: block;
    flex: 1 1 auto;
    align-self: center;
    box-sizing: border-box;
    height: auto;
    margin: 0;
    min-width: 0;
    font-size: var(--status-title-size);
    line-height: 1.2;
}

h1.title-flex--above > .status-page-heading {
    flex: 0 1 auto;
    width: 100%;
    text-align: center;
}

h1.title-flex .status-page-title-text,
h1.title-flex .status-page-heading :deep(.status-page-title-text),
h1.title-flex .status-page-heading :deep(span) {
    display: block;
    box-sizing: border-box;
    margin: 0;
    padding: 0.12em 0.35em;
    font-size: var(--status-title-size);
    line-height: 1.2;
    overflow-wrap: anywhere;
    white-space: normal;
}

.status-page-cropper {
    position: absolute;
    width: 0;
    height: 0;
    overflow: visible;
}

.logo-wrapper {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    position: relative;
    width: var(--status-logo-size, 3.75rem);
    height: var(--status-logo-size, 3.75rem);
    line-height: 0;

    &:hover {
        .icon-upload {
            transform: scale(1.2);
        }
    }

    &--preview-hidden {
        opacity: 0.45;
    }

    .icon-upload {
        transition: transform 200ms ease;
        position: absolute;
        bottom: 0.375rem;
        font-size: 1.25rem;
        left: -0.875rem;
        background-color: var(--color-surface);
        padding: 0.3125rem;
        border-radius: var(--radius-md);
        cursor: pointer;
        box-shadow: var(--shadow-float);
    }

    /* Reset button placed at top-left of the logo */
    .reset-top-left {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--color-surface);
        border: none;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        transform-origin: center;

        &:hover {
            background-color: var(--color-surface-hover);
            transform: scale(1.18);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }

        &:hover ~ .icon-upload {
            transform: none !important;
        }
    }

    .small-reset-btn {
        transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: transparent;
        border: none;
        cursor: pointer;

        &:hover {
            background-color: var(--color-surface-hover);
            transform: scale(1.18);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
        }
    }
}

.incident {
    .content {
        font-size: 0.875em;
        line-height: 1.5;

        &[contenteditable="true"] {
            min-height: 3.75rem;
        }
    }

    .date {
        font-size: 0.75em;
    }
}

.domain-name-list {
    li {
        display: flex;
        align-items: center;
        padding: 0.625rem 0 0.625rem 0.625rem;

        .domain-input {
            flex-grow: 1;
            background-color: transparent;
            border: none;
            color: var(--color-text);
            outline: none;

            &::placeholder {
                color: var(--color-text-subtle);
            }
        }
    }
}



.refresh-info {
    color: var(--color-text-subtle);
    font-size: 0.75em;
    line-height: 1.45;
}

.status-page-empty {
    padding: 1.25rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 0.875em;
    text-align: center;
}

/* Supporting text reads as one quiet block. */
.status-page-footer {
    margin-top: 0.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.8125em;
    text-align: center;

    p {
        margin: 0 0 0.35rem;
    }
}

.status-page-mascot {
    display: block;
    width: 5rem;
    height: auto;
    margin: 0 auto 0.85rem;
    pointer-events: none;
    filter: drop-shadow(0 8px 12px color-mix(in srgb, var(--color-text) 14%, transparent));
}

@media (max-width: 40rem) {
    .status-page-mascot {
        width: 4.25rem;
    }
}

.past-incidents-section {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    overflow: hidden;
}

.past-incidents-title {
    margin: 0;
    padding: 0.625rem 1rem;
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
    font-size: 0.8125em;
    font-weight: var(--weight-semibold);
    letter-spacing: -0.01em;
}

.incident-date-group + .incident-date-group {
    border-top: 1px solid var(--color-border);
}

.incident-date-header {
    margin: 0;
    padding: 0.75rem 1rem 0.25rem;
    color: var(--color-text-subtle);
    font-size: 0.75em;
    font-weight: var(--weight-medium);
}

.load-more-controls {
    display: flex;
    justify-content: center;
    padding: 0.75rem 1rem 1rem;
}
</style>
