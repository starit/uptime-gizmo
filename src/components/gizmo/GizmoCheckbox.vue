<template>
    <label class="gizmo-check gizmo-focus-within">
        <input
            v-bind="$attrs"
            :checked="modelValue"
            type="checkbox"
            class="gizmo-check__input"
            @change="handleChange"
        />
        <span class="gizmo-check__box" aria-hidden="true"></span>
        <span class="gizmo-check__label"><slot /></span>
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
