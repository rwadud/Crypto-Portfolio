const express = require('express');
const router = express.Router();
const https = require('https');

// Cache configuration
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
let cachedData = null;
let cacheTimestamp = null;

// Get API key from environment variable
const API_KEY = process.env.OPENEXCHANGERATES_API_KEY;

/**
 * Fetch exchange rates from OpenExchangeRates API
 */
function fetchExchangeRates() {
    return new Promise((resolve, reject) => {
        const url = `https://openexchangerates.org/api/latest.json?app_id=${API_KEY}`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(new Error('Failed to parse exchange rates'));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * GET /api/exchange-rates
 * Proxy endpoint for OpenExchangeRates with caching
 */
router.get('/', async (req, res) => {
    // Check if API key is configured
    if (!API_KEY) {
        return res.status(500).json({ 
            error: 'Exchange rates service not configured',
            message: 'OPENEXCHANGERATES_API_KEY environment variable is not set'
        });
    }
    
    try {
        const now = Date.now();
        
        // Check if we have valid cached data
        if (cachedData && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            console.log('Returning cached exchange rates');
            return res.json(cachedData);
        }
        
        // Fetch fresh data
        console.log('Fetching fresh exchange rates');
        const data = await fetchExchangeRates();
        
        // Update cache
        cachedData = data;
        cacheTimestamp = now;
        
        // Return data
        res.json(data);
        
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        
        // If we have stale cached data, return it
        if (cachedData) {
            console.log('Returning stale cached data due to error');
            return res.json(cachedData);
        }
        
        // Otherwise return error
        res.status(500).json({ 
            error: 'Failed to fetch exchange rates',
            message: error.message 
        });
    }
});

/**
 * GET /api/exchange-rates/status
 * Check cache status and API usage
 */
router.get('/status', (req, res) => {
    const now = Date.now();
    const cacheAge = cacheTimestamp ? now - cacheTimestamp : null;
    const cacheValid = cacheAge && cacheAge < CACHE_DURATION;
    
    res.json({
        cached: !!cachedData,
        cacheAge: cacheAge ? Math.floor(cacheAge / 1000) : null,
        cacheAgeMinutes: cacheAge ? Math.floor(cacheAge / 1000 / 60) : null,
        cacheValid: cacheValid,
        cacheDuration: CACHE_DURATION / 1000 / 60,
        nextRefresh: cacheTimestamp ? new Date(cacheTimestamp + CACHE_DURATION) : null
    });
});

module.exports = router;