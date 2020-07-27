var express = require('express');
var router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');

/* GET home page. */
router.get('/', async function(req, res, next) {
  let currencies = await CryptoCurrency.find().sort({rank:1});
  res.render('index', { title: 'Crypto Tracker', currencies: currencies });
});

module.exports = router;
