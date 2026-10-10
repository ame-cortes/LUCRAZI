export function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
  const publisherId = clientId?.match(/^ca-pub-(\d+)$/)?.[1];

  if (!publisherId) {
    return new Response("Configure um ID de publicador AdSense válido.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
