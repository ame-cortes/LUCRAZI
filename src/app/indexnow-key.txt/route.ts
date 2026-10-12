import { connection } from "next/server";

export async function GET() {
  await connection();
  const key = process.env.INDEXNOW_API_KEY;
  if (!key || !/^[a-z0-9]{8,128}$/i.test(key)) {
    return new Response("A chave IndexNow não está configurada.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(key, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
