let mongoose = require('mongoose');

const server = 'localhost:27017';
const database = 'crypto';

class Database {
    constructor() {
        this._connect()
    }

    _connect() {
        const mongoUri = process.env.MONGODB_URI || `mongodb://${server}/${database}`;
        mongoose.connect(mongoUri)
            .then(() => {
                console.log('Database connection successful')
            })
            .catch(err => {
                console.error('Database connection error')
            })
    }
}

module.exports = new Database();