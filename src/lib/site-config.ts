export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.lucrazi.com.br",
);

export const qrCodeUrl = new URL(
  "/ferramentas/gerador-qrcode-gratuito",
  siteUrl,
);

export const ebookUrl = new URL("/ferramentas/ebook-gratuito", siteUrl);
