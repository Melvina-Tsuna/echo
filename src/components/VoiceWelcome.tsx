"use client";

import { useEffect, useState } from "react";

const WELCOME_TEXT =
  "Bienvenue sur Écho, le lien entre les écoles et les familles.";

/**
 * Accueil vocal joué à l'ouverture du site, via la synthèse vocale locale du
 * navigateur (Web Speech API). Cette synthèse tourne sur le moteur de l'OS et
 * ne dépend donc pas du réseau une fois la page chargée — sauf certaines voix
 * "réseau" (ex. voix Google de Chrome), qu'on évite volontairement ici.
 * En cas d'absence de support ou d'échec, on affiche le message à la place.
 */
export default function VoiceWelcome() {
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setFallbackText(WELCOME_TEXT);
      return;
    }

    let cancelled = false;

    function pickLocalFrenchVoice(): SpeechSynthesisVoice | null {
      const voices = window.speechSynthesis.getVoices();
      const local = voices.filter((v) => v.localService);
      return (
        local.find((v) => v.lang.startsWith("fr")) ??
        local[0] ??
        null
      );
    }

    function speak() {
      if (cancelled) return;
      try {
        const voice = pickLocalFrenchVoice();
        if (!voice) {
          // Pas de voix locale disponible (ex. voix uniquement réseau,
          // coupées par la connexion) : on retombe sur le texte.
          setFallbackText(WELCOME_TEXT);
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(WELCOME_TEXT);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.95;
        utterance.onerror = () => setFallbackText(WELCOME_TEXT);
        window.speechSynthesis.speak(utterance);
      } catch {
        setFallbackText(WELCOME_TEXT);
      }
    }

    const existingVoices = window.speechSynthesis.getVoices();
    if (existingVoices.length > 0) {
      speak();
    } else {
      // La liste des voix charge de façon asynchrone sur certains navigateurs.
      window.speechSynthesis.addEventListener("voiceschanged", speak, {
        once: true,
      });
    }

    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", speak);
    };
  }, []);

  if (!fallbackText) return null;

  return (
    <p role="status" aria-live="polite" className="voice-welcome-fallback">
      {fallbackText}
    </p>
  );
}
