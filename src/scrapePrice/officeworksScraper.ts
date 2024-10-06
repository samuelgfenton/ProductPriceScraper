import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export async function scrapeOfficeworksPrice(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  // Launch a non-headless browser with stealth mode enabled
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Set user agent to simulate a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  try {
    // Navigate to the page and wait for the content to load
    await page.goto(
      "https://www.officeworks.com.au/shop/officeworks/search?q=hello&view=grid&page=1&sortBy=bestmatch",
      {
        waitUntil: "domcontentloaded",
      }
    );

    // Navigate to the page and wait for the content to load
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Scroll to the bottom of the page to trigger lazy loading
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));

    // // Replace the waitForTimeout method with a manual delay using new Promise
    // await new Promise((resolve) => setTimeout(resolve, 2000)); // Allow time for content to load

    // Debugging: Take a screenshot of the page after loading
    await page.screenshot({ path: "loaded-page.png", fullPage: true });

    // Debugging: Output HTML snapshot of the page to a file
    const html = await page.content();
    const fs = require("fs");
    fs.writeFileSync("page-snapshot.html", html);

    // Wait for the product price container to be present
    await page.waitForSelector("span[data-ref='product-price-isNotRR']", {
      timeout: 10000,
    });

    // Extract the price
    const priceElement = await page.$("span[data-ref='product-price-isNotRR']");
    if (!priceElement) {
      throw new Error("Price element not found");
    }

    // Extract the inner span that contains the price text
    const priceText = await priceElement.evaluate((el) => el.textContent);
    const price = parseFloat(priceText?.replace(/[^0-9.]/g, "") || "0");

    console.log(`Scraped price: ${price}`);
    await browser.close();
    return price;
  } catch (error) {
    await browser.close();
    console.error(
      `Error scraping price from URL: ${url} for Officeworks`,
      error
    );
    throw error;
  }
}
