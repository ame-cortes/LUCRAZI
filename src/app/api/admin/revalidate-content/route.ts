import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyNewsletterAdmin } from "@/lib/firebase-admin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const admin = await verifyNewsletterAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
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
    || body.slugs.length > 100
    || !body.slugs.every((slug) =>
      typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
    )
  ) {
    return NextResponse.json({ error: "A lista de artigos para atualização é inválida." }, { status: 400 });
  }

  const slugs = [...new Set(body.slugs)];
  revalidatePath("/");
  revalidatePath("/artigos");
  for (const slug of slugs) {
    revalidatePath(`/artigos/${slug}`);
  }

  return NextResponse.json({ revalidated: true, pathCount: slugs.length + 2 });
}
