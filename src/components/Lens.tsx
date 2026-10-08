"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "./Lens.module.css";

export type LensValue = "both" | "business" | "technical";

const LensContext = createContext<{ lens: LensValue; setLens: (value: LensValue) => void } | null>(null);

const OPTIONS: { value: LensValue; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "business", label: "Business" },
  { value: "technical", label: "Technical" },
];

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<LensValue>("both");
  return (
    <LensContext.Provider value={{ lens, setLens }}>
      <div data-lens={lens} className={styles.root}>
        {children}
      </div>
    </LensContext.Provider>
  );
}

export function LensSwitch() {
  const context = useContext(LensContext);
  if (!context) return null;
  const { lens, setLens } = context;
  const index = OPTIONS.findIndex((option) => option.value === lens);

  return (
    <div className={styles.switch} role="radiogroup" aria-label="Highlight experience for a role">
      <span className={styles.thumb} style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={lens === option.value}
          className={styles.option}
          data-active={lens === option.value}
          onClick={() => setLens(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
