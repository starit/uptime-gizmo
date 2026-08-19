/*
 * How stale the chain may get before an endpoint counts as unhealthy.
 *
 * Seconds, and per monitor rather than a constant, because block production
 * differs by orders of magnitude between chains — twelve seconds on Ethereum,
 * about two on Polygon, under one on some rollups — and some chains only produce
 * a block when there is something to put in it, so idleness is not a fault
 * there. No default that is right for one chain is right for the next.
 *
 * See docs/plans/web3-balance-monitoring.md.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.integer("web3_max_block_age").nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("web3_max_block_age");
    });
};
