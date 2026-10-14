import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isReadRequest = request.method === "GET" || request.method === "HEAD";
  if (!isReadRequest) {
    return NextResponse.next();
  }

  if (hostname === "ebook.lucrazi.com.br" && request.nextUrl.pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/ebook";
    return NextResponse.rewrite(destination);
  }

  if (hostname === "qr.lucrazi.com.br") {
    if (request.nextUrl.pathname === "/") {
      const destination = request.nextUrl.clone();
      destination.pathname = "/gerador-qr";
      return NextResponse.rewrite(destination);
    }
    if (request.nextUrl.pathname === "/gerador-qr") {
      const destination = request.nextUrl.clone();
      destination.pathname = "/";
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/gerador-qr"],
};
