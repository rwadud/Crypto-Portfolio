const express = require('express');
const router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');

/* Crypto Currency */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

/* Crypto Currency Page */
router.get('/:slug', function(req, res, next) {
    CryptoCurrency.findOne({slug:req.params.slug}).then(currency => {
        if(currency){
            res.render('currency', {
            title: currency.name,
            currency: currency
        });
        } else {
            res.render('404', {title: "404 Not Found"});
        }
    });
});

module.exports = router;