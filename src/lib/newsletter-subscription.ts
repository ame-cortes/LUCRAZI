import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { isBrevoConfigured, sendWelcomeEmail, syncBrevoSubscriber } from "@/lib/newsletter-email";

type SubscriberSource = "homepage" | "ebook.lucrazi.com.br";

type NewsletterSubscriptionResult =
  | { status: "already-subscribed" }
  | {
      status: "subscribed";
      welcomeSent: boolean;
      emailConfigured: boolean;
      brevoSynced: boolean;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAlreadyExists(error: unknown) {
  return isRecord(error) && (error.code === 6 || error.code === "already-exists");
}

export async function subscribeNewsletterSubscriber(
  email: string,
  emailHash: string,
  options: {
    source: SubscriberSource;
    consentTextVersion: string;
  },
): Promise<NewsletterSubscriptionResult> {
  const db = getFirebaseAdminDb();
  const subscriber = db.collection("newsletterSubscribers").doc(emailHash);
  let resubscribed = false;

  try {
    const existing = await subscriber.get();
    if (existing.exists) {
      if (existing.data()?.status !== "unsubscribed") {
        return { status: "already-subscribed" };
      }

      resubscribed = true;
      await subscriber.update({
        consent: true,
        consentTextVersion: options.consentTextVersion,
        consentAt: FieldValue.serverTimestamp(),
        status: "subscribed",
        source: options.source,
        unsubscribedAt: FieldValue.delete(),
        welcomeEmailStatus: "pending",
        brevoSyncedAt: FieldValue.delete(),
      });
    } else {
      await subscriber.create({
        email,
        consent: true,
        consentTextVersion: options.consentTextVersion,
        consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        source: options.source,
        status: "subscribed",
        welcomeEmailStatus: "pending",
      });
    }
  } catch (error) {
    if (isAlreadyExists(error)) {
      return { status: "already-subscribed" };
    }
    throw error;
  }

  let brevoSynced = false;
  let welcomeSent = false;

  try {
    brevoSynced = await syncBrevoSubscriber(email, resubscribed);
    if (brevoSynced) {
      await subscriber.update({ brevoSyncedAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("A inscrição foi gravada, mas não foi sincronizada com a lista Brevo.", error);
  }

  try {
    welcomeSent = await sendWelcomeEmail(email, emailHash);
    if (welcomeSent) {
      await subscriber.update({
        welcomeEmailStatus: "sent",
        welcomeEmailSentAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("A inscrição foi gravada, mas o e-mail de boas-vindas não foi enviado.", error);
    try {
      await subscriber.update({ welcomeEmailStatus: "failed" });
    } catch (updateError) {
      console.error("Não foi possível registrar a falha do e-mail de boas-vindas.", updateError);
    }
  }

  return {
    status: "subscribed",
    welcomeSent,
    emailConfigured: isBrevoConfigured(),
    brevoSynced,
  };
}
