const dns = require("node:dns");
const net = require("node:net");

const DEFAULT_ALLOWED_PORTS = new Set([ 80, 443 ]);
const BLOCKED_HOSTNAMES = new Set([
    "metadata.amazonaws.com",
    "metadata.google.internal",
]);
const BLOCKED_HOSTNAME_SUFFIXES = [ ".home", ".internal", ".lan", ".local", ".localhost" ];

const blockedIpv4Addresses = new net.BlockList();
for (const [ address, prefix ] of [
    [ "0.0.0.0", 8 ],
    [ "10.0.0.0", 8 ],
    [ "100.64.0.0", 10 ],
    [ "127.0.0.0", 8 ],
    [ "169.254.0.0", 16 ],
    [ "172.16.0.0", 12 ],
    [ "192.0.0.0", 24 ],
    [ "192.0.2.0", 24 ],
    [ "192.168.0.0", 16 ],
    [ "198.18.0.0", 15 ],
    [ "198.51.100.0", 24 ],
    [ "203.0.113.0", 24 ],
    [ "224.0.0.0", 4 ],
    [ "240.0.0.0", 4 ],
]) {
    blockedIpv4Addresses.addSubnet(address, prefix, "ipv4");
}
const blockedIpv6Addresses = new net.BlockList();
for (const [ address, prefix ] of [
    [ "::", 128 ],
    [ "::1", 128 ],
    [ "::ffff:0:0", 96 ],
    [ "64:ff9b:1::", 48 ],
    [ "100::", 64 ],
    [ "2001::", 23 ],
    [ "2002::", 16 ],
    [ "fc00::", 7 ],
    [ "fe80::", 10 ],
    [ "ff00::", 8 ],
]) {
    blockedIpv6Addresses.addSubnet(address, prefix, "ipv6");
}

class CloudTargetPolicyError extends Error {
    /**
     * @param code
     */
    constructor(code) {
        super(`Cloud target policy rejected the destination (${code})`);
        this.name = "CloudTargetPolicyError";
        this.code = code;
    }
}

/**
 * @param value
 */
function configuredAllowedPorts(value = process.env.UPTIME_GIZMO_CLOUD_ALLOWED_PORTS) {
    if (!value) {
        return DEFAULT_ALLOWED_PORTS;
    }
    const ports = new Set();
    for (const rawPort of value.split(",")) {
        const port = Number(rawPort.trim());
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new CloudTargetPolicyError("invalid_allowed_ports");
        }
        ports.add(port);
    }
    if (ports.size === 0) {
        throw new CloudTargetPolicyError("invalid_allowed_ports");
    }
    return ports;
}

/**
 * @param url
 */
function effectivePort(url) {
    return Number(url.port || (url.protocol === "https:" ? 443 : 80));
}

/**
 * @param target
 * @param allowedPorts
 */
function assertPublicTargetShape(target, allowedPorts = configuredAllowedPorts()) {
    let url;
    try {
        url = target instanceof URL ? target : new URL(target);
    } catch {
        throw new CloudTargetPolicyError("invalid_url");
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[(.*)\]$/, "$1");
    if (
        ![ "http:", "https:" ].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.hash ||
        !hostname ||
        BLOCKED_HOSTNAMES.has(hostname) ||
        BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))
    ) {
        throw new CloudTargetPolicyError("invalid_destination");
    }
    if (!allowedPorts.has(effectivePort(url))) {
        throw new CloudTargetPolicyError("blocked_port");
    }
    if (net.isIP(hostname)) {
        assertPublicAddress(hostname);
    }
    return url;
}

/**
 * @param address
 */
function assertPublicAddress(address) {
    const family = net.isIP(address);
    if (family === 0) {
        throw new CloudTargetPolicyError("invalid_address");
    }
    const blocked = family === 4
        ? blockedIpv4Addresses.check(address, "ipv4")
        : blockedIpv6Addresses.check(address, "ipv6");
    if (blocked) {
        throw new CloudTargetPolicyError("non_public_address");
    }
    return address;
}

/**
 * @param hostname
 * @param options
 */
async function resolveAndValidate(hostname, options = {}) {
    const resolver = options.resolver || dns.promises.lookup;
    const addresses = await resolver(hostname, {
        all: true,
        verbatim: true,
        ...(options.family ? { family: options.family } : {}),
    });
    if (!Array.isArray(addresses) || addresses.length === 0) {
        throw new CloudTargetPolicyError("unresolved_destination");
    }
    for (const result of addresses) {
        assertPublicAddress(result.address);
    }
    return addresses;
}

/**
 * @param options
 */
function createSafeLookup(options = {}) {
    return async (hostname, lookupOptions, callback) => {
        try {
            const addresses = await resolveAndValidate(hostname, {
                resolver: options.resolver,
                family: lookupOptions?.family,
            });
            if (lookupOptions?.all) {
                callback(null, addresses);
                return;
            }
            const selected = addresses[0];
            callback(null, selected.address, selected.family);
        } catch (error) {
            callback(error);
        }
    };
}

/**
 *
 */
function cloudPublicTargetPolicyEnabled() {
    return process.env.UPTIME_GIZMO_CLOUD_PUBLIC_TARGETS === "true";
}

/**
 * @param options
 * @param monitor
 */
function applyCloudPublicTargetPolicy(options, monitor) {
    if (!cloudPublicTargetPolicyEnabled()) {
        return;
    }
    if (monitor.proxy_id) {
        throw new CloudTargetPolicyError("proxy_not_allowed");
    }
    const allowedPorts = configuredAllowedPorts();
    assertPublicTargetShape(options.url, allowedPorts);
    const lookup = createSafeLookup();
    options.httpAgent.options.lookup = lookup;
    options.httpsAgent.options.lookup = lookup;
    options.maxContentLength = 1024 * 1024;
    options.maxBodyLength = 1024 * 1024;
    options.maxHeaderSize = 16 * 1024;
    options.beforeRedirect = (redirectOptions) => {
        assertPublicTargetShape(
            `${redirectOptions.protocol}//${redirectOptions.hostname}${redirectOptions.port ? `:${redirectOptions.port}` : ""}${redirectOptions.path || "/"}`,
            allowedPorts
        );
        redirectOptions.lookup = lookup;
    };
}

module.exports = {
    CloudTargetPolicyError,
    applyCloudPublicTargetPolicy,
    assertPublicAddress,
    assertPublicTargetShape,
    cloudPublicTargetPolicyEnabled,
    configuredAllowedPorts,
    createSafeLookup,
    resolveAndValidate,
};
