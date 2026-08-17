<template>
    <label class="gizmo-switch gizmo-focus-within">
        <input
            v-bind="$attrs"
            :checked="modelValue"
            type="checkbox"
            role="switch"
            class="gizmo-switch__input"
            @change="handleChange"
        />
        <span class="gizmo-switch__track" aria-hidden="true"><span class="gizmo-switch__thumb"></span></span>
        <span class="gizmo-switch__label"><slot /></span>
    </label>
</template>

<script>
export default {
    inheritAttrs: false,
    props: {
        modelValue: Boolean,
    },
    emits: ["update:modelValue", "change"],
    methods: {
        handleChange(event) {
            this.$emit("update:modelValue", event.target.checked);
            this.$emit("change", event);
        },
    },
};
</script>
