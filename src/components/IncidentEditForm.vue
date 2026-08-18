<template>
    <div
        class="shadow-box alert mb-4 p-4 incident"
        role="alert"
        :class="'bg-' + modelValue.style"
        data-testid="incident-edit"
    >
        <strong>{{ $t("Title") }}:</strong>
        <Editable
            :model-value="modelValue.title"
            tag="h4"
            :contenteditable="true"
            :noNL="true"
            class="alert-heading"
            data-testid="incident-title"
            @update:model-value="updateField('title', $event)"
        />

        <strong>{{ $t("Content") }}:</strong>
        <Editable
            :model-value="modelValue.content"
            tag="div"
            :contenteditable="true"
            class="content"
            data-testid="incident-content-editable"
            @update:model-value="updateField('content', $event)"
        />
        <div class="form-text">
            {{ $t("markdownSupported") }}
        </div>

        <div class="mt-3">
            <button class="btn btn-light me-2" data-testid="post-incident-button" @click="$emit('post')">
                <font-awesome-icon icon="bullhorn" />
                {{ $t("Post") }}
            </button>

            <button class="btn btn-light me-2" @click="$emit('cancel')">
                <font-awesome-icon icon="times" />
                {{ $t("Cancel") }}
            </button>

            <GizmoMenu class="d-inline-block me-2">
                <template #trigger>
                    <button class="btn btn-secondary" type="button">
                        {{ $t("Style") }}: {{ $t(modelValue.style) }}
                    </button>
                </template>
                <GizmoMenuItem
                    v-for="style in incidentStyles"
                    :key="style"
                    @select="updateField('style', style)"
                >
                    {{ $t(style) }}
                </GizmoMenuItem>
            </GizmoMenu>
        </div>
    </div>
</template>

<script>
import GizmoMenu from "./gizmo/GizmoMenu.vue";
import GizmoMenuItem from "./gizmo/GizmoMenuItem.vue";

export default {
    name: "IncidentEditForm",
    components: {
        GizmoMenu,
        GizmoMenuItem,
    },
    props: {
        modelValue: {
            type: Object,
            required: true,
        },
    },
    emits: ["update:modelValue", "post", "cancel"],
    data() {
        return {
            incidentStyles: ["info", "warning", "danger", "primary", "light", "dark"],
        };
    },
    methods: {
        updateField(field, value) {
            this.$emit("update:modelValue", {
                ...this.modelValue,
                [field]: value,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.incident {
    .content {
        &[contenteditable="true"] {
            min-height: 60px;
        }
    }
}
</style>
