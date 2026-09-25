"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Bouton d'activation des notifications push pour un compte Famille.
 * N'apparaît que si le navigateur supporte les notifications + service
 * workers, et si la clé publique VAPID est configurée côté client.
 */
export default function PushOptIn({ parentId }: { parentId: string }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    );
  }, []);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, [supported]);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permission refusée.");
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
        ),
      });
      const json = sub.toJSON();
      const { error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          parent_id: parentId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        });
      if (insertError) throw insertError;
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'activation.");
    }
    setLoading(false);
  }

  if (!supported || subscribed) return null;

  return (
    <div className="rounded-xl border-2 border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink m-0">
        Reçois une notification dès qu&apos;un message important arrive.
      </p>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="border-2 border-brand-600 text-brand-700 font-bold rounded-lg px-4 py-2 whitespace-nowrap disabled:opacity-60"
      >
        {loading ? "Activation…" : "Activer les notifications"}
      </button>
      {error && <p className="text-danger text-sm w-full m-0">{error}</p>}
    </div>
  );
}
