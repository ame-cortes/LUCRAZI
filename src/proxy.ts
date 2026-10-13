import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.hostname.toLowerCase() !== "ebook.lucrazi.com.br"
    || request.nextUrl.pathname !== "/"
    || (request.method !== "GET" && request.method !== "HEAD")
  ) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/ebook";
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/",
};
