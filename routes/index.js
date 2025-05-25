var express = require('express');
var router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Fixed at 100 items per page
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalCount = await CryptoCurrency.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);
    
    // Validate page number
    if (page < 1) {
      return res.redirect('/');
    }
    if (page > totalPages && totalPages > 0) {
      return res.redirect('/?page=' + totalPages);
    }
    
    // Fetch paginated data
    const currencies = await CryptoCurrency
      .find()
      .sort({ marketCap: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate range for display
    const startItem = skip + 1;
    const endItem = Math.min(skip + currencies.length, totalCount);
    
    res.render('index', { 
      title: 'Crypto Tracker', 
      currencies: currencies,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCount,
        startItem: startItem,
        endItem: endItem,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.render('index', { 
      title: 'Crypto Tracker', 
      currencies: [],
      pagination: null
    });
  }
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
