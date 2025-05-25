const cheerio = require('cheerio');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
require('./util/Database');
const CryptoCurrency = require('./models/CryptoCurrency');

const SCRAPE_SOURCE = 'https://coinmarketcap.com/';
const NAVIGATION_TIMEOUT = 60000;
const NAVIGATION_RETRIES = 3;
const RETRY_DELAY = 5000;

// Pagination configuration
const PAGINATION_CONFIG = {
    MAX_PAGES: 100,            // Maximum number of pages to scrape (covers all ~9700 cryptocurrencies)
    DELAY_BETWEEN_PAGES: 5000, // Delay in ms between page requests (5 seconds)
    ITEMS_PER_PAGE: 100        // Expected items per page
};

// Scraping lock to prevent concurrent runs
let isScrapingInProgress = false;

/**
 * Schedule scraping every 5 minutes
 */
cron.schedule('*/5 * * * *', async () => {
    if (isScrapingInProgress) {
        console.log('Scraping already in progress, skipping this run');
        return;
    }
    
    try {
        await scrape();
    } catch (error) {
        console.error('Cron scrape error:', error);
    }
});

/**
 * Data extraction utilities
 */
class DataExtractor {
    constructor($) {
        this.$ = $;
    }

    /**
     * Clean numeric data by removing currency symbols and handling abbreviations
     */
    static cleanNumericData(value) {
        if (!value) return '0';
        
        // Remove common currency symbols and commas
        let cleaned = value.replace(/[$£€¥,]/g, '');
        
        // Handle abbreviated numbers (K, M, B, T)
        const abbreviations = {
            'K': 1e3,
            'M': 1e6,
            'B': 1e9,
            'T': 1e12
        };
        
        const match = cleaned.match(/^([\d.]+)([KMBT])/i);
        if (match) {
            const number = parseFloat(match[1]);
            const multiplier = abbreviations[match[2].toUpperCase()];
            return (number * multiplier).toString();
        }
        
        // Extract numeric part from regular numbers
        const numericMatch = cleaned.match(/^[\d.]+/);
        return numericMatch ? numericMatch[0] : '0';
    }

    /**
     * Extract text from the second span (full precision value)
     * CoinMarketCap hides abbreviated values in first span, shows full in second
     */
    extractFullPrecisionValue(cell, fallbackSelector = 'span, p, div') {
        const paragraph = cell.find('p').first();
        if (paragraph.length) {
            const spans = paragraph.find('span');
            if (spans.length >= 2) {
                return this.$(spans[1]).text().trim();
            } else if (spans.length === 1) {
                return this.$(spans[0]).text().trim();
            }
        }
        
        // Fallback to first matching element
        return cell.find(fallbackSelector).first().text() || cell.text();
    }

    /**
     * Extract cryptocurrency data from a table row
     */
    extractRowData(row, columnMap) {
        const cells = this.$(row).find('td');
        const data = {
            rank: null,
            name: null,
            symbol: null,
            slug: null,
            icon: null,
            price: null,
            marketCap: null,
            volume: null,
            cryptoVolume: null,
            supply: null,
            change: null,
            graph: null
        };

        try {
            // Rank
            if (columnMap.rank !== undefined) {
                const rankCell = this.$(cells[columnMap.rank]);
                data.rank = rankCell.find('p, div, span').first().text().trim() || 
                           rankCell.text().trim();
            }

            // Name, Symbol, Slug, and Icon
            if (columnMap.name !== undefined) {
                const nameCell = this.$(cells[columnMap.name]);
                const link = nameCell.find('a[href*="/currencies/"]').first();
                
                if (link.length) {
                    // Extract slug from href
                    const href = link.attr('href');
                    data.slug = href ? href.split('/').filter(p => p).pop() : null;
                    
                    // Extract name and symbol
                    data.name = link.find('p.coin-item-name').text().trim();
                    data.symbol = link.find('p.coin-item-symbol').text().trim();
                    
                    // Extract icon
                    const img = nameCell.find('img').first();
                    if (img.length) {
                        data.icon = img.attr('src');
                    }
                }
            }

            // Price
            if (columnMap.price !== undefined) {
                const priceCell = this.$(cells[columnMap.price]);
                const priceText = this.extractFullPrecisionValue(priceCell);
                data.price = DataExtractor.cleanNumericData(priceText);
            }

            // Market Cap
            if (columnMap.marketCap !== undefined) {
                const marketCapCell = this.$(cells[columnMap.marketCap]);
                const marketCapText = this.extractFullPrecisionValue(marketCapCell);
                data.marketCap = DataExtractor.cleanNumericData(marketCapText);
            }

            // Volume (both USD and crypto)
            if (columnMap.volume !== undefined) {
                const volumeCell = this.$(cells[columnMap.volume]);
                
                // Extract monetary volume (USD value)
                const volumeText = this.extractFullPrecisionValue(volumeCell);
                data.volume = DataExtractor.cleanNumericData(volumeText);
                
                // Extract crypto volume (e.g., "435.15K BTC")
                const allDivs = volumeCell.find('div');
                if (allDivs.length > 1) {
                    const cryptoText = this.$(allDivs[1]).find('p').text().trim();
                    if (cryptoText.match(/[\d.]+[KMB]?\s+[A-Z]{2,}/)) {
                        data.cryptoVolume = cryptoText;
                    }
                }
            }

            // Supply
            if (columnMap.supply !== undefined) {
                const supplyCell = this.$(cells[columnMap.supply]);
                data.supply = supplyCell.find('p, span, div').first().text().trim();
            }

            // Change (24h)
            if (columnMap.change24h !== undefined) {
                const changeCell = this.$(cells[columnMap.change24h]);
                data.change = changeCell.find('span, p, div').first().text().trim();
            }

            // Graph
            if (columnMap.graph !== undefined) {
                const graphCell = this.$(cells[columnMap.graph]);
                const graphImg = graphCell.find('img').first();
                if (graphImg.length) {
                    data.graph = graphImg.attr('src');
                }
            }

        } catch (error) {
            console.error('Error extracting row data:', error);
        }

        return data;
    }

