const { BeanModel } = require("redbean-node/dist/bean-model");

class Web3Network extends BeanModel {
    /**
     * Returns an object ready to parse to JSON.
     *
     * rpc_url is absent. A hosted endpoint carries its key in the path —
     * `https://eth-mainnet.example.com/v2/<key>` — so the URL is the credential,
     * and anything holding it spends the owner's quota. The settings form loads
     * it separately for editing; nothing that lists networks needs it.
     * @returns {object} Object ready to parse
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            chainId: this.chain_id,
            active: Boolean(this.active),
        };
    }
}

module.exports = Web3Network;
