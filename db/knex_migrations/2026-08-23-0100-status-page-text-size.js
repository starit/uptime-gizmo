/*
 * Body copy on a public status page has its own size preset. The typeface
 * already stored in `title_font` is the page face, not a title-only choice.
 */
exports.up = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.string("text_size", 16).notNullable().defaultTo("md");
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.dropColumn("text_size");
    });
};
