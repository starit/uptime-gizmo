<template>
    <div tabindex="-1" class="filter-dropdown" @focusin="openMenu" @focusout="handleFocusOut">
        <button type="button" class="filter-dropdown-status" :class="{ active: filterActive }" tabindex="0">
            <div class="tw-px-1 tw-flex tw-items-center">
                <slot name="status"></slot>
            </div>
            <span class="tw-px-1">
                <font-awesome-icon icon="angle-down" />
            </span>
        </button>
        <ul class="filter-dropdown-menu" :class="{ open: open }">
            <slot name="dropdown"></slot>
        </ul>
    </div>
</template>

<script>
export default {
    components: {},
    props: {
        filterActive: {
            type: Boolean,
            required: true,
        },
    },
    emits: ["openMenu"],
    data() {
        return {
            open: false,
        };
    },
    methods: {
        openMenu() {
            this.$emit("openMenu");
            this.open = true;
        },

        handleFocusOut(e) {
            if (e.relatedTarget != null && this.$el.contains(e.relatedTarget)) {
                return;
            }
            this.open = false;
        },
    },
};
</script>

<style lang="scss">
/* Bootstrap's .dropdown supplied the positioning context that
   .filter-dropdown-menu is absolutely positioned against. */
.filter-dropdown {
    position: relative;
}

.filter-dropdown-menu {
    z-index: 100;
    transition: opacity 160ms ease, transform 160ms ease;
    padding: 0.25rem 0 !important;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;

    position: absolute;
    inset: 0 auto auto 0;
    margin: 0;
    transform: translate(0, 2.5rem);
    box-shadow: var(--shadow-float);
    visibility: hidden;
    list-style: none;
    height: 0;
    opacity: 0;
    background: var(--color-surface);
    color: var(--color-text);

    &.open {
        height: unset;
        visibility: inherit;
        opacity: 1;
    }

    .gizmo-menu__item {
        padding: 0.375rem 0.875rem;
    }

    .gizmo-menu__item:focus {
        background: var(--color-surface-hover);
    }
}

.filter-dropdown-status {
    display: flex;
    align-items: center;
    min-height: 2.25rem;
    margin-left: 0;
    color: var(--color-interactive);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);

    &:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }

    &.active {
        color: var(--color-text);
        border-color: var(--color-interactive);
        background-color: var(--color-interactive-subtle);
    }
}

.filter-active {
    color: var(--color-interactive);
}
</style>
