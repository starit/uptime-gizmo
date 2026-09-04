/* eslint-disable camelcase */
"use strict";

/**
 * Compact, secret-safe identity helpers for the monitor inventory.
 * The detail page can show richer copy; this list only needs enough to tell
 * types apart and to search without putting passwords on the screen.
 */

/**
 * Hide passwords in URLs and SQL-style connection strings.
 * @param {unknown} value URL or connection string
 * @returns {string} Displayable value
 */
function redactSecret(value) {
    if (value == null) {
        return "";
    }

    const text = String(value);
    if (text === "") {
        return "";
    }

    try {
        const parsed = new URL(text);
        if (parsed.password !== "") {
            parsed.password = "******";
        }
        return parsed.toString();
    } catch {
        return text
            .replaceAll(/Password=(.+?)(;|$)/gi, "Password=******$2")
            .replaceAll(/:([^:@/]+)@/g, ":******@");
    }
}

/**
 * @param {string} hostname Host or empty
 * @param {unknown} port Port or empty
 * @returns {string} host or host:port
 */
function hostPort(hostname, port) {
    if (!hostname) {
        return "";
    }
    if (port == null || port === "") {
        return String(hostname);
    }
    return `${hostname}:${port}`;
}

/**
 * @param {unknown} value Long id or address
 * @param {number} head Characters to keep at the start
 * @returns {string} Possibly shortened value
 */
function shorten(value, head = 10) {
    const text = value == null ? "" : String(value);
    if (text.length <= head + 5) {
        return text;
    }
    return `${text.slice(0, head)}…${text.slice(-4)}`;
}

/**
 * @param {unknown} list Array of hosts or URLs
 * @returns {string} First item, plus a remainder count
 */
function firstOfList(list) {
    if (!Array.isArray(list) || list.length === 0) {
        return "";
    }
    const first = redactSecret(list[0]);
    if (list.length === 1) {
        return first;
    }
    return `${first} +${list.length - 1}`;
}

/**
 * Friendly type name. Unknown ids stay as the raw type so a new monitor kind
 * still has a label.
 * @param {string} type Monitor type id
 * @param {(key: string) => string} t i18n function
 * @returns {string} Label
 */
function monitorTypeLabel(type, t = (key) => key) {
    switch (type) {
        case "http":
            return "HTTP(s)";
        case "keyword":
            return `HTTP(s) - ${t("Keyword")}`;
        case "json-query":
            return `HTTP(s) - ${t("Json Query")}`;
        case "real-browser":
            return "HTTP(s) - Browser";
        case "websocket-upgrade":
            return "Websocket Upgrade";
        case "port":
            return "TCP Port";
        case "ping":
            return "Ping";
        case "dns":
            return "DNS";
        case "docker":
            return t("Docker Container");
        case "system-service":
            return t("systemService");
        case "pm2":
            return t("PM2 Process");
        case "group":
            return t("Group");
        case "push":
            return "Push";
        case "manual":
            return t("Manual");
        case "globalping":
            return "Globalping";
        case "grpc-keyword":
            return `gRPC(s) - ${t("Keyword")}`;
        case "kafka-producer":
            return "Kafka Producer";
        case "mqtt":
            return "MQTT";
        case "ntp":
            return "NTP";
        case "rabbitmq":
            return "RabbitMQ";
        case "sip-options":
            return "SIP Options";
        case "smtp":
            return "SMTP";
        case "snmp":
            return "SNMP";
        case "tailscale-ping":
            return "Tailscale Ping";
        case "mongodb":
            return "MongoDB";
        case "mysql":
            return "MySQL/MariaDB";
        case "postgres":
            return "PostgreSQL";
        case "sqlserver":
            return "SQL Server";
        case "oracledb":
            return "Oracle Database";
        case "radius":
            return "Radius";
        case "redis":
            return "Redis";
        case "gamedig":
            return "GameDig";
        case "steam":
            return t("Steam Game Server");
        case "llm":
            return t("LLM Endpoint");
        case "web3-balance":
            return t("Web3 Balance");
        case "web3-rpc":
            return t("Web3 RPC Health");
        case "web3-contract":
            return t("Web3 Contract Value");
        default:
            return type || "";
    }
}

/**
 * Compact target line for one monitor. Secrets are stripped. The type name is
 * shown separately, so this is only the endpoint, model, address, or child
 * count.
 * @param {object} monitor Monitor row
 * @param {object} context Extra labels the list already knows
 * @param {number} context.childCount Group child count
 * @param {string} context.networkName Web3 network name
 * @param {string} context.llmModel Resolved LLM model
 * @param {string} context.llmTarget Credential name or redacted URL
 * @returns {string} Target, or empty
 */
