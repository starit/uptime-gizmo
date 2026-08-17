<template>
    <textarea
        v-bind="$attrs"
        :value="modelValue"
        class="gizmo-control gizmo-control--textarea gizmo-focus-ring"
        @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
</template>

<script>
export default {
    inheritAttrs: false,
    props: {
        modelValue: {
            type: String,
            default: "",
        },
    },
    emits: ["update:modelValue"],
};
</script>
