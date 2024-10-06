"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeColesPrice = scrapeColesPrice;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeColesPrice(url) {
    if (!url) {
        throw new Error("Invalid URL provided for scraping.");
    }
    // Launch a non-headless browser with stealth mode enabled
    const browser = await puppeteer_extra_1.default.launch({
        headless: false, // Set to false to run in non-headless mode
        defaultViewport: null,
    });
    const page = await browser.newPage();
    try {
        // Set custom user agent to mimic a real browser
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36");
        // Optional: Set additional headers if necessary
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
        });
        // Navigate to the URL
        await page.goto(url, { waitUntil: "networkidle2" });
        // Wait for the price element to appear (adjust selector if needed)
        const priceSelector = ".price__value";
        await page.waitForSelector(priceSelector, { timeout: 1000 });
        // Extract the price
        const priceElement = await page.$(priceSelector);
        if (!priceElement) {
            throw new Error(`Price element not found on the page for Coles.`);
        }
        const priceText = await priceElement.evaluate((el) => el.textContent);
        const price = parseFloat((priceText === null || priceText === void 0 ? void 0 : priceText.replace(/[^0-9.-]+/g, "")) || "0");
        return price;
    }
    catch (error) {
        console.error(`Error scraping price from URL: ${url} for Coles`, error);
        throw error;
    }
    finally {
        await browser.close(); // Ensure browser is closed in case of error
    }
}
