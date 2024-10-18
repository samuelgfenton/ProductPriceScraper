import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export async function scrapeAmazonPrice(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  // Launch the browser in non-headless mode to avoid detection
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract the price correctly by focusing on the span with the desired class
    const visiblePrice = await page.evaluate(() => {
      const priceElement = Array.from(document.querySelectorAll("span")).find(
        (span) =>
          span.classList.contains("dollars") &&
          span.closest(".Price.variant-huge")
      );

      if (!priceElement) {
        throw new Error("Price element not found");
      }

      const dollars = priceElement.textContent?.trim() || "0";
      const centsElement = priceElement.nextElementSibling;
      const cents = centsElement?.textContent?.trim() || "00";

      return parseFloat(`${dollars}.${cents}`);
    });

    return visiblePrice;
  } catch (error) {
    console.error(`Error scraping price from URL: ${url}`, error);
    throw error;
  } finally {
    await browser.close();
  }
}
