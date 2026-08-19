<template>
    <div>
        <p class="gizmo-field-help tw-mb-4">{{ $t("usersHelp") }}</p>

        <p v-if="error" class="gizmo-native-alert gizmo-native-alert--danger">{{ error }}</p>

        <template v-else>
            <ul class="gizmo-list-group tw-mb-3">
                <li v-for="user in users" :key="user.id" class="gizmo-list-group__item">
                    <strong>{{ user.username }}</strong>
                    <span v-if="user.admin" class="gizmo-field-help tw-ms-2">{{ $t("Administrator") }}</span>
                    <span v-if="!user.active" class="gizmo-field-help tw-ms-2">{{ $t("Disabled") }}</span>
                    <br />
                    <a href="#" @click.prevent="setAdmin(user, !user.admin)">
                        {{ user.admin ? $t("usersRevokeAdmin") : $t("usersGrantAdmin") }}
                    </a>
                    <span class="tw-mx-2">·</span>
                    <a href="#" @click.prevent="setActive(user, !user.active)">
                        {{ user.active ? $t("Disable") : $t("Enable") }}
                    </a>
                    <span class="tw-mx-2">·</span>
                    <a href="#" @click.prevent="askPassword(user)">{{ $t("usersResetPassword") }}</a>
                    <span class="tw-mx-2">·</span>
                    <a href="#" class="api-users__danger" @click.prevent="askDelete(user)">{{ $t("Delete") }}</a>
                </li>
            </ul>

            <form class="gizmo-form-stack tw-mb-3" @submit.prevent="add">
                <div>
                    <label for="new-username" class="gizmo-field-label">{{ $t("Username") }}</label>
                    <input id="new-username" v-model="draft.username" type="text" class="gizmo-native-control" required />
                </div>
                <div>
                    <label for="new-password" class="gizmo-field-label">{{ $t("Password") }}</label>
                    <input
                        id="new-password"
                        v-model="draft.password"
                        type="password"
                        class="gizmo-native-control"
                        minlength="6"
                        autocomplete="new-password"
                        required
                    />
                </div>
                <div class="gizmo-native-check">
                    <input id="new-admin" v-model="draft.admin" class="gizmo-native-check__input" type="checkbox" />
                    <label class="gizmo-native-check__label" for="new-admin">{{ $t("usersMakeAdmin") }}</label>
                </div>
                <div>
                    <button type="submit" class="gizmo-native-button gizmo-native-button--primary" :disabled="processing">
                        {{ $t("usersAdd") }}
                    </button>
                </div>
            </form>
        </template>

        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="doDelete">
            {{ $t("usersDeleteMsg", [ pending?.username ]) }}
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../Confirm.vue";

export default {
    components: {
        Confirm,
    },
    data() {
        return {
            users: [],
            error: "",
            processing: false,
            pending: null,
            draft: { username: "", password: "", admin: false },
        };
    },
    mounted() {
        this.load();
    },
    methods: {
        /**
         * Load the accounts. Only an administrator may.
         * @returns {void}
         */
        load() {
            this.$root.getSocket().emit("listUsers", (res) => {
                if (res.ok) {
                    this.users = res.users;
                    this.error = "";
                } else {
                    this.error = res.msg;
                }
            });
        },

        /**
         * Report the result and reload, since any of these changes the list.
         * @param {object} res the server's reply
         * @returns {void}
         */
        settle(res) {
            this.processing = false;
            this.$root.toastRes(res);
            if (res.ok) {
                this.load();
            }
        },

        /**
         * Create an account.
         * @returns {void}
         */
        add() {
            this.processing = true;
            this.$root.getSocket().emit("addUser", this.draft, (res) => {
                this.settle(res);
                if (res.ok) {
                    this.draft = { username: "", password: "", admin: false };
                }
            });
        },

        /**
         * Grant or revoke the administrator flag.
         * @param {object} user the account
         * @param {boolean} isAdmin what it should become
         * @returns {void}
         */
        setAdmin(user, isAdmin) {
            this.$root.getSocket().emit("setUserAdmin", user.id, isAdmin, (res) => this.settle(res));
        },

        /**
         * Enable or disable an account.
         * @param {object} user the account
         * @param {boolean} isActive what it should become
         * @returns {void}
         */
        setActive(user, isActive) {
            this.$root.getSocket().emit("setUserActive", user.id, isActive, (res) => this.settle(res));
        },

        /**
         * Set someone else's password.
         * @param {object} user the account
         * @returns {void}
         */
        askPassword(user) {
            // eslint-disable-next-line no-alert
            const next = prompt(this.$t("usersResetPasswordPrompt", [ user.username ]));
            if (!next) {
                return;
            }
            this.$root.getSocket().emit("resetUserPassword", user.id, next, (res) => this.settle(res));
        },

        /**
         * Ask before removing an account.
         * @param {object} user the account
         * @returns {void}
         */
        askDelete(user) {
            this.pending = user;
            this.$refs.confirmDelete.show();
        },

        /**
         * Remove the account.
         * @returns {void}
         */
        doDelete() {
            this.$root.getSocket().emit("deleteUser", this.pending.id, (res) => this.settle(res));
        },
    },
};
</script>

<style lang="scss" scoped>
.api-users__danger {
    color: var(--status-down-fg);
}
</style>
