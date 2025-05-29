---
title: 'Lançamento do V8 v8.4'
author: 'Camillo Bruni, aproveitando alguns booleanos frescos'
avatars:
 - 'camillo-bruni'
date: 2020-06-30
tags:
 - lançamento
description: 'O V8 v8.4 apresenta referências fracas e desempenho aprimorado do WebAssembly.'
tweet: '1277983235641761795'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso branch mais recente, [V8 versão 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4), que está em beta até seu lançamento em coordenação com o Chrome 84 Stable em algumas semanas. O V8 v8.4 está repleto de novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## WebAssembly

### Tempo de inicialização aprimorado

O compilador básico do WebAssembly ([Liftoff](https://v8.dev/blog/liftoff)) agora suporta [instruções atômicas](https://github.com/WebAssembly/threads) e [operações de memória em massa](https://github.com/WebAssembly/bulk-memory-operations). Isso significa que, mesmo que você use essas adições recentes à especificação, terá tempos de inicialização incrivelmente rápidos.

### Melhor depuração

Em um esforço contínuo para melhorar a experiência de depuração no WebAssembly, agora somos capazes de inspecionar qualquer quadro do WebAssembly que esteja ativo sempre que você pausar a execução ou atingir um ponto de interrupção.
Isso foi alcançado reutilizando o [Liftoff](https://v8.dev/blog/liftoff) para depuração. No passado, todo código que tivesse pontos de interrupção ou fosse executado passo a passo precisava ser executado no interpretador WebAssembly, o que reduz substancialmente a execução (frequentemente em cerca de 100×). Com o Liftoff, você perde apenas cerca de um terço do desempenho, mas pode executar passo a passo todo o código e inspecioná-lo a qualquer momento.

### Teste de Origem SIMD

A proposta SIMD permite que o WebAssembly aproveite as instruções vetoriais de hardware comumente disponíveis para acelerar cargas de trabalho intensivas em computação. O V8 tem [suporte](https://v8.dev/features/simd) para a [proposta SIMD do WebAssembly](https://github.com/WebAssembly/simd). Para habilitar isso no Chrome, use a flag `chrome://flags/#enable-webassembly-simd` ou inscreva-se para um [teste de origem](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567). [Testes de origem](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) permitem que desenvolvedores experimentem um recurso antes que ele seja padronizado e forneçam feedback valioso. Uma vez que uma origem tenha optado pelo teste, os usuários são incluídos no recurso durante o período do teste sem precisar atualizar as flags do Chrome.

## JavaScript

### Referências fracas e finalizadores

:::note
**Aviso!** Referências fracas e finalizadores são recursos avançados! Eles dependem do comportamento da coleta de lixo. A coleta de lixo é não determinística e pode não ocorrer.
:::

JavaScript é uma linguagem com coleta de lixo, o que significa que a memória ocupada por objetos que não são mais acessíveis pelo programa pode ser automaticamente recuperada quando o coletor de lixo é executado. Com exceção de referências em `WeakMap` e `WeakSet`, todas as referências em JavaScript são fortes e impedem que o objeto referenciado seja coletado. Por exemplo,

```js
const globalRef = {
  callback() { console.log('foo'); }
};
// Enquanto globalRef for acessível através do escopo global,
// nem ele nem a função em sua propriedade callback serão coletados.
```

Os programadores em JavaScript agora podem manter objetos de forma fraca via o recurso `WeakRef`. Objetos referenciados por referências fracas não impedem sua coleta de lixo, caso não sejam também referenciados de forma forte.

```js
const globalWeakRef = new WeakRef({
  callback() { console.log('foo'); }
});

(async function() {
  globalWeakRef.deref().callback();
  // Registra “foo” no console. globalWeakRef está garantido para estar vivo
  // no primeiro turno do loop de eventos após ser criado.

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve('foo'); }, 42);
  });
  // Aguarda um turno do loop de eventos.

  globalWeakRef.deref()?.callback();
  // O objeto dentro de globalWeakRef pode ser coletado pelo coletor de lixo
  // após o primeiro turno, pois não é mais acessível.
})();
```

O recurso acompanhante de `WeakRef`s é o `FinalizationRegistry`, que permite que programadores registrem callbacks para serem invocados após um objeto ser coletado pelo coletor de lixo. Por exemplo, o programa abaixo pode registrar `42` no console depois que o objeto inacessível no IIFE for coletado.

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // O segundo argumento é o valor “mantido” que é passado
  // para o finalizador quando o primeiro argumento é coletado.
})();
```

Os finalizadores são programados para serem executados no loop de eventos e nunca interrompem a execução síncrona do JavaScript.

Esses são recursos avançados e poderosos, e com um pouco de sorte, seu programa não precisará deles. Por favor, veja nosso [explicador](https://v8.dev/features/weak-references) para saber mais sobre eles!

### Métodos e acessórios privados

Os campos privados, que foram lançados na versão v7.4, são complementados com suporte a métodos e acessórios privados. Sintaticamente, os nomes de métodos e acessórios privados começam com `#`, assim como campos privados. Segue abaixo uma breve demonstração da sintaxe.

```js
class Component {
  #privateMethod() {
    console.log("Só posso ser chamado dentro do Component!");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

Métodos e acessórios privados têm as mesmas regras de escopo e semântica que os campos privados. Por favor, veja nosso [explicador](https://v8.dev/features/class-fields) para saber mais.

Obrigado a [Igalia](https://twitter.com/igalia) por contribuir com a implementação!

## API do V8

Por favor, use `git log branch-heads/8.3..branch-heads/8.4 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.4 -t branch-heads/8.4` para experimentar os novos recursos do V8 v8.4. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
