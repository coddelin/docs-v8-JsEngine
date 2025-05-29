---
title: "Extras do V8"
author: "Domenic Denicola ([@domenic](https://twitter.com/domenic)), Feiticeiro de Streams"
avatars:
  - "domenic-denicola"
date: 2016-02-04 13:33:37
tags:
  - internos
description: "V8 v4.8 inclui “extras do V8”, uma interface simples projetada com o objetivo de permitir que emuladores escrevam APIs autogerenciadas de alto desempenho."
---
O V8 implementa um grande subconjunto dos objetos e funções incorporados da linguagem JavaScript no próprio JavaScript. Por exemplo, você pode ver nossa [implementação de promessas](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) escrita em JavaScript. Tais recursos incorporados são chamados de _autogerenciados_. Essas implementações são incluídas em nosso [instantâneo de inicialização](/blog/custom-startup-snapshots) para que novos contextos possam ser criados rapidamente, sem a necessidade de configurar e inicializar os elementos autogerenciados durante a execução.

<!--truncate-->
Emuladores do V8, como o Chromium, às vezes desejam escrever APIs também em JavaScript. Isso funciona especialmente bem para recursos de plataforma que são independentes, como [streams](https://streams.spec.whatwg.org/), ou para recursos que fazem parte de uma “plataforma em camadas” de capacidades em nível superior construídas sobre recursos em nível inferior pré-existentes. Embora seja sempre possível executar código extra no momento da inicialização para configurar APIs do emulador (como é feito no Node.js, por exemplo), idealmente os emuladores deveriam ser capazes de obter os mesmos benefícios de desempenho para suas APIs autogerenciadas que o V8 oferece.

Os extras do V8 são um novo recurso do V8, desde nosso [lançamento v4.8](/blog/v8-release-48), projetados com o objetivo de permitir que emuladores escrevam APIs autogerenciadas de alto desempenho por meio de uma interface simples. Extras são arquivos JavaScript fornecidos pelo emulador que são compilados diretamente no instantâneo do V8. Eles também têm acesso a algumas utilidades auxiliares que facilitam a criação de APIs seguras em JavaScript.

## Um exemplo

Um arquivo extra do V8 é simplesmente um arquivo JavaScript com uma determinada estrutura:

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurável: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

Há algumas coisas a observar aqui:

- O objeto `global` não está presente na cadeia de escopo, portanto, qualquer acesso a ele (como o do `Object`) deve ser feito explicitamente por meio do argumento `global` fornecido.
- O objeto `binding` é um lugar para armazenar valores ou recuperar valores do emulador. Uma API C++ `v8::Context::GetExtrasBindingObject()` fornece acesso ao objeto `binding` pelo lado do emulador. Em nosso exemplo simples, permitimos que o emulador execute o cálculo de norma; em um exemplo real, você pode delegar ao emulador algo mais complicado, como resolução de URLs. Também adicionamos o construtor `Vec2` ao objeto `binding`, para que o código do emulador possa criar instâncias de `Vec2` sem passar pelo objeto `global`, que pode ser mutável.
- O objeto `v8` fornece um pequeno número de APIs para permitir que você escreva códigos seguros. Aqui criamos símbolos privados para armazenar nosso estado interno de uma maneira que não pode ser manipulada externamente. (Símbolos privados são um conceito interno do V8 e não fazem sentido no código JavaScript padrão.) Os recursos incorporados do V8 frequentemente usam “chamadas de função-%” para esse tipo de coisa, mas os extras do V8 não podem usar funções-%, pois são um detalhe de implementação interno do V8 e não são adequados para os emuladores dependerem.

Você pode estar curioso sobre de onde vêm esses objetos. Todos os três são inicializados no [inicializador do V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc), que instala algumas propriedades básicas, mas principalmente deixa a inicialização para o JavaScript autogerenciado do V8. Por exemplo, quase todos os arquivos .js no V8 instalam algo no `global`; veja, por exemplo, [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) ou [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). E instalamos APIs no objeto `v8` [em vários lugares](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs). (O objeto `binding` está vazio até ser manipulado por um extra ou emulador, então o único código relevante no próprio V8 é quando o inicializador o cria.)

Por fim, para informar ao V8 que estaremos compilando um extra, adicionamos uma linha ao arquivo gyp do nosso projeto:

```js
'v8_extra_library_files': ['./Vec2.js']
```

(Você pode ver um exemplo do mundo real disso [no arquivo gyp do V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170).)

## Extras do V8 na prática

Os extras do V8 oferecem uma maneira nova e leve para incorporadores implementarem recursos. O código JavaScript pode manipular com mais facilidade os componentes internos do JavaScript como arrays, mapas ou promessas; pode chamar outras funções JavaScript sem cerimônias; e pode lidar com exceções de maneira idiomática. Diferentemente de implementações em C++, os recursos implementados em JavaScript através dos extras do V8 podem se beneficiar de otimizações como inlining, e suas chamadas não acarretam custos de cruzamento de fronteira. Esses benefícios são especialmente notáveis em comparação com sistemas tradicionais de vínculo, como os vínculos Web IDL do Chromium.

Os extras do V8 foram apresentados e aprimorados no último ano, e o Chromium atualmente está usando-os para [implementar streams](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js). O Chromium também está considerando os extras do V8 para implementar [personalização de rolagem](https://codereview.chromium.org/1333323003) e [APIs de geometria eficientes](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ).

Os extras do V8 ainda estão em desenvolvimento, e a interface tem algumas arestas e desvantagens que esperamos resolver com o tempo. A principal área para melhorias é a história de depuração: os erros não são fáceis de localizar, e a depuração em tempo de execução geralmente é feita com declarações de impressão. No futuro, esperamos integrar os extras do V8 nas ferramentas de desenvolvedor e no framework de rastreamento do Chromium, tanto para o próprio Chromium quanto para qualquer incorporador que utilize o mesmo protocolo.

Outro motivo de cautela ao usar extras do V8 é o esforço adicional do desenvolvedor necessário para escrever código seguro e robusto. O código dos extras do V8 opera diretamente no snapshot, assim como o código dos componentes internos auto-hospedados do V8. Ele acessa os mesmos objetos que o JavaScript de área de usuário, sem camada de vínculo ou contexto separado para prevenir tal acesso. Por exemplo, algo aparentemente simples como `global.Object.prototype.hasOwnProperty.call(obj, 5)` tem seis maneiras potenciais de falhar devido ao código do usuário que modifica os componentes internos (conte-as!). Incorporadores como o Chromium precisam ser robustos contra qualquer código do usuário, independentemente de seu comportamento, e, por isso, em tais ambientes, é necessário tomar mais cuidado ao escrever extras do que ao escrever recursos tradicionais implementados em C++.

Se você quiser aprender mais sobre os extras do V8, confira nosso [documento de design](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz), que fornece muito mais detalhes. Estamos ansiosos para melhorar os extras do V8 e adicionar mais recursos que permitam que desenvolvedores e incorporadores escrevam extensões expressivas e de alto desempenho para o runtime do V8.
