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
            <ul class="users__list">
                <li v-for="user in users" :key="user.id" class="users__row" :class="{ 'users__row--off': !user.active }">
                    <div class="users__identity">
                        <span class="users__name">{{ user.username }}</span>
                        <span v-if="user.username === $root.username" class="users__tag">{{ $t("usersYou") }}</span>
                        <span v-if="user.admin" class="users__tag users__tag--admin">{{ $t("Administrator") }}</span>
                        <span v-if="!user.active" class="users__tag users__tag--off">{{ $t("Disabled") }}</span>
                    </div>

                    <!--
                        Named for the state they produce rather than the switch
                        they flip. "Make administrator" and "Remove administrator"
                        differ by one word in the middle and read as the same
                        control at a glance, which is a poor thing for a pair
                        whose two halves do opposite things.
                    -->
                    <div class="users__actions">
                        <button type="button" class="gizmo-native-button gizmo-native-button--secondary gizmo-native-button--sm" @click="askAdmin(user)">
                            {{ user.admin ? $t("usersDemote") : $t("usersPromote") }}
                        </button>
                        <button type="button" class="gizmo-native-button gizmo-native-button--secondary gizmo-native-button--sm" @click="askActive(user)">
                            {{ user.active ? $t("Disable") : $t("Enable") }}
                        </button>
                        <button type="button" class="gizmo-native-button gizmo-native-button--secondary gizmo-native-button--sm" @click="$refs.dialog.showPassword(user)">
                            {{ $t("usersResetPassword") }}
                        </button>
                        <button type="button" class="gizmo-native-button gizmo-native-button--danger-outline gizmo-native-button--sm" @click="askDelete(user)">
                            {{ $t("Delete") }}
                        </button>
                    </div>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--primary tw-mt-3" type="button" @click="$refs.dialog.show()">
                {{ $t("usersAdd") }}
            </button>
        </template>

        <UserDialog ref="dialog" @saved="load" />

        <!--
            Every one of these changes what somebody else can do, and three of
            them cannot be undone by the person they happen to. Each says what
            will happen rather than asking "are you sure".
        -->
        <Confirm ref="confirm" :btn-style="pending?.danger ? 'btn-danger' : 'btn-primary'" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="doPending">
            {{ pending?.message }}
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
         * Hold an action until it is confirmed.
         * @param {string} message what will happen, in the user's language
         * @param {boolean} danger whether to colour the confirmation as destructive
         * @param {Function} run what to do when confirmed
         * @returns {void}
         */
        ask(message, danger, run) {
            this.pending = { message, danger, run };
            this.$refs.confirm.show();
        },

        /**
         * Carry out whatever was confirmed.
         * @returns {void}
         */
        doPending() {
            this.pending?.run();
        },

        /**
         * Grant or revoke the administrator flag.
         * @param {object} user the account
         * @returns {void}
         */
        askAdmin(user) {
            const key = user.admin ? "usersDemoteConfirm" : "usersPromoteConfirm";
            this.ask(this.$t(key, [ user.username ]), user.admin, () => {
                this.$root.getSocket().emit("setUserAdmin", user.id, !user.admin, (res) => this.settle(res));
            });
        },

        /**
         * Enable or disable an account.
         * @param {object} user the account
         * @returns {void}
         */
        askActive(user) {
            const key = user.active ? "usersDisableConfirm" : "usersEnableConfirm";
            this.ask(this.$t(key, [ user.username ]), user.active, () => {
                this.$root.getSocket().emit("setUserActive", user.id, !user.active, (res) => this.settle(res));
            });
        },

        /**
         * Remove an account.
         * @param {object} user the account
         * @returns {void}
         */
        askDelete(user) {
            this.ask(this.$t("usersDeleteMsg", [ user.username ]), true, () => {
                this.$root.getSocket().emit("deleteUser", user.id, (res) => this.settle(res));
            });
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

.users__list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.users__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
}

/* A disabled account stays legible; it is the state that recedes, not the name. */
.users__row--off .users__name {
    color: var(--color-text-muted);
}

.users__identity {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
}

.users__name {
    color: var(--color-text);
    font-weight: var(--weight-semibold);
    overflow-wrap: anywhere;
}

.users__tag {
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    font-weight: var(--weight-medium);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.users__tag--admin {
    background: var(--color-interactive-subtle);
    color: var(--color-interactive);
}

.users__tag--off {
    background: var(--status-unknown-bg);
    color: var(--status-unknown-fg);
}

.users__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

@media (max-width: 620px) {
    .users__row {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
