/*
 * Watching the balance of an address.
 *
 * Networks are their own table rather than fields on a monitor: an RPC endpoint
 * is instance-level infrastructure that several monitors share, and changing
 * provider should not mean editing every monitor that used it.
 *
 * web3_min_balance is a string, deliberately. A chain reports balances as
 * integers of its smallest unit — 10^18 per Ether — which is past the point
 * where a double is exact, so the comparison happens in BigInt and the threshold
 * has to survive as written. A float column would round the very value the
 * comparison exists to protect.
 *
 * See docs/plans/web3-balance-monitoring.md.
 */
exports.up = async function (knex) {
    await knex.schema.createTable("web3_network", function (table) {
        table.increments("id");
        table.integer("user_id").unsigned().references("id").inTable("user").onDelete("SET NULL").onUpdate("CASCADE");
        table.string("name", 255).notNullable();
        // Held as a string: chain ids are not bounded by anything that
        // guarantees they fit an integer column on every backend.
        table.string("chain_id", 64).notNullable().defaultTo("");
        table.text("rpc_url").notNullable();
        table.boolean("active").notNullable().defaultTo(true);
        table.datetime("created_date").notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable("monitor", function (table) {
        table
            .integer("web3_network_id")
            .unsigned()
            .nullable()
            .references("id")
            .inTable("web3_network")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
        table.string("web3_address", 255).nullable();
        // Null means the chain's own token rather than a contract.
        table.string("web3_token_contract", 255).nullable();
        table.integer("web3_token_decimals").nullable().defaultTo(18);
        table.string("web3_min_balance", 78).nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropForeign("web3_network_id");
        table.dropColumn("web3_network_id");
        table.dropColumn("web3_address");
        table.dropColumn("web3_token_contract");
        table.dropColumn("web3_token_decimals");
        table.dropColumn("web3_min_balance");
    });

    await knex.schema.dropTable("web3_network");
};
