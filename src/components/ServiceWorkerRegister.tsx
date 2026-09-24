"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // silencieux : l'app fonctionne aussi sans SW, juste sans cache hors-ligne
      });
    }
  }, []);
  return null;
}
