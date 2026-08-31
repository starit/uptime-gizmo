/*
 * A caller-owned correlation key for retry-safe provisioning.
 *
 * The key is scoped to an Uptime Gizmo user because one process may contain
 * more than one independently managed estate. NULL remains valid for every
 * monitor created by the UI or by older clients.
 *
 * SQL Server is the exception to the usual NULL behaviour of a unique
 * constraint: it permits only one (user_id, NULL) pair. Existing installations
 * normally have many such rows, so adding an ordinary constraint there would
 * make an upgrade fail. A filtered unique index gives SQL Server the same
 * semantics the other supported databases get from their regular constraint.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.string("external_ref", 128).nullable();
    });

    if (knex.client.dialect === "mssql") {
        await knex.raw(
            `CREATE UNIQUE INDEX monitor_user_external_ref_unique
             ON monitor (user_id, external_ref)
             WHERE external_ref IS NOT NULL`
        );
    } else {
        await knex.schema.alterTable("monitor", function (table) {
            table.unique([ "user_id", "external_ref" ], {
                indexName: "monitor_user_external_ref_unique",
            });
        });
    }
};

exports.down = async function (knex) {
    if (knex.client.dialect === "mssql") {
        await knex.raw("DROP INDEX monitor_user_external_ref_unique ON monitor");
    } else {
        await knex.schema.alterTable("monitor", function (table) {
            table.dropUnique([ "user_id", "external_ref" ], "monitor_user_external_ref_unique");
        });
    }

    await knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("external_ref");
    });
};
