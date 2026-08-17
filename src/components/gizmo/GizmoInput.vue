<template>
    <input
        v-bind="$attrs"
        :value="modelValue"
        class="gizmo-control gizmo-focus-ring"
        @input="$emit('update:modelValue', $event.target.value)"
    />
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
};
</script>
