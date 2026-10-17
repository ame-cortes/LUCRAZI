import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyNewsletterAdmin } from "@/lib/firebase-admin";
import {
  isBrevoConfigured,
  sendNewsletterCampaign,
  suppressBrevoSubscriber,
  syncBrevoSubscriber,
} from "@/lib/newsletter-email";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const admin = await verifyNewsletterAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: "Configure a integração Brevo antes de enviar campanhas." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da solicitação precisa ser JSON válido." }, { status: 400 });
  }
  if (
    !isRecord(body)
    || typeof body.campaignId !== "string"
    || !/^[0-9a-f-]{36}$/i.test(body.campaignId)
    || typeof body.subject !== "string"
    || typeof body.message !== "string"
    || (body.articleSlug !== undefined
      && (typeof body.articleSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.articleSlug)))
  ) {
    return NextResponse.json({ error: "Preencha o assunto e o conteúdo da campanha." }, { status: 400 });
  }
  const subject = body.subject.trim();
  const message = body.message.trim();
  if (subject.length < 3 || subject.length > 150 || message.length < 10 || message.length > 8000) {
    return NextResponse.json({
      error: "O assunto deve ter de 3 a 150 caracteres e a mensagem, de 10 a 8.000 caracteres.",
    }, { status: 400 });
  }

  const db = getFirebaseAdminDb();
  let article: {
    slug: string;
    title: string;
    description: string;
    imageSrc?: string;
    imageAlt?: string;
  } | undefined;
  if (typeof body.articleSlug === "string") {
    try {
      const articleSnapshot = await db.collection("articles").doc(body.articleSlug).get();
      const stored = articleSnapshot.data();
      const content = stored?.article;
      if (
        !articleSnapshot.exists
        || stored?.status !== "published"
        || !isRecord(content)
        || typeof content.title !== "string"
        || typeof content.description !== "string"
      ) {
        return NextResponse.json({ error: "O artigo selecionado não está publicado. Atualize a lista e tente novamente." }, { status: 409 });
      }
      const imageSrc = typeof content.imageSrc === "string"
        && (content.imageSrc.startsWith("/images/")
          || (URL.canParse(content.imageSrc) && new URL(content.imageSrc).protocol === "https:"))
        ? content.imageSrc
        : undefined;
      article = {
        slug: body.articleSlug,
        title: content.title,
        description: content.description,
        ...(imageSrc ? { imageSrc } : {}),
        ...(typeof content.imageAlt === "string" ? { imageAlt: content.imageAlt } : {}),
      };
    } catch (error) {
      console.error("Não foi possível validar o artigo da campanha.", error);
      return NextResponse.json({ error: "Não foi possível validar o artigo selecionado." }, { status: 500 });
    }
  }
  const campaign = db.collection("newsletterCampaigns").doc(body.campaignId);
  try {
    await campaign.create({
      subject,
      ...(article ? { articleSlug: article.slug } : {}),
      status: "preparing",
      recipientCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: admin.uid,
    });
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && (error.code === 6 || error.code === "already-exists")
    ) {
      return NextResponse.json({ error: "Esta solicitação de campanha já foi processada." }, { status: 409 });
    }
    console.error("Não foi possível registrar a campanha antes do envio.", error);
    return NextResponse.json({ error: "Não foi possível preparar a campanha." }, { status: 500 });
  }

  let providerCampaignId: number | undefined;
  try {
    const subscriberSnapshot = await db.collection("newsletterSubscribers").get();
    const subscribers = subscriberSnapshot.docs.flatMap((item) => {
      const data = item.data();
      if (
        data.consent !== true
        || (data.status !== "subscribed" && data.status !== "awaiting_confirmation")
        || typeof data.email !== "string"
      ) return [];
      return [{
        ref: item.ref,
        email: data.email,
        status: data.status,
        brevoSyncedAt: data.brevoSyncedAt,
      }];
    });
    if (subscribers.length === 0) {
      await campaign.update({ status: "failed", error: "no_active_subscribers" });
      return NextResponse.json({ error: "Não há assinantes com consentimento ativo." }, { status: 409 });
    }

    await campaign.update({
      recipientCount: subscribers.length,
      status: "syncing_contacts",
    });

    const batchSize = 5;
    for (let index = 0; index < subscribers.length; index += batchSize) {
      const batch = subscribers.slice(index, index + batchSize);
      await Promise.all(batch.map(async (subscriber) => {
        if (!subscriber.brevoSyncedAt) {
          await syncBrevoSubscriber(subscriber.email);
          await subscriber.ref.update({ brevoSyncedAt: FieldValue.serverTimestamp() });
        }
      }));
    }

    const suppressionCandidates = subscriberSnapshot.docs.flatMap((item) => {
      const data = item.data();
      if (
        data.status !== "unsubscribed"
        || !data.brevoSyncedAt
        || data.brevoSuppressed === true
        || typeof data.email !== "string"
      ) return [];
      return [{ ref: item.ref, email: data.email }];
    });
    for (let index = 0; index < suppressionCandidates.length; index += batchSize) {
      const batch = suppressionCandidates.slice(index, index + batchSize);
      await Promise.all(batch.map(async (subscriber) => {
        await suppressBrevoSubscriber(subscriber.email);
        await subscriber.ref.update({ brevoSuppressed: true });
      }));
    }

    await campaign.update({ status: "sending" });
    providerCampaignId = await sendNewsletterCampaign(subject, message, {
      article,
      onCreated: async (createdId) => {
        providerCampaignId = createdId;
        await campaign.update({ status: "sending", providerCampaignId: createdId });
      },
    });
    await campaign.update({
      status: "sent",
      providerCampaignId,
      sentAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({
      status: "sent",
      recipientCount: subscribers.length,
      providerCampaignId,
    }, { status: 201 });
  } catch (error) {
    console.error("A campanha da newsletter não foi concluída.", error);
    await campaign.update({
      status: providerCampaignId ? "provider_error" : "failed",
      ...(providerCampaignId ? { providerCampaignId } : {}),
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown_error",
    });
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Não foi possível enviar a campanha.",
      campaignId: body.campaignId,
      providerCampaignId: providerCampaignId ?? null,
    }, { status: 502 });
  }
}
