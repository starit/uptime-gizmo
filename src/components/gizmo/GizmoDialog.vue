<template>
    <DialogRoot :open="open" :modal="true" @update:open="handleOpenChange">
        <DialogPortal>
            <DialogOverlay class="gizmo-dialog__overlay" />
            <DialogContent
                v-bind="descriptionAttributes"
                class="gizmo-dialog gizmo-focus-ring"
                :class="sizeClass"
                @open-auto-focus="handleOpenAutoFocus"
                @escape-key-down="handleEscapeKeyDown"
                @pointer-down-outside="handlePointerDownOutside"
            >
                <header class="gizmo-dialog__header">
                    <DialogTitle class="gizmo-dialog__title">
                        <slot name="title">{{ title }}</slot>
                    </DialogTitle>
                    <GizmoIconButton
                        v-if="showClose"
                        class="gizmo-dialog__close"
                        variant="ghost"
                        size="sm"
                        :label="closeLabel"
                        :disabled="closeDisabled"
                        @click="requestClose('close-button')"
                    >
                        <font-awesome-icon icon="times" aria-hidden="true" />
                    </GizmoIconButton>
                </header>

                <div v-if="hasDescription || $slots.default" class="gizmo-dialog__body">
                    <DialogDescription v-if="hasDescription" as="div" class="gizmo-dialog__description">
                        <slot name="description">{{ description }}</slot>
                    </DialogDescription>
                    <slot v-if="$slots.default" />
                </div>

                <footer v-if="$slots.footer" class="gizmo-dialog__footer">
                    <slot name="footer" :close="requestClose" />
                </footer>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>

<script setup lang="ts">
/* eslint-disable vue/require-explicit-emits -- The installed Vue ESLint plugin does not understand typed defineEmits. */
import { computed, ref, useSlots } from "vue";
import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
} from "reka-ui";
import GizmoIconButton from "./GizmoIconButton.vue";

type DialogSize = "sm" | "md" | "lg";
type DialogCloseReason = "backdrop" | "close-button" | "escape" | "programmatic";

const DIALOG_SIZE_CLASSES: Record<DialogSize, string> = {
    sm: "gizmo-dialog--sm",
    md: "gizmo-dialog--md",
    lg: "gizmo-dialog--lg",
};

const props = withDefaults(
    defineProps<{
        closeLabel: string;
        closeDisabled?: boolean;
        closeOnBackdrop?: boolean;
        closeOnEscape?: boolean;
        description?: string | null;
        open: boolean;
        showClose?: boolean;
        size?: DialogSize;
        title: string;
    }>(),
    {
        closeOnBackdrop: true,
        closeDisabled: false,
        closeOnEscape: true,
        description: null,
        showClose: true,
        size: "md",
    },
);

const emit = defineEmits<{
    dismiss: [reason: DialogCloseReason];
    "update:open": [value: boolean];
}>();

const slots = useSlots();
const pendingCloseReason = ref<DialogCloseReason>("programmatic");

const hasDescription = computed(() => Boolean(props.description || slots.description));
const descriptionAttributes = computed(() =>
    hasDescription.value ? {} : { "aria-describedby": undefined },
);
const sizeClass = computed(() => DIALOG_SIZE_CLASSES[props.size]);

/**
 * Prefer an explicitly marked safe action over DOM-order autofocus.
 * @param {Event} event Dialog autofocus event
 * @returns {void}
 */
function handleOpenAutoFocus(event: Event) {
    const initialFocus = (event.target as HTMLElement).querySelector<HTMLElement>("[autofocus]");
    if (initialFocus) {
        event.preventDefault();
        initialFocus.focus({ preventScroll: true });
    }
}

/**
 * Prevent or classify an Escape-key dismissal.
 * @param {KeyboardEvent} event Escape keyboard event
 * @returns {void}
 */
function handleEscapeKeyDown(event: KeyboardEvent) {
    if (props.closeDisabled || !props.closeOnEscape) {
        event.preventDefault();
        return;
    }

    pendingCloseReason.value = "escape";
}

/**
 * Prevent or classify a backdrop dismissal.
 * @param {Event} event Outside pointer event
 * @returns {void}
 */
function handlePointerDownOutside(event: Event) {
    if (props.closeDisabled || !props.closeOnBackdrop) {
        event.preventDefault();
        return;
    }

    pendingCloseReason.value = "backdrop";
}

/**
 * Forward state changes requested by the dialog primitive.
 * @param {boolean} open Next open state
 * @returns {void}
 */
function handleOpenChange(open: boolean) {
    if (open === props.open) {
        return;
    }

    if (!open) {
        emit("dismiss", pendingCloseReason.value);
        pendingCloseReason.value = "programmatic";
    }

    emit("update:open", open);
}

/**
 * Request a controlled close and report why it happened.
 * @param {DialogCloseReason} reason Close trigger
 * @returns {void}
 */
function requestClose(reason: DialogCloseReason = "programmatic") {
    if (!props.open || (reason !== "programmatic" && props.closeDisabled)) {
        return;
    }

    emit("dismiss", reason);
    emit("update:open", false);
}

defineExpose({
    close: requestClose,
});
</script>
