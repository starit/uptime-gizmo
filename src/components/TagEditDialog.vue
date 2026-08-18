<template>
    <GizmoDialog
        :open="open"
        size="lg"
        :title="$t('Edit Tag')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="tag-edit-form" class="gizmo-form-stack" @submit.prevent="submit">
                        <div class="tw-mb-3">
                            <label for="tag-name" class="gizmo-field-label">{{ $t("Name") }}</label>
                            <input
                                id="tag-name"
                                v-model="tag.name"
                                type="text"
                                class="gizmo-native-control"
                                :class="{ 'gizmo-native-control--invalid': nameInvalid }"
                                required
                                autofocus
                            />
                            <div class="gizmo-field-error">
                                {{ $t("Tag with this name already exist.") }}
                            </div>
                        </div>

                        <div class="tw-mb-3">
                            <label for="tag-color" class="gizmo-field-label">{{ $t("color") }}</label>
                            <div class="tw-flex">
                                <div class="tw-w-2/3 tw-pe-1">
                                    <vue-multiselect
                                        v-model="selectedColor"
                                        :options="colorOptions"
                                        :multiple="false"
                                        :searchable="true"
                                        :placeholder="$t('color')"
                                        track-by="color"
                                        label="name"
                                        select-label=""
                                        deselect-label=""
                                    >
                                        <template #option="{ option }">
                                            <Tag :item="option" size="sm" />
                                        </template>
                                        <template #singleLabel="{ option }">
                                            <Tag :item="option" size="sm" />
                                        </template>
                                    </vue-multiselect>
                                </div>
                                <div class="tw-w-1/3 tw-ps-1">
                                    <input id="tag-color-hex" v-model="tag.color" type="text" class="gizmo-native-control" />
                                </div>
                            </div>
                        </div>

                        <div class="tw-mb-3">
                            <label for="tag-monitors" class="gizmo-field-label">
                                {{ $t("Monitors", selectedMonitors.length) }}
                            </label>
                            <div class="tag-monitors-list">
                                <router-link
                                    v-for="monitor in selectedMonitors"
                                    :key="monitor.id"
                                    class="tw-flex tw-items-center tw-justify-between tw-no-underline tag-monitors-list-row tw-py-2 tw-px-3"
                                    :to="monitorURL(monitor.id)"
                                    @click="setOpen(false)"
                                >
                                    <span>{{ monitor.name }}</span>
                                    <button
                                        type="button"
                                        class="btn-rm-monitor gizmo-native-button gizmo-native-button--danger-outline tw-ms-2 tw-py-1"
                                        @click.stop.prevent="removeMonitor(monitor.id)"
                                    >
                                        <font-awesome-icon class="" icon="times" />
                                    </button>
                                </router-link>
                            </div>
                            <div v-if="allMonitorList.length > 0" class="tw-pt-3">
                                <label class="gizmo-field-label">{{ $t("Add a monitor") }}:</label>
                                <VueMultiselect
                                    v-model="selectedAddMonitor"
                                    :options="allMonitorList"
                                    :multiple="false"
                                    :searchable="true"
                                    :placeholder="$t('Add a monitor')"
                                    label="name"
                                    trackBy="name"
                                    class="tw-mt-1"
                                >
                                    <template #option="{ option }">
                                        <div class="tw-inline-flex">
                                            <span>
                                                {{ option.name }}
                                                <Tag
                                                    v-for="monitorTag in option.tags"
                                                    :key="monitorTag"
                                                    :item="monitorTag"
                                                    :size="'sm'"
                                                />
                                            </span>
                                        </div>
                                    </template>
                                </VueMultiselect>
                            </div>
                        </div>
        </form>

        <template #footer>
            <GizmoButton
                v-if="tag && tag.id !== null"
                class="gizmo-dialog__leading-action"
                variant="danger"
                :disabled="processing"
                @click="deleteConfirm"
            >
                {{ $t("Delete") }}
            </GizmoButton>
            <GizmoButton form="tag-edit-form" type="submit" :loading="processing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteTag">
        {{ $t("confirmDeleteTagMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";
import Tag from "./Tag.vue";
import VueMultiselect from "vue-multiselect";
import { colorOptions } from "../util-frontend";
import { getMonitorRelativeURL } from "../util.ts";

export default {
    components: {
        VueMultiselect,
        Confirm,
        GizmoButton,
        GizmoDialog,
        Tag,
    },
    props: {
        updated: {
            type: Function,
            default: () => {},
        },
        existingTags: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            open: false,
            processing: false,
            selectedColor: {
                name: null,
                color: null,
            },
            tag: {
                id: null,
                name: "",
                color: "",
                // Do not set default value here, please scroll to show()
            },
            monitors: [],
            removingMonitor: [],
            addingMonitor: [],
            selectedAddMonitor: null,
            nameInvalid: false,
        };
    },

    computed: {
        colorOptions() {
            if (!colorOptions(this).find((option) => option.color === this.tag.color)) {
                return colorOptions(this).concat({
                    name: "custom",
                    color: this.tag.color,
                });
            } else {
                return colorOptions(this);
            }
        },
        selectedMonitors() {
            return this.monitors
                .concat(
                    Object.values(this.$root.monitorList).filter((monitor) => this.addingMonitor.includes(monitor.id))
                )
                .filter((monitor) => !this.removingMonitor.includes(monitor.id));
        },
        allMonitorList() {
            return Object.values(this.$root.monitorList).filter((monitor) => !this.selectedMonitors.includes(monitor));
        },
    },

    watch: {
        // Set color option to "Custom" when a unknown color is entered
        "tag.color"(to, from) {
            if (to !== "" && colorOptions(this).find((x) => x.color === to) == null) {
                this.selectedColor.name = this.$t("Custom");
                this.selectedColor.color = to;
            }
        },
        "tag.name"(to, from) {
            if (to != null) {
                this.validate();
            }
        },
        selectedColor(to, from) {
            if (to != null) {
                this.tag.color = to.color;
            }
        },
        /**
         * Selected a monitor and add to the list.
         * @param {object} monitor Monitor to add
         * @returns {void}
         */
        selectedAddMonitor(monitor) {
            if (monitor) {
                if (this.removingMonitor.includes(monitor.id)) {
                    this.removingMonitor = this.removingMonitor.filter((id) => id !== monitor.id);
                } else {
                    this.addingMonitor.push(monitor.id);
                }
                this.selectedAddMonitor = null;
            }
        },
    },

    methods: {
        setOpen(open) {
            this.open = open;
        },
        /**
         * Show confirmation for deleting a tag
         * @returns {void}
         */
        deleteConfirm() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Reset the editTag form
         * @returns {void}
         */
        reset() {
            this.selectedColor = null;
            this.tag = {
                id: null,
                name: "",
                color: "",
            };
            this.monitors = [];
            this.removingMonitor = [];
            this.addingMonitor = [];
        },

        /**
         * Check for existing tags of the same name, set invalid input
         * @returns {boolean} True if editing tag is valid
         */
        validate() {
            this.nameInvalid = false;
            const sameName = this.existingTags.find((existingTag) => existingTag.name === this.tag.name);
            if (sameName != null && sameName.id !== this.tag.id) {
                this.nameInvalid = true;
                return false;
            }
            return true;
        },

        /**
         * Load tag information for display in the edit dialog
         * @param {object} tag tag object to edit
         * @returns {void}
         */
        show(tag) {
            if (this.processing) {
                return;
            }
            if (tag) {
                this.selectedColor = this.colorOptions.find((x) => x.color === tag.color) ?? {
                    name: this.$t("Custom"),
                    color: tag.color,
                };
                this.tag.id = tag.id;
                this.tag.name = tag.name;
                this.tag.color = tag.color;
                this.monitors = this.monitorsByTag(tag.id);
                this.removingMonitor = [];
                this.addingMonitor = [];
                this.selectedAddMonitor = null;
            }

            this.open = true;
        },

        /**
         * Submit tag and monitorTag changes to server
         * @returns {Promise<void>}
         */
        async submit() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            let editResult = true;

            if (!this.validate()) {
                this.processing = false;
                return;
            }

            if (this.tag.id == null) {
                await this.addTagAsync(this.tag).then((res) => {
                    if (!res.ok) {
                        this.$root.toastRes(res.msg);
                        editResult = false;
                    } else {
                        this.tag.id = res.tag.id;
                        this.updated();
                    }
                });
            }

            if (!editResult) {
                return;
            }

            for (let addId of this.addingMonitor) {
                await this.addMonitorTagAsync(this.tag.id, addId, "").then((res) => {
                    if (!res.ok) {
                        this.$root.toastError(res.msg);
                        editResult = false;
                    }
                });
            }

            for (let removeId of this.removingMonitor) {
                this.monitors
                    .find((monitor) => monitor.id === removeId)
                    ?.tags.forEach(async (monitorTag) => {
                        await this.deleteMonitorTagAsync(this.tag.id, removeId, monitorTag.value).then((res) => {
                            if (!res.ok) {
                                this.$root.toastError(res.msg);
                                editResult = false;
                            }
                        });
                    });
            }

            this.$root.getSocket().emit("editTag", this.tag, (res) => {
                this.$root.toastRes(res);
                this.processing = false;

                if (res.ok && editResult) {
                    this.updated();
                    this.open = false;
                }
            });
        },

        /**
         * Delete the editing tag from server
         * @returns {Promise<void>}
         */
        async deleteTag() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            await this.deleteTagAsync(this.tag.id).then((res) => {
                this.$root.toastRes(res);
                this.processing = false;

                if (res.ok) {
                    this.updated();
                    this.open = false;
                }
            });
        },

        /**
         * Remove a monitor from the monitors list locally
         * @param {number} id id of the tag to remove
         * @returns {void}
         */
        removeMonitor(id) {
            if (this.addingMonitor.includes(id)) {
                this.addingMonitor = this.addingMonitor.filter((x) => x !== id);
            } else {
                this.removingMonitor.push(id);
            }
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

        /**
         * Get URL of monitor
         * @param {number} id ID of monitor
         * @returns {string} Relative URL of monitor
         */
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },

        /**
         * Add a tag asynchronously
         * @param {object} newTag Object representing new tag to add
         * @returns {Promise<void>}
         */
        addTagAsync(newTag) {
            return new Promise((resolve) => {
                this.$root.getSocket().emit("addTag", newTag, resolve);
            });
        },

        /**
         * Delete a tag asynchronously
         * @param {number} tagId ID of tag to delete
         * @returns {Promise<void>}
         */
        deleteTagAsync(tagId) {
            return new Promise((resolve) => {
                this.$root.getSocket().emit("deleteTag", tagId, resolve);
            });
        },

        /**
         * Add a tag to a monitor asynchronously
         * @param {number} tagId ID of tag to add
         * @param {number} monitorId ID of monitor to add tag to
         * @param {string} value Value of tag
         * @returns {Promise<void>}
         */
        addMonitorTagAsync(tagId, monitorId, value) {
            return new Promise((resolve) => {
                this.$root.getSocket().emit("addMonitorTag", tagId, monitorId, value, resolve);
            });
        },
        /**
         * Delete a tag from a monitor asynchronously
         * @param {number} tagId ID of tag to remove
         * @param {number} monitorId ID of monitor to remove tag from
         * @param {string} value Value of tag
         * @returns {Promise<void>}
         */
        deleteMonitorTagAsync(tagId, monitorId, value) {
            return new Promise((resolve) => {
                this.$root.getSocket().emit("deleteMonitorTag", tagId, monitorId, value, resolve);
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.btn-rm-monitor {
    padding-left: 0.7rem;
    padding-right: 0.7rem;
}

.tag-monitors-list {
    max-height: 40vh;
    overflow-y: scroll;
}

.tag-monitors-list .tag-monitors-list-row {
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);

    &:hover {
        background-color: var(--color-surface-hover);
    }
}
</style>
