import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { articles } from "../src/lib/articles";

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function main() {
  if (!credentialsPath) {
    throw new Error(
      "Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho local do JSON da conta de serviço. Não o copie para o repositório nem para o deploy.",
    );
  }
  if (!projectId) {
    throw new Error("Defina FIREBASE_PROJECT_ID com o ID do projeto Firebase.");
  }

  const app = getApps()[0] ?? initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);
  const refs = articles.flatMap((article) => [
    db.collection("articles").doc(article.slug),
    db.collection("deletedArticles").doc(article.slug),
  ]);
  const existingDocuments = await db.getAll(...refs);
  const batch = db.batch();
  let created = 0;
  let skipped = 0;

  for (let index = 0; index < articles.length; index += 1) {
    const article = articles[index];
    const articleSnapshot = existingDocuments[index * 2];
    const deletionSnapshot = existingDocuments[index * 2 + 1];

    if (articleSnapshot.exists || deletionSnapshot.exists) {
      skipped += 1;
      continue;
    }

    batch.create(refs[index * 2], {
      slug: article.slug,
      status: "published",
      article,
      updatedAt: FieldValue.serverTimestamp(),
    });
    created += 1;
  }

  if (created > 0) await batch.commit();
  console.log(`Inicialização concluída no projeto ${projectId}: ${created} criados, ${skipped} preservados.`);
}

void main().catch((error: unknown) => {
  console.error("Falha ao inicializar o Firestore:", error);
  process.exitCode = 1;
});
