import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export async function scrapeAmazonPrice(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  // Launch a non-headless browser with stealth mode enabled
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Navigate to the page and wait for the content to load
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Selectors for dollars and cents components of the price
    const priceDollarsSelector = ".a-price-whole";
    const priceCentsSelector = ".a-price-fraction";

    // Wait for the price elements to be present in the DOM
    await page.waitForSelector(priceDollarsSelector, { timeout: 5000 });

    // Extract the dollars value
    const priceDollarsElement = await page.$(priceDollarsSelector);
    if (!priceDollarsElement) {
      throw new Error(`Price dollars element not found on the page for Amazon`);
    }
    const priceDollarsText = await priceDollarsElement.evaluate(
      (el) => el.textContent
    );
    const dollars = parseInt(priceDollarsText?.replace(/[^0-9]/g, "") || "0");

    // Default cents to 0 in case the element is not found
    let cents = 0;

    // Check if the cents element exists before trying to extract its value
    const priceCentsElement = await page.$(priceCentsSelector);
    if (priceCentsElement) {
      const priceCentsText = await priceCentsElement.evaluate(
        (el) => el.textContent
      );
      cents = parseInt(priceCentsText?.replace(/[^0-9]/g, "") || "0");
    } else {
      console.log(
        `Price cents element not found on the page for Amazon. Assuming cents as 0.`
      );
    }

    // Combine dollars and cents into a single price
    const price = dollars + cents / 100;

    await browser.close();
    return price;
  } catch (error) {
    await browser.close();
    console.error(`Error scraping price from URL: ${url} for Amazon`, error);
    throw error;
  }
}
