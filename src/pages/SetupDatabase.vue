<template>
    <main v-if="show" class="onboarding-shell">
        <form class="onboarding-card" @submit.prevent="submit">
            <div class="onboarding-brand">
                <img src="/images/uptime-gizmo-logo-horizontal-light.png" :alt="$root.appName" />
            </div>

            <div v-if="info.runningSetup" class="tw-mt-5">
                <div class="gizmo-native-alert gizmo-native-alert--success tw-mx-3 tw-px-4" role="alert">
                    <div class="tw-flex tw-items-center">
                        <strong>{{ $t("settingUpDatabaseMSG") }}</strong>
                        <div class="tw-ms-3 tw-pt-1">
                            <div class="gizmo-spinner-inline" role="status" aria-hidden="true"></div>
                        </div>
                    </div>
                </div>
            </div>

            <template v-if="!info.runningSetup">
                <div class="gizmo-floating-field tw-mt-4">
                    <select id="language" v-model="$root.language" class="gizmo-native-control gizmo-native-select">
                        <option v-for="(lang, i) in $i18n.availableLocales" :key="`Lang${i}`" :value="lang">
                            {{ $i18n.messages[lang].languageName }}
                        </option>
                    </select>
                    <label for="language" class="gizmo-field-label">{{ $t("Language") }}</label>
                </div>

                <p class="onboarding-card-prompt">
                    {{ $t("setupDatabaseChooseDatabase") }}
                </p>

                <div class="database-options" role="group" :aria-label="$t('Basic radio toggle button group')">
                    <template v-if="info.isEnabledEmbeddedMariaDB">
                        <input
                            id="btnradio3"
                            v-model="dbConfig.type"
                            type="radio"
                            class="gizmo-choice-input"
                            autocomplete="off"
                            value="embedded-mariadb"
                        />

                        <label class="gizmo-native-button gizmo-native-button--outline" for="btnradio3">Embedded MariaDB</label>
                    </template>

                    <input
                        id="btnradio2"
                        v-model="dbConfig.type"
                        type="radio"
                        class="gizmo-choice-input"
                        autocomplete="off"
                        value="mariadb"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btnradio2">MariaDB/MySQL</label>

                    <input
                        id="btnradio1"
                        v-model="dbConfig.type"
                        type="radio"
                        class="gizmo-choice-input"
                        autocomplete="off"
                        value="sqlite"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btnradio1">SQLite</label>
                </div>

                <div v-if="dbConfig.type === 'embedded-mariadb'" class="gizmo-field-help tw-mt-3 tw-text-start">
                    {{ $t("setupDatabaseEmbeddedMariaDB") }}
                </div>

                <div v-if="dbConfig.type === 'mariadb'" class="gizmo-field-help tw-mt-3 tw-text-start">
                    {{ $t("setupDatabaseMariaDB") }}
                </div>

                <div v-if="dbConfig.type === 'sqlite'" class="gizmo-field-help tw-mt-3 tw-text-start">
                    {{ $t("setupDatabaseSQLite") }}
                </div>

                <template v-if="dbConfig.type === 'mariadb'">
                    <div v-if="!isProvidedMariaDBSocket" class="gizmo-floating-field tw-mt-3">
                        <input
                            id="floatingInput"
                            v-model="dbConfig.hostname"
                            type="text"
                            class="gizmo-native-control"
                            required
                        />
                        <label for="floatingInput">{{ $t("Hostname") }}</label>
                    </div>

                    <div v-if="!isProvidedMariaDBSocket" class="gizmo-floating-field tw-mt-3">
                        <input id="floatingInput" v-model="dbConfig.port" type="text" class="gizmo-native-control" required />
                        <label for="floatingInput">{{ $t("Port") }}</label>
                    </div>

                    <div v-if="isProvidedMariaDBSocket" class="tw-mt-1 tw-text-start">
                        <i18n-t keypath="mariadbSocketPathDetectedHelptext" tag="div" class="gizmo-field-help">
                            <code>UPTIME_GIZMO_DB_SOCKET</code>
                        </i18n-t>
                    </div>

                    <hr v-if="isProvidedMariaDBSocket" class="tw-mt-3 tw-mb-2" />

                    <div class="gizmo-floating-field tw-mt-3">
                        <input
                            id="floatingInput"
                            v-model="dbConfig.username"
                            type="text"
                            class="gizmo-native-control"
                            required
                        />
                        <label for="floatingInput">{{ $t("Username") }}</label>
                    </div>

                    <div class="gizmo-floating-field tw-mt-3">
                        <input
                            id="floatingInput"
                            v-model="dbConfig.password"
                            type="password"
                            class="gizmo-native-control"
                            required
                        />
                        <label for="floatingInput">{{ $t("Password") }}</label>
                    </div>

                    <div class="gizmo-floating-field tw-mt-3">
                        <input id="floatingInput" v-model="dbConfig.dbName" type="text" class="gizmo-native-control" required />
                        <label for="floatingInput">{{ $t("dbName") }}</label>
                    </div>

                    <div class="tw-mt-3 tw-text-start">
                        <div class="gizmo-native-check gizmo-native-switch tw-ps-0" style="height: auto; display: block; padding: 0">
                            <div class="tw-flex tw-items-center">
                                <input
                                    id="sslCheck"
                                    v-model="dbConfig.ssl"
                                    type="checkbox"
                                    role="switch"
                                    class="gizmo-native-check__input tw-ms-0 tw-me-2"
                                    style="float: none"
                                />
                                <label class="gizmo-native-check__label tw-font-bold" for="sslCheck">
                                    {{ $t("enableSSL") }}
                                    <span class="tw-font-normal tw-text-content-muted" style="font-size: 0.9em">
                                        ({{ $t("Optional") }})
                                    </span>
                                </label>
                            </div>
                            <div class="gizmo-field-help tw-mt-1">
                                {{ $t("mariadbUseSSLHelptext") }}
                            </div>
                        </div>
                    </div>

                    <div v-if="dbConfig.ssl" class="gizmo-floating-field tw-mt-3">
                        <textarea
                            id="caInput"
                            v-model="dbConfig.ca"
                            class="gizmo-native-control"
                            placeholder="-----BEGIN CERTIFICATE-----"
                            style="height: 120px"
                        ></textarea>
                        <label for="caInput">{{ $t("mariadbCaCertificateLabel") }}</label>
                        <div class="gizmo-field-help">{{ $t("mariadbCaCertificateHelptext") }}</div>
                    </div>
                </template>

                <button class="gizmo-native-button gizmo-native-button--primary tw-mt-4 tw-w-full" type="submit" :disabled="disabledButton">
                    {{ $t("Next") }}
                </button>
            </template>
        </form>
    </main>
