/*
 * Public status pages can show a square logo beside or above the title.
 * These columns store the display size and placement; the cropped image itself
 * stays in `icon`.
 */
exports.up = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.string("icon_size", 16).notNullable().defaultTo("md");
        table.string("icon_position", 16).notNullable().defaultTo("left");
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.dropColumn("icon_size");
        table.dropColumn("icon_position");
    });
};
