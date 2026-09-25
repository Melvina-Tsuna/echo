"use client";

import { useEffect, useState } from "react";

const LARGE_TEXT_KEY = "echo-a11y-large-text";
const HIGH_CONTRAST_KEY = "echo-a11y-high-contrast";

function readStored(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * Réglages d'accessibilité (texte agrandi, contraste élevé), disponibles sur
 * TOUTES les pages via un bouton flottant persistant, plutôt qu'enfermés
 * dans le fil : la préférence est mémorisée (localStorage) et appliquée à
 * tout le site en ajoutant des classes sur <html>, lues par globals.css.
 */
export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    setLargeText(readStored(LARGE_TEXT_KEY));
    setHighContrast(readStored(HIGH_CONTRAST_KEY));
  }, []);

  // Ces effets appliquent uniquement la classe CSS : ils n'écrivent jamais
  // dans le localStorage, pour ne pas écraser la préférence stockée avec la
  // valeur par défaut au montage (le mode strict de React en dev monte les
  // effets deux fois, ce qui provoquait exactement ce bug).
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-large-text", largeText);
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle("a11y-high-contrast", highContrast);
  }, [highContrast]);

  function toggleLargeText() {
    setLargeText((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(LARGE_TEXT_KEY, next ? "1" : "0");
      } catch {
        // stockage indisponible (navigation privée…) : le réglage reste actif pour la session
      }
      return next;
    });
  }

  function toggleHighContrast() {
    setHighContrast((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(HIGH_CONTRAST_KEY, next ? "1" : "0");
      } catch {
        // stockage indisponible (navigation privée…) : le réglage reste actif pour la session
      }
      return next;
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-brand-600 bg-surface p-3 shadow-lg">
          <button
            type="button"
            onClick={toggleLargeText}
            aria-pressed={largeText}
            className="border-2 border-border rounded-lg px-3 py-2 font-semibold text-ink bg-surface whitespace-nowrap"
          >
            {largeText ? "A− Taille normale" : "A+ Agrandir le texte"}
          </button>
          <button
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            className="border-2 border-border rounded-lg px-3 py-2 font-semibold text-ink bg-surface whitespace-nowrap"
          >
            {highContrast ? "Contraste normal" : "Contraste élevé"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Réglages d'accessibilité (taille du texte, contraste)"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-brand-ink font-bold text-xl shadow-lg border-2 border-brand-700"
      >
        Aa
      </button>
    </div>
  );
}
