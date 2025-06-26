import admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import fs from "fs";

let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

try {
  if (admin.apps.length > 0) {
    const app = admin.app();
    adminAuth = app.auth();
    adminDb = app.firestore();
  } else {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8")
      );
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminAuth = app.auth();
      adminDb = app.firestore();
    } else {
      console.warn(
        "FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase Admin SDK not initialized. Server-side features will not work."
      );
    }
  }
} catch (error) {
  if (error instanceof Error) {
    console.error("Firebase Admin SDK initialization error:", error.stack);
  } else {
    console.error(
      "An unknown error occurred during Firebase Admin SDK initialization:",
      error
    );
  }
}

export { adminAuth, adminDb };
