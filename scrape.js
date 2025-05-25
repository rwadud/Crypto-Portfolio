const cheerio = require('cheerio');
// const request = require('request'); // Not used for main scraping logic
// const cron = require('node-cron'); // Cron job can be re-enabled later if needed
const db = require('./util/Database');
const puppeteer = require('puppeteer');
const CryptoCurrency = require('./models/CryptoCurrency');
const SCRAPE_SOURCE = 'https://coinmarketcap.com/';

/**
 * Scraping service cron job - can be re-enabled later
 **/
// cron.schedule('*/5 * * * *', () => {
//     scrape();
// });
// scrape(); // For testing: run once on start

/**
 * Scrape data using puppeteer and cheerio
 **/
async function scrape() {
    console.log('start scraping data');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'] // Added common args for stability
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'); // Set User-Agent
        await page.setViewport({ width: 1920, height: 1080 }); // Set viewport

        console.log(`Navigating to ${SCRAPE_SOURCE}`);
        await page.goto(SCRAPE_SOURCE, { waitUntil: 'networkidle2', timeout: 60000 }); // Wait until network is idle

        console.log('Page loaded, getting content...');
        let content = await loadPage(page);

        if (!content) {
            console.log('Failed to load page content.');
            await browser.close();
            return;
        }
        
        console.log('Page content retrieved, loading into Cheerio...');
        const $ = cheerio.load(content);

        console.log('Parsing document...');
        const rows = $('tbody tr[style="cursor:pointer"]');
        console.log(`Found ${rows.length} rows to process.`);

        for (let i = 0; i < rows.length; i++) {
            const elem = rows[i];
            try {
                const rankElement = $(elem).find('td:nth-child(2) p');
                let rank = rankElement.length ? rankElement.text() : 'N/A';

                const nameLinkElement = $(elem).find('td:nth-child(3) a.cmc-link');
                let name = nameLinkElement.length ? nameLinkElement.find('p.coin-item-name').text() : 'N/A';
                let icon = nameLinkElement.length ? nameLinkElement.find('img.coin-logo').attr('src') : '';
                let href = nameLinkElement.length ? nameLinkElement.attr('href') : '';
                let slug = href ? href.split('/')[2] : '';

                const priceElement = $(elem).find('td:nth-child(4) div span');
                let priceText = priceElement.length ? priceElement.text() : '0';
                let price = priceText.replace(/[^0-9.]/g, '');


                const change24hElement = $(elem).find('td:nth-child(6) span.sc-1e8091e1-0');
                let change24hText = change24hElement.length ? change24hElement.text() : '0%';
                let change = change24hText.replace(/[^0-9.-]/g, ''); // Keep minus sign

                // Market Cap: td:nth-child(8) p.sc-71024e3e-0 span.sc-11478e5d-1
                // Fallback: td:nth-child(8) p.sc-71024e3e-0
                let marketCapElement = $(elem).find('td:nth-child(8) p.sc-71024e3e-0 span.sc-11478e5d-1');
                if (!marketCapElement.length) {
                    marketCapElement = $(elem).find('td:nth-child(8) p.sc-71024e3e-0');
                }
                let marketCapText = marketCapElement.length ? marketCapElement.text() : '0';
                let marketCap = marketCapText.replace(/[^0-9.]/g, '');

                // Volume (24h): td:nth-child(9) a.cmc-link p.font_weight_500
                const volumeElement = $(elem).find('td:nth-child(9) a.cmc-link p.font_weight_500');
                let volumeText = volumeElement.length ? volumeElement.text() : '0';
                let volume = volumeText.replace(/[^0-9.]/g, '');

                // Circulating Supply: td:nth-child(10) div.circulating-supply-cell div.circulating-supply-value span
                const supplyElement = $(elem).find('td:nth-child(10) div.circulating-supply-cell div.circulating-supply-value span');
                let supply = supplyElement.length ? supplyElement.text().trim() : 'N/A';

                // Graph URL (7d): td:nth-child(11) img.sc-db1da501-0
                const graphElement = $(elem).find('td:nth-child(11) img.sc-db1da501-0');
                let graph = graphElement.length ? graphElement.attr('src') : '';
                
                // Basic validation
                if (name === 'N/A' || slug === '' || price === '') {
                    console.log(`Skipping row due to missing essential data: Name/Slug/Price for row ${i+1}`);
                    continue;
                }

                console.log(`Processing: Rank ${rank}, Name ${name}, Price $${price}`);

                let currency = await CryptoCurrency.findOne({ slug: slug });
                if (currency) {
                    // console.log(`Updating ${name}`);
                    currency.rank = parseInt(rank) || 0;
                    currency.price = parseFloat(price) || 0;
                    currency.icon = icon || currency.icon; // Don't overwrite icon if new one not found
                    currency.marketCap = parseFloat(marketCap) || 0;
                    currency.volume = parseFloat(volume) || 0;
                    currency.supply = supply;
                    currency.change = change; // Store as string, can be parsed later if needed
                    currency.graph = graph || currency.graph; // Don't overwrite graph if new one not found
                    await currency.save();
                } else {
                    // console.log(`Adding new currency ${name}`);
                    const newCurrency = new CryptoCurrency({
                        rank: parseInt(rank) || 0,
                        name,
                        icon,
                        price: parseFloat(price) || 0,
                        marketCap: parseFloat(marketCap) || 0,
                        volume: parseFloat(volume) || 0,
                        supply,
                        change,
                        graph,
                        slug
                    });
                    await newCurrency.save();
                }
            } catch (rowError) {
                console.error(`Error processing row ${i + 1}:`, rowError);
            }
        }
        console.log('Data scraping and processing finished.');

    } catch (error) {
        console.error('An error occurred in the main scrape function:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

async function loadPage(page) {
    console.log('Waiting for table selector...');
    try {
        // Wait for a more general table structure, increases robustness if specific class changes
        await page.waitForSelector('div[class*="cmc-body-content"] table tbody tr', { timeout: 60000 });
        console.log('Table selector found.');
    } catch (e) {
        console.warn('Warning: Table rows selector not found in loadPage after timeout. Proceeding with existing content, which might be incomplete.');
    }

    console.log('Scrolling page to load dynamic content...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 250; // Increased scroll distance
            let scrollAttempts = 0;
            const maxScrollAttempts = 60; // Increased attempts

            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrollAttempts++;

                if (totalHeight >= scrollHeight || scrollAttempts >= maxScrollAttempts) {
                    clearInterval(timer);
                    resolve();
                }
            }, 300); // Slower scroll interval
        });
    });
    console.log('Scrolling finished.');

    // Attempt to get the HTML of the main data table or a significant parent
    // This selector targets a common wrapper for CoinMarketCap's main content area
    console.log('Extracting HTML content...');
    const mainContentTableHTML = await page.evaluate(() => {
        const tableNode = document.querySelector('div[class*="cmc-body-content"] table.cmc-table');
        return tableNode ? tableNode.outerHTML : document.body.innerHTML;
    });
    
    return mainContentTableHTML;
}

// If running directly for testing:
if (require.main === module) {
    scrape().then(() => console.log('Scrape function called directly finished.')).catch(e => console.error('Error in direct scrape call:', e));
}

module.exports = { scrape }; // Export if needed by other modules, though cron is commented out.