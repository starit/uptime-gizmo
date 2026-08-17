<template>
    <label class="gizmo-check gizmo-focus-within">
        <input
            v-bind="$attrs"
            :checked="modelValue"
            type="checkbox"
            class="gizmo-check__input"
            @change="$emit('update:modelValue', $event.target.checked)"
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
    emits: ["update:modelValue"],
};
</script>
