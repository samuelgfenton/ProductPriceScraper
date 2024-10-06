"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeBigWPrice = scrapeBigWPrice;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
// Use the stealth plugin to avoid detection
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeBigWPrice(url) {
    if (!url) {
        throw new Error("Invalid URL provided for scraping.");
    }
    // Launch a non-headless browser with stealth mode enabled
    const browser = await puppeteer_extra_1.default.launch({
        headless: false,
        defaultViewport: null,
    });
    const page = await browser.newPage();
    try {
        // Navigate to the page and wait for the content to load
        await page.goto(url, { waitUntil: "domcontentloaded" });
        // Selectors for dollars and cents components of the price
        const priceDollarsSelector = "span.dollars[data-testid='price-value']";
        const priceCentsSelector = "sup.sup[data-testid='price-sup']";
        // Wait for the price elements to be present in the DOM
        await page.waitForSelector(priceDollarsSelector, { timeout: 5000 });
        // Extract the dollars value
        const priceDollarsElement = await page.$(priceDollarsSelector);
        if (!priceDollarsElement) {
            throw new Error(`Price dollars element not found on the page for Big W.`);
        }
        const priceDollarsText = await priceDollarsElement.evaluate((el) => el.textContent);
        const dollars = parseInt((priceDollarsText === null || priceDollarsText === void 0 ? void 0 : priceDollarsText.replace(/[^0-9]/g, "")) || "0");
        // Default cents to 0 in case the element is not found
        let cents = 0;
        // Check if the cents element exists before trying to extract its value
        const priceCentsElement = await page.$(priceCentsSelector);
        if (priceCentsElement) {
            const priceCentsText = await priceCentsElement.evaluate((el) => el.textContent);
            cents = parseInt((priceCentsText === null || priceCentsText === void 0 ? void 0 : priceCentsText.replace(/[^0-9]/g, "")) || "0");
        }
        else {
            console.log(`Price cents element not found on the page for Big W. Assuming cents as 0.`);
        }
        // Combine dollars and cents into a single price
        const price = dollars + cents / 100;
        await browser.close();
        return price;
    }
    catch (error) {
        await browser.close();
        console.error(`Error scraping price from URL: ${url} for Big W`, error);
        throw error;
    }
}
