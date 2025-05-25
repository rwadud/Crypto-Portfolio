let mongoose = require('mongoose');

// The DATABASE_URL environment variable will be used if set,
// otherwise, it defaults to the local MongoDB instance and 'crypto' database.
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/crypto';

class Database {
    constructor() {
        this._connect();
    }

    _connect() {
        mongoose.connect(MONGODB_URI)
            .then(() => {
                console.log('Database connection successful to:', MONGODB_URI);
            })
            .catch(err => {
                console.error('Database connection error to:', MONGODB_URI, err);
            });
    }
}

module.exports = new Database();