</template>

<script>
import axios from "axios";
import { useToast } from "vue-toastification";
import { sleep } from "../util.ts";
const toast = useToast();

export default {
    data() {
        return {
            show: false,
            dbConfig: {
                type: undefined,
                port: 3306,
                hostname: "",
                username: "",
                password: "",
                dbName: "kuma",
                ssl: false,
                ca: "",
            },
            info: {
                needSetup: false,
                runningSetup: false,
                isEnabledEmbeddedMariaDB: false,
            },
        };
    },
    computed: {
        disabledButton() {
            return this.dbConfig.type === undefined || this.info.runningSetup;
        },
        isProvidedMariaDBSocket() {
            return this.info.isEnabledMariaDBSocket;
        },
    },
    async mounted() {
        let res = await axios.get("/setup-database-info");
        this.info = res.data;

        if (this.info && this.info.needSetup === false) {
            location.href = "/setup";
        } else {
            this.show = true;
        }
    },
    methods: {
        async submit() {
            this.info.runningSetup = true;

            try {
                await axios.post("/setup-database", {
                    dbConfig: this.dbConfig,
                });
                await sleep(2000);
                await this.goToMainServerWhenReady();
            } catch (e) {
                toast.error(e.response.data);
            } finally {
                this.info.runningSetup = false;
            }
        },

        async goToMainServerWhenReady() {
            try {
                console.log("Trying...");
                let res = await axios.get("/setup-database-info");
                if (res.data && res.data.needSetup === false) {
                    this.show = false;
                    location.href = "/setup";
                } else {
                    if (res.data) {
                        this.info = res.data;
                    }
                    throw new Error("not ready");
                }
            } catch (e) {
                console.log("Not ready yet");
                await sleep(2000);
                await this.goToMainServerWhenReady();
            }
        },

        test() {
            this.$root.toastError("not implemented");
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

.onboarding-card {
    width: min(100%, 34rem);
    padding: clamp(1.5rem, 4vw, 2.75rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    box-shadow: 0 24px 70px rgba(10, 21, 30, 0.12);
}

.onboarding-brand {
    display: flex;
    justify-content: center;

    img {
        width: min(100%, 16rem);
        height: auto;
        border-radius: 0.75rem;
    }
}

.onboarding-card-prompt {
    margin: 2rem 0 1rem;
    color: var(--color-text);
    font-size: 1.05rem;
    font-weight: 700;
}

.database-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.625rem;

    label {
        min-height: 4.25rem;
        padding: 0.75rem;
        border-radius: 0.875rem !important;
        font-weight: 700;
    }
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

@media (max-width: 480px) {
    .onboarding-card {
        padding: 1.25rem;
    }
}
</style>
