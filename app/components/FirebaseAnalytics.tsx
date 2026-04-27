"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics } from "../../lib/firebase";

export default function FirebaseAnalytics() {
  useEffect(() => {
    initFirebaseAnalytics().catch((err) => {
      console.warn("Firebase analytics init failed:", err);
    });
  }, []);

  return null;
}
