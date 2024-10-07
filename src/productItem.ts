import {
  DocumentSnapshot,
  Timestamp,
  CollectionReference,
} from "@google-cloud/firestore";
import db from "./firebaseConfig"; // Assuming firebaseConfig is where your Firestore instance is set up
import { scrapePrice } from "./scrapePrice";

interface ProductItemRetailerLink {
  retailerId: string;
  urlParameters?: string;
  latestPrice?: number;
  retailerWouldSell: boolean;
  lastScraped?: Date;
  packId: number;

  // Method to convert retailer data to a Firestore-compatible format
  toFirestore(): object;
  getComboString(): string;
}

class RetailerImpl implements ProductItemRetailerLink {
  retailerId: string;
  urlParameters?: string;
  latestPrice?: number;
  retailerWouldSell: boolean;
  lastScraped?: Date;
  packId: number;

  constructor(data: any) {
    this.retailerId = data.retailerId;
    this.urlParameters = data.urlParameters;
    this.latestPrice = data.latestPrice;
    this.retailerWouldSell = data.retailerWouldSell;

    // Convert lastScraped from Firestore Timestamp to Date if necessary
    if (data.lastScraped instanceof Timestamp) {
      this.lastScraped = data.lastScraped.toDate(); // Convert Firestore Timestamp to Date
    } else {
      this.lastScraped = data.lastScraped
        ? new Date(data.lastScraped)
        : undefined; // Handle already-converted date or undefined
    }

    this.packId = data.packId || 1;
  }

  getComboString(): string {
    const packDivider: string = "__PK__";
    return `${this.retailerId}${packDivider}${this.packId}`;
  }

  // Convert the retailer data to a Firestore-compatible object
  toFirestore(): object {
    return {
      retailerId: this.retailerId,
      urlParameters: this.urlParameters,
      latestPrice: this.latestPrice,
      retailerWouldSell: this.retailerWouldSell,
      lastScraped: this.lastScraped
        ? Timestamp.fromDate(this.lastScraped)
        : null, // Save lastScraped as Firestore Timestamp
      packId: this.packId,
    };
  }
}

export class ProductItem {
  name: string;
  image: string;
  retailers: ProductItemRetailerLink[];
  private snapshot?: DocumentSnapshot; // Store the Firestore DocumentSnapshot

  constructor(data: any, snapshot?: DocumentSnapshot) {
    this.name = data.name || "";
    this.image = data.image || "";
    this.retailers = (data.retailers || []).map(
      (retailer: any) => new RetailerImpl(retailer)
    );
    this.snapshot = snapshot; // Store the document snapshot if provided
  }

  // Method to iterate through retailers and call a method to get the price
  async processRetailers(): Promise<void> {
    let scraped = false; // Flag to check if any prices were scraped

    // Iterate through all retailers and update prices and lastScraped in memory
    for (const retailer of this.retailers) {
      console.log(
        `Processing retailer: ${retailer.retailerId} for pack ${retailer.packId}`
      );

      const priceScraped = await this.getPriceForRetailer(retailer);

      // If a price was scraped, set the flag to true
      if (priceScraped) {
        scraped = true;
      }
    }

    // After processing all retailers, only save if at least one price was scraped
    if (scraped) {
      await this.saveToFirestore();

      // After saving the product item, update the history document
      await this.updateHistory();
    } else {
      console.log(
        "No prices scraped, skipping Firestore save and history update."
      );
    }
  }

