const cheerio = require('cheerio');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
require('./util/Database');
const CryptoCurrency = require('./models/CryptoCurrency');
const SCRAPE_SOURCE = 'https://coinmarketcap.com/';

/**
 * Scraping service cron job
 **/
cron.schedule('*/5 * * * *', () => {
    scrape().catch(console.error);
});

/**
 * Clean numeric data by removing currency symbols and commas
 */
function cleanNumericData(value) {
    if (!value) return '0';
    return value.replace(/[^0-9.-]/g, '') || '0';
}

/**
 * Parse table headers to dynamically identify column indices
 */
function parseTableHeaders($, table) {
    const headers = {};
    const headerCells = $(table).find('thead th, thead td');
    
    headerCells.each((index, cell) => {
        const rawText = $(cell).text().toLowerCase().trim();
        
        // Normalize header text
        const headerText = rawText
            .replace(/\(1h\)/g, '1h')
            .replace(/\(24h\)/g, '24h')
            .replace(/\(7d\)/g, '7d')
            .replace(/[^a-z0-9%#]/g, '') // Removes special characters, keeps letters, numbers, %, #
            .replace(/\s+/g, '');         // Removes spaces
        
        console.log(`Column ${index}: Raw="${rawText}" -> Normalized="${headerText}"`)
        
        // Map header text to column identifiers based on normalized headers:
        // #,name,price,1h%,24h%,7d%,marketcap,volume24h,circulatingsupply,last7days
        if (headerText === '#') {
            headers.rank = index;
        } else if (headerText === 'name') {
            headers.name = index;
        } else if (headerText === 'price') {
            headers.price = index;
        } else if (headerText === '1h%') {
            headers.change1h = index;
        } else if (headerText === '24h%') {
            headers.change24h = index;
        } else if (headerText === '7d%') {
            headers.change7d = index;
        } else if (headerText === 'marketcap') {
            headers.marketCap = index;
        } else if (headerText === 'volume24h') {
            headers.volume = index;
        } else if (headerText === 'circulatingsupply') {
            headers.supply = index;
        } else if (headerText === 'last7days') {
            headers.graph = index;
        }
    });
    
    console.log('Detected column mapping:', headers);
    console.log('Expected headers: #,name,price,1h%,24h%,7d%,marketcap,volume24h,circulatingsupply,last7days');
    
    // Log which expected headers were not found
    const expectedHeaders = {
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
    
    for (const [expected, field] of Object.entries(expectedHeaders)) {
        if (headers[field] === undefined) {
            console.log(`Warning: Expected header "${expected}" not found`);
        }
    }
    
    return headers;
}

/**
 * Extract data from a table row based on column indices
 */
function extractRowData($, row, columnMap) {
    const cells = $(row).find('td');
    const data = {
        rank: null,
        name: null,
        slug: null,
        icon: null,
        price: null,
        marketCap: null,
        volume: null,
        supply: null,
        change: null,
        graph: null
    };
    
    try {
        // Extract rank
        if (columnMap.rank !== undefined) {
            const rankCell = $(cells[columnMap.rank]);
            data.rank = rankCell.find('p, div, span').first().text().trim() || rankCell.text().trim();
        }
        
        // Extract name and related data
        if (columnMap.name !== undefined) {
            const nameCell = $(cells[columnMap.name]);
            const link = nameCell.find('a[href*="/currencies/"]').first();
            
            if (link.length) {
                const href = link.attr('href');
                data.name = link.find('p, span, div').first().text().trim() || link.text().trim();
                data.slug = href ? href.split('/').filter(p => p).pop() : null;
            }
            
            // Try to find icon
            const img = nameCell.find('img').first();
            if (img.length) {
                data.icon = img.attr('src');
            }
        }
        
        // Extract price
        if (columnMap.price !== undefined) {
            const priceCell = $(cells[columnMap.price]);
            const priceText = priceCell.find('a, span, div').first().text() || priceCell.text();
            data.price = cleanNumericData(priceText);
        }
        
        // Extract market cap
        if (columnMap.marketCap !== undefined) {
            const marketCapCell = $(cells[columnMap.marketCap]);
            const marketCapText = marketCapCell.find('span, p, div').first().text() || marketCapCell.text();
            data.marketCap = cleanNumericData(marketCapText);
        }
        
        // Extract volume
        if (columnMap.volume !== undefined) {
            const volumeCell = $(cells[columnMap.volume]);
            const volumeText = volumeCell.find('a, p, span, div').first().text() || volumeCell.text();
            data.volume = cleanNumericData(volumeText);
        }
        
        // Extract supply
        if (columnMap.supply !== undefined) {
            const supplyCell = $(cells[columnMap.supply]);
            const supplyText = supplyCell.find('p, span, div').first().text() || supplyCell.text();
            data.supply = supplyText.trim();
        }
        
        // Extract change (use 24h% as the primary change metric)
        if (columnMap.change24h !== undefined) {
            const changeCell = $(cells[columnMap.change24h]);
            const changeText = changeCell.find('span, p, div').first().text() || changeCell.text();
            data.change = changeText.trim();
        }
        
        // Extract graph
        if (columnMap.graph !== undefined) {
            const graphCell = $(cells[columnMap.graph]);
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
 * Scrape data using puppeteer and cheerio
 **/
async function scrape() {
    console.log('Starting data scrape at', new Date().toISOString());
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to', SCRAPE_SOURCE);
        await page.goto(SCRAPE_SOURCE, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for table to load
        await page.waitForSelector('table', { timeout: 10000 });
        
        // Scroll to load all data
        const content = await loadPage(page);
        
        // Load content in cheerio
        const $ = cheerio.load(content);
        
        // Find the main table
        const table = $('table').first();
        if (!table.length) {
            throw new Error('No table found on the page');
        }
        
        // Parse table headers to get column mapping
        const columnMap = parseTableHeaders($, table);
        
        // Validate that we found essential columns
        if (!columnMap.name || columnMap.price === undefined) {
            throw new Error('Essential columns (name, price) not found in table headers');
        }
        
        // Find all table rows
        const rows = $(table).find('tbody tr');
        console.log(`Found ${rows.length} rows to process`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            try {
                const data = extractRowData($, row, columnMap);
                
                // Validate essential data
                if (!data.name || !data.price) {
                    console.log(`Skipping row ${i + 1}: missing essential data`);
                    errorCount++;
                    continue;
                }
                
                // Update or create currency
                const currency = await CryptoCurrency.findOne({ name: data.name });
                
                if (currency) {
                    // Update existing currency
                    currency.rank = data.rank || currency.rank;
                    currency.price = data.price;
                    currency.marketCap = data.marketCap || currency.marketCap;
                    currency.volume = data.volume || currency.volume;
                    currency.supply = data.supply || currency.supply;
                    currency.change = data.change || currency.change;
                    currency.graph = data.graph || currency.graph;
                    
                    await currency.save();
                    console.log(`Updated: ${currency.name}`);
                } else {
                    // Create new currency
                    const newCurrency = new CryptoCurrency({
                        rank: data.rank || '0',
                        name: data.name,
                        icon: data.icon || '',
                        price: data.price,
                        marketCap: data.marketCap || '0',
                        volume: data.volume || '0',
                        supply: data.supply || '0',
                        change: data.change || '0%',
                        graph: data.graph || '',
                        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-')
                    });
                    
                    await newCurrency.save();
                    console.log(`Added: ${newCurrency.name}`);
                }
                
                successCount++;
            } catch (error) {
                console.error(`Error processing row ${i + 1}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`Scraping completed. Success: ${successCount}, Errors: ${errorCount}`);
        
    } catch (error) {
        console.error('Scraping error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Load page content with scrolling to ensure all data is loaded
 */
async function loadPage(page) {
    return page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const maxScroll = 10000; // Prevent infinite scrolling
            
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

// Export for testing
module.exports = { scrape };

// Run initial scrape if called directly
if (require.main === module) {
    scrape().catch(console.error);
}