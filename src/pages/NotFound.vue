<template>
    <div>
        <!-- Desktop header -->
        <header v-if="!$root.isMobile" class="tw-flex tw-flex-wrap tw-justify-center tw-py-3 tw-mb-3 tw-border-b tw-border-solid tw-border-border">
            <router-link
                to="/"
                class="not-found-brand tw-flex tw-items-center tw-mb-3 md:tw-mb-0 md:tw-me-auto tw-no-underline"
            >
                <BrandLogo class="not-found-brand-logo tw-me-2 tw-ms-4" />
                <span class="tw-text-2xl title">{{ $root.appName }}</span>
            </router-link>
        </header>

        <!-- Mobile header -->
        <header v-else class="tw-flex tw-flex-wrap tw-justify-center tw-pt-2 tw-pb-2 tw-mb-3">
            <router-link to="/dashboard" class="not-found-brand tw-flex tw-items-center tw-no-underline">
                <BrandLogo class="not-found-brand-logo" />
                <span class="tw-text-2xl title tw-ms-2">{{ $root.appName }}</span>
            </router-link>
        </header>

        <div class="content">
            <div>
                <strong><font-awesome-icon icon="triangle-exclamation" /> {{ $t("Page Not Found") }}</strong>
            </div>

            <div class="guide">
                {{ $t("Most likely causes:") }}
                <ul>
                    <li>{{ $t("The resource is no longer available.") }}</li>
                    <li>{{ $t("There might be a typing error in the address.") }}</li>
                </ul>

                {{ $t("What you can try:") }}
                <br />
                <ul>
                    <li>{{ $t("Retype the address.") }}</li>
                    <li>
                        <a href="#" class="go-back" @click="goBack()">{{ $t("Go back to the previous page.") }}</a>
                    </li>
                    <li>
                        <a href="/" class="go-back">{{ $t("Go back to home page.") }}</a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import BrandLogo from "../components/BrandLogo.vue";

export default {
    components: {
        BrandLogo,
    },
    async mounted() {},
    methods: {
        /**
         * Go back 1 in browser history
         * @returns {void}
         */
        goBack() {
            history.back();
        },
    },
};
</script>

<style scoped lang="scss">
.go-back {
    text-decoration: none;
    color: var(--color-interactive) !important;
}

.not-found-brand {
    color: var(--color-text);
}

.not-found-brand-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
}

.content {
    display: flex;
    justify-content: center;
    align-content: center;
    align-items: center;
    flex-direction: column;
    gap: 3rem;
    padding-top: 2rem;

    strong {
        font-size: 24px;
    }
}

.guide {
    max-width: 800px;
    font-size: 14px;
}

.title {
    font-weight: var(--weight-bold);
}

</style>
