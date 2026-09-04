<template>
    <transition name="slide-fade" appear>
        <MonitorInventory />
    </transition>
</template>

<script>
import MonitorInventory from "../components/MonitorInventory.vue";

export default {
    components: {
        MonitorInventory,
    },
};
</script>
