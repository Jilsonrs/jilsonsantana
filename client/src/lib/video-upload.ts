import * as tus from "tus-js-client";

// O envio de vídeo para o Bunny Stream, em partes e RETOMÁVEL (regra do
// operador, 25/09: se a internet cair, continua de onde parou). O arquivo vai do
// navegador direto para o Bunny, byte a byte, sem recompressão; o nosso servidor
// só entrega a assinatura — a chave da biblioteca nunca chega aqui.
//
// É o ÚNICO lugar do app que conhece o `tus-js-client` (peça aprovada pelo
// operador em 27/09). Os componentes falam com esta função, e os testes trocam
// esta função, não a biblioteca.

export type CredenciaisDeEnvio = {
  videoId: string;
  titulo: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
  embedUrl: string;
};

export type EnvioDeVideo = { concluido: Promise<void>; cancelar: () => void };

export function enviarVideo(
  arquivo: File,
  credenciais: CredenciaisDeEnvio,
  aoProgredir: (porcentagem: number) => void,
): EnvioDeVideo {
  let upload: tus.Upload | undefined;

  const concluido = new Promise<void>((resolver, rejeitar) => {
    upload = new tus.Upload(arquivo, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      // Queda de conexão no meio: o envio espera e RETOMA do ponto em que parou,
      // por uns 5 minutos (o começo é o do exemplo oficial do Bunny, e o resto
      // cobre uma troca de Wi-Fi ou um roteador reiniciando).
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000, 60000, 60000, 60000],
      // Retomar um envio de OUTRA sessão mandaria o arquivo para o vídeo antigo
      // enquanto o curso gravaria o novo — cada vídeo nasce com a sua assinatura.
      storeFingerprintForResuming: false,
      headers: {
        AuthorizationSignature: credenciais.signature,
        AuthorizationExpire: String(credenciais.expirationTime),
        VideoId: credenciais.videoId,
        LibraryId: credenciais.libraryId,
      },
      // O nome é o que o servidor escolheu (o título do curso ou da aula), nunca o
      // nome do arquivo no computador do operador, que sobrescreveria o do Bunny.
      metadata: { filetype: arquivo.type, title: credenciais.titulo },
      onProgress: (enviados, total) => aoProgredir(total > 0 ? Math.round((enviados / total) * 100) : 0),
      onSuccess: () => resolver(),
      onError: (erro) => rejeitar(erro),
    });

    upload.start();
  });

  return { concluido, cancelar: () => void upload?.abort() };
}
