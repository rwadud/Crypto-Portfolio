const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    currencies: {
        type: Map,
        of: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    total: {
        type: Number,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

module.exports = Portfolio;