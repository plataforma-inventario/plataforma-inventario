import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ImportarForm } from "./importar-form";

// "Uma parte que só apareça pra mim": central de importação, visível só
// pro Auditor (único perfil que lança dados - item 1 do briefing).
export default async function ImportarPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil !== "AUDITOR") redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Central de importação</h1>
        <p className="text-sm text-neutral-500">
          Solte os arquivos aqui conforme for lançando — cada um alimenta sozinho a aba certa
          (Lojas/lançamento, Defeitos, etc.).
        </p>
      </div>

      <ImportarForm />
    </div>
  );
}
