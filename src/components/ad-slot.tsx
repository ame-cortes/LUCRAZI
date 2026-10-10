"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

type AdSlotProps = {
  className?: string;
};

export function AdSlot({ className = "" }: AdSlotProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID;
  const [scriptReady, setScriptReady] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (!scriptReady || pushed.current) return;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
    pushed.current = true;
  }, [scriptReady]);

  if (!clientId || !slotId) return null;

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidade">
      <span className="ad-label">PUBLICIDADE</span>
      <Script
        id="google-adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
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
