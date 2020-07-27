const express = require('express');
const router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');
const Portfolio = require('../models/Portfolio');

/* Get all currencies */
router.get('/currencies', async(req, res, next) =>  {
    try {
        let currencies = await CryptoCurrency.find().sort({rank:1});
        if(currencies.length){
            res.json({
                "STATUS": "FOUND",
                "DATA": currencies
            });
        } else {
            res.json({
                "STATUS": "NOT-FOUND",
            });
        }
    } catch (error) {
        next(error);
    }
});

/* Get a single currency by id*/
router.get('/currencies/:id', async(req, res, next) =>  {
    try {
        let currency = await CryptoCurrency.findOne({_id:req.params.id});
        if(currency){
            res.json({
                "STATUS": "FOUND",
                "DATA": currency
            });
        } else {
            res.json({
                "STATUS": "NOT-FOUND",
            });
        }
    } catch (error) {
        next(error);
    }
});

/* Get all portfolios */
router.get('/portfolios', async(req, res, next) =>  {
    try {
        let portfolios = await Portfolio.find().sort('date');
        if(portfolios.length){
            res.json({
                "STATUS": "FOUND",
                "DATA": portfolios
            });
        } else {
            res.json({
                "STATUS": "NOT-FOUND",
            });
        }
    } catch (error) {
        next(error);
    }
});

/* Get portfolio by id */
router.get('/portfolios/:id', async(req, res, next) =>  {
    try {
        let portfolio = await Portfolio.findOne({_id:req.params.id});
        if(portfolio){
            res.json({
                "STATUS": "FOUND",
                "DATA": portfolio
            });
        } else {
            res.json({
                "STATUS": "NOT-FOUND",
            });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;