"use client";

import { useActionState, useRef, useEffect } from "react";
import { trocarSenha } from "./actions";

export function TrocarSenhaForm() {
  const [state, formAction, pending] = useActionState(trocarSenha, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sucesso) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="senhaAtual" className="text-sm font-medium text-neutral-700">
          Senha atual
        </label>
        <input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="senhaNova" className="text-sm font-medium text-neutral-700">
          Nova senha
        </label>
        <input
          id="senhaNova"
          name="senhaNova"
          type="password"
          required
          minLength={8}
          placeholder="mínimo 8 caracteres"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmacao" className="text-sm font-medium text-neutral-700">
          Confirmar nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          minLength={8}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      {state?.sucesso && <p className="text-sm text-emerald-700">Senha alterada com sucesso.</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
