/*
 * An llm monitor watches an inference endpoint, and the AI settings already
 * hold endpoints and keys for that same kind of destination. Repeating one in
 * every monitor means a rotated key has to be re-entered in each of them, and a
 * key entered per monitor is one more copy of a secret in the database.
 *
 * So a monitor may name a saved credential instead. The column holds that
 * credential's id, which lives in the llmCredentials setting rather than in a
 * table, so this is not a foreign key: a credential deleted out from under a
 * monitor is reported by the check rather than silently changing what it
 * watches.
 *
 * A monitor that names none keeps using its own url, llm_api_key and llm_model,
 * which is what every existing one does.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.string("llm_credential_id", 64).nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("llm_credential_id");
    });
};
