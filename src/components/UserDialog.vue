<template>
    <GizmoDialog
        :open="open"
        size="sm"
        :title="title"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="user-dialog-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div v-if="mode === 'create'">
                <label for="user-username" class="gizmo-field-label">{{ $t("Username") }}</label>
                <input
                    id="user-username"
                    v-model="draft.username"
                    type="text"
                    class="gizmo-native-control"
                    autocomplete="off"
                    required
                    autofocus
                />
            </div>

            <p v-else class="gizmo-field-help">{{ $t("usersResetPasswordFor", [ draft.username ]) }}</p>

            <div>
                <label for="user-password" class="gizmo-field-label">{{ $t("Password") }}</label>
                <input
                    id="user-password"
                    v-model="draft.password"
                    type="password"
                    class="gizmo-native-control"
                    minlength="6"
                    autocomplete="new-password"
                    required
                    :autofocus="mode === 'password'"
                />
                <div class="gizmo-field-help">{{ $t("usersPasswordHelp") }}</div>
            </div>

            <div v-if="mode === 'create'">
                <div class="gizmo-native-check">
                    <input id="user-admin" v-model="draft.admin" class="gizmo-native-check__input" type="checkbox" />
                    <label class="gizmo-native-check__label" for="user-admin">{{ $t("usersMakeAdmin") }}</label>
                </div>
                <div class="gizmo-field-help">{{ $t("usersMakeAdminHelp") }}</div>
            </div>
        </form>

        <template #footer>
            <GizmoButton variant="secondary" :disabled="processing" @click="setOpen(false)">
                {{ $t("Cancel") }}
            </GizmoButton>
            <GizmoButton variant="primary" type="submit" form="user-dialog-form" :disabled="processing">
                {{ processing ? $t("Saving...") : $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
</template>

<script>
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

/*
 * Creating an account, and setting someone else's password.
 *
 * One component for both because they are the same two fields with one of them
 * hidden, and because the alternative for the second was a browser prompt() —
 * unthemed, unlabelled, and impossible to say anything in about what the password
 * has to be.
 */
export default {
    components: {
        GizmoButton,
        GizmoDialog,
    },
    emits: [ "saved" ],
    data() {
        return {
            open: false,
            processing: false,
            mode: "create",
            userID: null,
            draft: { username: "", password: "", admin: false },
        };
    },
    computed: {
        /**
         * What the dialog is doing this time.
         * @returns {string} the heading
         */
        title() {
            return this.mode === "create" ? this.$t("usersAdd") : this.$t("usersResetPassword");
        },
    },
    methods: {
        /**
         * Open for a new account.
         * @returns {void}
         */
        show() {
            this.mode = "create";
            this.userID = null;
            this.draft = { username: "", password: "", admin: false };
            this.open = true;
        },

        /**
         * Open to set an existing account's password.
         * @param {object} user the account
         * @returns {void}
         */
        showPassword(user) {
            this.mode = "password";
            this.userID = user.id;
            this.draft = { username: user.username, password: "", admin: false };
            this.open = true;
        },

        /**
         * Track the dialog's controlled open state.
         * @param {boolean} open next state
         * @returns {void}
         */
        setOpen(open) {
            this.open = open;
            if (!open) {
                this.processing = false;
            }
        },

        /**
         * Send it.
         * @returns {void}
         */
        submit() {
            this.processing = true;

            const done = (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$emit("saved");
                    this.setOpen(false);
                }
            };

            if (this.mode === "create") {
                this.$root.getSocket().emit("addUser", this.draft, done);
            } else {
                this.$root.getSocket().emit("resetUserPassword", this.userID, this.draft.password, done);
            }
        },
    },
};
</script>
