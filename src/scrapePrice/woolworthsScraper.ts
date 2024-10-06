import puppeteer from "puppeteer";

export async function scrapeWoolworthsPrice(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  // Launch a non-headless browser (visible browser window)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract price using separate elements for dollars and cents
    const priceDollarsSelector = ".price-dollars";
    const priceCentsSelector = ".price-cents";

    // Wait for the price element to be present in the DOM
    await page.waitForSelector(priceDollarsSelector, { timeout: 1000 });
    await page.waitForSelector(priceCentsSelector, { timeout: 1000 });

    // Extract the dollars value
    const priceDollarsElement = await page.$(priceDollarsSelector);
    if (!priceDollarsElement) {
      throw new Error(
        `Price dollars element not found on the page for Woolworths.`
      );
    }
    const priceDollarsText = await priceDollarsElement.evaluate(
      (el) => el.textContent
    );
    const dollars = parseInt(priceDollarsText?.replace(/[^0-9]/g, "") || "0");

    // Extract the cents value
    let cents = 0;
    const priceCentsElement = await page.$(priceCentsSelector);
    if (priceCentsElement) {
      const priceCentsText = await priceCentsElement.evaluate(
        (el) => el.textContent
      );
      cents = parseInt(priceCentsText?.replace(/[^0-9]/g, "") || "0");
    }

    // Combine dollars and cents into a single price
    const price = dollars + cents / 100;

    await browser.close();
    return price;
  } catch (error) {
    await browser.close();
    console.error(
      `Error scraping price from URL: ${url} for Woolworths`,
      error
    );
    throw error;
  }
}
