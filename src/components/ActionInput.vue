<template>
    <div class="gizmo-inline-action">
        <GizmoInput
            v-model="model"
            :type="type"
            :placeholder="placeholder"
            :disabled="!enabled"
        />
        <GizmoIconButton :label="actionAriaLabel" @click="action()">
            <font-awesome-icon :icon="icon" />
        </GizmoIconButton>
    </div>
</template>

<script>
import GizmoIconButton from "./gizmo/GizmoIconButton.vue";
import GizmoInput from "./gizmo/GizmoInput.vue";

/**
 * Generic input field with a customizable action on the right.
 * Action is passed in as a function.
 */
export default {
    components: {
        GizmoIconButton,
        GizmoInput,
    },
    props: {
        /**
         * The value of the input field.
         */
        modelValue: {
            type: String,
            default: "",
        },
        /**
         * Whether the input field is enabled / disabled.
         */
        enabled: {
            type: Boolean,
            default: true,
        },
        /**
         * Placeholder text for the input field.
         */
        placeholder: {
            type: String,
            default: "",
        },
        /**
         * The icon displayed in the right button of the input field.
         * Accepts a Font Awesome icon string identifier.
         * @example "plus"
         */
        icon: {
            type: String,
            required: true,
        },
        /**
         * The input type of the input field.
         * @example "email"
         */
        type: {
            type: String,
            default: "text",
        },
        /**
         * The action to be performed when the button is clicked.
         * Action is passed in as a function.
         */
        action: {
            type: Function,
            default: () => {},
        },
        /**
         * The aria-label of the action button
         */
        actionAriaLabel: {
            type: String,
            required: true,
        },
    },
    emits: ["update:modelValue"],
    computed: {
        /**
         * Send value update to parent on change.
         */
        model: {
            get() {
                return this.modelValue;
            },
            set(value) {
                this.$emit("update:modelValue", value);
            },
        },
    },
};
</script>
