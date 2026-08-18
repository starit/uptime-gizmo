<template>
    <div>
        <h4>{{ $t("Certificate Info") }}</h4>
        {{ $t("Certificate Chain:") }}
        <div v-if="valid" class="tw-rounded tw-inline-flex tw-ms-2 tag-valid">
            {{ $t("Valid") }}
        </div>
        <div v-if="!valid" class="tw-rounded tw-inline-flex tw-ms-2 tag-invalid">
            {{ $t("Invalid") }}
        </div>
        <certificate-info-row :cert="certInfo" />
    </div>
</template>

<script>
import CertificateInfoRow from "./CertificateInfoRow.vue";
export default {
    components: {
        CertificateInfoRow,
    },
    props: {
        /** Object representing certificate */
        certInfo: {
            type: Object,
            required: true,
        },
        /** Is the TLS certificate valid? */
        valid: {
            type: Boolean,
            required: true,
        },
    },
};
</script>

<style lang="scss" scoped>
.tag-valid,
.tag-invalid {
    padding: 2px 25px;

    /* Was Bootstrap's text-white; these chips sit on a filled status colour. */
    color: var(--color-text-inverse);
}

.tag-valid {
    background-color: var(--status-up);
}

.tag-invalid {
    background-color: var(--status-down);
}
</style>
