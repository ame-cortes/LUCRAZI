import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyNewsletterAdmin } from "@/lib/firebase-admin";
import {
  isBrevoConfigured,
  sendWelcomeEmail,
  suppressBrevoSubscriber,
} from "@/lib/newsletter-email";

export async function GET(request: Request) {
  const admin = await verifyNewsletterAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  try {
    const db = getFirebaseAdminDb();
    const [subscriberSnapshot, campaignSnapshot] = await Promise.all([
      db.collection("newsletterSubscribers").get(),
      db.collection("newsletterCampaigns").orderBy("createdAt", "desc").limit(20).get(),
    ]);
    const subscribers = subscriberSnapshot.docs.flatMap((item) => {
      const data = item.data();
      if (typeof data.email !== "string") return [];
      const isLegacySubscriber = data.status === "awaiting_confirmation" && data.consent === true;
      return [{
        id: item.id,
        email: data.email,
        status: isLegacySubscriber ? "subscribed" : data.status,
        consent: data.consent === true,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        welcomeEmailStatus: data.welcomeEmailStatus ?? "not_sent",
        brevoSynced: Boolean(data.brevoSyncedAt),
      }];
    }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const campaigns = campaignSnapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        subject: data.subject,
        status: data.status,
        recipientCount: data.recipientCount ?? 0,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    });
    const activeCount = subscribers.filter((item) =>
      item.status === "subscribed" && item.consent,
    ).length;

    return NextResponse.json({
      subscribers,
      campaigns,
      activeCount,
      brevoConfigured: isBrevoConfigured(),
    });
  } catch (error) {
    console.error("Não foi possível carregar os assinantes da newsletter.", error);
    return NextResponse.json({ error: "Não foi possível carregar os assinantes." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    typeof body !== "object"
    || body === null
    || !("subscriberId" in body)
    || typeof body.subscriberId !== "string"
    || !/^[a-f0-9]{64}$/.test(body.subscriberId)
    || !("action" in body)
    || (body.action !== "unsubscribe" && body.action !== "welcome")
  ) {
    return NextResponse.json({ error: "Ação ou assinante inválido." }, { status: 400 });
  }

  try {
    const subscriber = getFirebaseAdminDb()
      .collection("newsletterSubscribers")
      .doc(body.subscriberId);
    const snapshot = await subscriber.get();
    const data = snapshot.data();
    if (!snapshot.exists || typeof data?.email !== "string") {
      return NextResponse.json({ error: "Assinante não encontrado." }, { status: 404 });
    }

    if (body.action === "unsubscribe") {
      if (data.status !== "unsubscribed") {
        await subscriber.update({
          status: "unsubscribed",
          unsubscribedAt: FieldValue.serverTimestamp(),
        });
      }
      let brevoSuppressed = false;
      try {
        brevoSuppressed = await suppressBrevoSubscriber(data.email);
        if (brevoSuppressed) {
          await subscriber.update({ brevoSuppressed: true });
        }
      } catch (error) {
        console.error("O cancelamento foi salvo localmente, mas a supressão Brevo ficou pendente.", error);
        await subscriber.update({ brevoSuppressed: false });
      }
      return NextResponse.json({ status: "unsubscribed", brevoSuppressed });
    }

    if (data.status === "unsubscribed" || data.consent !== true) {
      return NextResponse.json({ error: "Não é permitido enviar para este assinante." }, { status: 409 });
    }
    const sent = await sendWelcomeEmail(data.email, body.subscriberId);
    if (!sent) {
      return NextResponse.json({ error: "Configure a integração Brevo antes de enviar e-mails." }, { status: 503 });
    }
    await subscriber.update({
      welcomeEmailStatus: "sent",
      welcomeEmailSentAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ status: "sent" });
  } catch (error) {
    console.error("Não foi possível atualizar o assinante da newsletter.", error);
    return NextResponse.json({ error: "Não foi possível concluir a ação." }, { status: 502 });
  }
}
