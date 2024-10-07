import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function scrapePetbarn(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  // Launch a non-headless browser with stealth mode enabled
  const browser = await puppeteer.launch({
    headless: false, // Set to false to run in non-headless mode
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Set custom user agent to mimic a real browser
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36"
    );

    // Optional: Set additional headers if necessary
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Navigate to the URL
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the price element to appear (adjust selector if needed)
    const priceSelector = ".repeat-delivery__price";
    await page.waitForSelector(priceSelector, { timeout: 100000 });

    // Extract the price
    const priceElement = await page.$(priceSelector);
    if (!priceElement) {
      throw new Error(`Price element not found on the page for Coles.`);
    }
    const priceText = await priceElement.evaluate((el) => el.textContent);
    const price = parseFloat(priceText?.replace(/[^0-9.-]+/g, "") || "0");

    return price;
  } catch (error) {
    console.error(`Error scraping price from URL: ${url} for Coles`, error);
    throw error;
  } finally {
    await browser.close(); // Ensure browser is closed in case of error
  }
}
