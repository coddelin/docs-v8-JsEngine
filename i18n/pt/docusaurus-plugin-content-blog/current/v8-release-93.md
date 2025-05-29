---
title: "Lançamento do V8 v9.3"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-08-09
tags:
 - lançamento
description: "O lançamento do V8 v9.3 traz suporte a Object.hasOwn e causas de erro, melhora o desempenho da compilação e desativa as mitigações de geração de código não confiável no Android."
tweet: ""
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada a partir do branch principal do Git do V8 imediatamente antes de um marco beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3), que está em beta até seu lançamento em coordenação com o Chrome 93 Stable em algumas semanas. O V8 v9.3 está repleto de muitas novidades voltadas para desenvolvedores. Este post oferece um preview de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### Compilação em lote com Sparkplug

Lançamos nosso novo compilador JIT de médio nível e super rápido [Sparkplug](https://v8.dev/blog/sparkplug) na versão v9.1. Por motivos de segurança, o V8 [protege contra gravação](https://en.wikipedia.org/wiki/W%5EX) a memória de código que gera, exigindo que altere as permissões entre gravável (durante a compilação) e executável. Isso é atualmente implementado usando chamadas `mprotect`. No entanto, como o Sparkplug gera código tão rapidamente, o custo de chamar `mprotect` para cada função compilada individual tornou-se um grande gargalo no tempo de compilação. No V8 v9.3, estamos introduzindo a compilação em lote para o Sparkplug: em vez de compilar cada função individualmente, compilamos várias funções em um lote. Isso amortiza o custo de alterar as permissões de página de memória fazendo isso apenas uma vez por lote.

A compilação em lote reduz o tempo geral de compilação (Ignition + Sparkplug) em até 44% sem regredir a execução do JavaScript. Se olharmos apenas para o custo de compilar o código Sparkplug, o impacto é obviamente maior, por exemplo, uma redução de 82% para o benchmark `docs_scrolling` (veja abaixo) no Windows 10. Surpreendentemente, a compilação em lote melhorou o desempenho de compilação ainda mais do que o custo de W^X, já que agrupar operações semelhantes geralmente é melhor para o CPU. No gráfico abaixo, você pode ver o impacto de W^X no tempo de compilação (Ignition + Sparkplug) e como a compilação em lote mitigou bem esse overhead.

![Benchmarks](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` é um alias mais fácil de usar para `Object.prototype.hasOwnProperty.call`.

Por exemplo:

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

Detalhes ligeiramente mais (mas não muito!) estão disponíveis em nosso [explicador de recursos](https://v8.dev/features/object-has-own).

### Causa de erro

A partir da v9.3, os vários construtores embutidos de `Error` são estendidos para aceitar um objeto de opções com uma propriedade `cause` como segundo parâmetro. Se tal objeto de opções for passado, o valor da propriedade `cause` será instalado como uma propriedade própria na instância de `Error`. Isso fornece uma maneira padronizada de encadear erros.

Por exemplo:

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

Como de costume, veja nosso [explicador de recursos](https://v8.dev/features/error-cause) mais detalhado.

## Mitigações de código não confiável desativadas no Android

Três anos atrás, introduzimos um conjunto de [mitigações de geração de código](https://v8.dev/blog/spectre) para defender contra ataques de Spectre. Sempre percebemos que isso era uma solução temporária que fornecia apenas proteção parcial contra ataques do [Spectre](https://spectreattack.com/spectre.pdf). A única proteção eficaz é isolar os sites via [Site Isolation](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html). Site Isolation foi habilitado no Chrome em dispositivos desktop há algum tempo, no entanto, habilitar o Site Isolation completo no Android tem sido mais desafiador devido a restrições de recursos. Porém, a partir do Chrome 92, [Site Isolation no Android](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html) foi habilitado em muitos mais sites que contêm dados sensíveis.

Assim, decidimos desativar as mitigações de geração de código do V8 para Spectre no Android. Essas mitigações são menos eficazes do que o Site Isolation e impõem um custo de desempenho. Desativá-las traz o Android para o mesmo nível das plataformas desktop, onde já foram desativadas desde a v7.0 do V8. Ao desativar essas mitigações, vimos algumas melhorias significativas no desempenho de benchmarks no Android.

![Melhorias no desempenho](/_img/v8-release-93/code-mitigations.svg)

## API do V8

Por favor, use `git log branch-heads/9.2..branch-heads/9.3 include/v8.h` para obter uma lista das mudanças na API.
