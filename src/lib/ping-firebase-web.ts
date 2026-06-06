import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let appSingleton: FirebaseApp | null = null;

export function getPingFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (appSingleton) return appSingleton;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn(
      "[ping-firebase-web] NEXT_PUBLIC_FIREBASE_* 미설정 — 부고 저장 불가",
    );
    return null;
  }
  try {
    appSingleton = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return appSingleton;
  } catch (e) {
    console.error("[ping-firebase-web] initializeApp 실패", e);
    return null;
  }
}

export function getPingFirestore(): Firestore | null {
  const app = getPingFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}

export function getPingFirebaseStorage(): FirebaseStorage | null {
  const app = getPingFirebaseApp();
  if (!app) return null;
  return getStorage(app);
}
