/*
 * Writes server/notification-fields.js from the interface's own forms.
 *
 * A provider's settings are defined in exactly one place that is authoritative:
 * the Vue component a person fills in. Anything else — a list kept beside it, a
 * description written by hand — is a copy that goes stale the next time a
 * provider gains a field, and goes stale silently.
 *
 * So the definitions are generated from those components and committed, with a
 * test that regenerates and compares. Editing a form and forgetting this file
 * fails that test rather than quietly shipping a form missing a field.
 *
 * Run with: node extra/generate-notification-fields.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VUE_DIR = path.join(ROOT, "src", "components", "notifications");
const PROVIDER_DIR = path.join(ROOT, "server", "notification-providers");
const LANG = path.join(ROOT, "src", "lang", "en.json");
const OUT = path.join(ROOT, "server", "notification-fields.js");

/*
 * HiddenInput is how every credential is entered. Reading only `input` misses
 * all of them, which is the difference between a Telegram form with a Bot
 * Token field and one that creates a channel that can never send.
 */
const CONTROL =
    /<(HiddenInput|input|select|textarea)\b([^>]*?)v-model\s*=\s*"\$parent\.notification\.([A-Za-z0-9_]+)"([^>]*?)>/gs;
const LABEL = /\$t\(\s*"([^"]+)"\s*\)/g;

/**
 * Providers this build has, by the lowercased file name that pairs them with a form.
 * @returns {object} Map of file stem to registered provider name
 */
function providerNames() {
    const names = {};
    for (const file of fs.readdirSync(PROVIDER_DIR)) {
        if (!file.endsWith(".js")) {
            continue;
        }
        const text = fs.readFileSync(path.join(PROVIDER_DIR, file), "utf8");
        const named = text.match(/^\s*name\s*=\s*"([^"]+)"/m);
        if (named) {
            names[path.basename(file, ".js").toLowerCase()] = named[1];
        }
    }
    return names;
}

/**
 * The English text behind a label, since a form labels its fields by i18n key.
 * @param {object} lang Parsed en.json
 * @param {string} key The i18n key a form used
 * @returns {string|null} The English text, or null when there is none
 */
function translate(lang, key) {
    const value = lang[key];
    return typeof value === "string" && value.trim() ? value : null;
}

/**
 * A readable name for a field whose form gave it no label at all.
 * @param {string} key The binding name
 * @param {string} provider The provider it belongs to
 * @returns {string} Something readable
 */
function humanize(key, provider) {
    let stripped = key;
    if (stripped.toLowerCase().startsWith(provider.toLowerCase())) {
        stripped = stripped.slice(provider.length) || key;
    }
    const words = stripped.replace(/(?<!^)(?=[A-Z])/g, " ").replace(/_/g, " ").split(/\s+/).filter(Boolean);
    return words.map((w) => (w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1))).join(" ") || key;
}

/**
 * The choices a select offers, when they are written out rather than looped over.
 * @param {string} text The component source
 * @param {number} end Where the opening tag ended
 * @returns {string[]|null} Literal option values, or null
 */
function selectOptions(text, end) {
    const close = text.indexOf("</select>", end);
    if (close === -1) {
        return null;
    }
    const body = text.slice(end, close);
    if (body.includes("v-for")) {
        return null;
    }
    const values = [ ...body.matchAll(/<option\b[^>]*\bvalue\s*=\s*"([^"]*)"/g) ]
        .map((m) => m[1])
        .filter(Boolean);
    return values.length ? values : null;
}

/**
 * Read one form's fields.
 * @param {string} text The component source
 * @param {string} provider The provider it belongs to
 * @param {object} lang Parsed en.json
 * @returns {object[]} The fields the form collects
 */
function extract(text, provider, lang) {
    const fields = [];
    const seen = new Set();
    for (const m of text.matchAll(CONTROL)) {
        const [ , tag, before, key, after ] = m;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        const attrs = before + after;
        const typeAttr = attrs.match(/\btype\s*=\s*"([^"]+)"/);
        const html = typeAttr ? typeAttr[1] : null;
        const isCheckbox = html === "checkbox";

        let type;
        if (tag === "HiddenInput" || html === "password") {
            type = "secret";
        } else if (isCheckbox) {
            type = "boolean";
        } else if (html === "number") {
            type = "number";
        } else if (html === "url" || html === "email") {
            type = html;
        } else {
            type = "text";
        }

        /*
         * A credential is described as one whatever the form does with it.
         * Some forms put an API key in a plain text box, and the type here is
         * advice to whoever draws the form next — telling them to show a token
         * in the clear because this interface happens to would spread the
         * weaker choice rather than the safer one.
         */
        if (type === "text" && /token|password|secret|apikey|accesskey/i.test(key)) {
            type = "secret";
        }

        const options = tag === "select" ? selectOptions(text, m.index + m[0].length) : null;
        if (options) {
            type = "select";
        }

        /*
         * A checkbox is labelled by the text after it and everything else by
         * the text before it. Reading them the same way puts each checkbox
         * under the previous field's name.
         */
        let raw = null;
        if (isCheckbox) {
            const after400 = text.slice(m.index + m[0].length, m.index + m[0].length + 400);
            raw = [ ...after400.matchAll(LABEL) ][0]?.[1] ?? null;
        }
        if (!raw) {
            const beforeLabels = [ ...text.slice(0, m.index).matchAll(LABEL) ];
            raw = beforeLabels.length ? beforeLabels[beforeLabels.length - 1][1] : null;
        }

        const field = {
            key,
            label: raw ? (translate(lang, raw) ?? raw) : humanize(key, provider),
            type,
            required: /(?<![:\w])required(?![-\w])/.test(attrs) || /:required\s*=\s*"true"/.test(attrs),
        };
        if (options) {
            field.options = options;
        }
        fields.push(field);
    }
    return fields;
}

/**
 * Build the whole manifest.
 * @returns {object} Provider name to its fields
 */
function build() {
    const lang = JSON.parse(fs.readFileSync(LANG, "utf8"));
    const names = providerNames();
    const manifest = {};

    for (const file of fs.readdirSync(VUE_DIR).sort()) {
        if (!file.endsWith(".vue")) {
            continue;
        }
        const provider = names[path.basename(file, ".vue").toLowerCase()];
        if (!provider) {
            continue;
        }
        const fields = extract(fs.readFileSync(path.join(VUE_DIR, file), "utf8"), provider, lang);
        if (fields.length) {
            manifest[provider] = fields;
        }
    }
    return manifest;
}

/**
 * The file contents for a manifest.
 * @param {object} manifest Provider name to its fields
 * @returns {string} The module source
 */
function render(manifest) {
    return `/*
 * What each notification provider needs entered.
 *
 * GENERATED by extra/generate-notification-fields.js from the interface's own
 * forms, which are the only authoritative description of a provider's
 * settings. Do not edit by hand: run the generator instead, and a test will
 * tell you if this file and the forms have come apart.
 *
 * A provider absent from here has no form component, so nothing is known about
 * what it needs. That is reported as the absence of a description rather than
 * as needing nothing, so a client can ask for its settings directly instead of
 * offering an empty form.
 */
const NOTIFICATION_FIELDS = ${JSON.stringify(manifest, null, 4)};

module.exports = { NOTIFICATION_FIELDS };
`;
}

module.exports = { build, render };

if (require.main === module) {
    const manifest = build();
    fs.writeFileSync(OUT, render(manifest));
    const count = Object.values(manifest).reduce((n, f) => n + f.length, 0);
    process.stdout.write(`${Object.keys(manifest).length} providers, ${count} fields\n`);
}
