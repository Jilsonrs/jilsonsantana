# Imagens do site

Tudo o que está aqui é servido na raiz do site: `client/public/img/logo.svg`
chega ao navegador como **`/img/logo.svg`**. É assim que as fontes já funcionam
(`client/public/fonts/`).

Referencie sempre pelo caminho absoluto, começando com `/`:

```tsx
<img src="/img/logo.svg" alt="Jilson Santana" />
```

## O que entra aqui

O que é **fixo e faz parte do produto**: a logomarca, o logo do JilsonAI, ícones
de marca, ilustração de tela vazia, a imagem de OG (a que aparece quando alguém
compartilha um link no WhatsApp ou LinkedIn).

## O que NÃO entra aqui

**Thumbnail de curso.** Ela vive no campo `Course.thumbnailUrl`, preenchido pelo
painel admin — é conteúdo, muda sem deploy. Colocar aqui obrigaria um deploy a
cada curso novo.

## Formato

- **Logo e ícone → SVG.** Escala sem borrar em qualquer tela e pesa pouco.
- **Foto e ilustração → WebP.** Parte do público acessa de aparelho antigo e
  conexão instável, e leveza é requisito técnico (`docs/design.md` §1), não
  gosto. WebP costuma pesar bem menos que o mesmo PNG/JPG.
- **Imagem de OG → PNG ou JPG, 1200×630.** É a exceção ao WebP: quem lê essa
  imagem é o robô do WhatsApp e do LinkedIn, e nem todos aceitam WebP.

Toda `<img>` precisa de `alt` — descritivo, ou `alt=""` se for decorativa.
