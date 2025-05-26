let mongoose = require('mongoose');

// Default configuration (used if environment variables not set)
const DEFAULT_SERVER = 'localhost:27017';
const DEFAULT_DATABASE = 'crypto';

class Database {
    constructor() {
        this._connect()
    }

    _connect() {
        // Use MONGODB_URI if available, otherwise construct from individual parts
        const mongoUri = process.env.MONGODB_URI || 
                        process.env.DATABASE_URL ||
                        `mongodb://${process.env.MONGODB_HOST || DEFAULT_SERVER}/${process.env.MONGODB_DATABASE || DEFAULT_DATABASE}`;
        
        console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//<user>:<pass>@'));
        
        mongoose.connect(mongoUri)
            .then(() => {
                console.log('Database connection successful')
            })
            .catch(err => {
                console.error('Database connection error:', err.message)
            })
    }
}

module.exports = new Database();