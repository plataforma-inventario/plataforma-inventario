"use client";

import { useActionState, useRef, useEffect } from "react";
import { criarUsuario } from "./actions";

export function UsuarioForm() {
  const [state, formAction, pending] = useActionState(criarUsuario, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.erro) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium text-neutral-700">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="senha" className="text-sm font-medium text-neutral-700">
          Senha inicial
        </label>
        <input
          id="senha"
          name="senha"
          type="text"
          required
          minLength={8}
          placeholder="mínimo 8 caracteres — combine com a pessoa"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="perfil" className="text-sm font-medium text-neutral-700">
          Perfil de acesso
        </label>
        <select
          id="perfil"
          name="perfil"
          required
          defaultValue=""
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="" disabled>
            Selecione
          </option>
          <option value="AUDITOR">Auditor</option>
          <option value="DIRETORIA">Diretoria</option>
          <option value="GERENTE_VAREJO">Gerente comercial — Varejo</option>
          <option value="GERENTE_REVENDA">Gerente comercial — Revenda</option>
          <option value="LOGISTICA">Logística / Centro de Distribuição</option>
        </select>
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
