<template>
    <div>
        <div class="tw-flex tw-flex-row tw-items-center tw-p-1 tw-overflow-hidden">
            <div class="tw-m-3 tw-ps-3">
                <div class="cert-icon">
                    <font-awesome-icon icon="file" />
                    <font-awesome-icon class="award-icon" icon="award" />
                </div>
            </div>
            <div class="tw-m-3">
                <table class="tw-text-start">
                    <tbody>
                        <tr class="tw-my-3">
                            <td class="tw-px-3">{{ $t("Subject:") }}</td>
                            <td>{{ formatSubject(cert.subject) }}</td>
                        </tr>
                        <tr class="tw-my-3">
                            <td class="tw-px-3">{{ $t("Valid To:") }}</td>
                            <td><Datetime :value="cert.validTo" /></td>
                        </tr>
                        <tr class="tw-my-3">
                            <td class="tw-px-3">{{ $t("Days Remaining:") }}</td>
                            <td>{{ cert.daysRemaining }}</td>
                        </tr>
                        <tr class="tw-my-3">
                            <td class="tw-px-3">{{ $t("Issuer:") }}</td>
                            <td>{{ formatSubject(cert.issuer) }}</td>
                        </tr>
                        <tr class="tw-my-3">
                            <td class="tw-px-3">{{ $t("Fingerprint:") }}</td>
                            <td>{{ cert.fingerprint }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="tw-flex">
            <font-awesome-icon v-if="cert.issuerCertificate" class="tw-m-2 ps-6 link-icon" icon="link" />
        </div>
        <certificate-info-row v-if="cert.issuerCertificate" :cert="cert.issuerCertificate" />
    </div>
</template>

<script>
import Datetime from "../components/Datetime.vue";
export default {
    name: "CertificateInfoRow",
    components: {
        Datetime,
    },
    props: {
        /** Object representing certificate */
        cert: {
            type: Object,
            required: true,
        },
    },
    methods: {
        /**
         * Format the subject of the certificate
         * @param {object} subject Object representing the certificates
         * subject
         * @returns {string} Certificate subject
         */
        formatSubject(subject) {
            if (subject.O && subject.CN && subject.C) {
                return `${subject.CN} - ${subject.O} (${subject.C})`;
            } else if (subject.O && subject.CN) {
                return `${subject.CN} - ${subject.O}`;
            } else if (subject.CN) {
                return subject.CN;
            } else {
                return "no info";
            }
        },
    },
};
</script>

<style lang="scss" scoped>
table {
    overflow: hidden;
}

.cert-icon {
    position: relative;
    font-size: 70px;
    color: var(--color-interactive);
    opacity: 0.5;
}

.award-icon {
    position: absolute;
    font-size: 0.5em;
    bottom: 20%;
    left: 12%;
    color: var(--color-text-inverse);
}

.link-icon {
    font-size: 1.25rem;
    margin-inline-start: 3.125rem !important;
    color: var(--color-interactive);
    opacity: 0.5;
}
</style>
