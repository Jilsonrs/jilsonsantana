import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroDoCampo } from "./MolduraDeAcesso";

// O CAMPO DO CÓDIGO DE 6 NÚMEROS (etapa 4.7, passo 5) — na tela de entrar e na da senha nova. O
// teclado de números no celular (`inputMode`) e o preenchimento automático do código que chega por
// e-mail ou mensagem (`one-time-code`).

type Props = { id: string; rotulo: string; erro?: string; descritoPor?: string; registro: UseFormRegisterReturn };

export function CampoDeCodigo({ id, rotulo, erro, descritoPor, registro }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={erro ? "text-destructive" : undefined}>
        {rotulo}
      </Label>
      <Input id={id} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={Boolean(erro)} aria-describedby={erro ? `${id}-erro` : descritoPor} {...registro} />
      {erro && <ErroDoCampo id={`${id}-erro`}>{erro}</ErroDoCampo>}
    </div>
  );
}
