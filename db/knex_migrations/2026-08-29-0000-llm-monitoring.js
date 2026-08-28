/*
 * Checking that an inference endpoint is still producing usable output.
 *
 * An HTTP monitor already covers reachability, and that is the failure this
 * type is not for. What it cannot see is the one that matters: a provider
 * answering 200 with an error object in the payload, a model that has been
 * deprecated out from under the caller, a gateway returning an empty
 * completion, or a response that arrives so late the application calling it has
 * already given up. Every one of those keeps a status-code check green.
 *
 * So the check is a real completion request, and the assertion is on the
 * content that comes back.
 *
 * The endpoint, timeout and content assertion reuse `url`, `timeout` and
 * `keyword`/`invert_keyword` rather than adding columns: they mean the same
 * thing here as they do for an HTTP keyword monitor, only extracted from one
 * field of a JSON body instead of the whole response.
 *
 * llm_api_key is deliberately not writable over the REST API. Every other
 * credential-bearing resource in this project is entered by a human for the
 * same reason, and the API has no decided answer yet for accepting a secret
 * over HTTP.
 *
 * llm_max_tokens defaults low because every check spends tokens. At the default
 * 60-second interval a monitor makes 1440 requests a day, and a cap is the only
 * thing standing between a monitor and a bill.
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.string("llm_model", 128).nullable();
        table.text("llm_api_key").nullable();
        table.text("llm_prompt").nullable();
        table.integer("llm_max_tokens").nullable().defaultTo(16);
        table.integer("llm_max_latency").nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("llm_model");
        table.dropColumn("llm_api_key");
        table.dropColumn("llm_prompt");
        table.dropColumn("llm_max_tokens");
        table.dropColumn("llm_max_latency");
    });
};
