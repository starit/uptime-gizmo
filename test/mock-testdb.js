const { sync: rimrafSync } = require("rimraf");
const Database = require("../server/database");

class TestDB {
    dataDir;

    constructor(dir = "./data/test") {
        this.dataDir = dir;
    }

    async create() {
        // A previously interrupted test run may leave a complete database here.
        // Start each fixture from the same empty state.
        rimrafSync(this.dataDir);
        Database.initDataDir({ "data-dir": this.dataDir });
        Database.dbConfig = {
            type: "sqlite",
        };
        Database.writeDBConfig(Database.dbConfig);
        await Database.connect(true);
        await Database.patch();
    }

    async destroy() {
        await Database.close();
        this.dataDir && rimrafSync(this.dataDir);
    }
}

module.exports = TestDB;
