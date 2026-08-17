<template>
    <div class="gizmo-inline-action">
        <GizmoSelect :id="id" v-model="model" :disabled="disabled" :required="required">
            <option v-for="option in options" :key="option" :value="option.value" :disabled="option.disabled">
                {{ option.label }}
            </option>
        </GizmoSelect>
        <GizmoIconButton :label="actionAriaLabel" :disabled="actionDisabled" @click="action()">
            <font-awesome-icon :icon="icon" aria-hidden="true" />
        </GizmoIconButton>
    </div>
</template>

<script>
import GizmoIconButton from "./gizmo/GizmoIconButton.vue";
import GizmoSelect from "./gizmo/GizmoSelect.vue";

/**
 * Generic select field with a customizable action on the right.
 * Action is passed in as a function.
 */
export default {
    components: {
        GizmoIconButton,
        GizmoSelect,
    },
    props: {
        options: {
            type: Array,
            default: () => [],
        },
        /**
         * The id of the form which will be targeted by a <label for=..
         */
        id: {
            type: String,
            required: true,
        },
        /**
         * The value of the select field.
         */
        modelValue: {
            type: Number,
            default: null,
        },
        /**
         * Whether the select field is enabled / disabled.
         */
        disabled: {
            type: Boolean,
            default: false,
        },
        /**
         * The icon displayed in the right button of the select field.
         * Accepts a Font Awesome icon string identifier.
         * @example "plus"
         */
        icon: {
            type: String,
            required: true,
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
        /**
         * Whether the action button is disabled.
         * @example true
         */
        actionDisabled: {
            type: Boolean,
            default: false,
        },
        /**
         * Whether the select field is required.
         * @example true
         */
        required: {
            type: Boolean,
            default: false,
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
