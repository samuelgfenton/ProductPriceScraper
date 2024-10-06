"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const firebaseConfig_1 = __importDefault(require("./firebaseConfig"));
const productItem_1 = require("./productItem");
const productRetailer_1 = require("./productRetailer");
// Map to store the ProductRetailer objects
const productRetailersMap = new Map();
// Function to load the ProductRetailers collection into memory
async function loadProductRetailers() {
    console.log("Loading Product Retailers...");
    const snapshot = await firebaseConfig_1.default.collection("ProductRetailers").get();
    snapshot.forEach((doc) => {
        const data = doc.data();
        const productRetailer = new productRetailer_1.ProductRetailer(data);
        productRetailersMap.set(productRetailer.domain, productRetailer);
        console.log(`Loaded retailer: ${productRetailer.name}`);
    });
    console.log(`Total retailers loaded: ${productRetailersMap.size}`);
}
// Function to fetch and process ProductItems collection once
async function fetchAndProcessProductItems() {
    console.log("Fetching Product Items...");
    try {
        // Get the snapshot of the ProductItems collection
        const snapshot = await firebaseConfig_1.default.collection("ProductItems").get();
        if (snapshot.empty) {
            console.log("No product items found.");
            return;
        }
        // Process each ProductItem document
        for (const doc of snapshot.docs) {
            const data = doc.data();
            console.log(`Processing product item: ${data.name}`);
            // Create a ProductItem object with the DocumentSnapshot
            const productItem = new productItem_1.ProductItem(data, doc);
            // Async iterate through each retailer linked to the item
            await productItem.processRetailers();
        }
        console.log("Finished processing all product items.");
    }
    catch (error) {
        console.error("Error fetching product items:", error);
    }
}
// Function to show a system dialog before scraping starts
async function showScrapingWarning(mainWindow) {
    return new Promise((resolve) => {
        const buttons = ["Cancel", "Proceed"];
        const timeout = setTimeout(() => {
            // Auto-dismiss after 10 seconds (simulate a "Proceed" action)
            resolve(true);
        }, 10000); // 10 seconds timeout
        const options = {
            type: "warning", // Ensure it's a valid literal type
            buttons: buttons,
            title: "Warning",
            message: "Scraping is about to begin. Do you want to proceed?",
            detail: "The scraping process may take some time. Click Cancel to stop it.",
        };
        electron_1.dialog.showMessageBox(mainWindow, options).then((response) => {
            clearTimeout(timeout); // Clear the timeout if the user responds
            if (response.response === 0) {
                // User clicked "Cancel"
                resolve(false);
            }
            else {
                // User clicked "Proceed"
                resolve(true);
            }
        });
    });
}
async function main() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    // Show the warning dialog before scraping
    const proceedWithScraping = await showScrapingWarning(mainWindow);
    if (!proceedWithScraping) {
        console.log("Scraping operation cancelled by the user.");
        return;
    }
    try {
        // Load the ProductRetailers collection
        await loadProductRetailers();
        // Fetch and process the ProductItems collection
        await fetchAndProcessProductItems();
    }
    catch (error) {
        console.error("Error in main process:", error);
    }
}
// Electron app initialization
electron_1.app.on("ready", () => {
    main().catch(console.error);
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
