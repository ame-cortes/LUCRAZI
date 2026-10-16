import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isQrCodeHost, qrCodeUrl, siteUrl } from "@/lib/site-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const sitemapBaseUrl = isQrCodeHost((await headers()).get("host"))
    ? qrCodeUrl.origin
    : siteUrl;

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", sitemapBaseUrl).toString(),
  };
}
