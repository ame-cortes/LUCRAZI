import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import {
  isBrevoConfigured,
  sendWelcomeEmail,
  syncBrevoSubscriber,
} from "@/lib/newsletter-email";

type SubscriberSource = "homepage" | "ferramentas-ebook";

type NewsletterSubscriptionResult =
  | { status: "already-subscribed"; welcomeSent: boolean }
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
    ebookAttachment?: Uint8Array;
  },
): Promise<NewsletterSubscriptionResult> {
  const db = getFirebaseAdminDb();
  const subscriber = db.collection("newsletterSubscribers").doc(emailHash);
  let resubscribed = false;
  let skipWelcome = false;

  try {
    const existing = await subscriber.get();
    if (existing.exists) {
      if (existing.data()?.status !== "unsubscribed") {
        const welcomeAlreadySent = existing.data()?.welcomeEmailStatus === "sent";
        if (welcomeAlreadySent || !options.ebookAttachment) {
          return { status: "already-subscribed", welcomeSent: false };
        }

        let welcomeSent = false;
        try {
          welcomeSent = await sendWelcomeEmail(email, emailHash, options.ebookAttachment);
          if (welcomeSent) {
            await subscriber.update({
              welcomeEmailStatus: "sent",
              welcomeEmailSentAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (error) {
          console.error("Não foi possível enviar a mensagem de boas-vindas ao assinante existente.", error);
          await subscriber.update({ welcomeEmailStatus: "failed" });
        }

        return { status: "already-subscribed", welcomeSent };
      }

      resubscribed = true;
      skipWelcome =
        options.ebookAttachment !== undefined
        && existing.data()?.welcomeEmailStatus === "sent";
      await subscriber.update({
        consent: true,
        consentTextVersion: options.consentTextVersion,
        consentAt: FieldValue.serverTimestamp(),
        status: "subscribed",
        source: options.source,
        unsubscribedAt: FieldValue.delete(),
        welcomeEmailStatus: skipWelcome ? "sent" : "pending",
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
      return { status: "already-subscribed", welcomeSent: false };
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
    if (!skipWelcome) {
      welcomeSent = await sendWelcomeEmail(email, emailHash, options.ebookAttachment);
      if (welcomeSent) {
        await subscriber.update({
          welcomeEmailStatus: "sent",
          welcomeEmailSentAt: FieldValue.serverTimestamp(),
        });
      }
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
