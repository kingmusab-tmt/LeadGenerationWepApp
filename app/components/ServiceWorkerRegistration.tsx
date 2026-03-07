"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker once on the client.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    const register = async () => {
      try {
        const existingRegistration =
          await navigator.serviceWorker.getRegistration("/");

        if (existingRegistration) {
          return;
        }

        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
