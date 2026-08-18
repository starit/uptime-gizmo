<template>
    <div class="dashboard-shell">
        <aside v-if="!$root.isMobile" class="monitor-rail">
            <div class="monitor-rail-action">
                <router-link to="/add" class="gizmo-native-button gizmo-native-button--primary tw-mb-3">
                    <font-awesome-icon icon="plus" />
                    {{ $t("Add New Monitor") }}
                </router-link>
            </div>
            <MonitorList :scrollbar="true" />
        </aside>

        <section ref="container" class="workspace-canvas">
            <!-- Add :key to disable vue router re-use the same component -->
            <router-view :key="$route.fullPath" :calculatedHeight="height" />
        </section>
    </div>
</template>

<script>
import MonitorList from "../components/MonitorList.vue";

export default {
    components: {
        MonitorList,
    },
    data() {
        return {
            height: 0,
        };
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
};
</script>

<style lang="scss" scoped>
.dashboard-shell {
    display: grid;
    grid-template-columns: minmax(17rem, 0.8fr) minmax(0, 2fr);
    gap: clamp(1rem, 2vw, 2rem);
    width: min(100% - 2rem, 1540px);
    margin: 0 auto;
}

.monitor-rail {
    position: sticky;
    top: 6.5rem;
    align-self: start;
    max-height: calc(100vh - 8rem);
    padding: 1rem;
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-panel);
}

.monitor-rail-action {
    display: flex;
    justify-content: flex-end;
}

.workspace-canvas {
    min-width: 0;
}

@media (max-width: 767.98px) {
    .dashboard-shell {
        display: block;
        width: min(100% - 1.25rem, 1540px);
    }
}
</style>
