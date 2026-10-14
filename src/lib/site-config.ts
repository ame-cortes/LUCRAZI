export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.lucrazi.com.br",
);

export const qrCodeUrl = new URL(
  process.env.NEXT_PUBLIC_QR_CODE_URL || "/gerador-qr",
  siteUrl,
);
