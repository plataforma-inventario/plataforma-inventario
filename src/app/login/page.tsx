import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <Image src="/logo-icon.png" alt="Grupo Nunes" width={48} height={48} priority className="mb-3" />
        <h1 className="mb-1 text-xl font-semibold text-brand-dark">
          Plataforma de Inventário
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Entre com seu e-mail e senha.
        </p>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
