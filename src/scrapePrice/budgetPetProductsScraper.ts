import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function scrapeBudgetPetProducts(url: string): Promise<number> {
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

    // let visiblePrice = null;
    // // Get the price from the correct div
    // visiblePrice = await page.evaluate(() => {
    //   const activePromoDiv = document.querySelector(
    //     ".promo-price-list-product.active"
    //   );

    //   if (activePromoDiv) {
    //     let priceElement = activePromoDiv.querySelector(
    //       ".repeat-delivery__price"
    //     );

    //     if (priceElement) {
    //       if (priceElement.textContent) {
    //         const priceText = priceElement.textContent?.trim() || ""; // Handle null textContent
    //         return parseFloat(priceText.replace("$", "").replace(",", "")); // Clean up the price text and convert to number
    //       }
    //     } else {
    //       priceElement = activePromoDiv.querySelector(
    //         ".member-price-block__price"
    //       );
    //       if (priceElement) {
    //         if (priceElement.textContent) {
    //           const priceText = priceElement.textContent?.trim() || ""; // Handle null textContent
    //           return parseFloat(priceText.replace("$", "").replace(",", "")); // Clean up the price text and convert to number
    //         }
    //       }
    //     }
    //   }

    //   return null;
    // });

    const price = await page.$$eval(
      "div.price_box_container span",
      (elements) => {
        for (let element of elements) {
          const text = element.textContent!.trim();
          if (/^\$\d+(\.\d{2})?$/.test(text)) {
            // Check if the text is a valid price
            return text; // Return the price if found
          }
        }
        return null; // Return null if no price is found
      }
    );

    console.log(`Budget pet products price is ${price}`);

    return parseFloat(price!.replace("$", "").replace(",", ""));
    // return price!;
  } catch (error) {
    console.error(
      `Error scraping price from URL: ${url} for BudgetPetProducts`,
      error
    );
    throw error;
  } finally {
    await browser.close(); // Ensure browser is closed in case of error
  }
}
