"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

type AdSlotProps = {
  className?: string;
  slotId?: string;
};

export function AdSlot({ className = "", slotId: configuredSlotId }: AdSlotProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
  const slotId = configuredSlotId ?? process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID;
  const pushed = useRef(false);

  useEffect(() => {
    if (!clientId || !slotId || pushed.current) return;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
    pushed.current = true;
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidade">
      <span className="ad-label">PUBLICIDADE</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
