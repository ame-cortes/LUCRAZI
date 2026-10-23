import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getBillingAccess } from "@/lib/billing-plans";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codeId: string }> },
) {
  const { codeId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(codeId)) {
    return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
  }

  try {
    const db = getFirebaseAdminDb();
    const result = await db.collectionGroup("qrCodes")
      .where("publicId", "==", codeId)
      .limit(1)
      .get();
    const codeDoc = result.docs[0];
    if (!codeDoc) return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });

    const data = codeDoc.data();
    const destination = typeof data.content === "string" ? data.content : "";
    if (data.contentType !== "url" || !/^https?:\/\//i.test(destination)) {
      return NextResponse.json({ error: "Este QR Code não possui um destino web válido." }, { status: 404 });
    }

    if (data.trackingEnabled === true) {
      const userId = codeDoc.ref.parent.parent?.id;
      if (userId) {
        await db.runTransaction(async (transaction) => {
          const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
          const [currentCode, billing] = await Promise.all([
            transaction.get(codeDoc.ref),
            transaction.get(billingRef),
          ]);
          if (!currentCode.exists || !getBillingAccess(billing.data()).hasMetrics) return;
          transaction.update(codeDoc.ref, {
            scanCount: FieldValue.increment(1),
            lastScannedAt: FieldValue.serverTimestamp(),
          });
        });
      }
    }

    return NextResponse.redirect(destination, { status: 302 });
  } catch (error) {
    console.error("Não foi possível encaminhar o QR Code.", error);
    return NextResponse.json({ error: "Este QR Code está temporariamente indisponível." }, { status: 503 });
  }
}
