import type Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { AVISOS_DO_ENDERECO, avisosConfigurados, cobrancaConfigurada } from "./stripe.js";
import { enderecoDoSite } from "./endereco-do-site.js";

// A CONFERÊNCIA DA COBRANÇA NA SUBIDA (E4 da revisão ampla da cobrança, 29/10/2026 — plano → etapa 4.9b). Duas
// coisas que, erradas, deixam o aluno sem conseguir pagar, ou pago e sem acesso, SEM erro nenhum: as chaves da
// Stripe de modos diferentes (o campo de pagamento abre num modo e a cobrança vai para o outro), e o endereço de
// avisos da conta desligado ou sem um aviso que o site trata (foi assim com o `payment_intent.succeeded` até a
// P112). Roda em produção, uma vez por subida de cada cópia (`index.ts`); nunca derruba a subida — só alerta. O
// registro diz o MODO das chaves, nunca as chaves.

export type ModoDaChave = "live" | "test";

/**
 * O modo de uma chave da Stripe pelo prefixo (`live_` ou `test_`), se ela for de um dos `tipos` (`pk` a publicável;
 * `sk` e `rk`, a secreta e a restrita) — a secreta colada no lugar da publicável não é chave publicável. Função pura.
 */
export function modoDaChave(chave: string | undefined, tipos: readonly string[]): ModoDaChave | null {
  const achado = /^([a-z]+)_(live|test)_/.exec(chave ?? "");
  if (!achado || !tipos.includes(achado[1] ?? "")) return null;
  return achado[2] === "live" ? "live" : "test";
}

/** O problema das chaves, ou nada: a publicável e a secreta existem e são do MESMO modo. Função pura. */
export function problemaDasChaves(publicavel: string | undefined, secreta: string | undefined): string | null {
  const daPublicavel = modoDaChave(publicavel, ["pk"]);
  const daSecreta = modoDaChave(secreta, ["sk", "rk"]);
  if (!daPublicavel || !daSecreta) {
    return `uma das chaves da Stripe não tem a forma de chave (a publicável: ${daPublicavel ?? "ausente ou malformada"}; a secreta: ${daSecreta ?? "ausente ou malformada"}) — sem as duas, não há como pagar`;
  }
  if (daPublicavel !== daSecreta) {
    return `as chaves da Stripe são de modos diferentes (a publicável é ${daPublicavel}, a secreta é ${daSecreta}): o campo de pagamento abre num modo e a cobrança vai para o outro`;
  }
  return null;
}

/** O que a conferência lê de cada endereço de avisos da conta. */
export type EnderecoDeAvisos = Pick<Stripe.WebhookEndpoint, "id" | "url" | "status" | "enabled_events">;

/** O mesmo endereço, sem diferença de maiúsculas no domínio nem da barra no fim. */
function mesmoEndereco(a: string, b: string): boolean {
  const normal = (endereco: string) => {
    try {
      const url = new URL(endereco);
      return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
    } catch {
      return endereco;
    }
  };
  return normal(a) === normal(b);
}

/**
 * O problema do endereço de avisos deste site, ou nada (função pura): ele existe na conta, está LIGADO, e os ligados
 * que apontam para cá assinam, juntos, todos os avisos que o site trata (`AVISOS_DO_ENDERECO`; "todos os eventos",
 * `*`, também vale).
 */
export function problemaDoEndereco(enderecos: EnderecoDeAvisos[], url: string): string | null {
  const nossos = enderecos.filter((endereco) => mesmoEndereco(endereco.url, url));
  if (nossos.length === 0) return `nenhum endereço de avisos da Stripe aponta para ${url}: nenhum aviso chega ao site (pagamento confirmado, cancelamento, devolução)`;
  const ligados = nossos.filter((endereco) => endereco.status === "enabled");
  if (ligados.length === 0) return `o endereço de avisos ${nossos.map((endereco) => endereco.id).join(", ")} está desligado na Stripe: nenhum aviso chega ao site`;
  const assinados = new Set(ligados.flatMap((endereco) => endereco.enabled_events));
  if (assinados.has("*")) return null;
  const faltam = AVISOS_DO_ENDERECO.filter((tipo) => !assinados.has(tipo));
  if (faltam.length > 0) return `o endereço de avisos ${ligados.map((endereco) => endereco.id).join(", ")} não assina ${faltam.join(", ")}: esses avisos nunca chegam ao site — incluir no painel da Stripe (Workbench → Webhooks)`;
  return null;
}

/**
 * A conferência da subida: alerta (`[stripe] subida: …`) cada problema achado e devolve se estava tudo certo.
 * Nunca lança. Sem a cobrança ou os avisos configurados, não confere nada (as rotas já respondem 503 e alertam).
 */
export async function conferirCobrancaNaSubida(ambiente: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (!cobrancaConfigurada() || !avisosConfigurados()) return true;
  let tudoCerto = true;
  const chaves = problemaDasChaves(ambiente.STRIPE_PUBLISHABLE_KEY, ambiente.STRIPE_SECRET_KEY);
  if (chaves) {
    tudoCerto = false;
    console.error(`[stripe] subida: ${chaves}`);
  }
  // Sem o endereço do site (BETTER_AUTH_URL), a subida já alerta pelos e-mails (`index.ts`): aqui, só registro.
  const url = enderecoDoSite("/api/stripe/webhook", ambiente);
  if (!url) {
    console.warn("[stripe] subida: sem o endereço do site (BETTER_AUTH_URL), o endereço de avisos não foi conferido");
    return false;
  }
  try {
    const lista = await stripe().webhookEndpoints.list({ limit: 100 });
    const problema = problemaDoEndereco(lista.data, url);
    if (problema) {
      tudoCerto = false;
      console.error(`[stripe] subida: ${problema}`);
    }
  } catch (erro) {
    tudoCerto = false;
    console.error(`[stripe] subida: não consegui conferir o endereço de avisos — ${erroSemMensagem(erro, "a lista dos endereços de avisos").message}`);
  }
  return tudoCerto;
}
