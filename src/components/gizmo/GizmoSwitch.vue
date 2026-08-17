<template>
    <label class="gizmo-switch gizmo-focus-within">
        <input
            v-bind="$attrs"
            :checked="modelValue"
            type="checkbox"
            role="switch"
            class="gizmo-switch__input"
            @change="$emit('update:modelValue', $event.target.checked)"
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
    emits: ["update:modelValue"],
};
</script>
