// NULL preserves the existing single-fallback column on upgraded databases.
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", (table) => {
        table.text("web3_fallback_network_ids").nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", (table) => {
        table.dropColumn("web3_fallback_network_ids");
    });
};
