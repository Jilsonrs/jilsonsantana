import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { senhaNovaSchema } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroDoCampo, FalhaDoFormulario } from "@/components/acesso/MolduraDeAcesso";
import { criarSenhaSemLogin } from "@/lib/api";
import { POS_LOGIN } from "@/lib/acesso-por-codigo";
import { codigoDoErro } from "@/lib/course-form";
import { passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { esquecerTentativa } from "@/lib/tentativa-de-assinar";
import { navegador } from "@/lib/versao";

// A SENHA LOGO DEPOIS DE PAGAR (etapa 4.7, passo 6e2 — decisão do operador, 21/10/2026: a senha nasce
// na própria tela, e a pessoa já entra para estudar). A senha só vai por POST, com a tentativa que
// esta aba guardou; nunca é aparada (`senhaNovaSchema`). Criada a senha — ou recusada de vez —, a
// tentativa é esquecida: ela não serve para mais nada.

const formSchema = z.object({ senha: senhaNovaSchema });
type FormValues = z.infer<typeof formSchema>;

/** As recusas que encerram o caminho por aqui: a pessoa segue pela tela de entrar. */
const RECUSAS_QUE_ENCERRAM = ["PrazoVencido", "EmailConfirmado", "JaTemSenha"] as const;

export function CriarSenhaDepoisDePagar({ tentativa }: { tentativa: string }) {
  const t = useT();
  const [aviso, setAviso] = useState<string | null>(null);
  const [fim, setFim] = useState<{ mensagem: string; botao: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const erroDaSenha = errors.senha ? (errors.senha.type === "too_small" ? t.senhaNova.senhaCurta : errors.senha.type === "too_big" ? t.senhaNova.senhaLonga : t.senhaNova.senhaVazia) : undefined;

  async function criar({ senha }: FormValues) {
    setAviso(null);
    try {
      const { entrou } = await criarSenhaSemLogin({ tentativa, senha });
      esquecerTentativa();
      // Entrou: o Início, carregando a página (esta é do servidor — `lib/versao.ts`).
      if (entrou) return navegador.ir(POS_LOGIN);
      setFim({ mensagem: t.assinar.senhaCriadaEntre, botao: t.login.entrar });
    } catch (falha) {
      const motivo = codigoDoErro(falha);
      const encerra = RECUSAS_QUE_ENCERRAM.find((recusa) => recusa === motivo);
      if (encerra) {
        esquecerTentativa();
        const mensagem = { PrazoVencido: t.assinar.prazoVencido, EmailConfirmado: t.assinar.emailJaConfirmado, JaTemSenha: t.assinar.jaTemSenha }[encerra];
        return setFim({ mensagem, botao: t.assinar.irParaEntrar });
      }
      if (motivo === "NaoConfirmado") setAviso(t.assinar.naoConfirmado);
      // Dois cliques ao criar a senha (`Ocupada`): o texto do operador para esperar (21/10/2026).
      else if (motivo === "Ocupada") setAviso(t.assinar.aguardeUmInstante);
      else setAviso(passouDoLimite(falha) ? t.comum.muitasTentativas : t.login.falha);
    }
  }

  if (fim) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-foreground">
          {fim.mensagem}
        </p>
        <Button asChild>
          <a href="/login">{fim.botao}</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(criar)} className="max-w-md space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="senha-depois-de-pagar" className={erroDaSenha ? "text-destructive" : undefined}>
          {t.assinar.campoDaSenha}
        </Label>
        <Input
          id="senha-depois-de-pagar"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(erroDaSenha)}
          aria-describedby={erroDaSenha ? "senha-depois-de-pagar-erro" : "senha-depois-de-pagar-regra"}
          {...register("senha")}
        />
        {erroDaSenha ? (
          <ErroDoCampo id="senha-depois-de-pagar-erro">{erroDaSenha}</ErroDoCampo>
        ) : (
          <p id="senha-depois-de-pagar-regra" className="text-[13px] text-muted-foreground">
            {t.senhaNova.regra}
          </p>
        )}
      </div>
      {aviso && <FalhaDoFormulario>{aviso}</FalhaDoFormulario>}
      <Button type="submit" size="lg" className="min-h-12 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? t.senhaNova.criando : t.assinar.criarSenhaEComecar}
      </Button>
    </form>
  );
}
