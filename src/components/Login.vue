<template>
    <div class="form-container">
        <div class="form">
            <!--
                The one screen everybody sees, and until now the only one with
                nothing on it but two fields. The mascot is decorative — the
                heading is the greeting, so the image carries no meaning and is
                hidden from screen readers.
            -->
            <div class="login-greeting">
                <img
                    class="login-greeting__mascot"
                    src="/images/gizmo-mascot-engineer-cutout.webp"
                    alt=""
                    width="448"
                    height="448"
                    decoding="async"
                >
                <p class="login-greeting__slogan">{{ $t("uptimeIsMoney") }}</p>
            </div>

            <form aria-label="Login Form" class="tw-pt-3" @submit.prevent="submit">
                <div v-if="!tokenRequired" class="gizmo-floating-field">
                    <input
                        id="floatingInput"
                        v-model="username"
                        type="text"
                        class="gizmo-native-control"
                        placeholder="Username"
                        autocomplete="username"
                        required
                    />
                    <label for="floatingInput">{{ $t("Username") }}</label>
                </div>

                <div v-if="!tokenRequired" class="gizmo-floating-field tw-mt-3">
                    <input
                        id="floatingPassword"
                        v-model="password"
                        type="password"
                        class="gizmo-native-control"
                        placeholder="Password"
                        autocomplete="current-password"
                        required
                    />
                    <label for="floatingPassword">{{ $t("Password") }}</label>
                </div>

                <div v-if="tokenRequired">
                    <div class="gizmo-floating-field tw-mt-3">
                        <input
                            id="otp"
                            ref="otpInput"
                            v-model="token"
                            type="text"
                            maxlength="6"
                            class="gizmo-native-control"
                            placeholder="123456"
                            autocomplete="one-time-code"
                            required
                        />
                        <label for="otp">{{ $t("Token") }}</label>
                    </div>
                </div>

                <div class="gizmo-native-check tw-mb-3 tw-mt-3 tw-flex tw-justify-center tw-pe-4">
                    <div class="gizmo-native-check">
                        <input
                            id="remember"
                            v-model="$root.remember"
                            type="checkbox"
                            value="remember-me"
                            class="gizmo-native-check__input"
                        />

                        <label class="gizmo-native-check__label" for="remember">
                            {{ $t("Remember me") }}
                        </label>
                    </div>
                </div>
                <button class="tw-w-full gizmo-native-button gizmo-native-button--primary" type="submit" :disabled="processing">
                    {{ $t("Login") }}
                </button>

                <div v-if="res && !res.ok" class="gizmo-native-alert gizmo-native-alert--danger tw-mt-3" role="alert">
                    {{ $t(res.msg) }}
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
        };
    },

    watch: {
        tokenRequired(newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    this.$refs.otpInput?.focus();
                });
            }
        },
    },

    mounted() {
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        submit() {
            this.processing = true;

            this.$root.login(this.username, this.password, this.token, (res) => {
                this.processing = false;

                if (res.tokenRequired) {
                    this.tokenRequired = true;
                } else {
                    this.res = res;
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.form-container {
    display: flex;
    align-items: center;
    padding-top: 40px;
    padding-bottom: 40px;
}

.form {
    width: 100%;
    max-width: 330px;
    padding: 15px;
    margin: auto;
    text-align: center;
}

.login-greeting {
    margin-bottom: 0.5rem;
}

.login-greeting__mascot {
    /*
     * Preflight makes images display:block, so the form's text-align does not
     * reach them and the mascot sat against the left edge while everything else
     * was centred.
     */
    margin-inline: auto;
    width: clamp(7rem, 30vw, 9.5rem);
    height: auto;

    /* The cutout carries its own studio shadow; a second one would read as two
       light sources. */
    filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.16));
}

.login-greeting__slogan {
    margin: 0.35rem 0 0;
    color: var(--color-text);
    font-size: 1.15rem;
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
    text-wrap: balance;
}

/* On a short window the form matters more than the greeting. */
@media (max-height: 700px) {
    .login-greeting__mascot {
        width: clamp(5rem, 18vw, 6.5rem);
    }

    .login-greeting__slogan {
        font-size: 1rem;
    }
}
</style>
