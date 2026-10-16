export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.lucrazi.com.br",
);

export const qrCodeUrl = new URL(
  process.env.NEXT_PUBLIC_QR_CODE_URL || "/gerador-qr",
  siteUrl,
);

export const hasDedicatedQrCodeHost =
  qrCodeUrl.hostname.toLowerCase() !== siteUrl.hostname.toLowerCase();

export function isQrCodeHost(host: string | null): boolean {
  return hasDedicatedQrCodeHost
    && host?.toLowerCase().replace(/:\d+$/, "") === qrCodeUrl.hostname.toLowerCase();
}