  // Method to get the price for a specific retailer using Puppeteer
  async getPriceForRetailer(
    retailer: ProductItemRetailerLink
  ): Promise<boolean> {
    if (!retailer.urlParameters) {
      console.log(
        `No URL parameters provided for retailer: ${retailer.retailerId} with pack id ${retailer.packId}`
      );
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Get today's date without time

    console.log(`Retailer last scraped at ${retailer.lastScraped}`);

    if (retailer.lastScraped) {
      // Create a date object for lastScraped without time
      const lastScrapedDate = new Date(
        retailer.lastScraped.getFullYear(),
        retailer.lastScraped.getMonth(),
        retailer.lastScraped.getDate()
      );

      // If the last scraped date is today, skip scraping
      if (lastScrapedDate.getTime() === today.getTime()) {
        console.log(
          `Skipping retailer ${retailer.retailerId} for pack  ${retailer.packId} as it was already scraped today.`
        );
        return false;
      }
    }

    try {
      console.log(
        `Fetching price for retailer: ${retailer.retailerId} with pack ${retailer.packId}`
      );
      // Pass the retailerId and URL to the scrapePrice function
      const price = await scrapePrice(
        retailer.retailerId,
        retailer.urlParameters
      );
      retailer.latestPrice = price;
      retailer.lastScraped = new Date(); // Set the current timestamp as last scraped

      console.log(
        `Price for ${retailer.retailerId} with pack ${retailer.packId}: ${price}. Last scraped: ${retailer.lastScraped}`
      );
      return true; // Return true if a price was scraped
    } catch (error) {
      console.error(
        `Failed to fetch price for retailer: ${retailer.retailerId}`,
        error
      );
      return false; // Return false if there was an error
    }
  }

  // Method to save the updated ProductItem back to Firestore
  async saveToFirestore(): Promise<void> {
    if (!this.snapshot) {
      console.error("Cannot save product item without a DocumentSnapshot.");
      return;
    }

    const productData = {
      name: this.name,
      image: this.image,
      retailers: this.retailers.map((retailer) => retailer.toFirestore()),
    };

    try {
      await db
        .collection("ProductItems")
        .doc(this.snapshot.id)
        .set(productData, { merge: true }); // Use merge to update only the fields provided
      console.log(`Product item ${this.name} saved successfully to Firestore.`);
    } catch (error) {
      console.error(
        `Failed to save product item ${this.name} to Firestore:`,
        error
      );
    }
  }

  // Method to update the history document after scraping all prices
  async updateHistory(): Promise<void> {
    if (!this.snapshot) {
      console.error("Cannot update history without a DocumentSnapshot.");
      return;
    }

    const currentDate = new Date().toISOString().split("T")[0]; // Get current date in 'YYYY-MM-DD' format
    const quarterId = this.getQuarterId(new Date()); // Get current quarter ID

    // Create history data structure
    const historyData: { [date: string]: { [retailerId: string]: number } } =
      {};
    this.retailers.forEach((retailer) => {
      if (retailer.latestPrice !== undefined) {
        historyData[currentDate] = historyData[currentDate] || {};
        historyData[currentDate][retailer.getComboString()] =
          retailer.latestPrice;
      }
    });

    if (historyData[currentDate] !== undefined) {
      // Get reference to the history document
      const historyDocRef = db
        .collection("ProductItems")
        .doc(this.snapshot.id)
        .collection("History")
        .doc(quarterId);

      try {
        // Use transaction to ensure atomic updates to history document
        await db.runTransaction(async (transaction) => {
          const historyDoc = await transaction.get(historyDocRef);

          if (historyDoc.exists) {
            // Update existing history document
            const existingHistory = historyDoc.data() || {};
            existingHistory[currentDate] = historyData[currentDate];
            transaction.set(historyDocRef, existingHistory, { merge: true });
          } else {
            // Create new history document
            transaction.set(historyDocRef, historyData);
          }
        });

        console.log(
          `History updated successfully for product item ${this.name} in quarter ${quarterId}.`
        );
      } catch (error) {
        console.error(
          `Failed to update history for product item ${this.name}:`,
          error
        );
      }
    }
  }

  // Method to get the current financial quarter ID
  getQuarterId(date: Date): string {
    const year = date.getFullYear();
    let quarter: number;

    // Australian financial year starts from July (Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun)
    if (date.getMonth() >= 6 && date.getMonth() <= 8) {
      quarter = 1; // Jul-Sep
    } else if (date.getMonth() >= 9 && date.getMonth() <= 11) {
      quarter = 2; // Oct-Dec
    } else if (date.getMonth() >= 0 && date.getMonth() <= 2) {
      quarter = 3; // Jan-Mar (next year)
    } else {
      quarter = 4; // Apr-Jun (next year)
    }

    // If the date is in Q3 or Q4, increment the financial year
    const financialYear = quarter === 3 || quarter === 4 ? year + 1 : year;

    return `Q${quarter}${financialYear}`;
  }
}
