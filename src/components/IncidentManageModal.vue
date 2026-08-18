<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Edit Incident')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="incident-edit-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="incident-title" class="gizmo-field-label">{{ $t("Title") }}</label>
                <input
                    id="incident-title"
                    v-model="form.title"
                    type="text"
                    class="gizmo-native-control"
                    :placeholder="$t('Incident title')"
                    required
                    autofocus
                />
            </div>

            <div>
                <label for="incident-content" class="gizmo-field-label">{{ $t("Content") }}</label>
                <textarea
                    id="incident-content"
                    v-model="form.content"
                    class="gizmo-native-control"
                    rows="4"
                    :placeholder="$t('Incident description')"
                    required
                ></textarea>
            </div>

            <div>
                <label for="incident-style" class="gizmo-field-label">{{ $t("Style") }}</label>
                <select id="incident-style" v-model="form.style" class="gizmo-native-control gizmo-native-select">
                    <option value="info">{{ $t("info") }}</option>
                    <option value="warning">{{ $t("warning") }}</option>
                    <option value="danger">{{ $t("danger") }}</option>
                    <option value="primary">{{ $t("primary") }}</option>
                    <option value="light">{{ $t("light") }}</option>
                    <option value="dark">{{ $t("dark") }}</option>
                </select>
            </div>

            <div class="gizmo-native-check">
                <input id="incident-pin" v-model="form.pin" type="checkbox" class="gizmo-native-check__input" />
                <label for="incident-pin" class="gizmo-native-check__label">{{ $t("Pin this incident") }}</label>
                <div class="gizmo-field-help">
                    {{ $t("Pinned incidents are shown prominently on the status page") }}
                </div>
            </div>
        </form>

        <template #footer>
            <GizmoButton variant="secondary" :disabled="processing" @click="setOpen(false)">
                {{ $t("Cancel") }}
            </GizmoButton>
            <GizmoButton form="incident-edit-form" type="submit" :loading="processing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="confirmDeleteIncident"
    >
        {{ $t("deleteIncidentMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

export default {
    name: "IncidentManageModal",
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
    },
    props: {
        slug: {
            type: String,
            required: true,
        },
    },
    emits: ["incident-updated"],
    data() {
        return {
            open: false,
            processing: false,
            incidentId: null,
            pendingDeleteIncident: null,
            form: {
                title: "",
                content: "",
                style: "warning",
                pin: true,
            },
        };
    },
    methods: {
        setOpen(open) {
            this.open = open;
        },
        showEdit(incident) {
            if (this.processing) {
                return;
            }
            this.incidentId = incident.id;
            this.form = {
                title: incident.title,
                content: incident.content,
                style: incident.style || "warning",
                pin: Boolean(incident.pin),
            };
            this.open = true;
        },
        showDelete(incident) {
            this.pendingDeleteIncident = incident;
            this.$refs.confirmDelete.show();
        },
        submit() {
            if (this.processing) {
                return;
            }
            if (!this.form.title?.trim()) {
                this.$root.toastError(this.$t("Please input title"));
                return;
            }
            if (!this.form.content?.trim()) {
                this.$root.toastError(this.$t("Please input content"));
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("editIncident", this.slug, this.incidentId, this.form, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.open = false;
                    this.$emit("incident-updated");
                }
            });
        },
        confirmDeleteIncident() {
            if (!this.pendingDeleteIncident || this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("deleteIncident", this.slug, this.pendingDeleteIncident.id, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$emit("incident-updated");
                }
                this.pendingDeleteIncident = null;
            });
        },
    },
};
</script>
