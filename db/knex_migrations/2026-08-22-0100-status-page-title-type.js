/*
 * Public status-page titles can use a size preset and a small set of
 * self-hosted typefaces. The cropped logo stays in `icon`.
 */
exports.up = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.string("title_size", 16).notNullable().defaultTo("md");
        table.string("title_font", 16).notNullable().defaultTo("sans");
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.dropColumn("title_size");
        table.dropColumn("title_font");
    });
};
