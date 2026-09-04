const express = require("express");
const bodyParser = require("body-parser");

/**
 * @param {number} port Port number
 * @param {string} url Webhook URL
 * @param {number} timeout Timeout
 * @returns {Promise<object>} Webhook data
 */
async function mockWebhook(port, url, timeout = 2500) {
    return new Promise((resolve, reject) => {
        const app = express();
        const tmo = setTimeout(() => {
            server.close();
            reject({ reason: "Timeout" });
        }, timeout);
        app.use(bodyParser.json()); // Middleware to parse JSON bodies
        app.post(`/${url}`, (req, res) => {
            res.status(200).send("OK");
            server.close();
            tmo && clearTimeout(tmo);
            resolve(req.body);
        });
        const server = app.listen(port);
    });
}

/**
 * Listen on an operating-system-assigned port before running the request that
 * should reach the webhook. This avoids collisions with unrelated local
 * services and removes the sender/listener race from integration tests.
 * @param {string} url Webhook URL
 * @param {(port:number) => Promise<void>} trigger Request producer
 * @param {number} timeout Timeout
 * @returns {Promise<object>} Webhook data
 */
mockWebhook.onAvailablePort = async function (url, trigger, timeout = 2500) {
    return new Promise((resolve, reject) => {
        const app = express();
        let settled = false;
        const finish = (callback, value) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(tmo);
            server.close();
            callback(value);
        };
        const tmo = setTimeout(() => finish(reject, new Error("Webhook timeout")), timeout);
        app.use(bodyParser.json());
        app.post(`/${url}`, (req, res) => {
            res.status(200).send("OK");
            finish(resolve, req.body);
        });
        const server = app.listen(0, "127.0.0.1", async () => {
            try {
                await trigger(server.address().port);
            } catch (error) {
                finish(reject, error);
            }
        });
        server.on("error", (error) => finish(reject, error));
    });
};

/**
 * Prove that a request producer does not call a webhook during a short window.
 * The listener is started first and always closed before this promise settles.
 * @param {string} url Webhook URL
 * @param {(port:number) => Promise<void>} trigger Request producer
 * @param {number} timeout Observation window
 * @returns {Promise<void>} resolves when no request arrived
 */
mockWebhook.expectNoRequest = async function (url, trigger, timeout = 500) {
    return new Promise((resolve, reject) => {
        const app = express();
        let settled = false;
        const finish = (callback, value) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(tmo);
            server.close();
            callback(value);
        };
        const tmo = setTimeout(() => finish(resolve), timeout);
        app.use(bodyParser.json());
        app.post(`/${url}`, (_req, res) => {
            res.status(200).send("Unexpected request");
            finish(reject, new Error("Webhook was called unexpectedly"));
        });
        const server = app.listen(0, "127.0.0.1", async () => {
            try {
                await trigger(server.address().port);
            } catch (error) {
                finish(reject, error);
            }
        });
        server.on("error", (error) => finish(reject, error));
    });
};

module.exports = mockWebhook;
