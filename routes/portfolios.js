const express = require('express');
const router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');
const Portfolio = require('../models/Portfolio');
const {ensureAuthenticated} = require('../config/auth');

/* Portfolio listing */
router.get('/', ensureAuthenticated, async(req, res, next) => {
    try {
        let portfolios = await Portfolio.find({user:req.user.id}).sort({date:'asc'});
        res.render('portfolios', {
            title: 'Portfolio',
            portfolios: portfolios
        });
    } catch (error) {
        next(error);
    }
});

/* Get A Portfolio */
router.get('/:id', ensureAuthenticated, async(req, res, next) => {
    try {
        let portfolio = await Portfolio.findOne({_id:req.params.id});
        if(portfolio){
            let currencies = await CryptoCurrency.find().select('name price').sort({rank:1});
            console.log(portfolio.currencies.keys())
            res.render('portfolio', {
                title: portfolio.name,
                portfolio: portfolio,
                currencies: currencies
            });
        } else {
            res.render('404', {title: "404 Not Found"});
        }

    } catch (error) {
        next(error);
    }
    Portfolio.findOne({_id:req.params.id}).then(portfolio => {
        if(portfolio){

        } else {

        }
    });
});

/* Process Create Form
*  Create a new portfolio
* */
router.post('/', ensureAuthenticated, function(req, res, next) {
    let errors = [];

    if(!req.body.name){
        errors.push({text:'Please enter a portfolio name'});
    }

    if(errors.length > 0){
        res.render('/portfolios', {
            errors: errors,
            name: req.body.name,
            desc: req.body.desc
        });
    } else {
        const newPortfolio = {
            name: req.body.name,
            description: req.body.desc,
            currencies: {},
            total: 0.0,
            user: req.user.id
        };
        new Portfolio(newPortfolio)
            .save()
            .then(portfolio => {
                req.flash('success_msg', 'Portfolio created.');
                res.redirect('/portfolios');
            })
    }
});

/* Process Edit Form
*  Edit a portfolio
* */
router.put('/:id', ensureAuthenticated, async(req, res, next) =>  {

    try {
        let errors = [];
        let portfolio = await Portfolio.findOne({_id:req.params.id});

        if(portfolio.user !== req.user.id){
            errors.push({msg:'No permission.'});
            req.flash('errors', errors);
            res.redirect('back');
            return;
        }

        let name = req.body.name;
        if(typeof req.body.action != "undefined" && req.body.action === "edit"){
            if(portfolio){
                portfolio.name = name;
                portfolio.description = req.body.desc;
                await portfolio.save();
                res.redirect('back');
            }
        } else if (typeof req.body.action != "undefined" && req.body.action === "update") {
            if(portfolio){
                portfolio.total = req.body.total;
                await portfolio.save();
                res.json({
                    STATUS: "OK"
                });
            }
        } else {
            if(name.includes('('))
                name = name.split('(')[0].trim();
            let currency = await CryptoCurrency.findOne({name:name});

            if(!name){
                errors.push({msg:'Please select a crypto currency.'});
            }
            if(!currency){
                errors.push({msg:'Not a valid crypto currency.'});
            }
            if(!req.body.amount){
                errors.push({msg:'Please enter an amount.'});
            }
            if(req.body.amount <= 0 ||isNaN(req.body.amount)){
                errors.push({msg:'Please enter a positive amount.'});
            }
            if(errors.length > 0){
                req.flash('errors', errors);
                res.redirect('back');
            } else {
                if(typeof req.body.action != "undefined" && req.body.action === "remove"){
                    portfolio.currencies.delete(currency._id.toString());
                    if(portfolio.currencies.size === 0)
                        portfolio.total = 0;
                    await portfolio.save();
                    res.json({
                        STATUS: "OK"
                    });
                } else {
                    portfolio.currencies.set(currency._id.toString(), req.body.amount);
                    await portfolio.save();
                    res.redirect('back');
                }
            }
        }

    } catch (error) {
        next(error);
    }
});

/* Delete A Portfolio */
router.delete('/:id', ensureAuthenticated, function(req, res, next) {
    Portfolio.deleteOne({ _id:req.params.id}, function (err) {
        if (err) return next(error);
        res.json({
            STATUS: "OK"
        });
    });
});

module.exports = router;