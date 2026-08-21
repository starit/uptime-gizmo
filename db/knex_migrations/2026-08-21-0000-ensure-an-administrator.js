/*
 * Setup used to store the first account without setting admin, and the column
 * defaults to false. LLM credentials are now writable only by an administrator
 * — because the base URL receives the API key — so an instance with nobody
 * marked admin would have no way to configure them.
 *
 * Same rule as the original backfill: if nobody is an administrator yet, the
 * accounts that already exist are.
 */
exports.up = async function (knex) {
    const row = await knex("user").where("admin", 1).count("id as count").first();
    const count = Number(row?.count ?? 0);

    if (count === 0) {
        await knex("user").update({ admin: true });
    }
};

exports.down = async function () {
    // Cannot know which rows were promoted.
};
