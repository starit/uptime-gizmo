<template>
    <div tabindex="-1" class="filter-dropdown" @focusin="openMenu" @focusout="handleFocusOut">
        <button type="button" class="filter-dropdown-status" :class="{ active: filterActive }" tabindex="0">
            <!-- Padding belongs to the button, not to two inner spans: the button
                 had none of its own, so the label sat against its own border. -->
            <div class="tw-flex tw-items-center">
                <slot name="status"></slot>
            </div>
            <span class="filter-dropdown-caret">
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

<style lang="scss" scoped>
/* Bootstrap's .dropdown supplied the positioning context that
   .filter-dropdown-menu is absolutely positioned against. */
.filter-dropdown {
    position: relative;
}

.filter-dropdown-menu {
    z-index: 100;
    transition: opacity 160ms ease;
    padding: 0.25rem 0 !important;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;

    /* Measured from the trigger rather than nudged down by a hard 2.5rem, which
       had to be kept in step with the trigger's height by hand and was not. */
    position: absolute;
    inset: calc(100% + 0.25rem) auto auto 0;

    /* Without a floor, "No tags found." wrapped onto three lines in a box barely
       wider than the word. */
    min-width: 10rem;
    margin: 0;
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

    :deep(.gizmo-menu__item) {
        padding: 0.375rem 0.875rem;
    }

    :deep(.gizmo-menu__item:focus) {
        background: var(--color-surface-hover);
    }
}

/*
 * These sit in a row with the search box and should read as its siblings. They
 * did not: 2.25rem against the input's 2.5rem, inherited 1rem type against its
 * 0.875rem, and blue label text at rest, so an unused filter looked livelier
 * than the field beside it and the row had two different heights in it.
 */
.filter-dropdown-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 2.5rem;

    /* Tight, because these share a narrow rail with the search field. */
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.875rem;
    line-height: 1.375rem;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color 140ms var(--easing-out), box-shadow 140ms var(--easing-out);

    &:hover {
        border-color: var(--color-border-strong);
    }

    /*
     * A filter is on. A ring rather than a fill: the trigger usually holds a
     * status badge or a tag chip, and a blue wash behind a green badge made
     * three colours out of a two-state control. The halo is the same idiom the
     * inputs use for focus, one step quieter. The global :focus-visible rule
     * supplies the keyboard ring, so there is no :focus rule here — the old one
     * also fired on mouse clicks and doubled up with this border.
     */
    &.active {
        border-color: var(--color-interactive);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-interactive) 18%, transparent);
    }
}

.filter-dropdown-caret {
    display: inline-flex;
    color: var(--color-text-subtle);
    font-size: 0.8125rem;
}

:deep(.filter-active) {
    color: var(--color-interactive);
}
</style>
