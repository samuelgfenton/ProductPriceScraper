import db from "./firebaseConfig";
import { ProductItem } from "./productItem";
import { ProductRetailer } from "./productRetailer";

// Map to store the ProductRetailer objects
const productRetailersMap = new Map<string, ProductRetailer>();

// Function to load the ProductRetailers collection into memory
async function loadProductRetailers(): Promise<void> {
  console.log("Loading Product Retailers...");
  const snapshot = await db.collection("ProductRetailers").get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const productRetailer = new ProductRetailer(data);
    productRetailersMap.set(productRetailer.domain, productRetailer);
    console.log(`Loaded retailer: ${productRetailer.name}`);
  });

  console.log(`Total retailers loaded: ${productRetailersMap.size}`);
}

// Function to fetch and process ProductItems collection once
async function fetchAndProcessProductItems(): Promise<void> {
  console.log("Fetching Product Items...");

  try {
    // Get the snapshot of the ProductItems collection
    const snapshot = await db.collection("ProductItems").get();

    if (snapshot.empty) {
      console.log("No product items found.");
      return;
    }

    // Process each ProductItem document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // console.log(`Processing product item: ${data.name}`);

      // Create a ProductItem object with the DocumentSnapshot
      const productItem = new ProductItem(data, doc);

      // Async iterate through each retailer linked to the item
      await productItem.scrapePriceForRetailerPacks();
    }

    console.log("Finished processing all product items.");

    // Once finished, update the ScraperState to "Complete"
    await updateScraperState("Complete");
  } catch (error) {
    console.error("Error fetching product items:", error);
  }
}

// Function to update the ScraperState field in Firestore
async function updateScraperState(newState: string): Promise<void> {
  try {
    console.log(`Updating ScraperState to '${newState}'...`);

    // Reference to the 'Settings' document in 'ProductSettings' collection
    const settingsDocRef = db.collection("ProductSettings").doc("Settings");

    // Update the ScraperState field in Firestore
    await settingsDocRef.update({ ScraperState: newState });

    console.log(`ScraperState successfully updated to '${newState}'.`);
  } catch (error) {
    console.error("Error updating ScraperState:", error);
  }
}

// Function to monitor changes in the 'ScraperState' field in 'ProductSettings'
async function monitorScraperState(): Promise<void> {
  console.log("Monitoring scraper state...");

  const settingsDocRef = db.collection("ProductSettings").doc("Settings");

  // Exponential backoff variables
  let retryDelay = 1000; // Initial delay: 1 second
  const maxDelay = 60000; // Maximum delay: 1 minute

  // Function to start the listener
  const startListener = () => {
    console.log("Starting Firestore listener...");
    const unsubscribe = settingsDocRef.onSnapshot(
      (doc) => {
        // Reset retry delay on successful snapshot
        retryDelay = 1000;

        if (doc.exists) {
          const data = doc.data();
          const scraperState = data?.ScraperState;

          console.log(`Scraper state changed: ${scraperState}`);

          if (scraperState === "Pending") {
            // Immediately update the ScraperState to 'Scraping' asynchronously
            updateScraperState("Scraping").catch(console.error);

            console.log("Scraper state is 'Pending'. Starting the scraper...");
            fetchAndProcessProductItems().catch(console.error);
          }
        } else {
          console.error("Settings document does not exist.");
        }
      },
      (error) => {
        console.error("Error in Firestore listener:", error);

        // Retry with exponential backoff
        setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, maxDelay); // Double the delay each time, up to maxDelay
          console.log(
            `Retrying Firestore listener in ${retryDelay / 1000} seconds...`
          );
          startListener(); // Retry starting the listener
        }, retryDelay);
      }
    );

    return unsubscribe;
  };

  // Start the listener for the first time
  startListener();
}

async function main(): Promise<void> {
  try {
    // Load the ProductRetailers collection
    await loadProductRetailers();

    // Start monitoring the 'ScraperState' field for changes
    monitorScraperState();
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

// Start the main process
main().catch(console.error);
