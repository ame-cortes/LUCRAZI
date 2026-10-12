import { NextResponse } from "next/server";
import { verifyNewsletterAdmin } from "@/lib/firebase-admin";
import { siteUrl } from "@/lib/site-config";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const admin = await verifyNewsletterAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const key = process.env.INDEXNOW_API_KEY;
  if (!key || !/^[a-z0-9]{8,128}$/i.test(key)) {
    return NextResponse.json({ error: "Configure uma chave IndexNow válida no servidor." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da solicitação precisa ser JSON válido." }, { status: 400 });
  }

  if (
    !isRecord(body)
    || !Array.isArray(body.slugs)
    || body.slugs.length === 0
    || body.slugs.length > 9_998
    || !body.slugs.every((slug) =>
      typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    )
  ) {
    return NextResponse.json({ error: "A lista de artigos para IndexNow é inválida." }, { status: 400 });
  }

  const slugs = [...new Set(body.slugs)];
  const urlList = [
    new URL("/", siteUrl).toString(),
    new URL("/artigos", siteUrl).toString(),
    ...slugs.map((slug) => new URL(`/artigos/${slug}`, siteUrl).toString()),
  ];

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: siteUrl.host,
        key,
        keyLocation: new URL("/indexnow-key.txt", siteUrl).toString(),
        urlList,
      }),
    });

    if (!response.ok) {
      console.error("O IndexNow recusou o envio das URLs.", { status: response.status });
      return NextResponse.json({
        error: `O IndexNow recusou o envio (HTTP ${response.status}).`,
      }, { status: 502 });
    }

    return NextResponse.json({ submitted: true, urlCount: urlList.length });
  } catch (error) {
    console.error("Não foi possível enviar as URLs ao IndexNow.", error);
    return NextResponse.json({ error: "Não foi possível conectar ao IndexNow." }, { status: 502 });
  }
}
