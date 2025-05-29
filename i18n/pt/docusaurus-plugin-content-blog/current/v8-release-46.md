---
title: 'Lançamento do V8 v4.6'
author: 'a equipe do V8'
date: 2015-08-28 13:33:37
tags:
  - lançamento
description: 'O V8 v4.6 vem com menos travamentos e suporte para novos recursos de linguagem ES2015.'
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é criada a partir do Git master do V8 imediatamente antes de o Chrome criar um branch para uma versão Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6), que estará em beta até ser lançado em coordenação com o Chrome 46 Stable. O V8 4.6 está repleto de novidades voltadas para desenvolvedores, e gostaríamos de oferecer um preview de alguns dos destaques em antecipação ao lançamento dentro de algumas semanas.

<!--truncate-->
## Suporte aprimorado ao ECMAScript 2015 (ES6)

O V8 v4.6 adiciona suporte para vários recursos do [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Operador de espalhamento

O [operador de espalhamento](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) torna muito mais conveniente trabalhar com arrays. Por exemplo, ele torna obsoleto o código imperativo quando você simplesmente deseja mesclar arrays.

```js
// Mesclando arrays
// Código sem o operador de espalhamento
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// Código com o operador de espalhamento
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

Outra boa aplicação do operador de espalhamento é substituir `apply`:

```js
// Parâmetros de função armazenados em um array
// Código sem o operador de espalhamento
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Oi ', 'Operador ', 'de espalhamento!'];
myFunction.apply(null, argsInArray);

// Código com o operador de espalhamento
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Oi ', 'Operador ', 'de espalhamento!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target) é uma das funcionalidades do ES6 projetadas para melhorar o trabalho com classes. Nos bastidores, na verdade é um parâmetro implícito para cada função. Se uma função é chamada com a palavra-chave `new`, então o parâmetro contém uma referência à função chamada. Se `new` não for usado, o parâmetro será undefined.

Na prática, isso significa que você pode usar `new.target` para descobrir se uma função foi chamada normalmente ou chamada como construtora via a palavra-chave `new`.

```js
function myFunction() {
  if (new.target === undefined) {
    throw 'Tente chamá-la com new.';
  }
  console.log('Funciona!');
}

// Falha:
myFunction();

// Funciona:
const a = new myFunction();
```

Quando classes e herança ES6 são usadas, `new.target` dentro do construtor de uma superclasse está vinculado ao construtor derivado que foi invocado com `new`. Em particular, isso dá às superclasses acesso ao protótipo da classe derivada durante a construção.

## Reduzir os travamentos

[Travamento](https://en.wiktionary.org/wiki/jank#Noun) pode ser um problema, especialmente ao jogar um jogo. Frequentemente, é ainda pior quando o jogo possui múltiplos jogadores. [oortonline.gl](http://oortonline.gl/) é um benchmark WebGL que testa os limites dos navegadores atuais renderizando uma cena 3D complexa com efeitos de partículas e renderização com shaders modernos. A equipe do V8 iniciou uma missão para explorar os limites da performance do Chrome nesses ambientes. Ainda não terminamos, mas os frutos de nossos esforços já estão começando a aparecer. O Chrome 46 mostra avanços incríveis na performance do oortonline.gl, que você pode ver abaixo.

Algumas das otimizações incluem:

- [Melhorias na performance de TypedArray](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArrays são amplamente usados em motores de renderização como Turbulenz (o motor por trás do oortonline.gl). Por exemplo, motores frequentemente criam arrays tipados (como Float32Array) em JavaScript e os passam para WebGL após aplicar transformações.
    - O ponto chave foi otimizar a interação entre o embutidor (Blink) e V8.
- [Melhorias na performance ao passar TypedArrays e outra memória do V8 para o Blink](https://code.google.com/p/chromium/issues/detail?id=515795)
    - Não há necessidade de criar handles adicionais (que também são rastreados pelo V8) para arrays tipados quando eles são passados para WebGL como parte de uma comunicação unidirecional.
    - Ao atingir os limites da memória alocada externamente (Blink), agora iniciamos uma coleta de lixo incremental em vez de uma completa.
- [Agendamento da coleta de lixo em períodos ociosos](/blog/free-garbage-collection)
    - As operações de coleta de lixo são programadas durante períodos de inatividade na thread principal, o que desobstrui o compositor e resulta em uma renderização mais suave.
- [Varredura simultânea ativada para toda a geração antiga do heap coletado pelo garbage](https://code.google.com/p/chromium/issues/detail?id=507211)
    - A liberação de pedaços de memória não utilizados é realizada em threads adicionais concorrentes à thread principal, o que reduz significativamente o tempo de pausa principal da coleta de lixo.

O bom é que todas as mudanças relacionadas ao oortonline.gl são melhorias gerais que potencialmente afetam todos os usuários de aplicativos que fazem uso intensivo do WebGL.

## API V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada grande lançamento.

Os desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 4.6 -t branch-heads/4.6` para experimentar os novos recursos no V8 v4.6. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
