import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// O `server/.env` (o banco de DEV) — SEM sobrescrever o que já veio no ambiente, e isso ESCRITO.
// Com o `import "dotenv/config"` de antes, uma variável DOTENV_CONFIG_OVERRIDE (ou DOTENV_CONFIG_PATH)
// no terminal invertia a regra, e o servidor do E2E passava a falar com o banco de dev (revisão de
// segurança, 26/10/2026; medido no dotenv 18). O caminho é o do próprio servidor, venha de onde vier
// o comando. Importe PRIMEIRO, antes de qualquer arquivo que leia o ambiente. Em produção o arquivo
// não existe: as variáveis vêm do Cloud Run.
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), override: false, quiet: true });
