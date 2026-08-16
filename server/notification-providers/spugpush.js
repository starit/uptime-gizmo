const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { DOWN, UP } = require("../../src/util");

class SpugPush extends NotificationProvider {
    name = "SpugPush";

    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        let okMsg = "Sent Successfully.";
        try {
            let formData = {
                title: "Uptime Gizmo Message",
                content: msg,
            };
            if (heartbeatJSON) {
                if (heartbeatJSON["status"] === UP) {
                    formData.title = `UptimeGizmo 「${monitorJSON["name"]}」 is Up`;
                    formData.content = `[✅ Up] ${heartbeatJSON["msg"]}`;
                } else if (heartbeatJSON["status"] === DOWN) {
                    formData.title = `UptimeGizmo 「${monitorJSON["name"]}」 is Down`;
                    formData.content = `[🔴 Down] ${heartbeatJSON["msg"]}`;
                }
            }
            const apiUrl = `https://push.spug.cc/send/${notification.templateKey}`;
            let config = this.getAxiosConfigWithProxy({});
            await axios.post(apiUrl, formData, config);
            return okMsg;
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }
}

module.exports = SpugPush;
