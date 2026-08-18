/*
 * The two flags that make up the whole permission model.
 *
 * `user.admin` distinguishes an administrator from everyone else.
 * `api_key.read_only` marks a credential that may read and nothing more.
 *
 * Effective authority is the intersection of the two, so a key never exceeds
 * its owner. See docs/plans/multi-user.md and docs/plans/mcp-and-agent-api.md.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("user", function (table) {
        table.boolean("admin").notNullable().defaultTo(false);
    });

    await knex.schema.alterTable("api_key", function (table) {
        table.boolean("read_only").notNullable().defaultTo(false);
    });

    // Existing accounts have always had full authority, and an instance must
    // never end up with no administrator.
    await knex("user").update({ admin: true });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("user", function (table) {
        table.dropColumn("admin");
    });

    await knex.schema.alterTable("api_key", function (table) {
        table.dropColumn("read_only");
    });
};
