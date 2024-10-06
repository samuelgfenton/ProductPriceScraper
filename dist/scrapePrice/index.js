"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePrice = scrapePrice;
const colesScraper_1 = require("./colesScraper");
const woolworthsScraper_1 = require("./woolworthsScraper");
const bigWScraper_1 = require("./bigWScraper"); // Import Big W scraper
// Define retailer ID constants
const WOOLWORTHS_ID = "cQMPvKBQApSlqUcb0mOx";
const COLES_ID = "1uTbwkjBC2danzaMYa1c";
const BIGW_ID = "Ey8mtHqi2ddZ2ZYzLzk8"; // Add Big W ID
// Function to scrape the price from the retailer's URL
async function scrapePrice(retailerId, url) {
    if (!url) {
        throw new Error("Invalid URL provided for scraping.");
    }
    switch (retailerId) {
        case WOOLWORTHS_ID:
            return await (0, woolworthsScraper_1.scrapeWoolworthsPrice)(url);
        case COLES_ID:
            return await (0, colesScraper_1.scrapeColesPrice)(url);
        case BIGW_ID:
            return await (0, bigWScraper_1.scrapeBigWPrice)(url);
        default:
            throw new Error(`No scraper defined for retailer: ${retailerId}`);
    }
}
