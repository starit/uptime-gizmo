<template>
    <div class="tw-my-4">
        <div class="tw-mx-0 mx-lg-4 tw-pt-1 tw-mb-4">
            <button class="gizmo-native-button gizmo-native-button--primary" @click.stop="addTag">
                <font-awesome-icon icon="plus" />
                {{ $t("Add New Tag") }}
            </button>
        </div>

        <div class="tags-list tw-my-3">
            <div
                v-for="(tag, index) in tagsList"
                :key="tag.id"
                class="tw-flex tw-items-center tw-mx-0 mx-lg-4 tw-py-1 tags-list-row"
                :disabled="processing"
                @click="editTag(index)"
            >
                <div class="tw-grow overflow-hidden tw-pe-3">
                    <Tag :item="tag" :title="tag.name" :scrollable="true" :constrained="true" />
                </div>

                <div class="flex-shrink-0 tw-px-1">
                    <span class="tw-hidden lg:tw-inline">{{ $t("Monitors", monitorsByTag(tag.id).length) }}</span>
                    <span class="lg:tw-hidden">{{ monitorsByTag(tag.id).length }} M</span>
                </div>

                <div class="flex-shrink-0 tw-pe-2 pe-lg-3">
                    <button
                        type="button"
                        class="btn-rm-tag gizmo-native-button gizmo-native-button--danger-outline tw-ms-2 tw-py-1"
                        :disabled="processing"
                        @click.stop="deleteConfirm(index)"
                    >
                        <font-awesome-icon class="" icon="trash" />
                    </button>
                </div>
            </div>
        </div>

        <TagEditDialog ref="tagEditDialog" :updated="tagsUpdated" :existing-tags="tagsList" />
        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteTag">
            {{ $t("confirmDeleteTagMsg") }}
        </Confirm>
    </div>
</template>

<script>
import TagEditDialog from "../../components/TagEditDialog.vue";
import Tag from "../Tag.vue";
import Confirm from "../Confirm.vue";

export default {
    components: {
        Confirm,
        TagEditDialog,
        Tag,
    },

    data() {
        return {
            processing: false,
            tagsList: null,
            deletingTag: null,
        };
    },

    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
    },

    mounted() {
        this.getExistingTags();
    },

    methods: {
        /**
         * Reflect tag changes in the UI by fetching data. Callback for the edit tag dialog.
         * @returns {void}
         */
        tagsUpdated() {
            this.getExistingTags();
            this.$root.getMonitorList();
        },

        /**
         * Get list of tags from server
         * @returns {void}
         */
        getExistingTags() {
            this.processing = true;
            this.$root.getSocket().emit("getTags", (res) => {
                this.processing = false;
                if (res.ok) {
                    this.tagsList = res.tags;
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },

        /**
         * Show confirmation for deleting a tag
         * @param {number} index index of the tag to delete in the local tagsList
         * @returns {void}
         */
        deleteConfirm(index) {
            this.deletingTag = this.tagsList[index];
            this.$refs.confirmDelete.show();
        },

        /**
         * Show dialog for adding a new tag
         * @returns {void}
         */
        addTag() {
            this.$refs.tagEditDialog.reset();
            this.$refs.tagEditDialog.show();
        },

        /**
         * Show dialog for editing a tag
         * @param {number} index index of the tag to edit in the local tagsList
         * @returns {void}
         */
        editTag(index) {
            this.$refs.tagEditDialog.show(this.tagsList[index]);
        },

        /**
         * Delete the tag "deletingTag" from server
         * @returns {void}
         */
        deleteTag() {
            this.processing = true;
            this.$root.getSocket().emit("deleteTag", this.deletingTag.id, (res) => {
                this.$root.toastRes(res);
                this.processing = false;

                if (res.ok) {
                    this.tagsUpdated();
                }
            });
        },

        /**
         * Get monitors which has a specific tag locally
         * @param {number} tagId id of the tag to filter
         * @returns {object[]} list of monitors which has a specific tag
         */
        monitorsByTag(tagId) {
            return Object.values(this.$root.monitorList).filter((monitor) => {
                return monitor.tags.find((monitorTag) => monitorTag.tag_id === tagId);
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.btn-rm-tag {
    padding-left: 9px;
    padding-right: 9px;
}

.tags-list .tags-list-row {
    cursor: pointer;
    border-top: 1px solid var(--color-border);

    &:hover {
        background-color: var(--color-surface-hover);
    }
}
</style>
