import { auth } from "@/auth";
import { TrocarSenhaForm } from "./trocar-senha-form";

export default async function PerfilPage() {
  const session = await auth();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium text-brand-dark">Meu perfil</h1>
        <p className="text-sm text-neutral-500">
          {session.user.nome} · {session.user.email}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-medium text-neutral-900">Trocar senha</h2>
        <TrocarSenhaForm />
      </div>
    </div>
  );
}
