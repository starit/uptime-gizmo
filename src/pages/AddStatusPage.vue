<template>
    <transition name="slide-fade" appear>
        <div class="status-page-onboarding">
            <header class="gizmo-page-header">
                <h1 class="gizmo-page-header__title">{{ $t("Add New Status Page") }}</h1>
            </header>

            <form @submit.prevent="submit">
                <GizmoPanel density="default" :footer-full-width="true">
                    <GizmoField v-slot="{ describedby, invalid }" for-id="name" :label="$t('Name')" :required="true">
                        <GizmoInput
                            id="name"
                            v-model="title"
                            type="text"
                            required
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            data-testid="name-input"
                        />
                    </GizmoField>

                    <GizmoField v-slot="{ describedby, invalid }" for-id="slug" :label="$t('Slug')" :required="true">
                        <div class="gizmo-input-prefix">
                            <span id="basic-addon3" class="gizmo-input-prefix__label">/status/</span>
                            <GizmoInput
                                id="slug"
                                v-model="slug"
                                type="text"
                                autocapitalize="none"
                                required
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                data-testid="slug-input"
                            />
                        </div>
                        <div class="gizmo-field__help">
                            <ul>
                                <li>
                                    {{ $t("Accept characters:") }}
                                    <mark>a-z</mark>
                                    <mark>0-9</mark>
                                    <mark>-</mark>
                                </li>
                                <li>
                                    {{ $t("No consecutive dashes") }}
                                    <mark>--</mark>
                                </li>
                                <i18n-t tag="li" keypath="statusPageSpecialSlugDesc">
                                    <mark class="inline-mark">default</mark>
                                </i18n-t>
                            </ul>
                        </div>
                    </GizmoField>

                    <template #footer>
                        <GizmoButton
                            id="monitor-submit-btn"
                            type="submit"
                            :loading="processing"
                            data-testid="submit-button"
                        >
                            {{ $t("Next") }}
                        </GizmoButton>
                    </template>
                </GizmoPanel>
            </form>
        </div>
    </transition>
</template>

<script>
import GizmoButton from "../components/gizmo/GizmoButton.vue";
import GizmoField from "../components/gizmo/GizmoField.vue";
import GizmoInput from "../components/gizmo/GizmoInput.vue";
import GizmoPanel from "../components/gizmo/GizmoPanel.vue";

export default {
    components: {
        GizmoButton,
        GizmoField,
        GizmoInput,
        GizmoPanel,
    },
    data() {
        return {
            title: "",
            slug: "",
            processing: false,
        };
    },
    methods: {
        /**
         * Submit form data to add new status page
         * @returns {Promise<void>}
         */
        async submit() {
            this.processing = true;

            this.$root.getSocket().emit("addStatusPage", this.title, this.slug, (res) => {
                this.processing = false;

                if (res.ok) {
                    location.href = "/status/" + res.slug + "?edit";
                } else {
                    if (res.msg.includes("UNIQUE constraint")) {
                        this.$root.toastError("The slug is already taken. Please choose another slug.");
                    } else {
                        this.$root.toastRes(res);
                    }
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.status-page-onboarding {
    max-width: 640px;
}

#slug {
    text-transform: lowercase;
}

.inline-mark {
    margin-inline-end: 0.25rem;
}
</style>
