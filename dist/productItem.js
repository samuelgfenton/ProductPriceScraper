"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductItem = void 0;
const firestore_1 = require("@google-cloud/firestore");
const firebaseConfig_1 = __importDefault(require("./firebaseConfig")); // Assuming firebaseConfig is where your Firestore instance is set up
const scrapePrice_1 = require("./scrapePrice");
// Extend the Retailer interface to add the toFirestore method
// Extend the Retailer interface to add the toFirestore method
class RetailerImpl {
    constructor(data) {
        this.retailerId = data.retailerId;
        this.urlParameters = data.urlParameters;
        this.latestPrice = data.latestPrice;
        this.retailerWouldSell = data.retailerWouldSell;
        // Convert lastScraped from Firestore Timestamp to Date if necessary
        if (data.lastScraped instanceof firestore_1.Timestamp) {
            this.lastScraped = data.lastScraped.toDate(); // Convert Firestore Timestamp to Date
        }
        else {
            this.lastScraped = data.lastScraped
                ? new Date(data.lastScraped)
                : undefined; // Handle already-converted date or undefined
        }
    }
    // Convert the retailer data to a Firestore-compatible object
    toFirestore() {
        return {
            retailerId: this.retailerId,
            urlParameters: this.urlParameters,
            latestPrice: this.latestPrice,
            retailerWouldSell: this.retailerWouldSell,
            lastScraped: this.lastScraped
                ? firestore_1.Timestamp.fromDate(this.lastScraped)
                : null, // Save lastScraped as Firestore Timestamp
        };
    }
}
class ProductItem {
    constructor(data, snapshot) {
        this.name = data.name || "";
        this.image = data.image || "";
        this.retailers = (data.retailers || []).map((retailer) => new RetailerImpl(retailer));
        this.snapshot = snapshot; // Store the document snapshot if provided
    }
    // Method to iterate through retailers and call a method to get the price
    async processRetailers() {
        // Iterate through all retailers and update prices and lastScraped in memory
        for (const retailer of this.retailers) {
            console.log(`Processing retailer: ${retailer.retailerId}`);
            await this.getPriceForRetailer(retailer);
        }
        // After processing all retailers, save the updated product item to Firestore
        await this.saveToFirestore();
        // After saving the product item, update the history document
        await this.updateHistory();
    }
    // Method to get the price for a specific retailer using Puppeteer
    async getPriceForRetailer(retailer) {
        if (!retailer.urlParameters) {
            console.log(`No URL parameters provided for retailer: ${retailer.retailerId}`);
            return;
        }
        // Check if the retailer's price was scraped in the last 12 hours
        const now = new Date();
        console.log(`Retailer last scraped at ${retailer.lastScraped}`);
        if (retailer.lastScraped) {
            const timeDifference = now.getTime() - retailer.lastScraped.getTime();
            const hoursDifference = timeDifference / (1000 * 60 * 60);
            if (hoursDifference < 12) {
                // console.log(`Skipping retailer ${retailer.retailerId} as it was scraped ${hoursDifference.toFixed(2)} hours ago.`);
                return;
            }
        }
        try {
            console.log(`Fetching price for retailer: ${retailer.retailerId}`);
            // Pass the retailerId and URL to the scrapePrice function
            const price = await (0, scrapePrice_1.scrapePrice)(retailer.retailerId, retailer.urlParameters);
            retailer.latestPrice = price;
            retailer.lastScraped = new Date(); // Set the current timestamp as last scraped
            console.log(`Price for ${retailer.retailerId}: ${price}. Last scraped: ${retailer.lastScraped}`);
        }
        catch (error) {
            console.error(`Failed to fetch price for retailer: ${retailer.retailerId}`, error);
        }
    }
    // Method to save the updated ProductItem back to Firestore
    async saveToFirestore() {
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
            await firebaseConfig_1.default
                .collection("ProductItems")
                .doc(this.snapshot.id)
                .set(productData, { merge: true }); // Use merge to update only the fields provided
            console.log(`Product item ${this.name} saved successfully to Firestore.`);
        }
        catch (error) {
            console.error(`Failed to save product item ${this.name} to Firestore:`, error);
        }
    }
    // Method to update the history document after scraping all prices
    async updateHistory() {
        if (!this.snapshot) {
            console.error("Cannot update history without a DocumentSnapshot.");
            return;
        }
        const currentDate = new Date().toISOString().split("T")[0]; // Get current date in 'YYYY-MM-DD' format
        const quarterId = this.getQuarterId(new Date()); // Get current quarter ID
        // Create history data structure
        const historyData = {};
        this.retailers.forEach((retailer) => {
            if (retailer.latestPrice !== undefined) {
                historyData[currentDate] = historyData[currentDate] || {};
                historyData[currentDate][retailer.retailerId] = retailer.latestPrice;
            }
        });
        if (historyData[currentDate] !== undefined) {
            // Get reference to the history document
            const historyDocRef = firebaseConfig_1.default
                .collection("ProductItems")
                .doc(this.snapshot.id)
                .collection("History")
                .doc(quarterId);
            try {
                // Use transaction to ensure atomic updates to history document
                await firebaseConfig_1.default.runTransaction(async (transaction) => {
                    const historyDoc = await transaction.get(historyDocRef);
                    if (historyDoc.exists) {
                        // Update existing history document
                        const existingHistory = historyDoc.data() || {};
                        existingHistory[currentDate] = historyData[currentDate];
                        transaction.set(historyDocRef, existingHistory, { merge: true });
                    }
                    else {
                        // Create new history document
                        transaction.set(historyDocRef, historyData);
                    }
                });
                console.log(`History updated successfully for product item ${this.name} in quarter ${quarterId}.`);
            }
            catch (error) {
                console.error(`Failed to update history for product item ${this.name}:`, error);
            }
        }
    }
    // Method to get the current financial quarter ID
    getQuarterId(date) {
        const year = date.getFullYear();
        let quarter;
        // Australian financial year starts from July (Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun)
        if (date.getMonth() >= 6 && date.getMonth() <= 8) {
            quarter = 1; // Jul-Sep
        }
        else if (date.getMonth() >= 9 && date.getMonth() <= 11) {
            quarter = 2; // Oct-Dec
        }
        else if (date.getMonth() >= 0 && date.getMonth() <= 2) {
            quarter = 3; // Jan-Mar (next year)
        }
        else {
            quarter = 4; // Apr-Jun (next year)
        }
        // If the date is in Q3 or Q4, increment the financial year
        const financialYear = quarter === 3 || quarter === 4 ? year + 1 : year;
        return `Q${quarter}${financialYear}`;
    }
}
exports.ProductItem = ProductItem;
