<template>
    <div>
        <div class="notification-list tw-my-4">
            <p v-if="$root.notificationList.length === 0">
                {{ $t("Not available, please setup.") }}
            </p>
            <p v-else>
                {{ $t("notificationDescription") }}
            </p>

            <ul class="gizmo-list-group tw-mb-3">
                <li v-for="(notification, index) in $root.notificationList" :key="index" class="gizmo-list-group__item">
                    {{ notification.name }}
                    <span v-if="notification.active === false" class="gizmo-inline-badge tw-ms-2">
                        {{ $t("Disabled") }}
                    </span>
                    <br />
                    <a href="#" @click="$refs.notificationDialog.show(notification.id)">{{ $t("Edit") }}</a>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--secondary tw-me-2" type="button" @click="$refs.notificationDialog.show()">
                {{ $t("Setup Notification") }}
            </button>
        </div>

        <div class="tw-my-4 tw-pt-4">
            <h5 class="tw-my-4 settings-subheading">{{ $t("monitorToastMessagesLabel") }}</h5>
            <p>{{ $t("monitorToastMessagesDescription") }}</p>

            <div class="tw-my-4">
                <label for="toastErrorTimeoutSecs" class="gizmo-field-label">
                    {{ $t("toastErrorTimeout") }}
                </label>
                <input
                    id="toastErrorTimeoutSecs"
                    v-model="toastErrorTimeoutSecs"
                    type="number"
                    class="gizmo-native-control"
                    min="-1"
                    step="1"
                />
            </div>

            <div class="tw-my-4">
                <label for="toastSuccessTimeoutSecs" class="gizmo-field-label">
                    {{ $t("toastSuccessTimeout") }}
                </label>
                <input
                    id="toastSuccessTimeoutSecs"
                    v-model="toastSuccessTimeoutSecs"
                    type="number"
                    class="gizmo-native-control"
                    min="-1"
                    step="1"
                />
            </div>
        </div>

        <div class="tw-my-4 tw-pt-4">
            <h5 class="tw-my-4 settings-subheading">{{ $t("settingsCertificateExpiry") }}</h5>
            <p>{{ $t("certificationExpiryDescription") }}</p>
            <p>{{ $t("notificationDescription") }}</p>
            <div class="tw-mt-1 tw-mb-3 tw-ps-2 cert-exp-days notification-setting-column">
                <div
                    v-for="day in settings.tlsExpiryNotifyDays"
                    :key="day"
                    class="tw-flex tw-items-center tw-justify-between cert-exp-day-row tw-py-2"
                >
                    <span>{{ $t("days", day) }}</span>
                    <button
                        type="button"
                        class="btn-rm-expiry gizmo-native-button gizmo-native-button--secondary gizmo-native-button--sm tw-ms-2"
                        :aria-label="$t('Remove the expiry notification')"
                        @click="removeTlsExpiryNotifDay(day)"
                    >
                        <font-awesome-icon icon="times" />
                    </button>
                </div>
            </div>
            <div class="notification-setting-column">
                <ActionInput
                    v-model="tlsExpiryNotifInput"
                    :type="'number'"
                    :placeholder="$t('days', 1)"
                    :icon="'plus'"
                    :action="() => addTlsExpiryNotifDay(tlsExpiryNotifInput)"
                    :action-aria-label="$t('Add a new expiry notification day')"
                />
            </div>
            <div>
                <button class="gizmo-native-button gizmo-native-button--primary" type="button" @click="saveSettings()">
                    {{ $t("Save") }}
                </button>
            </div>
        </div>

        <div class="tw-my-4 tw-pt-4">
            <h5 class="tw-my-4 settings-subheading">{{ $t("settingsDomainExpiry") }}</h5>
            <p>{{ $t("domainExpiryDescription") }}</p>
            <p>{{ $t("notificationDescription") }}</p>
            <div class="tw-mt-1 tw-mb-3 tw-ps-2 cert-exp-days notification-setting-column">
                <div
                    v-for="day in settings.domainExpiryNotifyDays"
                    :key="day"
                    class="tw-flex tw-items-center tw-justify-between cert-exp-day-row tw-py-2"
                >
                    <span>{{ $t("days", day) }}</span>
                    <button
                        type="button"
                        class="btn-rm-expiry gizmo-native-button gizmo-native-button--secondary gizmo-native-button--sm tw-ms-2"
                        :aria-label="$t('Remove the expiry notification')"
                        @click="removeDomainExpiryNotifDay(day)"
                    >
                        <font-awesome-icon icon="times" />
                    </button>
                </div>
            </div>
            <div class="notification-setting-column">
                <ActionInput
                    v-model="domainExpiryNotifInput"
                    :type="'number'"
                    :placeholder="$t('days', 1)"
                    :icon="'plus'"
                    :action="() => addDomainExpiryNotifDay(domainExpiryNotifInput)"
                    :action-aria-label="$t('Add a new expiry notification day')"
                />
            </div>
            <div>
                <button class="gizmo-native-button gizmo-native-button--primary" type="button" @click="saveSettings()">
                    {{ $t("Save") }}
                </button>
            </div>
        </div>

        <NotificationDialog ref="notificationDialog" />
    </div>
