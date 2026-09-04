"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { erro: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}
