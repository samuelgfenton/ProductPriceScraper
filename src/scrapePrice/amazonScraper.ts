import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use stealth plugin to avoid detection.
puppeteer.use(StealthPlugin());

export async function scrapeAmazonPrice(url: string): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided.");
  }

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser in action
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Navigate to the page and wait for the content to load
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const { dollarText, fractionText, fullPrice } = await page.evaluate(() => {
      const subscriptionElement = document.querySelector("#subscriptionPrice");

      if (!subscriptionElement) {
        throw new Error("Subscription price element not found.");
      }

      const priceElement = document.querySelector(
        "#sns-base-price .a-price.a-text-normal"
      );

      if (!priceElement) {
        throw new Error("Price element inside subscription not found.");
      }

      const dollarElement = priceElement.querySelector(".a-price-whole");
      const fractionElement = priceElement.querySelector(".a-price-fraction");

      const dollarText =
        dollarElement?.textContent?.replace(".", "").trim() || "0";
      const fractionText = fractionElement?.textContent?.trim() || "00";

      // Combine dollar and fraction values into a float number
      const fullPrice = parseFloat(`${dollarText}.${fractionText}`);

      // Return the values to be logged in Node.js
      return { dollarText, fractionText, fullPrice };
    });

    // Now log the values in Node.js
    console.log("Dollar element:", dollarText);
    console.log("Fraction element:", fractionText);
    console.log(`Extracted Price: $${fullPrice}`);

    return fullPrice;
  } catch (error) {
    console.error("Error scraping price:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
