<template>
    <div>
        <!--
            The page listed endpoints without ever saying what one is for, which
            chains can go in it, or what the two monitor types do with it. The
            EVM-only limit in particular was only discoverable by adding a
            Solana endpoint and watching every call fail.
        -->
        <p class="gizmo-field-help tw-mb-2">{{ $t("web3NetworksIntro") }}</p>
        <p class="gizmo-field-help tw-mb-2">{{ $t("web3NetworksSupported") }}</p>
        <p class="gizmo-field-help tw-mb-4">{{ $t("web3NetworksHelp") }}</p>

        <div class="tw-my-4">
            <!-- Body size made this line louder than the three paragraphs of
                 explanation above it, for a sentence that only says "empty". -->
            <p v-if="$root.web3NetworkList.length === 0" class="gizmo-field-help">
                {{ $t("Not available, please setup.") }}
            </p>

            <ul v-else class="gizmo-list-group tw-mb-3">
                <li v-for="network in $root.web3NetworkList" :key="network.id" class="gizmo-list-group__item">
                    <strong>{{ network.name }}</strong>
                    <span v-if="network.chainId" class="gizmo-field-help tw-ms-2">
                        {{ $t("Chain ID") }} {{ network.chainId }}
                    </span>
                    <span v-if="!network.active" class="gizmo-field-help tw-ms-2">{{ $t("Disabled") }}</span>
                    <br />
                    <a href="#" @click.prevent="$refs.dialog.show(network.id)">{{ $t("Edit") }}</a>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--primary tw-me-2" type="button" @click="$refs.dialog.show()">
                {{ $t("Setup Web3 Network") }}
            </button>
        </div>

        <Web3NetworkDialog ref="dialog" />
    </div>
</template>

<script>
import Web3NetworkDialog from "../Web3NetworkDialog.vue";

export default {
    components: {
        Web3NetworkDialog,
    },
};
</script>
