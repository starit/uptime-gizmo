const { R } = require("redbean-node");

/**
 * The channels a monitor should notify.
 *
 * One query, in one place. This selection existed twice — once for status
 * changes and once for certificate expiry — and when the active flag was made
 * to mean something, only the first copy learned about it. A disabled channel
 * stopped receiving outage alerts and kept receiving certificate warnings,
 * which is a worse failure than the flag never having worked: the operator has
 * evidence it is off.
 *
 * Anything that decides who to notify goes through here, so a third delivery
 * path cannot quietly disagree with the first two.
 * @param {number} monitorID The monitor about to send
 * @returns {Promise<object[]>} The channels attached to it that are switched on
 */
async function notificationRecipients(monitorID) {
    return R.getAll(
        `SELECT notification.*
         FROM notification
         JOIN monitor_notification ON monitor_notification.notification_id = notification.id
         WHERE monitor_notification.monitor_id = ? AND notification.active = 1`,
        [ monitorID ]
    );
}

module.exports = { notificationRecipients };
