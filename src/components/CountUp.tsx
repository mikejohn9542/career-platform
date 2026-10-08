"use client";

import { useEffect, useState } from "react";

/**
 * Counts a figure up into a fixed-width slot. The final value is rendered on the
 * server, so the number is correct without JavaScript and for screen readers.
 */
export function CountUp({ value, prefix = "", suffix = "", delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const final = `${prefix}${value.toLocaleString("en-US")}${suffix}`;
  const [display, setDisplay] = useState(final);

  useEffect(() => {
    if (value < 10 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 1400;
    let frame = 0;
    let start: number | null = null;
    const timer = window.setTimeout(() => {
      const step = (now: number) => {
        start ??= now;
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(2, -10 * t);
        setDisplay(`${prefix}${Math.round(value * (t === 1 ? 1 : eased)).toLocaleString("en-US")}${suffix}`);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      setDisplay(`${prefix}0${suffix}`);
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, prefix, suffix, delay]);

  return (
    <span style={{ display: "inline-block", minWidth: `${final.length}ch`, fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">{display}</span>
      <span className="visually-hidden">{final}</span>
    </span>
  );
}
