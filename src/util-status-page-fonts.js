/**
 * Public status-page typefaces besides IBM Plex Sans, which is already in the
 * main bundle. Each face is an async CSS chunk so a default (sans) page does
 * not download Serif, Mono, or Fraunces, and switching in the editor only
 * fetches the face that was chosen.
 *
 * Vite must see a literal `import("…")` per file; a computed path would not
 * be code-split.
 */

/** @type {Record<string, () => Promise<unknown[]>>} */
const loaders = {
    serif: () =>
        Promise.all([
            import("@fontsource/ibm-plex-serif/400.css"),
            import("@fontsource/ibm-plex-serif/600.css"),
        ]),
    mono: () =>
        Promise.all([
            import("@fontsource/ibm-plex-mono/400.css"),
            import("@fontsource/ibm-plex-mono/600.css"),
        ]),
    display: () =>
        Promise.all([
            import("@fontsource/fraunces/400.css"),
            import("@fontsource/fraunces/600.css"),
        ]),
};

/** @type {Map<string, Promise<void>>} */
const inflight = new Map();

/**
 * Fetch 400 and 600 for a status-page face. Sans is a no-op. Repeats reuse
 * the same promise so edit-mode switching and public loads do not re-fetch.
 * @param {string} font sans, serif, mono, or display
 * @returns {Promise<void>}
 */
export function loadStatusPageFont(font) {
    if (!font || font === "sans" || !loaders[font]) {
        return Promise.resolve();
    }

    let pending = inflight.get(font);
    if (!pending) {
        pending = loaders[font]()
            .then(() => undefined)
            .catch(() => {
                inflight.delete(font);
            });
        inflight.set(font, pending);
    }
    return pending;
}

/**
 * Warm the extra faces once the operator opens the editor, so cycling the
 * typeface select does not wait on the first click.
 * @returns {Promise<void>}
 */
export function prefetchStatusPageFonts() {
    return Promise.all(["serif", "mono", "display"].map((font) => loadStatusPageFont(font))).then(() => undefined);
}
