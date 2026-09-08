/*
 * A Web3 monitor may use one already-configured network when its primary RPC
 * endpoint cannot return a usable result. Keeping this as another network
 * reference avoids duplicating RPC credentials on every monitor.
 *
 * Existing monitors receive NULL and keep their previous single-endpoint
 * behaviour.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table
            .integer("web3_fallback_network_id")
            .unsigned()
            .nullable()
            .references("id")
            .inTable("web3_network")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropForeign("web3_fallback_network_id");
        table.dropColumn("web3_fallback_network_id");
    });
};
