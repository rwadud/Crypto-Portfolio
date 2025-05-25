const mongoose = require('mongoose');

const CryptoCurrencySchema = new mongoose.Schema({
    rank: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    marketCap: {
        type: Number,
        required: true
    },
    volume: {
        type: Number,
        required: true
    },
    cryptoVolume: {
        type: String,
        required: false
    },
    supply: {
        type: String,
        required: true
    },
    change: {
        type: String,
        required: true
    },
    graph: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    }
});

const CryptoCurrency = mongoose.model('CryptoCurrency', CryptoCurrencySchema);

module.exports = CryptoCurrency;