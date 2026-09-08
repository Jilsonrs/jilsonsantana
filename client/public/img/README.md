# Imagens do site

Tudo o que está aqui é servido na raiz do site: `client/public/img/logo.svg`
chega ao navegador como **`/img/logo.svg`**. É assim que as fontes já funcionam
(`client/public/fonts/`).

Referencie sempre pelo caminho absoluto, começando com `/`:

```tsx
<img src="/img/logo.svg" alt="Jilson Santana" />
```

## As regras estão na lei visual, não aqui

**O que entra nesta pasta, em que formato, e o que fica de fora: `docs/design.md`
§12.** Este arquivo não repete nenhuma delas de propósito — regra escrita em dois
lugares é regra que diverge, e a que ninguém está olhando é a errada.

Este README existe por um motivo mecânico: o git não versiona pasta vazia. Sem
um arquivo aqui, a pasta sumiria no próximo clone.
