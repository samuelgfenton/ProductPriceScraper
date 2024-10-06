import * as admin from "firebase-admin";

// Replace with your service account key file path or credentials object
const serviceAccount = require("./ServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export default db;
