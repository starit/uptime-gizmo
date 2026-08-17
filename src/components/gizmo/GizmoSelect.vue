<template>
    <select
        v-bind="$attrs"
        :value="modelValue"
        class="gizmo-control gizmo-control--select gizmo-focus-ring"
        @change="$emit('update:modelValue', selectedValue($event.target))"
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
    emits: ["update:modelValue"],
    methods: {
        selectedValue(select) {
            const option = select.options[select.selectedIndex];
            return option && option._value !== undefined ? option._value : select.value;
        },
    },
};
</script>
