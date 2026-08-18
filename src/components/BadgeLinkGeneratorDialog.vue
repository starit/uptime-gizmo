<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Badge Link Generator', [monitor.name])"
        :close-label="$t('Close')"
        @update:open="setOpen"
    >
        <div class="gizmo-form-stack">
            <i18n-t keypath="Badge Link Generator Helptext" tag="p" class="gizmo-dialog-copy">
                <template #documentation>
                    <a
                        href="https://github.com/starit/uptime-gizmo/wiki/Badge"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ $t("documentation") }}
                    </a>
                </template>
            </i18n-t>

            <div>
                <label for="badge-type" class="gizmo-field-label">{{ $t("Badge Type") }}</label>
                <select id="badge-type" v-model="badge.type" class="gizmo-native-control gizmo-native-select" autofocus>
                    <option value="status">status</option>
                    <option value="uptime">uptime</option>
                    <option value="ping">ping</option>
                    <option value="avg-response">avg-response</option>
                    <option value="cert-exp">cert-exp</option>
                    <option value="response">response</option>
                </select>
            </div>

            <div v-for="field in visibleFields" :key="field.key">
                <label :for="`badge-${field.key}`" class="gizmo-field-label">{{ $t(field.label) }}</label>
                <input
                    :id="`badge-${field.key}`"
                    v-model="badge[field.key]"
                    :type="field.type"
                    :min="field.min"
                    :placeholder="field.placeholder"
                    class="gizmo-native-control"
                />
            </div>

            <div>
                <label for="badge-style" class="gizmo-field-label">{{ $t("Badge Style") }}</label>
                <select id="badge-style" v-model="badge.style" class="gizmo-native-control gizmo-native-select">
                    <option value="plastic">plastic</option>
                    <option value="flat">flat</option>
                    <option value="flat-square">flat-square</option>
                    <option value="for-the-badge">for-the-badge</option>
                    <option value="social">social</option>
                </select>
            </div>

            <div>
                <label for="badge-value" class="gizmo-field-label">{{ $t("Badge value (For Testing only.)") }}</label>
                <input id="badge-value" v-model="badge.value" type="text" class="gizmo-native-control" />
            </div>

            <div class="gizmo-dialog-badge-preview">
                <img :src="badgeURL" :alt="$t('Badge Preview')" />
            </div>

            <div>
                <label for="badge-url" class="gizmo-field-label">{{ $t("Badge URL") }}</label>
                <CopyableInput id="badge-url" v-model="badgeURL" type="url" disabled="disabled" />
            </div>
        </div>

        <template #footer>
            <GizmoButton variant="secondary" @click="setOpen(false)">
                {{ $t("Close") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
</template>

<script lang="ts">
import CopyableInput from "./CopyableInput.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";
import { badgeConstants } from "../badge-constants.ts";

type BadgeType = "status" | "uptime" | "ping" | "avg-response" | "cert-exp" | "response";
type BadgeParameter =
    | "duration"
    | "label"
    | "prefix"
    | "suffix"
    | "labelColor"
    | "color"
    | "labelPrefix"
    | "labelSuffix"
    | "upColor"
    | "downColor"
    | "pendingColor"
    | "maintenanceColor"
    | "warnColor"
    | "warnDays"
    | "downDays";

interface BadgeFieldDefinition {
    label: string;
    min?: string;
    placeholder?: string;
    type: "number" | "text";
}

interface BadgeDraft extends Record<BadgeParameter, string | null> {
    style: string;
    type: BadgeType;
    value: string | null;
}

interface BadgeRoot {
    baseURL: string;
}

const FIELD_DEFINITIONS: Record<BadgeParameter, BadgeFieldDefinition> = {
    duration: { label: "Badge Duration (in hours)", type: "number", min: "0", placeholder: "24" },
    label: { label: "Badge Label", type: "text" },
    prefix: { label: "Badge Prefix", type: "text" },
    suffix: { label: "Badge Suffix", type: "text", placeholder: "%" },
    labelColor: { label: "Badge Label Color", type: "text", placeholder: "#555" },
    color: { label: "Badge Color", type: "text", placeholder: badgeConstants.defaultUpColor },
    labelPrefix: { label: "Badge Label Prefix", type: "text" },
    labelSuffix: { label: "Badge Label Suffix", type: "text", placeholder: "h" },
    upColor: { label: "Badge Up Color", type: "text", placeholder: badgeConstants.defaultUpColor },
    downColor: { label: "Badge Down Color", type: "text", placeholder: badgeConstants.defaultDownColor },
    pendingColor: { label: "Badge Pending Color", type: "text", placeholder: badgeConstants.defaultPendingColor },
    maintenanceColor: {
        label: "Badge Maintenance Color",
        type: "text",
        placeholder: badgeConstants.defaultMaintenanceColor,
    },
    warnColor: { label: "Badge Warn Color", type: "text", placeholder: badgeConstants.defaultMaintenanceColor },
    warnDays: { label: "Badge Warn Days", type: "number", min: "0", placeholder: badgeConstants.defaultCertExpireWarnDays },
    downDays: { label: "Badge Down Days", type: "number", min: "0", placeholder: badgeConstants.defaultCertExpireDownDays },
};

const PARAMETERS: Record<BadgeType, BadgeParameter[]> = {
    status: ["upColor", "downColor", "pendingColor", "maintenanceColor"],
    uptime: ["duration", "labelPrefix", "labelSuffix", "prefix", "suffix", "color", "labelColor"],
    ping: ["duration", "labelPrefix", "labelSuffix", "prefix", "suffix", "color", "labelColor"],
    "avg-response": ["duration", "labelPrefix", "labelSuffix", "prefix", "suffix", "color", "labelColor"],
    "cert-exp": ["labelPrefix", "labelSuffix", "prefix", "suffix", "upColor", "warnColor", "downColor", "warnDays", "downDays", "labelColor"],
    response: ["labelPrefix", "labelSuffix", "prefix", "suffix", "color", "labelColor"],
};

export default {
    components: {
        CopyableInput,
        GizmoButton,
        GizmoDialog,
    },
    data() {
        return {
            open: false,
            monitor: { id: null as number | null, name: null as string | null },
            badge: {
                type: "status",
                duration: null,
                label: null,
                prefix: null,
                suffix: null,
                labelColor: null,
                color: null,
                labelPrefix: null,
                labelSuffix: null,
                upColor: null,
                downColor: null,
                pendingColor: null,
                maintenanceColor: null,
                warnColor: null,
                warnDays: null,
                downDays: null,
                style: "flat",
                value: null,
            } as BadgeDraft,
            parameters: PARAMETERS,
        };
    },
    computed: {
        visibleFields() {
            return this.parameters[this.badge.type].map((key) => ({ key, ...FIELD_DEFINITIONS[key] }));
        },
        badgeURL() {
            if (!this.monitor.id || !this.badge.type) {
                return "";
            }
            const root = this.$root as unknown as BadgeRoot;
            let url = new URL(root.baseURL).origin + "/api/badge/" + this.monitor.id + "/" + this.badge.type;
            const query: Record<string, string> = {};
            for (const parameter of this.parameters[this.badge.type]) {
                if (parameter === "duration" && this.badge.duration) {
                    url += "/" + this.badge.duration;
                } else if (this.badge[parameter]) {
                    query[parameter] = this.badge[parameter] as string;
                }
            }
            for (const parameter of ["label", "style", "value"] as const) {
                if (parameter === "style" && this.badge.style === "flat") {
                    continue;
                }
                if (this.badge[parameter]) {
                    query[parameter] = this.badge[parameter] as string;
                }
            }
            const search = new URLSearchParams(query).toString();
            return search ? `${url}?${search}` : url;
        },
    },
    methods: {
        setOpen(open: boolean) {
            this.open = open;
        },
        show(monitorId: number, monitorName: string) {
            this.monitor = { id: monitorId, name: monitorName };
            this.open = true;
        },
    },
};
</script>
