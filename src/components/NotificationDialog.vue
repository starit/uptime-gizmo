<template>
    <GizmoDialog
        :open="open"
        size="lg"
        :title="$t('Setup Notification')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="notification-settings-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="notification-type" class="gizmo-field-label">{{ $t("Notification Type") }}</label>
                <select id="notification-type" v-model="notification.type" class="gizmo-native-control gizmo-native-select" autofocus>
                    <optgroup
                        v-for="category in notificationCategories"
                        :key="category.key"
                        :label="$t(category.label)"
                    >
                        <option v-for="(name, type) in category.options" :key="type" :value="type">
                            {{ name }}
                        </option>
                    </optgroup>
                </select>
            </div>

            <div>
                <label for="notification-name" class="gizmo-field-label">{{ $t("Friendly Name") }}</label>
                <input
                    id="notification-name"
                    v-model="notification.name"
                    type="text"
                    class="gizmo-native-control"
                    required
                />
            </div>

            <NotificationFormHost :form="currentForm" :notification="notification" />

            <div class="gizmo-form-stack gizmo-dialog-section">
                <div>
                    <div class="gizmo-native-check gizmo-native-switch">
                        <input
                            id="notification-active"
                            v-model="notification.active"
                            class="gizmo-native-check__input"
                            type="checkbox"
                        />
                        <label class="gizmo-native-check__label" for="notification-active">
                            {{ $t("notificationEnabled") }}
                        </label>
                    </div>
                    <div class="gizmo-field-help">
                        {{ $t("notificationEnabledDescription") }}
                    </div>
                </div>

                <div>
                    <div class="gizmo-native-check gizmo-native-switch">
                        <input
                            id="notification-default-enabled"
                            v-model="notification.isDefault"
                            class="gizmo-native-check__input"
                            type="checkbox"
                        />
                        <label class="gizmo-native-check__label" for="notification-default-enabled">
                            {{ $t("Default enabled") }}
                        </label>
                    </div>
                    <div class="gizmo-field-help">
                        {{ $t("enableDefaultNotificationDescription") }}
                    </div>
                </div>

                <div class="gizmo-native-check gizmo-native-switch">
                    <input
                        id="notification-apply-existing"
                        v-model="notification.applyExisting"
                        class="gizmo-native-check__input"
                        type="checkbox"
                    />
                    <label class="gizmo-native-check__label" for="notification-apply-existing">
                        {{ $t("Apply on all existing monitors") }}
                    </label>
                </div>
            </div>
        </form>

        <template #footer>
            <GizmoButton
                v-if="id"
                class="gizmo-dialog__leading-action"
                variant="danger"
                :disabled="processing"
                @click="deleteConfirm"
            >
                {{ $t("Delete") }}
            </GizmoButton>
            <GizmoButton variant="secondary" :disabled="processing" @click="test">
                {{ $t("Test") }}
            </GizmoButton>
            <GizmoButton
                form="notification-settings-form"
                type="submit"
                :loading="processing"
            >
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="deleteNotification"
    >
        {{ $t("deleteNotificationMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "./Confirm.vue";
import NotificationFormList from "./notifications";
import NotificationFormHost from "./NotificationFormHost.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

export default {
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
        NotificationFormHost,
    },
    emits: ["added"],
    data() {
        return {
            open: false,
            processing: false,
            id: null,
            notification: {
                name: "",
                /** @type { null | keyof NotificationFormList } */
                type: null,
                isDefault: false,
                active: true,
                // Do not set default value here, please scroll to show()
            },
        };
    },

    computed: {
        currentForm() {
            if (!this.notification.type) {
                return null;
            }
            return NotificationFormList[this.notification.type];
        },

        notificationNameList() {
            // Universal - Adapters and multi-service wrapper libraries
            let universal = {
                apprise: this.$t("apprise"),
                webhook: "Webhook",
            };

            // Chat Platforms - Messaging apps and team communication tools
            let chatPlatforms = {
                bale: "Bale",
                Bitrix24: "Bitrix24",
                ClickUp: "ClickUp",
                discord: "Discord",
                max: this.$t("maxMessenger"),
                fluxer: "Fluxer",
                GoogleChat: "Google Chat (Google Workspace)",
                gorush: "Gorush",
                gotify: "Gotify",
                GrafanaOncall: "Grafana Oncall",
                HaloPSA: "Halo PSA",
                HeiiOnCall: "Heii On-Call",
                HomeAssistant: "Home Assistant",
                Keep: "Keep",
                Kook: "Kook",
                line: "LINE Messenger",
                matrix: "Matrix",
                mattermost: "Mattermost",
                Milky: "Milky(QQ)",
                nextcloudtalk: "Nextcloud Talk",
                nostr: "Nostr",
                OneChat: "OneChat",
                OneBot: "OneBot",
                pumble: "Pumble",
                "rocket.chat": "Rocket.Chat",
                signal: "Signal",
                slack: "Slack",
                stackfield: "Stackfield",
                teams: "Microsoft Teams",
                telegram: "Telegram",
                threema: "Threema",
                ZohoCliq: "ZohoCliq",
                CallMeBot: "CallMeBot (WhatsApp, Telegram Call, Facebook Messenger)",
                whapi: "WhatsApp (Whapi)",
                evolution: "WhatsApp (Evolution)",
                waha: "WhatsApp (WAHA)",
                Whatsapp360messenger: "WhatsApp (360messenger)",
                openwa: "WhatsApp (OpenWA)",
            };

            // Push Services - Push notification services
            let pushServices = {
                Bark: "Bark",
                gorush: "Gorush",
                gotify: "Gotify",
                lunasea: "LunaSea",
                notifery: "Notifery",
                ntfy: "Ntfy",
                pinglet: "Pinglet",
                pushbullet: "Pushbullet",
                PushByTechulus: "Push by Techulus",
                pushover: "Pushover",
                pushy: "Pushy",
                Webpush: "Webpush",
            };

            // SMS Services - SMS and voice call providers
            let smsServices = {
                clicksendsms: "ClickSend SMS",
                Elks: "46elks",
                Cellsynt: "Cellsynt",
                gtxmessaging: "GtxMessaging",
                octopush: "Octopush",
                Onesender: "Onesender",
                plivo: "Plivo",
                SevenIO: "SevenIO",
                SMSEagle: "SMSEagle",
                SMSPartner: "SMS Partner",
                telnyx: "Telnyx",
                Teltonika: this.$t("Teltonika SMS Gateway"),
                twilio: "Twilio",
            };

            // Email - Email services
            let email = {
                Brevo: "Brevo",
                Resend: "Resend",
                SendGrid: "SendGrid",
                smtp: this.$t("smtp"),
                TurboSMTP: "TurboSMTP",
            };

            // Incident Management - On-call and alerting platforms
            let incidentManagement = {
                alerta: "Alerta",
                AlertNow: "AlertNow",
                Flowtriq: "Flowtriq",
                GoAlert: "GoAlert",
                GrafanaOncall: "Grafana Oncall",
                HeiiOnCall: "Heii On-Call",
                Keep: "Keep",
                Opsgenie: "Opsgenie",
                JiraServiceManagement: this.$t("Jira Service Management"),
                PagerDuty: "PagerDuty",
                PagerTree: "PagerTree",
                SIGNL4: "SIGNL4",
                Splunk: "Splunk",
                squadcast: "SquadCast",
            };

            // Home Automation - Smart home and IoT platforms
            let homeAutomation = {
                HomeAssistant: "Home Assistant",
            };

            // Other Integrations
            let other = {
                GoogleSheets: "Google Sheets",
            };

            // Regional - Not supported in most regions or documentation is not in English
            let regional = {
                AliyunSMS: "AliyunSMS (阿里云短信服务)",
                bearsms: "BearSMS (Israel)",
                egosms: "EgoSMS (Uganda)",
                DingDing: "DingDing (钉钉自定义机器人)",
                Feishu: "Feishu (飞书)",
                FlashDuty: "FlashDuty (快猫星云)",
                FreeMobile: "FreeMobile (mobile.free.fr)",
                Ooredoo: "Ooredoo (Maldives)",
                PushDeer: "PushDeer",
                promosms: "PromoSMS",
                serwersms: "SerwerSMS.pl",
                SMSManager: "SmsManager (smsmanager.cz)",
                WeCom: "WeCom (企业微信群机器人)",
                ServerChan: "ServerChan (Server酱)",
                PushPlus: "PushPlus (推送加)",
                SpugPush: "SpugPush（Spug推送助手）",
                smsc: "SMSC",
                smsir: "SMS.IR",
                WPush: "WPush(wpush.cn)",
                WxPusher: "WxPusher SPT Push (WxPusher极简推送)",
                YZJ: "YZJ (云之家自定义机器人)",
                SMSPlanet: "SMSPlanet.pl",
                VK: "VK",
                VKTeams: "VKTeams",
            };

            // Sort by notification name alphabetically
            // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
            let sort = (list2) => {
                return Object.entries(list2)
                    .sort(([, a], [, b]) => a.localeCompare(b))
                    .reduce(
                        (r, [k, v]) => ({
                            ...r,
                            [k]: v,
                        }),
                        {}
                    );
            };

            return {
                universal: sort(universal),
                chatPlatforms: sort(chatPlatforms),
                pushServices: sort(pushServices),
                smsServices: sort(smsServices),
                email: sort(email),
                incidentManagement: sort(incidentManagement),
                homeAutomation: sort(homeAutomation),
                other: sort(other),
                regional: sort(regional),
            };
        },

        notificationCategories() {
            return [
                { key: "universal", label: "notificationUniversal", options: this.notificationNameList.universal },
                {
                    key: "chat-platforms",
                    label: "notificationChatPlatforms",
                    options: this.notificationNameList.chatPlatforms,
                },
                {
                    key: "push-services",
                    label: "notificationPushServices",
                    options: this.notificationNameList.pushServices,
                },
                {
                    key: "sms-services",
                    label: "notificationSmsServices",
                    options: this.notificationNameList.smsServices,
                },
                { key: "email", label: "notificationEmail", options: this.notificationNameList.email },
                {
                    key: "incident-management",
                    label: "notificationIncidentManagement",
                    options: this.notificationNameList.incidentManagement,
                },
                {
                    key: "home-automation",
                    label: "notificationHomeAutomation",
                    options: this.notificationNameList.homeAutomation,
                },
                { key: "other", label: "notificationOther", options: this.notificationNameList.other },
                { key: "regional", label: "notificationRegional", options: this.notificationNameList.regional },
            ];
        },

        notificationFullNameList() {
            let list = {};
            // Combine all categories into a single list
            for (let category of Object.values(this.notificationNameList)) {
                for (let [key, value] of Object.entries(category)) {
                    list[key] = value;
                }
            }
            return list;
        },
    },

    watch: {
        "notification.type"(to, from) {
            let oldName;
            if (from) {
                oldName = this.getUniqueDefaultName(from);
            } else {
                oldName = "";
            }

            if (!this.notification.name || this.notification.name === oldName) {
                this.notification.name = this.getUniqueDefaultName(to);
            }
        },
    },
    methods: {
        /**
         * Synchronize the controlled dialog state.
         * @param {boolean} open Next open state
         * @returns {void}
         */
        setOpen(open) {
            this.open = open;
        },

        /**
         * Show dialog to confirm deletion
         * @returns {void}
         */
        deleteConfirm() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Show settings for specified notification
         * @param {number} notificationID ID of notification to show
         * @returns {void}
         */
        show(notificationID) {
            if (this.processing) {
                return;
            }
            if (notificationID) {
                this.id = notificationID;

                for (let n of this.$root.notificationList) {
                    if (n.id === notificationID) {
                        this.notification = {
                            ...JSON.parse(n.config),
                            // `active` is a real column. Prefer it over the
                            // historical copy that may exist in config.
                            active: n.active !== false,
                        };

                        // applyExisting is one time only, but it got saved to database previously. Workaround fix, set it to false here to deal with the problem.
                        this.notification.applyExisting = false;

                        break;
                    }
                }
            } else {
                this.id = null;
                this.notification = {
                    name: "",
                    type: "telegram",
                    isDefault: false,
                    active: true,
                };
            }

            this.open = true;
        },

        /**
         * Submit the form to the server
         * @returns {void}
         */
        submit() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("addNotification", this.notification, this.id, (res) => {
                this.$root.toastRes(res);
                this.processing = false;

                if (res.ok) {
                    this.open = false;

                    // Emit added event, doesn't emit edit.
                    if (!this.id) {
                        this.$emit("added", res.id);
                    }
                }
            });
        },

        /**
         * Test the notification endpoint
         * @returns {void}
         */
        test() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("testNotification", this.notification, (res) => {
                this.$root.toastRes(res);
                this.processing = false;
            });
        },

        /**
         * Delete the notification endpoint
         * @returns {void}
         */
        deleteNotification() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("deleteNotification", this.id, (res) => {
                this.$root.toastRes(res);
                this.processing = false;

                if (res.ok) {
                    this.open = false;
                }
            });
        },
        /**
         * Get a unique default name for the notification
         * @param {keyof NotificationFormList} notificationKey
         * Notification to retrieve
         * @returns {string} Default name
         */
        getUniqueDefaultName(notificationKey) {
            let index = 1;
            let name = "";
            do {
                name = this.$t("defaultNotificationName", {
                    notification: this.notificationFullNameList[notificationKey].replace(/\(.+\)/, "").trim(),
                    number: index++,
                });
            } while (this.$root.notificationList.find((it) => it.name === name));
            return name;
        },
    },
};
</script>
