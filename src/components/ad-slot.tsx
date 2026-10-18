"use client";

import { useEffect, useRef, useState } from "react";

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
  const adRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const [isFilled, setIsFilled] = useState(false);

  useEffect(() => {
    if (!clientId || !slotId || !adRef.current) return;

    const ad = adRef.current;
    const updateStatus = () => setIsFilled(ad.dataset.adStatus === "filled");
    const observer = new MutationObserver(updateStatus);
    observer.observe(ad, { attributes: true, attributeFilter: ["data-ad-status"] });
    updateStatus();

    if (!pushed.current) {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    }

    return () => observer.disconnect();
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <aside
      className={`ad-slot ${className} ${isFilled ? "ad-slot-filled" : "ad-slot-pending"}`}
      aria-label={isFilled ? "Publicidade" : undefined}
    >
      {isFilled && <span className="ad-label">PUBLICIDADE</span>}
      <ins
        ref={adRef}
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
