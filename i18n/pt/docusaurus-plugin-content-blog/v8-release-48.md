---
title: "V8 lançamento v4.8"
author: "a equipe do V8"
date: "2015-11-25 13:33:37"
tags: 
  - lançamento
description: "V8 v4.8 adiciona suporte para vários novos recursos de linguagem ES2015."
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes do Chrome criar um branch para um marco Beta. Hoje temos o prazer de anunciar nosso mais recente branch, [V8 versão 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8), que estará em beta até ser lançado em coordenação com a versão estável do Chrome 48. V8 4.8 contém alguns recursos voltados para desenvolvedores, então gostaríamos de dar uma prévia de alguns dos destaques em antecipação ao lançamento nas próximas semanas.

<!--truncate-->
## Suporte aprimorado ao ECMAScript 2015 (ES6)

Esta versão do V8 fornece suporte para dois [símbolos bem conhecidos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), símbolos incorporados na especificação ES2015 que permitem aos desenvolvedores usar vários elementos de linguagem de baixo nível que antes estavam ocultos.

### `@@isConcatSpreadable`

O nome de uma propriedade booleana que, se `true`, indica que um objeto deve ser expandido para seus elementos de array por `Array.prototype.concat`.

```js
(function() {
  'use strict';
  class AutomaticamenteEspalhandoArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const primeiro = [1];
  const segundo = new AutomaticamenteEspalhandoArray();
  segundo[0] = 2;
  segundo[1] = 3;
  const todos = primeiro.concat(segundo);
  // Saída [1, 2, 3]
  console.log(todos);
}());
```

### `@@toPrimitive`

O nome de um método para invocar em um objeto para conversões implícitas a valores primitivos.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const motor = new V8();
  console.log(Number(motor));
  console.log(String(motor));
}());
```

### `ToLength`

A especificação ES2015 ajusta a operação abstrata para conversão de tipo para converter um argumento em um inteiro adequado para uso como comprimento de um objeto do tipo array. (Embora não diretamente observável, essa alteração pode ser indiretamente visível ao lidar com objetos do tipo array com comprimento negativo.)

## API do V8

Por favor, confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada lançamento principal.

Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 4.8 -t branch-heads/4.8` para experimentar os novos recursos no V8 v4.8. Alternativamente, você pode [assinar o canal beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
