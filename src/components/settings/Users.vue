<template>
    <div>
        <!--
            The model is unusual enough to be worth stating on the page. Someone
            arriving here reasonably expects accounts to separate people from each
            other, and these do not: they separate passwords. Saying so before
            they add anyone is cheaper than them discovering it afterwards.
        -->
        <section class="users__model">
            <h3 class="users__model-title">{{ $t("usersModelTitle") }}</h3>
            <p>{{ $t("usersModelShared") }}</p>
            <p>{{ $t("usersModelAdmin") }}</p>
            <p>{{ $t("usersModelReadOnly") }}</p>
        </section>

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
                    <a href="#" @click.prevent="$refs.dialog.showPassword(user)">{{ $t("usersResetPassword") }}</a>
                    <span class="tw-mx-2">·</span>
                    <a href="#" class="users__danger" @click.prevent="askDelete(user)">{{ $t("Delete") }}</a>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--primary" type="button" @click="$refs.dialog.show()">
                {{ $t("usersAdd") }}
            </button>
        </template>

        <UserDialog ref="dialog" @saved="load" />

        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="doDelete">
            {{ $t("usersDeleteMsg", [ pending?.username ]) }}
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../Confirm.vue";
import UserDialog from "../UserDialog.vue";

export default {
    components: {
        Confirm,
        UserDialog,
    },
    data() {
        return {
            users: [],
            error: "",
            pending: null,
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
            this.$root.toastRes(res);
            if (res.ok) {
                this.load();
            }
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
.users__model {
    margin-bottom: 1.5rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.55;

    p {
        margin: 0 0 0.5rem;

        &:last-child {
            margin-bottom: 0;
        }
    }
}

.users__model-title {
    margin: 0 0 0.5rem;
    color: var(--color-text);
    font-size: 0.875rem;
    font-weight: var(--weight-semibold);
}

.users__danger {
    color: var(--status-down-fg);
}
</style>
