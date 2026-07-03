"use client";

import { ReactNode } from "react";

// Tap-to-select chip used across the batch flow and settings.
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "border active:scale-[0.98]",
        selected
          ? "border-moss-500 bg-moss-600/25 text-moss-400"
          : "border-ink-500 bg-ink-700 text-zinc-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
