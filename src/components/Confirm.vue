<template>
    <GizmoDialog
        :open="open"
        size="sm"
        :title="dialogTitle"
        :close-label="t('Close')"
        @update:open="setOpen"
    >
        <template #description>
            <slot />
        </template>
        <template #footer>
            <GizmoButton variant="secondary" autofocus @click="no">
                {{ noText || t("No") }}
            </GizmoButton>
            <GizmoButton :variant="confirmVariant" @click="yes">
                {{ yesText || t("Yes") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
</template>

<script setup lang="ts">
/* eslint-disable vue/require-explicit-emits -- The installed Vue ESLint plugin does not understand typed defineEmits. */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

const props = withDefaults(
    defineProps<{
        btnStyle?: string;
        noText?: string | null;
        title?: string | null;
        yesText?: string | null;
    }>(),
    {
        btnStyle: "btn-primary",
        noText: null,
        title: null,
        yesText: null,
    },
);

const emit = defineEmits<{
    no: [];
    yes: [];
}>();

const { t } = useI18n();
const open = ref(false);

const confirmVariant = computed(() => (props.btnStyle === "btn-danger" ? "danger" : "primary"));
const dialogTitle = computed(() => props.title || t("Confirm"));

/**
 * Synchronize the controlled dialog state.
 * @param {boolean} value Next open state
 * @returns {void}
 */
function setOpen(value: boolean) {
    open.value = value;
}

/**
 * Show the confirmation dialog through its legacy public API.
 * @returns {void}
 */
function show() {
    open.value = true;
}

/**
 * Hide the confirmation dialog.
 * @returns {void}
 */
function hide() {
    open.value = false;
}

/**
 * Confirm the action and close the dialog.
 * @returns {void}
 */
function yes() {
    emit("yes");
    hide();
}

/**
 * Cancel the action and close the dialog.
 * @returns {void}
 */
function no() {
    emit("no");
    hide();
}

defineExpose({ hide, show });
</script>