function monitorTargetLabel(monitor, context = {}) {
    if (!monitor) {
        return "";
    }

    switch (monitor.type) {
        case "http":
        case "keyword":
        case "json-query":
        case "real-browser":
        case "websocket-upgrade":
            return redactSecret(monitor.url);
        case "ping":
        case "tailscale-ping":
        case "ntp":
            return monitor.hostname || "";
        case "port":
        case "steam":
        case "sip-options":
        case "smtp":
            return hostPort(monitor.hostname, monitor.port);
        case "dns":
            return [monitor.dns_resolve_type ? `[${monitor.dns_resolve_type}]` : "", monitor.hostname]
                .filter(Boolean)
                .join(" ");
        case "globalping":
            return [
                monitor.subtype === "http" ? redactSecret(monitor.url) : monitor.hostname,
                monitor.location,
            ]
                .filter(Boolean)
                .join(" · ");
        case "docker":
            return monitor.docker_container || "";
        case "gamedig":
            return [monitor.game, hostPort(monitor.hostname, monitor.port)].filter(Boolean).join(" · ");
        case "grpc-keyword":
            return redactSecret(monitor.grpcUrl);
        case "mqtt":
            return [hostPort(monitor.hostname, monitor.port), monitor.mqttTopic].filter(Boolean).join("/");
        case "mongodb":
        case "mysql":
        case "postgres":
        case "sqlserver":
        case "oracledb":
        case "redis":
            return redactSecret(monitor.databaseConnectionString);
        case "radius":
            return redactSecret(monitor.hostname);
        case "snmp":
            return [hostPort(monitor.hostname, monitor.port), monitor.snmpOid].filter(Boolean).join(" · ");
        case "kafka-producer":
            return [firstOfList(monitor.kafkaProducerBrokers), monitor.kafkaProducerTopic].filter(Boolean).join(" · ");
        case "rabbitmq":
            return firstOfList(monitor.rabbitmqNodes);
        case "pm2":
        case "system-service":
            return monitor.system_service_name || "";
        case "llm": {
            const model = context.llmModel || monitor.llmModel || "";
            const target = context.llmTarget || redactSecret(monitor.url);
            return [model, target].filter(Boolean).join(" · ");
        }
        case "web3-balance":
            return [context.networkName, shorten(monitor.web3Address, 8)].filter(Boolean).join(" · ");
        case "web3-rpc":
            return context.networkName || "";
        case "web3-contract":
            return [context.networkName, shorten(monitor.web3CallTo || monitor.web3Address, 8)]
                .filter(Boolean)
                .join(" · ");
        case "group":
            if (context.groupLabel) {
                return context.groupLabel;
            }
            if (typeof context.childCount === "number" && context.childCount > 0) {
                return String(context.childCount);
            }
            return "";
        case "push":
        case "manual":
            return "";
        default:
            return redactSecret(monitor.url) || monitor.hostname || "";
    }
}

/**
 * Search blob for one monitor. Includes the displayed target so operators can
 * find a host after the raw URL with a password has been redacted.
 * @param {object} monitor Monitor row
 * @param {object} context Same context as monitorTargetLabel
 * @param {Function} t i18n function
 * @returns {string} Lowercased haystack
 */
function monitorSearchHaystack(monitor, context = {}, t = (key) => key) {
    if (!monitor) {
        return "";
    }

    const tags = Array.isArray(monitor.tags) ? monitor.tags : [];
    const parts = [
        monitor.name,
        monitor.type,
        monitorTypeLabel(monitor.type, t),
        monitorTargetLabel(monitor, context),
        monitor.hostname,
        monitor.keyword,
        monitor.jsonPath,
        monitor.mqttTopic,
        monitor.docker_container,
        monitor.system_service_name,
        monitor.web3Address,
        monitor.web3CallTo,
        monitor.llmModel,
        monitor.kafkaProducerTopic,
        ...tags.map((tag) => `${tag.name || ""} ${tag.value || ""}`),
    ];

    return parts.filter(Boolean).join(" ").toLowerCase();
}

/**
 * @param {object} monitor Monitor row
 * @returns {boolean} Whether the monitor itself is running
 */
function isMonitorActive(monitor) {
    return Boolean(monitor?.active);
}

/**
 * Groups have no check interval. Interval 0 is a real value and must show.
 * @param {object} monitor Monitor row
 * @returns {boolean} Whether to show the interval column
 */
function hasCheckInterval(monitor) {
    if (!monitor || monitor.type === "group") {
        return false;
    }
    return typeof monitor.interval === "number";
}

/**
 * Latency is only meaningful on types that measure a round trip.
 * @param {object} monitor Monitor row
 * @param {object|null} beat Last heartbeat
 * @returns {boolean} Whether to show ping ms
 */
function hasPingSample(monitor, beat) {
    if (!monitor || !beat || typeof beat.ping !== "number") {
        return false;
    }
    if (monitor.type === "group" || monitor.type === "manual") {
        return false;
    }
    return true;
}

module.exports = {
    redactSecret,
    monitorTypeLabel,
    monitorTargetLabel,
    monitorSearchHaystack,
    isMonitorActive,
    hasCheckInterval,
    hasPingSample,
};
