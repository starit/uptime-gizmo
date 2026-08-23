<template>
    <div class="gizmo-inline-action">
        <GizmoInput
            :id="id"
            v-model="model"
            :type="type"
            :placeholder="placeholder"
            :autocomplete="autocomplete"
            :required="required"
            :readonly="readonly"
            :disabled="disabled"
        />

        <!-- The adjacent input is often disabled/readonly so the value cannot be
             edited. Copy must stay clickable — that is the control's purpose. -->
        <GizmoIconButton :label="$t('Copy to Clipboard')" @click="copyToClipboard(model)">
            <font-awesome-icon :icon="icon" />
        </GizmoIconButton>
    </div>
</template>

<script>
import GizmoIconButton from "./gizmo/GizmoIconButton.vue";
import GizmoInput from "./gizmo/GizmoInput.vue";

let timeout;

export default {
    components: {
        GizmoIconButton,
        GizmoInput,
    },
    props: {
        /** ID of this input */
        id: {
            type: String,
            default: "",
        },
        /** Type of input */
        type: {
            type: String,
            default: "text",
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
        /** Should the field auto complete */
        autocomplete: {
            type: String,
            default: undefined,
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
        /** Is the input disabled? */
        disabled: {
            type: String,
            default: undefined,
        },
    },
    emits: ["update:modelValue"],
    data() {
        return {
            visibility: "password",
            icon: "copy",
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
         * Show the input
         * @returns {void}
         */
        showInput() {
            this.visibility = "text";
        },

        /**
         * Hide the input
         * @returns {void}
         */
        hideInput() {
            this.visibility = "password";
        },

        /**
         * Copy the provided text to the users clipboard
         * @param {string} textToCopy Text to copy to clipboard
         * @returns {Promise<void>}
         */
        async copyToClipboard(textToCopy) {
            const text = String(textToCopy ?? "");

            try {
                if (navigator.clipboard?.writeText && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                } else {
                    this.copyWithFallback(text);
                }
                this.markCopied();
            } catch {
                try {
                    this.copyWithFallback(text);
                    this.markCopied();
                } catch {
                    this.$root.toastError(this.$t("Failed to copy to clipboard"));
                }
            }
        },

        /**
         * Flash the copy control so the tap is visibly acknowledged.
         * @returns {void}
         */
        markCopied() {
            this.icon = "check";
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.icon = "copy";
            }, 3000);
        },

        /**
         * Copy via the visible field when it can be selected, otherwise a
         * 1px textarea inside this control. Do not park the fallback off-screen
         * with `position: fixed`: a transformed dialog becomes the containing
         * block and iOS then fails the copy silently.
         * @param {string} text Text to copy
         * @returns {void}
         * @throws {Error} If the browser refuses the copy command
         */
        copyWithFallback(text) {
            const visibleInput = this.$el.querySelector("input");
            if (visibleInput && !visibleInput.disabled) {
                try {
                    visibleInput.focus();
                    visibleInput.select();
                    visibleInput.setSelectionRange(0, text.length);
                    if (document.execCommand("copy")) {
                        return;
                    }
                } catch {
                    // Some input types reject selection APIs; use the textarea path.
                }
            }

            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.setAttribute("readonly", "");
            textArea.setAttribute("aria-hidden", "true");
            textArea.tabIndex = -1;
            textArea.style.cssText = "position:absolute;inset-inline-start:0;inset-block-start:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
            this.$el.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, text.length);

            let copied = false;
            try {
                copied = document.execCommand("copy");
            } finally {
                this.$el.removeChild(textArea);
            }

            if (!copied) {
                throw new Error("copy failed");
            }
        },
    },
};
</script>
