<template>
    <main class="onboarding-shell" data-cy="setup-form">
        <div class="onboarding-card">
            <form @submit.prevent="submit">
                <div class="onboarding-brand">
                    <img src="/images/uptime-gizmo-logo-horizontal-light.png" :alt="$root.appName" />
                </div>

                <p class="onboarding-card-prompt">
                    {{ $t("Create your admin account") }}
                </p>

                <div class="gizmo-floating-field">
                    <select id="language" v-model="$root.language" class="gizmo-native-control gizmo-native-select">
                        <option v-for="(lang, i) in $i18n.availableLocales" :key="`Lang${i}`" :value="lang">
                            {{ $i18n.messages[lang].languageName }}
                        </option>
                    </select>
                    <label for="language" class="gizmo-field-label">{{ $t("Language") }}</label>
                </div>

                <div class="gizmo-floating-field tw-mt-3">
                    <input
                        id="floatingInput"
                        v-model="username"
                        type="text"
                        class="gizmo-native-control"
                        :placeholder="$t('Username')"
                        required
                        data-cy="username-input"
                    />
                    <label for="floatingInput">{{ $t("Username") }}</label>
                </div>

                <div class="gizmo-floating-field tw-mt-3">
                    <input
                        id="floatingPassword"
                        v-model="password"
                        type="password"
                        class="gizmo-native-control"
                        :placeholder="$t('Password')"
                        required
                        data-cy="password-input"
                    />
                    <label for="floatingPassword">{{ $t("Password") }}</label>
                </div>

                <div class="gizmo-floating-field tw-mt-3">
                    <input
                        id="repeat"
                        v-model="repeatPassword"
                        type="password"
                        class="gizmo-native-control"
                        :placeholder="$t('Repeat Password')"
                        required
                        data-cy="password-repeat-input"
                    />
                    <label for="repeat">{{ $t("Repeat Password") }}</label>
                </div>

                <button
                    class="tw-w-full gizmo-native-button gizmo-native-button--primary tw-mt-3"
                    type="submit"
                    :disabled="processing"
                    data-cy="submit-setup-form"
                >
                    {{ $t("Create") }}
                </button>
            </form>
        </div>
    </main>
</template>

<script>
export default {
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            repeatPassword: "",
        };
    },
    watch: {},
    mounted() {
        // TODO: Check if it is a database setup

        this.$root.getSocket().emit("needSetup", (needSetup) => {
            if (!needSetup) {
                this.$router.push("/");
            }
        });
    },
    methods: {
        /**
         * Submit form data for processing
         * @returns {void}
         */
        submit() {
            this.processing = true;

            if (this.password !== this.repeatPassword) {
                this.$root.toastError("PasswordsDoNotMatch");
                this.processing = false;
                return;
            }

            this.$root.getSocket().emit("setup", this.username, this.password, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.processing = true;

                    this.$root.login(this.username, this.password, "", () => {
                        this.processing = false;
                        this.$router.push("/");
                    });
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.onboarding-shell {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 100vh;
    padding: clamp(2rem, 8vh, 7rem) 1rem;
    background:
        radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--color-brand) 18%, transparent), transparent 22rem),
        var(--color-bg);
}

.form-floating {
    > .form-select {
        padding-left: 1.3rem;
        padding-top: 1.525rem;
        line-height: 1.35;

        ~ label {
            padding-left: 1.3rem;
        }
    }

    > label {
        padding-left: 1.3rem;
    }

    > .form-control {
        padding-left: 1.3rem;
    }
}

.onboarding-card {
    width: 100%;
    max-width: 30rem;
    padding: clamp(1.5rem, 4vw, 2.75rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    box-shadow: 0 24px 70px rgba(10, 21, 30, 0.12);
    text-align: center;
}

.onboarding-brand img {
    width: min(100%, 16rem);
    height: auto;
    border-radius: 0.75rem;
}

.onboarding-card-prompt {
    margin: 2rem 0 1rem;
    color: var(--color-text);
    font-size: 1.05rem;
    font-weight: 700;
}
</style>
