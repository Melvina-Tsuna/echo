"use client";

import { useState } from "react";

/**
 * Bouton de lecture audio accessible.
 * - Si `audioUrl` est fourni (note vocale humaine enregistrée, ex. en langue locale),
 *   on la joue directement : c'est toujours préférable à la synthèse vocale.
 * - Sinon, on utilise la synthèse vocale du navigateur (Web Speech API) pour lire `text`.
 */
export default function AudioButton({
  text,
  audioUrl,
  label = "Écouter",
}: {
  text: string;
  audioUrl?: string | null;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);

  function playAudioFile(url: string) {
    const audio = new Audio(url);
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  }

  function speak(t: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  function handleClick() {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    if (audioUrl) {
      playAudioFile(audioUrl);
    } else {
      speak(text);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={playing}
      className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-600 bg-surface px-4 py-2 text-brand-700 font-bold hover:bg-brand-50 focus-visible:outline-brand-700"
    >
      <span aria-hidden="true">{playing ? "⏸" : "🔊"}</span>
      {playing ? "Arrêter" : label}
    </button>
  );
}
