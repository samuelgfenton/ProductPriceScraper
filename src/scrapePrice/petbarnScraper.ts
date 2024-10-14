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

    await new Promise((resolve) => setTimeout(resolve, 100));

    let visiblePrice = null;
    // Get the price from the correct div
    visiblePrice = await page.evaluate(() => {
      const activePromoDiv = document.querySelector(
        ".promo-price-list-product.active"
      );

      if (activePromoDiv) {
        let priceElement = activePromoDiv.querySelector(
          ".repeat-delivery__price"
        );

        if (priceElement) {
          if (priceElement.textContent) {
            const priceText = priceElement.textContent?.trim() || ""; // Handle null textContent
            return parseFloat(priceText.replace("$", "").replace(",", "")); // Clean up the price text and convert to number
          }
        } else {
          priceElement = activePromoDiv.querySelector(
            ".member-price-block__price"
          );
          if (priceElement) {
            if (priceElement.textContent) {
              const priceText = priceElement.textContent?.trim() || ""; // Handle null textContent
              return parseFloat(priceText.replace("$", "").replace(",", "")); // Clean up the price text and convert to number
            }
          }
        }
      }

      return null;
    });

    return visiblePrice!;
  } catch (error) {
    console.error(`Error scraping price from URL: ${url} for Petbarn`, error);
    throw error;
  } finally {
    await browser.close(); // Ensure browser is closed in case of error
  }
}