    /**
     * Parse table headers and map to column indices
     */
    parseTableHeaders(table) {
        const headers = {};
        const headerCells = this.$(table).find('thead th, thead td');
        
        const headerMappings = {
            '#': 'rank',
            'name': 'name',
            'price': 'price',
            '1h%': 'change1h',
            '24h%': 'change24h',
            '7d%': 'change7d',
            'marketcap': 'marketCap',
            'volume24h': 'volume',
            'circulatingsupply': 'supply',
            'last7days': 'graph'
        };
        
        headerCells.each((index, cell) => {
            const rawText = this.$(cell).text().toLowerCase().trim();
            const normalizedText = rawText
                .replace(/\(1h\)/g, '1h')
                .replace(/\(24h\)/g, '24h')
                .replace(/\(7d\)/g, '7d')
                .replace(/[^a-z0-9%#]/g, '')
                .replace(/\s+/g, '');
            
            if (headerMappings[normalizedText]) {
                headers[headerMappings[normalizedText]] = index;
            }
        });
        
        return headers;
    }
}

/**
 * Browser automation utilities
 */
class BrowserAutomation {
    static async launchBrowser() {
        return await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-blink-features=AutomationControlled'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            protocolTimeout: NAVIGATION_TIMEOUT
        });
    }

    static async navigateWithRetry(page, url) {
        for (let attempt = 1; attempt <= NAVIGATION_RETRIES; attempt++) {
            try {
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: NAVIGATION_TIMEOUT
                });
                return true;
            } catch (error) {
                console.log(`Navigation attempt ${attempt} failed:`, error.message);
                if (attempt < NAVIGATION_RETRIES) {
                    console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }
        }
        return false;
    }

    static async scrollPage(page) {
        return page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const maxScroll = 10000;
                
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    
                    if (totalHeight >= scrollHeight || totalHeight >= maxScroll) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
            
            return document.querySelector('body').innerHTML;
        });
    }
}

/**
 * Database operations
 */
class DatabaseOperations {
    static async updateOrCreateCurrency(data) {
        const currency = await CryptoCurrency.findOne({ name: data.name });
        
        if (currency) {
            // Update existing
            Object.assign(currency, {
                rank: data.rank || currency.rank,
                symbol: data.symbol,
                price: data.price,
                marketCap: data.marketCap || currency.marketCap,
                volume: data.volume || currency.volume,
                cryptoVolume: data.cryptoVolume || currency.cryptoVolume,
                supply: data.supply || currency.supply,
                change: data.change || currency.change,
                graph: data.graph || currency.graph
            });
            
            await currency.save();
            console.log(`Updated: ${currency.name} (${currency.symbol})`);
        } else {
            // Create new
            const newCurrency = new CryptoCurrency({
                rank: data.rank || '0',
                name: data.name,
                symbol: data.symbol,
                icon: data.icon || '',
                price: data.price,
                marketCap: data.marketCap || '0',
                volume: data.volume || '0',
                cryptoVolume: data.cryptoVolume || '',
                supply: data.supply || '0',
                change: data.change || '0%',
                graph: data.graph || '',
                slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-')
            });
            
            await newCurrency.save();
            console.log(`Added: ${newCurrency.name} (${newCurrency.symbol})`);
        }
    }
}

