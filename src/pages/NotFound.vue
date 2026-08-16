<template>
    <div>
        <!-- Desktop header -->
        <header v-if="!$root.isMobile" class="d-flex flex-wrap justify-content-center py-3 mb-3 border-bottom">
            <router-link
                to="/"
                class="not-found-brand d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none"
            >
                <img class="not-found-brand-logo me-2 ms-4" src="/images/logo.png" :alt="$root.appName" />
                <span class="fs-4 title">{{ $root.appName }}</span>
            </router-link>
        </header>

        <!-- Mobile header -->
        <header v-else class="d-flex flex-wrap justify-content-center pt-2 pb-2 mb-3">
            <router-link to="/dashboard" class="not-found-brand d-flex align-items-center text-decoration-none">
                <img class="not-found-brand-logo" src="/images/logo.png" :alt="$root.appName" />
                <span class="fs-4 title ms-2">{{ $root.appName }}</span>
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
export default {
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
    font-weight: bold;
}

</style>
