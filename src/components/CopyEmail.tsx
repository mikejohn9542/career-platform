"use client";

import { useState } from "react";

export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <button type="button" className={className} onClick={copy} data-copied={copied}>
      <span aria-hidden="true">{copied ? "Copied" : "Copy email"}</span>
      <span className="visually-hidden">Copy email address {email}</span>
      <span role="status" className="visually-hidden">
        {copied ? "Email address copied" : ""}
      </span>
    </button>
  );
}
