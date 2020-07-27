const cheerio = require('cheerio');
const request = require('request');
const cron = require('node-cron');
const db = require('./util/Database');
const puppeteer = require('puppeteer');
const CryptoCurrency = require('./models/CryptoCurrency');
const SCRAPE_SOURCE = 'https://coinmarketcap.com/';

/**
 * Scraping service cron job
 **/
cron.schedule('*/5 * * * *', () => {
    scrape();
});

/**
 * Scrape data using puppeteer and cheerio
 **/
async function scrape() {
	console.log('start scraping data');

    const browser = await puppeteer.launch({
        /**
         * Use the default headless mode.
         */
        headless: true,
        args: ['--no-sandbox']
    });

	try{
		const page = await browser.newPage();

		/**
		* Visit page
		*/
		await page.goto(SCRAPE_SOURCE);

		/**
		 * Get page content as HTML.
		 */
		let content = await loadPage(page);

		/**
		 * Load content in cheerio.
		 */
		const $ = cheerio.load(content);

	
		/**
		* Parse document
		**/
		$('.cmc-table-listing .cmc-table-row').each( async function (i, elem) {
			let rank = $(elem).find('.cmc-table__cell--sort-by__rank').find('div').text();
			let href = $(elem).find('.cmc-table__cell--sort-by__name').find('a');
			let icon = $(elem).find('.cmc-table__cell--sort-by__name').find('img').attr('src');
			let name = href.attr('title');
			let slug = href.attr('href').split('/')[2];
			let price = $(elem).find('.cmc-table__cell--sort-by__price').find('a').text().replace(/[^0-9.]/g,'');
			let marketCap = $(elem).find('.cmc-table__cell--sort-by__market-cap').find('div').text().replace(/[^0-9.]/g,'');
			let volume = $(elem).find('.cmc-table__cell--sort-by__volume-24-h').find('a').text().replace(/[^0-9.]/g,'');
			let supply = $(elem).find('.cmc-table__cell--sort-by__circulating-supply').find('div').text();
			let change = $(elem).find('.cmc-table__cell--sort-by__percent-change-24-h').find('div').text();
			let graph = $(elem).find('.cmc-table__column-graph').find('img').attr('src');

			let currency = await CryptoCurrency.findOne({name:name});
			if(currency){
				//console.log(`updating ${currency.name}`);
				currency.rank = rank;
				currency.price = price;
				currency.marketCap = marketCap;
				currency.volume = volume;
				currency.supply = supply;
				currency.change = change;
				currency.save();
			} else {
				const newCurrency = new CryptoCurrency({
					rank,
					name,
					icon,
					price,
					marketCap,
					volume,
					supply,
					change,
					graph,
					slug
				});
				newCurrency.save();
				//console.log(`adding new currency ${newCurrency.name}`);
			}
		});
		console.log('data scraped');

		await browser.close();
	} catch (error) {
		console.log(error);
		await browser.close();
	} finally {
		await browser.close();
	}
}

async function loadPage(page){
    return page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
        return document.querySelector('body').innerHTML;
    });
}