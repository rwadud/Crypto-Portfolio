var express = require('express');
var router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');

/* GET home page. */
router.get('/', async function(req, res, next) {
  let currencies = await CryptoCurrency.find().sort({rank:1});
  res.render('index', { title: 'Crypto Tracker', currencies: currencies });
});

/* Health check endpoint */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'unknown'
  });
});

module.exports = router;
