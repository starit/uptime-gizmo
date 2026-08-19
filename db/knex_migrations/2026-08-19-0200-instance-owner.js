/*
 * Which account the estate belongs to.
 *
 * Resources carry user_id and about ninety places filter on it. Rather than
 * rewrite those to mean "any signed-in person", every session adopts one account
 * as the owner of the estate, and the queries keep working unchanged. The
 * session's real account is tracked separately for the few things that are
 * genuinely personal — its password, its two-factor settings, its API keys.
 *
 * Set to the existing account, which already owns everything, so nothing moves.
 *
 * See docs/plans/multi-user.md.
 */
exports.up = async function (knex) {
    const existing = await knex("user").orderBy("id").first();

    if (!existing) {
        // A database with no account yet: setup will create one and record it.
        return;
    }

    const already = await knex("setting").where({ key: "instanceOwnerId" }).first();
    if (already) {
        return;
    }

    await knex("setting").insert({
        key: "instanceOwnerId",
        value: String(existing.id),
        type: "general",
    });
};

exports.down = async function (knex) {
    await knex("setting").where({ key: "instanceOwnerId" }).delete();
};
