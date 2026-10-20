import { NextResponse, type NextRequest } from "next/server";
import { ebookUrl, qrCodeUrl, siteUrl } from "@/lib/site-config";

function permanentRedirect(request: NextRequest, destination: URL) {
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination, 301);
}

export function proxy(request: NextRequest) {
  const hostHeader = request.headers.get("host");
  const hostname = (hostHeader ?? request.nextUrl.hostname)
    .toLowerCase()
    .replace(/:\d+$/, "");
  const isReadRequest = request.method === "GET" || request.method === "HEAD";
  if (!isReadRequest) {
    return NextResponse.next();
  }

  const requestedPath = request.nextUrl.pathname;

  if (
    (hostname === "ebook.lucrazi.com.br" || hostname === "qr.lucrazi.com.br")
    && (requestedPath === "/sitemap.xml" || requestedPath === "/robots.txt")
  ) {
    return permanentRedirect(request, new URL(requestedPath, siteUrl));
  }

  if (hostname === "ebook.lucrazi.com.br") {
    if (requestedPath === "/" || requestedPath === "/ebook") {
      return permanentRedirect(request, ebookUrl);
    }
  }

  if (hostname === "qr.lucrazi.com.br") {
    if (requestedPath === "/" || requestedPath === "/gerador-qr") {
      return permanentRedirect(request, qrCodeUrl);
    }
    return permanentRedirect(request, new URL(requestedPath, siteUrl));
  }

  if (requestedPath === "/gerador-qr") {
    return permanentRedirect(request, qrCodeUrl);
  }

  if (requestedPath === "/ebook") {
    return permanentRedirect(request, ebookUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/ebook", "/gerador-qr", "/sitemap.xml", "/robots.txt"],
};
