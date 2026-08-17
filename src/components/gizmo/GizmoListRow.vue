<template>
    <div class="gizmo-list-row">
        <div v-if="$slots.leading" class="gizmo-list-row__leading"><slot name="leading" /></div>
        <div class="gizmo-list-row__content"><slot /></div>
        <div v-if="$slots.trailing" class="gizmo-list-row__trailing"><slot name="trailing" /></div>
    </div>
</template>