/**
 * Scrape a single page of data
 */
async function scrapePage(page, pageNumber) {
    const url = pageNumber === 1 ? SCRAPE_SOURCE : `${SCRAPE_SOURCE}?page=${pageNumber}`;
    
    console.log(`\nScraping page ${pageNumber}: ${url}`);
    const navigationSuccess = await BrowserAutomation.navigateWithRetry(page, url);
    
    if (!navigationSuccess) {
        throw new Error(`Failed to navigate to page ${pageNumber}`);
    }
    
    // Wait for table and scroll to load data
    await page.waitForSelector('table', { timeout: 10000 });
    const content = await BrowserAutomation.scrollPage(page);
    
    // Parse content
    const $ = cheerio.load(content);
    const extractor = new DataExtractor($);
    
    // Find and validate table
    const table = $('table').first();
    if (!table.length) {
        throw new Error('No table found on the page');
    }
    
    // Parse headers (only needed on first page, but we'll do it each time for safety)
    const columnMap = extractor.parseTableHeaders(table);
    if (!columnMap.name || columnMap.price === undefined) {
        throw new Error('Essential columns (name, price) not found');
    }
    
    // Process rows
    const rows = $(table).find('tbody tr');
    console.log(`Page ${pageNumber}: Found ${rows.length} rows to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        try {
            const data = extractor.extractRowData(rows[i], columnMap);
            
            // Validate essential data
            if (!data.name || !data.symbol || !data.price) {
                console.log(`Page ${pageNumber}, Row ${i + 1}: missing essential data`);
                errorCount++;
                continue;
            }
            
            await DatabaseOperations.updateOrCreateCurrency(data);
            successCount++;
        } catch (error) {
            console.error(`Page ${pageNumber}, Row ${i + 1} error:`, error.message);
            errorCount++;
        }
    }
    
    return { successCount, errorCount, rowCount: rows.length };
}

/**
 * Main scraping function with pagination
 */
async function scrape() {
    // Check if already scraping
    if (isScrapingInProgress) {
        console.log('Scraping already in progress, aborting new request');
        return;
    }
    
    // Set the lock
    isScrapingInProgress = true;
    const startTime = Date.now();
    
    console.log('Starting data scrape at', new Date().toISOString());
    console.log(`Will scrape up to ${PAGINATION_CONFIG.MAX_PAGES} pages`);
    
    let browser;
    let totalSuccess = 0;
    let totalErrors = 0;
    
    try {
        // Launch browser
        browser = await BrowserAutomation.launchBrowser();
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Scrape multiple pages
        for (let pageNum = 1; pageNum <= PAGINATION_CONFIG.MAX_PAGES; pageNum++) {
            try {
                const results = await scrapePage(page, pageNum);
                totalSuccess += results.successCount;
                totalErrors += results.errorCount;
                
                console.log(`Page ${pageNum} complete: ${results.successCount} success, ${results.errorCount} errors`);
                
                // Stop if we got fewer rows than expected (likely last page)
                if (results.rowCount < PAGINATION_CONFIG.ITEMS_PER_PAGE) {
                    console.log(`Page ${pageNum} had only ${results.rowCount} items, stopping pagination`);
                    break;
                }
                
                // Add delay between pages (except after last page)
                if (pageNum < PAGINATION_CONFIG.MAX_PAGES) {
                    console.log(`Waiting ${PAGINATION_CONFIG.DELAY_BETWEEN_PAGES}ms before next page...`);
                    await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.DELAY_BETWEEN_PAGES));
                }
                
            } catch (pageError) {
                console.error(`Error scraping page ${pageNum}:`, pageError.message);
                // Continue with next page even if one fails
            }
        }
        
        console.log(`\nTotal scraping completed. Success: ${totalSuccess}, Errors: ${totalErrors}`);
        
    } catch (error) {
        console.error('Fatal scraping error:', error);
    } finally {
        // Always release the lock
        isScrapingInProgress = false;
        
        if (browser) {
            await browser.close();
        }
        
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Scraping session ended. Total time: ${elapsedTime} seconds`);
    }
}

// Export for testing
module.exports = { scrape, DataExtractor };

// Run initial scrape if called directly
if (require.main === module) {
    scrape().catch(console.error);
}