<template>
    <select
        v-bind="$attrs"
        v-model="model"
        class="gizmo-control gizmo-control--select gizmo-focus-ring"
        @change="$emit('change', $event)"
    >
        <slot />
    </select>
</template>

<script>
export default {
    inheritAttrs: false,
    props: {
        modelValue: {
            type: [String, Number],
            default: "",
        },
    },
    emits: ["update:modelValue", "change"],
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
};
</script>
