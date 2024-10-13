import {
  DocumentSnapshot,
  Timestamp,
  CollectionReference,
} from "@google-cloud/firestore";
import moment from "moment-timezone";
import db from "./firebaseConfig"; // Assuming firebaseConfig is where your Firestore instance is set up
import { scrapePrice } from "./scrapePrice";

interface ProductItemRetailerLink {
  retailerId: string;
  urlParameters?: string;
  latestPrice?: number;
  retailerWouldSell: boolean;
  lastScraped?: Date;
  errorOnLastScrap: boolean;
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
  errorOnLastScrap: boolean;

  constructor(data: any) {
    this.retailerId = data.retailerId;
    this.urlParameters = data.urlParameters;
    this.latestPrice = data.latestPrice;
    this.retailerWouldSell = data.retailerWouldSell;
    this.errorOnLastScrap =
      data.errorOnLastScrap == undefined ? false : data.errorOnLastScrap;

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
      errorOnLastScrap: this.errorOnLastScrap,
    };
  }
}

export class ProductItem {
  name: string;
  image: string;
  retailers: ProductItemRetailerLink[];
  private snapshot?: DocumentSnapshot; // Store the Firestore DocumentSnapshot
  needToSave: boolean = false;

  constructor(data: any, snapshot?: DocumentSnapshot) {
    this.name = data.name || "";
    this.image = data.image || "";
    this.retailers = (data.retailers || []).map(
      (retailer: any) => new RetailerImpl(retailer)
    );
    this.snapshot = snapshot; // Store the document snapshot if provided
  }

  // Method to iterate through retailers and call a method to get the price
  async scrapePriceForRetailerPacks(): Promise<void> {
    this.needToSave = false; // Flag to check if any prices were scraped

    // Iterate through all retailers and update prices and lastScraped in memory
    for (const retailerLink of this.retailers) {
      // console.log(
      //   `Processing retailer: ${retailer.retailerId} for pack ${retailer.packId}`
      // );

      const priceScraped = await this.getPriceForRetailer(retailerLink);

      console.log(`priceScraped: ${priceScraped}`);
    }

    // After processing all retailers, only save if at least one price was scraped
    if (this.needToSave) {
      // After saving the product item, update the history document
      await this.updateHistory();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.saveToFirestore();
    } else {
      // console.log(
      //   "No prices scraped, skipping Firestore save and history update."
      // );
    }
  }

  // Method to get the price for a specific retailer using Puppeteer
  async getPriceForRetailer(
    retailerLink: ProductItemRetailerLink
  ): Promise<boolean> {
    if (!retailerLink.urlParameters) {
      console.log(
        `No URL parameters provided for retailer: ${retailerLink.retailerId} with pack id ${retailerLink.packId}`
      );
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Get today's date without time

    // console.log(`Retailer last scraped at ${retailer.lastScraped}`);

    if (retailerLink.lastScraped) {
      // Create a date object for lastScraped without time
      const lastScrapedDate = new Date(
        retailerLink.lastScraped.getFullYear(),
        retailerLink.lastScraped.getMonth(),
        retailerLink.lastScraped.getDate()
      );

      // If the last scraped date is today, skip scraping
      if (lastScrapedDate.getTime() === today.getTime()) {
        // console.log(
        //   `Skipping retailer ${retailer.retailerId} for pack  ${retailer.packId} as it was already scraped today.`
        // );
        return false;
      }
    }

    retailerLink.lastScraped = new Date(); // Set the current timestamp as last scraped

    try {
      console.log(
        `Fetching price for retailer: ${retailerLink.retailerId} with pack ${retailerLink.packId}`
      );
      // Pass the retailerId and URL to the scrapePrice function
      const price = await scrapePrice(
        retailerLink.retailerId,
        retailerLink.urlParameters
      );
      console.log(`Got price ${price}`);
      retailerLink.latestPrice = price;

      console.log(
        `Price for ${retailerLink.retailerId} with pack ${retailerLink.packId}: ${price}. Last scraped: ${retailerLink.lastScraped}`
      );

      retailerLink.errorOnLastScrap = price === null;
      console.log(
        `retailerLink.errorOnLastScrap: ${retailerLink.errorOnLastScrap}`
      );

      this.needToSave = true;
      return true; // Return true if a price was scraped
    } catch (error) {
      console.error(
        `Failed to fetch price for retailer: ${retailerLink.retailerId}`,
        error
      );
      retailerLink.errorOnLastScrap = true;
      this.needToSave = true;
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

    // Set the time zone for Australia (Sydney)
    const currentDate = moment.tz("Australia/Sydney").format("YYYY-MM-DD");
    const yearId = this.getYearId(new Date()); // Get current quarter ID

    console.log(`currentDate: ${currentDate}`);

    // Create history data structure
    const historyData: { [date: string]: { [retailerId: string]: number } } =
      {};
    this.retailers.forEach((retailer) => {
      if (
        retailer.latestPrice !== undefined &&
        retailer.errorOnLastScrap === false
      ) {
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
        .doc(yearId);

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
          `History updated successfully for product item ${this.name} in quarter ${yearId}.`
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
  getYearId(date: Date): string {
    const year = date.getFullYear();

    return `${year}`;
  }
}
