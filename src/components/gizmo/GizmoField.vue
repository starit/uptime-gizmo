<template>
    <div class="gizmo-field" :class="{ 'has-error': error }">
        <label v-if="label" class="gizmo-field__label" :for="forId">
            {{ label }}<span v-if="required" class="gizmo-field__required" aria-hidden="true">*</span>
        </label>
        <slot :describedby="describedBy" :invalid="Boolean(error)" />
        <p v-if="error" :id="errorId" class="gizmo-field__error" role="alert">{{ error }}</p>
        <p v-else-if="help" :id="helpId" class="gizmo-field__help">{{ help }}</p>
    </div>
</template>

<script>
export default {
    props: {
        forId: {
            type: String,
            default: "",
        },
        label: {
            type: String,
            default: "",
        },
        help: {
            type: String,
            default: "",
        },
        error: {
            type: String,
            default: "",
        },
        required: Boolean,
    },
    computed: {
        helpId() {
            return this.forId ? `${this.forId}-help` : undefined;
        },
        errorId() {
            return this.forId ? `${this.forId}-error` : undefined;
        },
        describedBy() {
            return this.error ? this.errorId : this.help ? this.helpId : undefined;
        },
    },
};
</script>
