const createError = require('http-errors');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const db = require('./util/Database');

//Load routes
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const apiRouter = require('./routes/api');
const currenciesRouter = require('./routes/currencies');
const portfoliosRouter = require('./routes/portfolios');
const exchangeRatesRouter = require('./routes/exchange-rates');

const app = express();

// Passport Config
require('./config/passport')(passport);

// view engine setup
// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Method override middleware
app.use(methodOverride('_method'));


// Express session
app.use(
    session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: false
        }
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.errors = req.flash('errors');
    res.locals.user = req.user || null;
    res.locals.currency = req.cookies.currency;
    res.locals.country = req.cookies.country;
    res.locals.formatMoney = function(x) {
        return '$'+x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    }
    next();
});

//Register Routes
app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/api/exchange-rates', exchangeRatesRouter);
app.use('/users', usersRouter);
app.use('/currencies', currenciesRouter);
app.use('/portfolios', portfoliosRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.title = 'Error';
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
