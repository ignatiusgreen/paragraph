"use client";
import { useEffect, useState } from "react";

export function Flash({ message }: { message: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { document.cookie = "flash=; Max-Age=0; path=/"; }, []);
  if (!open) return null;
  return (
    <div className="notice warn" role="alert" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" className="linklike" onClick={() => setOpen(false)}>Dismiss</button>
    </div>
  );
}
