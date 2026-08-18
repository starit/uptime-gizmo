<template>
    <div>
        <!-- Proxies -->
        <div class="proxy-list tw-my-4">
            <p v-if="$root.proxyList.length === 0">
                {{ $t("Not available, please setup.") }}
            </p>
            <p v-else>
                {{ $t("proxyDescription") }}
            </p>

            <ul class="gizmo-list-group tw-mb-3">
                <li v-for="(proxy, index) in $root.proxyList" :key="index" class="gizmo-list-group__item">
                    {{ proxy.host }}:{{ proxy.port }} ({{ proxy.protocol }})
                    <span v-if="proxy.default === true" class="gizmo-inline-badge tw-ms-2">{{ $t("Default") }}</span>
                    <br />
                    <a href="#" @click="$refs.proxyDialog.show(proxy.id)">{{ $t("Edit") }}</a>
                    |
                    <a href="#" @click="$refs.proxyDialog.showClone(proxy.id)">{{ $t("Clone") }}</a>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--primary tw-me-2" type="button" @click="$refs.proxyDialog.show()">
                {{ $t("Setup Proxy") }}
            </button>
        </div>

        <ProxyDialog ref="proxyDialog" />
    </div>
</template>

<script>
import ProxyDialog from "../../components/ProxyDialog.vue";

export default {
    components: {
        ProxyDialog,
    },
};
</script>
