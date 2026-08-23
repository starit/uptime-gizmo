/*
 * Reading one value out of a contract and comparing it against a threshold.
 *
 * The calldata is stored as text and sent verbatim rather than composed from an
 * ABI: encoding is a large surface whose failure mode is a call that succeeds
 * and returns the wrong number, and every caller of this feature — an agent
 * through the REST API, or a human reading a contract at this level — already
 * has the hex.
 *
 * web3_value_threshold is a string for the same reason web3_min_balance is: a
 * uint256 at 18 decimals is past where a double is exact, so the comparison
 * happens in BigInt and the threshold has to survive as written.
 *
 * web3_value_decimals defaults to 0, unlike the balance type's 18. Most values
 * read this way are not token amounts — a round id, a count, a basis-point rate
 * — and defaulting to 18 would silently turn a threshold of 1000 into
 * 0.000000000000001.
 *
 * See docs/plans/web3-contract-monitoring.md.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.string("web3_call_to", 255).nullable();
        table.text("web3_call_data").nullable();
        table.integer("web3_value_offset").nullable().defaultTo(0);
        table.string("web3_value_type", 16).nullable().defaultTo("uint256");
        table.integer("web3_value_decimals").nullable().defaultTo(0);
        table.string("web3_value_operator", 16).nullable();
        table.string("web3_value_threshold", 96).nullable();
        table.string("web3_block_tag", 16).nullable().defaultTo("latest");
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("web3_call_to");
        table.dropColumn("web3_call_data");
        table.dropColumn("web3_value_offset");
        table.dropColumn("web3_value_type");
        table.dropColumn("web3_value_decimals");
        table.dropColumn("web3_value_operator");
        table.dropColumn("web3_value_threshold");
        table.dropColumn("web3_block_tag");
    });
};
