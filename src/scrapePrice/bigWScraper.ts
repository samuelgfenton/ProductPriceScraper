import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export async function scrapeBigWPrice(url: string): Promise<number> {
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
    // Navigate to the URL
    await page.goto(url, { waitUntil: "networkidle2" });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Select the element with class 'Price variant-huge' and inside it the span with 'data-testid="price-value"'
    const priceElement = await page.$(
      'span.Price.variant-huge span[data-testid="price-value"]'
    );

    // Extract the dollars part
    const dollars = await page.evaluate((el) => el!.textContent, priceElement);

    // Check if there is a span with class "extras" (for cents, if present within the same container)
    const extrasElement = await page.$("span.Price.variant-huge span.extras");
    let cents = "00"; // Default if cents part is missing
    if (extrasElement) {
      cents =
        (await page.evaluate((el) => el.textContent, extrasElement)) ?? "00";
    }

    // Combine dollars and cents to get the full price as a float
    let fullPrice: number | null = parseFloat(`${dollars}.${cents}`);
    console.log(`Price as float: ${fullPrice}`);

    if (fullPrice == 0) {
      fullPrice = null;
    }

    return fullPrice!;
  } catch (error) {
    await browser.close();
    console.error(`Error scraping price from URL: ${url} for Big W`, error);
    throw error;
  }
}
