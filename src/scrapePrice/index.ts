import { scrapeColesPrice } from "./colesScraper";
import { scrapeWoolworthsPrice } from "./woolworthsScraper";
import { scrapeBigWPrice } from "./bigWScraper"; // Import Big W scraper
import { scrapeOfficeworksPrice } from "./officeworksScraper";

// Define retailer ID constants
const WOOLWORTHS_ID = "cQMPvKBQApSlqUcb0mOx";
const COLES_ID = "1uTbwkjBC2danzaMYa1c";
const BIGW_ID = "Ey8mtHqi2ddZ2ZYzLzk8";
const OFFICEWORKS_ID = "dSpScB3klFvWaH3C4eB9";

// Function to scrape the price from the retailer's URL
export async function scrapePrice(
  retailerId: string,
  url: string
): Promise<number> {
  if (!url) {
    throw new Error("Invalid URL provided for scraping.");
  }

  switch (retailerId) {
    case WOOLWORTHS_ID:
      return await scrapeWoolworthsPrice(url);
    case COLES_ID:
      return await scrapeColesPrice(url);
    case BIGW_ID:
      return await scrapeBigWPrice(url);
    case OFFICEWORKS_ID:
      return await scrapeOfficeworksPrice(url);
    default:
      throw new Error(`No scraper defined for retailer: ${retailerId}`);
  }
}
