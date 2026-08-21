<template>
    <div class="gizmo-inline-action">
        <GizmoInput
            :id="id"
            v-model="model"
            :type="visibility"
            :placeholder="placeholder"
            :maxlength="maxlength"
            :autocomplete="autocomplete"
            :required="required"
            :readonly="readonly"
            :disabled="disabled"
        />

        <GizmoIconButton v-if="visibility == 'password'" :label="$t('Reveal')" :disabled="disabled" @click="showInput()">
            <font-awesome-icon icon="eye" />
        </GizmoIconButton>
        <GizmoIconButton v-if="visibility == 'text'" :label="$t('Password')" :disabled="disabled" @click="hideInput()">
            <font-awesome-icon icon="eye-slash" />
        </GizmoIconButton>
    </div>
</template>

<script>
import GizmoIconButton from "./gizmo/GizmoIconButton.vue";
import GizmoInput from "./gizmo/GizmoInput.vue";

export default {
    components: {
        GizmoIconButton,
        GizmoInput,
    },
    inheritAttrs: false,
    props: {
        /** Forwarded to the input itself so a caller's <label for> resolves. */
        id: {
            type: String,
            default: undefined,
        },
        /** The value of the input */
        modelValue: {
            type: String,
            default: "",
        },
        /** A placeholder to use */
        placeholder: {
            type: String,
            default: "",
        },
        /** Maximum length of the input */
        maxlength: {
            type: Number,
            default: 255,
        },
        /** Should the field auto complete */
        autocomplete: {
            type: String,
            default: "new-password",
        },
        /** Is the input required? */
        required: {
            type: Boolean,
        },
        /** Should the input be read only? */
        readonly: {
            type: String,
            default: undefined,
        },
        /** Whether the field and its reveal control are disabled */
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["update:modelValue"],
    data() {
        return {
            visibility: "password",
        };
    },
    computed: {
        model: {
            get() {
                return this.modelValue;
            },
            set(value) {
                this.$emit("update:modelValue", value);
            },
        },
    },
    created() {},
    methods: {
        /**
         * Show users input in plain text
         * @returns {void}
         */
        showInput() {
            this.visibility = "text";
        },
        /**
         * Censor users input
         * @returns {void}
         */
        hideInput() {
            this.visibility = "password";
        },
    },
};
</script>
