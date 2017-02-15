/**
 * Created by voloshin on 13.02.17.
 */
module.exports = class User {

    constructor(fb_id, json, db) {
        this.db = db;
        this.fb_id = fb_id;
    }

    static load() {

    }
}