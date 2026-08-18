<template>
    <div>
        <div class="tw-mb-3">
            <label for="hostname" class="gizmo-field-label">{{ $t("Hostname") }}</label>
            <input id="hostname" v-model="$parent.notification.smtpHost" type="text" class="gizmo-native-control" required />
        </div>

        <i18n-t
            tag="div"
            keypath="Either enter the hostname of the server you want to connect to or localhost if you intend to use a locally configured mail transfer agent"
            class="gizmo-field-help"
        >
            <template #localhost>
                <code>localhost</code>
            </template>
            <template #local_mta>
                <a href="https://wikipedia.org/wiki/Mail_Transfer_Agent" target="_blank">
                    {{ $t("locally configured mail transfer agent") }}
                </a>
            </template>
        </i18n-t>
        <div class="tw-mb-3">
            <label for="port" class="gizmo-field-label">{{ $t("Port") }}</label>
            <input
                id="port"
                v-model="$parent.notification.smtpPort"
                type="number"
                class="gizmo-native-control"
                required
                min="0"
                max="65535"
                step="1"
            />
        </div>

        <div class="tw-mb-3">
            <label for="secure" class="gizmo-field-label">{{ $t("Security") }}</label>
            <select id="secure" v-model="$parent.notification.smtpSecure" class="gizmo-native-control gizmo-native-select">
                <option :value="false">{{ $t("secureOptionNone") }}</option>
                <option :value="true">{{ $t("secureOptionTLS") }}</option>
            </select>
        </div>

        <div class="tw-mb-3">
            <div class="gizmo-native-check">
                <input
                    id="ignore-tls-error"
                    v-model="$parent.notification.smtpIgnoreTLSError"
                    class="gizmo-native-check__input"
                    type="checkbox"
                    value=""
                />
                <label class="gizmo-native-check__label" for="ignore-tls-error">
                    {{ $t("Ignore TLS Error") }}
                </label>
            </div>
        </div>

        <div v-if="!$parent.notification.smtpSecure" class="tw-mb-3">
            <div class="gizmo-native-check">
                <input
                    id="ignore-starttls"
                    v-model="$parent.notification.smtpIgnoreSTARTTLS"
                    class="gizmo-native-check__input"
                    type="checkbox"
                    value=""
                />
                <label class="gizmo-native-check__label" for="ignore-starttls">
                    {{ $t("Disable STARTTLS") }}
                </label>
            </div>
            <div class="gizmo-field-help">
                {{ $t("disableSTARTTLSDescription") }}
            </div>
        </div>

        <div class="tw-mb-3">
            <label for="username" class="gizmo-field-label">{{ $t("Username") }}</label>
            <input
                id="username"
                v-model="$parent.notification.smtpUsername"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
            />
        </div>

        <div class="tw-mb-3">
            <label for="password" class="gizmo-field-label">{{ $t("Password") }}</label>
            <HiddenInput
                id="password"
                v-model="$parent.notification.smtpPassword"
                :required="false"
                autocomplete="new-password"
            ></HiddenInput>
        </div>

        <div class="tw-mb-3">
            <label for="from-email" class="gizmo-field-label">{{ $t("From Email") }}</label>
            <input
                id="from-email"
                v-model="$parent.notification.smtpFrom"
                type="text"
                class="gizmo-native-control"
                required
                autocomplete="false"
                placeholder='"Uptime Gizmo" &lt;example@kuma.pet&gt;'
            />
            <div class="gizmo-field-help"></div>
        </div>

        <div class="tw-mb-3">
            <label for="to-email" class="gizmo-field-label">{{ $t("To Email") }}</label>
            <input
                id="to-email"
                v-model="$parent.notification.smtpTo"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
                placeholder="example2@kuma.pet, example3@kuma.pet"
                :required="!hasRecipient"
            />
        </div>

        <div class="tw-mb-3">
            <label for="to-cc" class="gizmo-field-label">{{ $t("smtpCC") }}</label>
            <input
                id="to-cc"
                v-model="$parent.notification.smtpCC"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
                :required="!hasRecipient"
            />
        </div>

        <div class="tw-mb-3">
            <label for="to-bcc" class="gizmo-field-label">{{ $t("smtpBCC") }}</label>
            <input
                id="to-bcc"
                v-model="$parent.notification.smtpBCC"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
                :required="!hasRecipient"
            />
        </div>

        <div class="tw-mb-3">
            <label for="subject-email" class="gizmo-field-label">{{ $t("emailCustomSubject") }}</label>
            <TemplatedInput
                id="subject-email"
                v-model="$parent.notification.customSubject"
                :required="false"
                placeholder=""
            ></TemplatedInput>
            <div class="gizmo-field-help">{{ $t("leave blank for default subject") }}</div>
        </div>

        <div class="tw-mb-3">
            <label for="body-email" class="gizmo-field-label">{{ $t("emailCustomBody") }}</label>
            <TemplatedTextarea
                id="body-email"
                v-model="$parent.notification.customBody"
                :required="false"
                placeholder=""
            ></TemplatedTextarea>
            <div class="gizmo-field-help">{{ $t("leave blank for default body") }}</div>
        </div>

        <div class="tw-mb-3">
            <div class="gizmo-native-check">
                <input
                    id="use-html-body"
                    v-model="$parent.notification.htmlBody"
                    class="gizmo-native-check__input"
                    type="checkbox"
                    value=""
                />
                <label class="gizmo-native-check__label" for="use-html-body">
                    {{ $t("Use HTML for custom E-mail body") }}
                </label>
            </div>
        </div>

        <div class="tw-mb-3">
            <div class="gizmo-native-check gizmo-native-switch">
                <input v-model="showAdditionalHeadersField" class="gizmo-native-check__input" type="checkbox" />
                <label class="gizmo-native-check__label">{{ $t("smtpAdditionalHeadersTitle") }}</label>
            </div>
            <i18n-t
                v-if="showAdditionalHeadersField"
                tag="div"
                keypath="smtpAdditionalHeadersDesc"
                class="gizmo-field-help tw-mb-3"
            >
                <a href="https://nodemailer.com/message/custom-headers" target="_blank">{{ $t("documentation") }}</a>
            </i18n-t>

            <textarea
                v-if="showAdditionalHeadersField"
                id="additional-headers"
                v-model="$parent.notification.smtpAdditionalHeaders"
                class="gizmo-native-control"
                rows="5"
                :placeholder="headersPlaceholder"
                :required="showAdditionalHeadersField"
            ></textarea>
        </div>

        <ToggleSection :heading="$t('smtpDkimSettings')">
            <i18n-t tag="div" keypath="smtpDkimDesc" class="gizmo-field-help tw-mb-3">
                <a href="https://nodemailer.com/dkim/" target="_blank">{{ $t("documentation") }}</a>
            </i18n-t>

            <div class="tw-mb-3">
                <label for="dkim-domain" class="gizmo-field-label">{{ $t("smtpDkimDomain") }}</label>
                <input
                    id="dkim-domain"
                    v-model="$parent.notification.smtpDkimDomain"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="example.com"
                />
            </div>
            <div class="tw-mb-3">
                <label for="dkim-key-selector" class="gizmo-field-label">{{ $t("smtpDkimKeySelector") }}</label>
                <input
                    id="dkim-key-selector"
                    v-model="$parent.notification.smtpDkimKeySelector"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="2017"
                />
            </div>
            <div class="tw-mb-3">
                <label for="dkim-private-key" class="gizmo-field-label">{{ $t("smtpDkimPrivateKey") }}</label>
                <textarea
                    id="dkim-private-key"
                    v-model="$parent.notification.smtpDkimPrivateKey"
                    rows="5"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="-----BEGIN PRIVATE KEY-----"
                ></textarea>
            </div>
            <div class="tw-mb-3">
                <label for="dkim-hash-algo" class="gizmo-field-label">{{ $t("smtpDkimHashAlgo") }}</label>
                <input
                    id="dkim-hash-algo"
                    v-model="$parent.notification.smtpDkimHashAlgo"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="sha256"
                />
            </div>
            <div class="tw-mb-3">
                <label for="dkim-header-fields" class="gizmo-field-label">{{ $t("smtpDkimheaderFieldNames") }}</label>
                <input
                    id="dkim-header-fields"
                    v-model="$parent.notification.smtpDkimheaderFieldNames"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="message-id:date:from:to"
                />
            </div>
            <div class="tw-mb-3">
                <label for="dkim-skip-fields" class="gizmo-field-label">{{ $t("smtpDkimskipFields") }}</label>
                <input
                    id="dkim-skip-fields"
                    v-model="$parent.notification.smtpDkimskipFields"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="false"
                    placeholder="message-id:date"
                />
            </div>
        </ToggleSection>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedInput from "../TemplatedInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";
import ToggleSection from "../ToggleSection.vue";

export default {
    components: {
        HiddenInput,
        TemplatedInput,
        TemplatedTextarea,
        ToggleSection,
    },
    data() {
        return {
            showAdditionalHeadersField: this.$parent.notification.smtpAdditionalHeaders != null,
        };
    },
    computed: {
        hasRecipient() {
            if (
                this.$parent.notification.smtpTo ||
                this.$parent.notification.smtpCC ||
                this.$parent.notification.smtpBCC
            ) {
                return true;
            } else {
                return false;
            }
        },
        headersPlaceholder() {
            return this.$t("Example:", [
                `{
    "X-Custom-Header": "Additional Header"
}`,
            ]);
        },
    },
    mounted() {
        if (typeof this.$parent.notification.smtpSecure === "undefined") {
            this.$parent.notification.smtpSecure = false;
        }
    },
};
</script>
