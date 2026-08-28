const crypto = require("node:crypto");
const { log, DOWN, UP } = require("../src/util");

const MAX_ATTEMPTS = 4;

/**
 * @param value
 */
function normalizeOccurredAt(value) {
    const stringValue = String(value);
    const parsed = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(stringValue) ? stringValue : `${stringValue.replace(" ", "T")}Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new TypeError("Transition occurrence time is invalid");
    }
    return parsed.toISOString();
}

/**
 * @param status
 */
function transitionState(status) {
    if (status === DOWN) {
        return "down";
    }
    if (status === UP) {
        return "recovery";
    }
    return null;
}

/**
 * @param input
 */
function transitionEvent(input) {
    const state = transitionState(input.status);
    if (!state) {
        return null;
    }
    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const identity = `${input.instanceId}:${input.monitorId}:${state}:${occurredAt}`;
    return {
        eventId: crypto.createHash("sha256").update(identity).digest("hex"),
        monitorId: input.monitorId,
        occurredAt,
        state,
    };
}

/**
 * @param secret
 * @param timestamp
 * @param body
 */
function signTransitionBody(secret, timestamp, body) {
    return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

class CloudTransitionEventSender {
    /**
     * @param options
     */
    constructor(options) {
        this.endpoint = options.endpoint;
        this.instanceId = options.instanceId;
        this.secret = options.secret;
        this.fetch = options.fetchImplementation || fetch;
        this.sleep = options.sleepImplementation || ((milliseconds) => new Promise((resolve) => {
            const timeout = setTimeout(resolve, milliseconds);
            timeout.unref?.();
        }));
    }

    /**
     * @param input
     */
    enqueue(input) {
        const event = transitionEvent({ ...input, instanceId: this.instanceId });
        if (!event) {
            return false;
        }
        void this.send(event).catch((error) => {
            log.error("cloud-events", `Transition delivery failed after retries: ${error.message}`);
        });
        return true;
    }

    /**
     * @param event
     */
    async send(event) {
        const body = JSON.stringify(event);
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
            const timestamp = String(Math.floor(Date.now() / 1000));
            try {
                const response = await this.fetch(this.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "uptime-gizmo-cloud-events/1",
                        "X-Gizmo-Instance-ID": this.instanceId,
                        "X-Gizmo-Signature": `v1=${signTransitionBody(this.secret, timestamp, body)}`,
                        "X-Gizmo-Timestamp": timestamp,
                    },
                    body,
                    signal: AbortSignal.timeout(5000),
                });
                if (response.ok) {
                    return;
                }
                if (![ 408, 409, 425, 429 ].includes(response.status) && response.status < 500) {
                    const error = new Error(`Cloud rejected transition event (${response.status})`);
                    error.retryable = false;
                    throw error;
                }
            } catch (error) {
                if (error.retryable === false || attempt + 1 >= MAX_ATTEMPTS) {
                    throw error;
                }
            }
            await this.sleep(1000 * (2 ** attempt));
        }
    }
}

let configuredSender;

/**
 *
 */
function senderFromEnvironment() {
    if (configuredSender !== undefined) {
        return configuredSender;
    }
    const endpoint = process.env.UPTIME_GIZMO_CLOUD_EVENT_URL;
    const instanceId = process.env.UPTIME_GIZMO_CLOUD_INSTANCE_ID;
    const secret = process.env.UPTIME_GIZMO_CLOUD_EVENT_SECRET;
    if (!endpoint && !instanceId && !secret) {
        configuredSender = null;
        return configuredSender;
    }
    if (!endpoint || !instanceId || !secret || secret.length < 32) {
        throw new TypeError("Cloud transition event configuration is incomplete");
    }
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && [ "127.0.0.1", "localhost", "::1" ].includes(url.hostname))) {
        throw new TypeError("Cloud transition event URL must use HTTPS");
    }
    configuredSender = new CloudTransitionEventSender({ endpoint: url.toString(), instanceId, secret });
    return configuredSender;
}

/**
 * @param input
 */
function enqueueCloudTransition(input) {
    try {
        return senderFromEnvironment()?.enqueue(input) || false;
    } catch (error) {
        log.error("cloud-events", `Transition event configuration is invalid: ${error.message}`);
        return false;
    }
}

module.exports = {
    CloudTransitionEventSender,
    enqueueCloudTransition,
    normalizeOccurredAt,
    signTransitionBody,
    transitionEvent,
};