</template>

<script>
import NotificationDialog from "../../components/NotificationDialog.vue";
import ActionInput from "../ActionInput.vue";

export default {
    components: {
        NotificationDialog,
        ActionInput,
    },

    data() {
        return {
            toastSuccessTimeoutSecs: 20,
            toastErrorTimeoutSecs: -1,
            /**
             * Variable to store the input for new certificate expiry day.
             */
            tlsExpiryNotifInput: null,
            domainExpiryNotifInput: null,
        };
    },

    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
    },

    watch: {
        // Parse, store and apply new timeout settings.
        toastSuccessTimeoutSecs(newTimeout) {
            const parsedTimeout = parseInt(newTimeout);
            if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                localStorage.toastSuccessTimeout = newTimeout > 0 ? newTimeout * 1000 : newTimeout;
            }
        },
        toastErrorTimeoutSecs(newTimeout) {
            const parsedTimeout = parseInt(newTimeout);
            if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                localStorage.toastErrorTimeout = newTimeout > 0 ? newTimeout * 1000 : newTimeout;
            }
        },
    },

    mounted() {
        this.loadToastTimeoutSettings();
    },

    methods: {
        /**
         * Remove a day from tls expiry notification days.
         * @param {number} day The day to remove.
         * @returns {void}
         */
        removeTlsExpiryNotifDay(day) {
            this.settings.tlsExpiryNotifyDays = this.settings.tlsExpiryNotifyDays.filter((d) => d !== day);
        },
        /**
         * Add a new tls expiry notification day.
         * Will verify:
         * - day is not null or empty string.
         * - day is a number.
         * - day is > 0.
         * - The day is not already in the list.
         * @param {number} day The day number to add.
         * @returns {void}
         */
        addTlsExpiryNotifDay(day) {
            if (day != null && day !== "") {
                const parsedDay = parseInt(day);
                if (parsedDay != null && !isNaN(parsedDay) && parsedDay > 0) {
                    if (!this.settings.tlsExpiryNotifyDays.includes(parsedDay)) {
                        this.settings.tlsExpiryNotifyDays.push(parseInt(day));
                        this.settings.tlsExpiryNotifyDays.sort((a, b) => a - b);
                        this.tlsExpiryNotifInput = null;
                    }
                }
            }
        },
        /**
         * Remove a day from domain expiry notification days.
         * @param {number} day The day to remove.
         * @returns {void}
         */
        removeDomainExpiryNotifDay(day) {
            this.settings.domainExpiryNotifyDays = this.settings.domainExpiryNotifyDays.filter((d) => d !== day);
        },
        /**
         * Add a new domain expiry notification day.
         * Will verify:
         * - day is not null or empty string.
         * - day is a number.
         * - day is > 0.
         * - The day is not already in the list.
         * @param {number} day The day number to add.
         * @returns {void}
         */
        addDomainExpiryNotifDay(day) {
            if (day != null && day !== "") {
                const parsedDay = parseInt(day);
                if (parsedDay != null && !isNaN(parsedDay) && parsedDay > 0) {
                    if (!this.settings.domainExpiryNotifyDays.includes(parsedDay)) {
                        this.settings.domainExpiryNotifyDays.push(parseInt(day));
                        this.settings.domainExpiryNotifyDays.sort((a, b) => a - b);
                        this.domainExpiryNotifInput = null;
                    }
                }
            }
        },

        /**
         * Loads toast timeout settings from storage to component data.
         * @returns {void}
         */
        loadToastTimeoutSettings() {
            const successTimeout = localStorage.toastSuccessTimeout;
            if (successTimeout !== undefined) {
                const parsedTimeout = parseInt(successTimeout);
                if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                    this.toastSuccessTimeoutSecs = parsedTimeout > 0 ? parsedTimeout / 1000 : parsedTimeout;
                }
            }

            const errorTimeout = localStorage.toastErrorTimeout;
            if (errorTimeout !== undefined) {
                const parsedTimeout = parseInt(errorTimeout);
                if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                    this.toastErrorTimeoutSecs = parsedTimeout > 0 ? parsedTimeout / 1000 : parsedTimeout;
                }
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.notification-setting-column { width: min(100%, 40rem); }

.btn-rm-expiry {
    padding-left: 0.7rem;
    padding-right: 0.7rem;
}

.cert-exp-days .cert-exp-day-row {
    border-bottom: 1px solid var(--color-border);
}

.cert-exp-days .cert-exp-day-row:last-child {
    border: none;
}
</style>
