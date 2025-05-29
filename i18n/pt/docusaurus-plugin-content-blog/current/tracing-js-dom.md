---
title: 'Rastreamento do JS para o DOM e de volta novamente'
author: 'Ulan Degenbaev, Alexei Filippov, Michael Lippautz e Hannes Payer — a sociedade do DOM'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2018-03-01 13:33:37
tags:
  - internals
  - memória
description: 'As DevTools do Chrome agora podem rastrear e fazer snapshot de objetos DOM C++ e exibir todos os objetos DOM alcançáveis a partir do JavaScript com suas referências.'
tweet: '969184997545562112'
---
Depurar vazamentos de memória no Chrome 66 ficou muito mais fácil. As DevTools do Chrome agora podem rastrear e fazer snapshot de objetos DOM C++ e exibir todos os objetos DOM alcançáveis a partir do JavaScript com suas referências. Este recurso é um dos benefícios do novo mecanismo de rastreamento em C++ do coletor de lixo V8.

<!--truncate-->
## Contexto

Um vazamento de memória em um sistema de coleta de lixo ocorre quando um objeto não utilizado não é liberado devido a referências não intencionais de outros objetos. Vazamentos de memória em páginas da web frequentemente envolvem interações entre objetos JavaScript e elementos DOM.

O seguinte [exemplo simples](https://ulan.github.io/misc/leak.html) mostra um vazamento de memória que ocorre quando um programador esquece de desregistrar um ouvinte de evento. Nenhum dos objetos referenciados pelo ouvinte de evento pode ser coletado pelo coletor de lixo. Em particular, a janela do iframe vaza junto com o ouvinte de evento.

```js
// Janela principal:
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // Fazer algo com `localVariable`.
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // ERRO: esqueceu de desregistrar `leakingListener`.
});
```

O iframe com vazamento também mantém todos os seus objetos JavaScript vivos.

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

É importante entender a noção de caminhos de retenção para encontrar a causa raiz de um vazamento de memória. Um caminho de retenção é uma cadeia de objetos que impede a coleta de lixo do objeto com vazamento. A cadeia começa em um objeto raiz, como o objeto global da janela principal. A cadeia termina no objeto com vazamento. Cada objeto intermediário na cadeia possui uma referência direta ao próximo objeto na cadeia. Por exemplo, o caminho de retenção do objeto `Leak` no iframe é o seguinte:

![Figura 1: Caminho de retenção de um objeto vazado via `iframe` e ouvinte de evento](/_img/tracing-js-dom/retaining-path.svg)

Observe que o caminho de retenção cruza a fronteira JavaScript / DOM (destacada em verde/vermelho, respectivamente) duas vezes. Os objetos JavaScript vivem no heap V8, enquanto os objetos DOM são objetos C++ no Chrome.

## Snapshot do heap nas DevTools

Podemos inspecionar o caminho de retenção de qualquer objeto tirando um snapshot do heap nas DevTools. O snapshot do heap captura precisamente todos os objetos no heap do V8. Até recentemente, ele tinha apenas informações aproximadas sobre os objetos DOM C++. Por exemplo, o Chrome 65 mostra um caminho de retenção incompleto para o objeto `Leak` do exemplo simples:

![Figura 2: Caminho de retenção no Chrome 65](/_img/tracing-js-dom/chrome-65.png)

Apenas a primeira linha é precisa: o objeto `Leak` está de fato armazenado na `global_variable` do objeto window do iframe. As linhas subsequentes aproximam o caminho de retenção real, dificultando a depuração do vazamento de memória.

A partir do Chrome 66, as DevTools rastreiam objetos DOM C++ e capturam precisamente os objetos e referências entre eles. Isso é baseado no poderoso mecanismo de rastreamento de objetos C++ que foi introduzido para coleta de lixo entre componentes anteriormente. Como resultado, [o caminho de retenção nas DevTools](https://www.youtube.com/watch?v=ixadA7DFCx8) está realmente correto agora:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figura 3: Caminho de retenção no Chrome 66</figcaption>
</figure>

## Sob o capô: rastreamento entre componentes

Os objetos DOM são gerenciados pelo Blink — o mecanismo de renderização do Chrome, que é responsável por traduzir o DOM em texto e imagens reais na tela. O Blink e sua representação do DOM são escritos em C++, o que significa que o DOM não pode ser exposto diretamente ao JavaScript. Em vez disso, os objetos no DOM são divididos em duas partes: um objeto wrapper V8 disponível para o JavaScript e um objeto C++ que representa o nó no DOM. Esses objetos têm referências diretas entre si. Determinar a vida útil e a propriedade de objetos entre vários componentes, como Blink e V8, é difícil porque todas as partes envolvidas precisam concordar sobre quais objetos ainda estão vivos e quais podem ser recuperados.

No Chrome 56 e versões anteriores (ou seja, até março de 2017), o Chrome usava um mecanismo chamado _agrupamento de objetos_ para determinar a vivacidade. Os objetos eram atribuídos a grupos com base no seu contêiner em documentos. Um grupo com todos os seus objetos contidos era mantido ativo enquanto um único objeto fosse mantido ativo por algum outro caminho de retenção. Isso fazia sentido no contexto de nós do DOM que sempre se referem ao seu documento contêiner, formando os chamados árvores DOM. No entanto, essa abstração removia todos os caminhos reais de retenção, o que tornava difícil usá-la para depuração, como mostrado na Figura 2. No caso de objetos que não se encaixavam nesse cenário, por exemplo, closures JavaScript usadas como ouvintes de eventos, essa abordagem também se tornava complicada e resultava em vários bugs onde objetos wrapper JavaScript eram coletados prematuramente, sendo substituídos por wrappers JS vazios que perdiam todas as suas propriedades.

A partir do Chrome 57, essa abordagem foi substituída por rastreamento entre componentes, que é um mecanismo que determina a vivacidade rastreando do JavaScript para a implementação C++ do DOM e vice-versa. Implementamos rastreamento incremental no lado C++ com barreiras de gravação para evitar qualquer interrupção de rastreamento do tipo pare-o-mundo sobre a qual falamos em [posts anteriores do blog](/blog/orinoco-parallel-scavenger). O rastreamento entre componentes não apenas oferece melhor latência, mas também aproxima melhor a vivacidade dos objetos entre limites de componentes e corrige vários [cenários](https://bugs.chromium.org/p/chromium/issues/detail?id=501866) que costumavam causar vazamentos. Além disso, permite que o DevTools forneça um snapshot que realmente represente o DOM, como mostrado na Figura 3.

Experimente! Estamos felizes em ouvir seu feedback.
