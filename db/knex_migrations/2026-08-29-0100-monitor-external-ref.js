/*
 * A caller-owned correlation key for retry-safe provisioning.
 *
 * The key is scoped to an Uptime Gizmo user because one process may contain
 * more than one independently managed estate. NULL remains valid for every
 * monitor created by the UI or by older clients; SQL unique constraints allow
 * multiple NULL values on every database dialect this project supports.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.string("external_ref", 128).nullable();
        table.unique([ "user_id", "external_ref" ], {
            indexName: "monitor_user_external_ref_unique",
        });
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropUnique([ "user_id", "external_ref" ], "monitor_user_external_ref_unique");
        table.dropColumn("external_ref");
    });
};
