---
title: &apos;Lançamento do V8 v7.7&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)), alocador preguiçoso de notas de lançamento&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-08-13 16:45:00
tags:
  - lançamento
description: &apos;O V8 v7.7 apresenta alocação preguiçosa de feedback, compilação em segundo plano mais rápida para WebAssembly, melhorias em rastreamento de pilha e novas funcionalidades do Intl.NumberFormat.&apos;
tweet: &apos;1161287541611323397&apos;
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é branqueada a partir do mestre do Git do V8 imediatamente antes de uma etapa Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [a versão 7.7 do V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7), que está em beta até seu lançamento em coordenação com o Chrome 77 Stable em algumas semanas. O V8 v7.7 está repleto de recursos interessantes voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Desempenho (tamanho e velocidade)

### Alocação preguiçosa de feedback

Para otimizar o JavaScript, o V8 coleta feedback sobre os tipos de operandos que são passados para várias operações (como `+` ou `o.foo`). Este feedback é usado para otimizar essas operações adaptando-as a esses tipos específicos. Esta informação é armazenada em “vetores de feedback”, e enquanto esta informação é muito importante para alcançar tempos de execução mais rápidos, também pagamos um custo pelo uso de memória necessário para alocar esses vetores de feedback.

Para reduzir o uso de memória do V8, agora alocamos os vetores de feedback de forma preguiçosa apenas após a função ter executado uma certa quantidade de bytecode. Isso evita alocar vetores de feedback para funções de curta duração que não se beneficiam do feedback coletado. Nossos experimentos em laboratório mostram que alocar vetores de feedback de forma preguiçosa economiza cerca de 2–8% do tamanho do heap do V8.

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

Nossos experimentos em situações reais mostram que isso reduz o tamanho do heap do V8 em 1–2% em plataformas desktop e 5–6% em plataformas móveis para os usuários do Chrome. Não há regressões de desempenho no desktop, enquanto nas plataformas móveis vimos, na verdade, uma melhoria de desempenho em telefones de baixo custo com memória limitada. Fique atento para um post mais detalhado em nosso blog sobre nossos trabalhos recentes para economizar memória.

### Compilação em segundo plano escalonável para WebAssembly

Nas últimas etapas, trabalhamos na escalabilidade da compilação em segundo plano do WebAssembly. Quanto mais núcleos seu computador tiver, mais você se beneficia desse esforço. Os gráficos abaixo foram criados em uma máquina Xeon de 24 núcleos, compilando [o demo do Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html). Dependendo do número de threads usados, a compilação leva menos da metade do tempo em comparação com o V8 v7.4.

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### Melhorias no rastreamento de pilha

Quase todos os erros lançados pelo V8 capturam um rastreamento de pilha quando são criados. Este rastreamento de pilha pode ser acessado a partir do JavaScript através da propriedade não padrão `error.stack`. Na primeira vez que um rastreamento de pilha é recuperado via `error.stack`, o V8 serializa o rastreamento de pilha estruturado subjacente em uma string. Este rastreamento de pilha serializado é mantido para acelerar futuras consultas a `error.stack`.

Nas últimas versões, trabalhamos em alguns [refatoramentos internos da lógica de rastreamento de pilha](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([bug de rastreamento](https://bugs.chromium.org/p/v8/issues/detail?id=8742)), simplificando o código e melhorando a performance da serialização do rastreamento de pilha em até 30%.

## Funcionalidades da linguagem JavaScript

[A API `Intl.NumberFormat`](/features/intl-numberformat) para formatação de números sensível ao idioma ganha novas funcionalidades neste lançamento! Agora ela suporta notação compacta, notação científica, notação de engenharia, exibição de sinais e unidades de medida.

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
});
formatter.format(299792458);
// → &apos;299,792,458 m/s&apos;
```

Consulte [nosso explicador de recursos](/features/intl-numberformat) para mais detalhes.

## API do V8

Por favor, use `git log branch-heads/7.6..branch-heads/7.7 include/v8.h` para obter uma lista das alterações na API.

Os desenvolvedores que têm um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.7 -t branch-heads/7.7` para experimentar os novos recursos no V8 v7.7. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
