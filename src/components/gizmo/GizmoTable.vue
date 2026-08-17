<template>
    <div class="gizmo-table-wrap">
        <table v-bind="$attrs" class="gizmo-table"><slot /></table>
    </div>
</template>

<script>
export default {
    inheritAttrs: false,
};
</script>
