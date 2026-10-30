import { useState } from "react";
import { enderecoDeEmailSchema, lerDocumentoFiscal, nomeDaPessoaSchema } from "@jilson/core";
import { useT } from "@/lib/language";

/**
 * "SEUS DADOS" NA TELA DE ASSINAR (etapa 4.7, passo 9 — saiu do formulário para ele não passar do tamanho
 * combinado, com o OK do operador, 30/10/2026). As duas telas pedem o CPF ou CNPJ; a pública (`semLogin`)
 * pede também o nome, o e-mail e a caixa de novidades. A conferência é a do `core`, a mesma do servidor:
 * errado, o aviso vai embaixo do PRIMEIRO campo errado (na ordem da tela: nome, e-mail, CPF), e nada vai
 * ao servidor nem ao cartão. O nome vazio pede o nome; o nome com dígito, símbolo ou endereço de site pede só letras
 * (decisão do operador, 30/10/2026, depois da revisão de segurança do passo 9).
 */
export function useSeusDados(semLogin: boolean) {
  const { assinar: t, login } = useT();
  const [nome, setNome] = useState("");
  const [erroDoNome, setErroDoNome] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [erroDoEmail, setErroDoEmail] = useState<string | null>(null);
  const [documento, setDocumento] = useState("");
  const [erroDoDocumento, setErroDoDocumento] = useState<string | null>(null);
  const [novidades, setNovidades] = useState(false);

  return {
    nome,
    erroDoNome,
    mudarNome: (valor: string) => {
      setNome(valor);
      setErroDoNome(null);
    },
    email,
    erroDoEmail,
    mudarEmail: (valor: string) => {
      setEmail(valor);
      setErroDoEmail(null);
    },
    documento,
    erroDoDocumento,
    mudarDocumento: (valor: string) => {
      setDocumento(valor);
      setErroDoDocumento(null);
    },
    novidades,
    setNovidades,
    /** Confere os dados antes de enviar: certos, `true`; errado, o aviso no primeiro campo errado e `false`. */
    conferir: (): boolean => {
      if (semLogin && !nomeDaPessoaSchema.safeParse(nome).success) {
        setErroDoNome(nome.trim() === "" ? t.nomeVazio : t.nomeSoLetras);
        return false;
      }
      if (semLogin && !enderecoDeEmailSchema.safeParse(email).success) {
        setErroDoEmail(login.emailInvalido);
        return false;
      }
      if (!lerDocumentoFiscal(documento)) {
        setErroDoDocumento(t.documentoInvalido);
        return false;
      }
      return true;
    },
    /** O servidor recusou o e-mail (já tem conta) ou o CPF (a Stripe o recusou): o aviso embaixo do campo. */
    recusarEmail: (mensagem: string) => setErroDoEmail(mensagem),
    recusarDocumento: () => setErroDoDocumento(t.documentoInvalido),
  };
}

export type SeusDadosDaTela = ReturnType<typeof useSeusDados>;
