/*
 * The LLM base URL is not a display setting. generateTheme sends the API key
 * to it as a Bearer token, so a value that points at an attacker, at cloud
 * metadata, or at a link-local address is a credential leak rather than a
 * misconfiguration.
 *
 * Empty is fine: themed.js then talks to the provider's own host. Anything
 * else has to be a URL we are willing to put that header on.
 */

/**
 * Setting keys that are the LLM credential bag. The first four are the
 * single-credential settings the list replaced; they are still read for an
 * instance that has not saved the AI page since upgrading.
 */
const LLM_SETTING_KEYS = [
    "llmProvider",
    "llmApiKey",
    "llmModel",
    "llmBaseUrl",
    "llmCredentials",
    "llmActiveCredentialId",
];

const METADATA_HOSTS = new Set([
    "metadata.google.internal",
    "metadata.goog",
    "metadata",
]);

/**
 * Parse four dotted decimals, or null when the string is not an IPv4 address.
 * @param {string} host hostname
 * @returns {number[]|null} octets, or null
 */
function ipv4Octets(host) {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (!match) {
        return null;
    }
    const octets = match.slice(1).map(Number);
    if (octets.some((part) => part > 255)) {
        return null;
    }
    return octets;
}

/**
 * Whether this host is localhost, including IPv6 loopback.
 * @param {string} host hostname from URL
 * @returns {boolean} true when it is the local machine
 */
function isLocalhost(host) {
    const name = host.toLowerCase();
    return name === "localhost" || name === "127.0.0.1" || name === "::1";
}

/**
 * Whether this host is link-local or a known cloud-metadata name.
 *
 * 169.254.169.254 is the usual IMDS address; the rest of 169.254.0.0/16 is
 * the same class of "this machine's neighbourhood", never an LLM provider.
 * @param {string} host hostname from URL
 * @returns {boolean} true when the key must not be sent there
 */
function isMetadataOrLinkLocal(host) {
    const name = host.toLowerCase();

    if (METADATA_HOSTS.has(name)) {
        return true;
    }

    const octets = ipv4Octets(name) || ipv4FromMappedIPv6(name);
    if (octets && octets[0] === 169 && octets[1] === 254) {
        return true;
    }

    return name.startsWith("fe80:");
}

/**
 * IPv4-mapped IPv6 — dotted (`::ffff:169.254.169.254`) or the hex form Node's
 * URL parser emits (`::ffff:a9fe:a9fe`).
 * @param {string} host hostname without brackets
 * @returns {number[]|null} IPv4 octets, or null
 */
function ipv4FromMappedIPv6(host) {
    const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(host);
    if (dotted) {
        return ipv4Octets(dotted[1]);
    }

    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(host);
    if (!hex) {
        return null;
    }

    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return [ (high >> 8) & 255, high & 255, (low >> 8) & 255, low & 255 ];
}

/**
 * Refuse a base URL that would receive the LLM API key unsafely.
 *
 * The llm monitor type validates its own endpoint through here rather than
 * repeating the rules: it sends the same kind of credential to the same kind of
 * destination, and a second copy of this list is how one of them ends up
 * missing a case.
 * @param {any} value raw setting
 * @param {string} label what to call the value in an error message
 * @returns {string|undefined} trimmed URL, or undefined when unset
 * @throws {Error} when the value cannot be used as a request destination
 */
function assertSafeLlmBaseUrl(value, label = "The LLM base URL") {
    if (value == null) {
        return undefined;
    }

    const text = String(value).trim();
    if (text === "") {
        return undefined;
    }

    let url;
    try {
        url = new URL(text);
    } catch (e) {
        throw new Error(`${label} is not a URL`);
    }

    if (url.username || url.password) {
        throw new Error(`${label} must not contain credentials; the API key is sent separately`);
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error(`${label} must be http or https`);
    }

    const host = url.hostname.replace(/^\[|\]$/g, "");

    if (isMetadataOrLinkLocal(host)) {
        throw new Error(`${label} cannot be a link-local or cloud-metadata address`);
    }

    // HTTP on the public internet would send the key in cleartext. Local
    // Ollama and similar speak HTTP on loopback; that is the one exception.
    if (url.protocol === "http:" && !isLocalhost(host)) {
        throw new Error(`${label} must use HTTPS, except for localhost`);
    }

    return text;
}

module.exports = {
    LLM_SETTING_KEYS,
    assertSafeLlmBaseUrl,
};
