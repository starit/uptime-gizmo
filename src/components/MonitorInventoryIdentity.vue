<template>
    <div class="inventory-identity">
        <router-link :to="href" class="monitor-name-link">
            {{ monitor.name }}
        </router-link>
        <div v-if="hasMeta" class="monitor-meta">
            <!--
                Two groups, not one run of words. The written metadata reads as a
                sentence and the tags read as chips, so a row with several tags
                still scans in the same order as a row with none.
            -->
            <span class="meta-text">
                <span class="type-id">{{ typeLabel }}</span>
                <span v-if="target" class="target-label" :title="target">{{ target }}</span>
                <span v-if="groupLabel" class="group-path" :title="groupLabel">{{ groupLabel }}</span>
            </span>
            <span v-if="(monitor.tags || []).length > 0" class="monitor-tags">
                <Tag v-for="tag in monitor.tags" :key="tag.tag_id" :item="tag" size="sm" :title="tag.name" />
            </span>
        </div>
    </div>
</template>

<script>
import Tag from "./Tag.vue";

export default {
    components: {
        Tag,
    },
    props: {
        monitor: {
            type: Object,
            required: true,
        },
        href: {
            type: String,
            required: true,
        },
        typeLabel: {
            type: String,
            required: true,
        },
        target: {
            type: String,
            default: "",
        },
        groupLabel: {
            type: String,
            default: "",
        },
    },
    computed: {
        hasMeta() {
            return Boolean(this.typeLabel || this.target || this.groupLabel)
                || (this.monitor.tags || []).length > 0;
        },
    },
};
</script>

<style lang="scss" scoped>
.inventory-identity {
    min-width: 0;
}

.monitor-name-link {
    color: var(--color-text);
    font-weight: var(--weight-semibold);
    text-decoration: none;

    &:hover {
        color: var(--color-interactive);
        text-decoration: underline;
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }
}

.monitor-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    margin-top: 0.2rem;
    min-width: 0;
}

/*
 * The written half. Separated by a middot rather than by spacing alone, so the
 * three values stay distinguishable when the row is narrow enough to wrap.
 */
.meta-text {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    gap: 0.4rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1.1rem;

    > * + *::before {
        content: "·";
        margin-inline-end: 0.4rem;
        color: var(--color-text-subtle);
    }
}

.type-id {
    flex: 0 0 auto;
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
}

/*
 * Truncated rather than wrapped. A long URL broken across three lines pushed
 * the status and uptime of every row below it out of alignment, and the whole
 * value is on the element's title for when it is actually wanted.
 */
.target-label,
.group-path {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.target-label {
    flex: 1 1 auto;
}

.group-path {
    flex: 0 1 auto;
}

/*
 * Kept together and out of the text flow, so tags wrap as a block instead of
 * threading between the words.
 */
.monitor-tags {
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
}
</style>
