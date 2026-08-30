/*
 * What each notification provider needs entered, for a client that has to draw
 * a form without being the interface.
 *
 * The interface reads these settings straight out of its own Vue components,
 * which is fine for the interface and no use to anything else: a template
 * binds `$parent.notification.<key>` in whatever shape suits the markup, and
 * some of it is behind custom components. Extracting a form definition from
 * those was tried and produced the wrong answer in the way that matters —
 * every credential entered through `HiddenInput` was missed, so a generated
 * Telegram form had no Bot Token field and would have created a channel that
 * silently never sends. A form that is mostly right is worse here than no form
 * at all.
 *
 * So these are written out and checked by hand against both the component and
 * the provider that reads them. Only the providers people reach for first are
 * covered; a caller asking about anything else is told there is no definition
 * and can fall back to entering the settings directly, which is what it had
 * before this existed.
 *
 * The right long-term home for this is the provider classes themselves,
 * declared next to the code that reads them so the two cannot drift. That is a
 * change to a hundred files and is not this.
 *
 * `secret` marks a value that should be entered like a password and never
 * displayed back. `required` marks what a provider cannot work without —
 * everything else has a working default or is genuinely optional.
 */
const NOTIFICATION_FIELDS = {
    telegram: [
        { key: "telegramBotToken", label: "Bot Token", type: "secret", required: true },
        { key: "telegramChatID", label: "Chat ID", type: "text", required: true },
        { key: "telegramServerUrl", label: "Server URL", type: "url", required: false },
        { key: "telegramMessageThreadID", label: "Message Thread ID", type: "text", required: false },
        { key: "telegramSendSilently", label: "Send Silently", type: "boolean", required: false },
        { key: "telegramProtectContent", label: "Protect Forwarding/Saving", type: "boolean", required: false },
    ],
    slack: [
        { key: "slackwebhookURL", label: "Webhook URL", type: "url", required: true },
        { key: "slackusername", label: "Username", type: "text", required: false },
        { key: "slackiconemo", label: "Icon Emoji", type: "text", required: false },
        { key: "slackchannel", label: "Channel Name", type: "text", required: false },
        { key: "slackrichmessage", label: "Send rich messages", type: "boolean", required: false },
    ],
    discord: [
        { key: "discordWebhookUrl", label: "Webhook URL", type: "url", required: true },
        { key: "discordUsername", label: "Bot Display Name", type: "text", required: false },
        { key: "discordPrefixMessage", label: "Prefix Custom Message", type: "text", required: false },
    ],
    webhook: [
        { key: "webhookURL", label: "Post URL", type: "url", required: true },
        { key: "webhookContentType", label: "Request Body", type: "text", required: false },
        { key: "webhookAdditionalHeaders", label: "Additional Headers", type: "text", required: false },
    ],
    smtp: [
        { key: "smtpHost", label: "Hostname", type: "text", required: true },
        { key: "smtpPort", label: "Port", type: "number", required: true },
        { key: "smtpFrom", label: "From Email", type: "text", required: true },
        { key: "smtpTo", label: "To Email", type: "text", required: true },
        { key: "smtpSecure", label: "Ignore TLS Error", type: "text", required: false },
        { key: "smtpUsername", label: "Username", type: "text", required: false },
        { key: "smtpPassword", label: "Password", type: "secret", required: false },
        { key: "smtpCC", label: "CC", type: "text", required: false },
        { key: "smtpBCC", label: "BCC", type: "text", required: false },
    ],
    gotify: [
        { key: "gotifyserverurl", label: "Server URL", type: "url", required: true },
        { key: "gotifyapplicationToken", label: "Application Token", type: "secret", required: true },
        { key: "gotifyPriority", label: "Priority", type: "number", required: false },
    ],
    pushover: [
        { key: "pushoveruserkey", label: "User Key", type: "secret", required: true },
        { key: "pushoverapptoken", label: "Application Token", type: "secret", required: true },
        { key: "pushovertitle", label: "Title", type: "text", required: false },
        { key: "pushoverdevice", label: "Device", type: "text", required: false },
        { key: "pushoverpriority", label: "Priority", type: "text", required: false },
    ],
    ntfy: [
        { key: "ntfyserverurl", label: "Server URL", type: "url", required: true },
        { key: "ntfytopic", label: "Topic", type: "text", required: true },
        { key: "ntfyPriority", label: "Priority", type: "number", required: false },
        { key: "ntfyusername", label: "Username", type: "text", required: false },
        { key: "ntfypassword", label: "Password", type: "secret", required: false },
        { key: "ntfyaccesstoken", label: "Access Token", type: "secret", required: false },
    ],
    matrix: [
        { key: "homeserverUrl", label: "Homeserver URL", type: "url", required: true },
        { key: "internalRoomId", label: "Internal Room ID", type: "text", required: true },
        { key: "accessToken", label: "Access Token", type: "secret", required: true },
    ],
    DingDing: [
        { key: "webHookUrl", label: "Webhook URL", type: "url", required: true },
        { key: "secretKey", label: "Secret Key", type: "secret", required: true },
        { key: "mentioning", label: "Mentioning", type: "text", required: false },
    ],
    Feishu: [
        { key: "feishuWebHookUrl", label: "Webhook URL", type: "url", required: true },
    ],
    Bark: [
        { key: "barkEndpoint", label: "Endpoint", type: "url", required: true },
        { key: "barkGroup", label: "Group", type: "text", required: false },
        { key: "barkSound", label: "Sound", type: "text", required: false },
    ],
    ServerChan: [
        { key: "serverChanSendKey", label: "SendKey", type: "secret", required: true },
    ],
    PagerDuty: [
        { key: "pagerdutyIntegrationKey", label: "Integration Key", type: "secret", required: true },
        { key: "pagerdutyIntegrationUrl", label: "Integration URL", type: "url", required: false },
        { key: "pagerdutyPriority", label: "Priority", type: "text", required: false },
        { key: "pagerdutyAutoResolve", label: "Auto resolve or acknowledged", type: "text", required: false },
    ],
};

module.exports = { NOTIFICATION_FIELDS };
