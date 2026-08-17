<template>
    <label class="gizmo-check gizmo-focus-within">
        <input
            v-bind="$attrs"
            :checked="modelValue === value"
            :value="value"
            type="radio"
            class="gizmo-check__input"
            @change="handleChange"
        />
        <span class="gizmo-check__box gizmo-check__box--radio" aria-hidden="true"></span>
        <span class="gizmo-check__label"><slot /></span>
    </label>
</template>

<script>
export default {
    inheritAttrs: false,
    props: {
        modelValue: {
            type: [String, Number, Boolean],
            default: null,
        },
        value: {
            type: [String, Number, Boolean],
            required: true,
        },
    },
    emits: ["update:modelValue", "change"],
    methods: {
        handleChange(event) {
            this.$emit("update:modelValue", this.value);
            this.$emit("change", event);
        },
    },
};
</script>
