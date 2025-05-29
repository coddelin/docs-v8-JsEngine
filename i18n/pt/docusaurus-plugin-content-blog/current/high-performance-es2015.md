---
title: &apos;Desempenho elevado de ES2015 e além&apos;
author: &apos;Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), Engenheiro de Desempenho ECMAScript&apos;
avatars:
  - &apos;benedikt-meurer&apos;
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: &apos;O desempenho do V8 para os recursos da linguagem ES2015+ agora está no mesmo nível de seus equivalentes transpilados para ES5.&apos;
---
Nos últimos meses, a equipe do V8 concentrou-se em trazer o desempenho dos recursos recém-adicionados de [ES2015](https://www.ecma-international.org/ecma-262/6.0/) e outros recursos JavaScript ainda mais recentes para o mesmo nível de seus equivalentes transpilados para [ES5](https://www.ecma-international.org/ecma-262/5.1/).

<!--truncate-->
## Motivação

Antes de entrarmos nos detalhes das várias melhorias, devemos primeiro considerar por que o desempenho dos recursos ES2015+ é importante, apesar do uso generalizado do [Babel](http://babeljs.io/) no desenvolvimento web moderno:

1. Em primeiro lugar, há novos recursos do ES2015 que são apenas polyfilled sob demanda, como por exemplo o builtin [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign). Quando o Babel transpila [propriedades de espalhamento de objetos](https://github.com/sebmarkbage/ecmascript-rest-spread) (que são amplamente utilizadas por muitas aplicações [React](https://facebook.github.io/react) e [Redux](http://redux.js.org/)), ele confia no [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) em vez de um equivalente do ES5, se o VM suportá-lo.
1. Fazer polyfill dos recursos do ES2015 geralmente aumenta o tamanho do código, o que contribui significativamente para a atual [crise de desempenho web](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis), especialmente em dispositivos móveis comuns em mercados emergentes. Assim, o custo de apenas entregar, analisar e compilar o código pode ser bastante alto, mesmo antes de você chegar ao custo real de execução.
1. Por último, mas não menos importante, o JavaScript no lado do cliente é apenas um dos ambientes que dependem do motor V8. Há também o [Node.js](https://nodejs.org/) para aplicações e ferramentas do lado do servidor, onde os desenvolvedores não precisam transpilar o código para ES5, mas podem usar diretamente os recursos suportados pela [versão relevante do V8](https://nodejs.org/en/download/releases/) na versão alvo do Node.js.

Vamos considerar o seguinte trecho de código retirado da documentação do [Redux](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html):

```js
function todoApp(state = initialState, action) {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return { ...state, visibilityFilter: action.filter };
    default:
      return state;
  }
}
```

Há duas coisas nesse código que exigem transpilação: o parâmetro padrão para state e a propagação de state dentro do literal de objeto. O Babel gera o seguinte código ES5:

```js
&apos;use strict&apos;;

var _extends = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

function todoApp() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return _extends({}, state, { visibilityFilter: action.filter });
    default:
      return state;
  }
}
```

Agora imagine que [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) é ordens de magnitude mais lento do que o polyfill `_extends` gerado pelo Babel. Nesse caso, atualizar de um navegador que não suporta [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) para uma versão capaz de ES2015 do navegador seria uma regressão de desempenho séria e provavelmente dificultaria a adoção do ES2015 em geral.

Este exemplo também destaca outra desvantagem importante da transpilação: O código gerado que é enviado ao usuário geralmente é consideravelmente maior do que o código ES2015+ que o desenvolvedor escreveu inicialmente. No exemplo acima, o código original tem 203 caracteres (176 bytes comprimidos) enquanto o código gerado tem 588 caracteres (367 bytes comprimidos). Isso já é um aumento de tamanho de um fator dois. Vamos olhar outro exemplo da proposta de [iteradores assíncronos](https://github.com/tc39/proposal-async-iteration):

```js
async function* readLines(path) {
  let file = await fileOpen(path);
  try {
    while (!file.EOF) {
      yield await file.readLine();
    }
  } finally {
    await file.close();
  }
}
```

Babel traduz esses 187 caracteres (150 bytes gzipados) em impressionantes 2987 caracteres (971 bytes gzipados) de código ES5, sem contar o [runtime do regenerator](https://babeljs.io/docs/plugins/transform-regenerator/) que é necessário como dependência adicional:

```js
&apos;use strict&apos;;

var _asyncGenerator = function() {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function(arg) {
            resume(&apos;next&apos;, arg);
          }, function(arg) {
            resume(&apos;throw&apos;, arg);
          });
        } else {
          settle(result.done ? &apos;return&apos; : &apos;normal&apos;, result.value);
        }
      } catch (err) {
        settle(&apos;throw&apos;, err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case &apos;return&apos;:
          front.resolve({
            value: value,
            done: true
          });
          break;
        case &apos;throw&apos;:
          front.reject(value);
          break;
        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== &apos;function&apos;) {
      this.return = undefined;
    }
  }
  if (typeof Symbol === &apos;function&apos; && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke(&apos;next&apos;, arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke(&apos;throw&apos;, arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke(&apos;return&apos;, arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function await (value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function () {
  var _ref = _asyncGenerator.wrap(regeneratorRuntime.mark(function _callee(path) {
    var file;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _asyncGenerator.await(fileOpen(path));

          case 2:
            file = _context.sent;
            _context.prev = 3;

          case 4:
            if (file.EOF) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return _asyncGenerator.await(file.readLine());

          case 7:
            _context.next = 9;
            return _context.sent;

          case 9:
            _context.next = 4;
            break;

          case 11:
            _context.prev = 11;
            _context.next = 14;
            return _asyncGenerator.await(file.close());

          case 14:
            return _context.finish(11);

          case 15:
          case &apos;end&apos;:
            return _context.stop();
        }
      }
    }, _callee, this, [[3,, 11, 15]]);
  }));

  return function readLines(_x) {
    return _ref.apply(this, arguments);
  };
}();
```

Isso representa um aumento de **650%** no tamanho (a função genérica `_asyncGenerator` pode ser compartilhada dependendo de como você empacota seu código, então é possível amortizar parte desse custo entre vários usos de iteradores assíncronos). Nós não acreditamos que seja viável distribuir apenas código transpilado para ES5 a longo prazo, pois o aumento do tamanho não afeta apenas o tempo/custo de download, mas também adiciona sobrecarga adicional ao processo de parsing e compilação. Se realmente quisermos melhorar drasticamente o carregamento das páginas e a agilidade das aplicações web modernas, especialmente em dispositivos móveis, precisamos incentivar os desenvolvedores não apenas a usar ES2015+ ao escrever código, mas também a enviar esse código em vez de transpilar para ES5. Entregar bundles totalmente transpilados apenas para navegadores legados que não suportam ES2015. Para os implementadores de VM, essa visão significa que precisamos suportar os recursos ES2015+ nativamente **e** fornecer desempenho razoável.

## Metodologia de medição

Conforme descrito acima, o desempenho absoluto dos recursos do ES2015+ não é realmente um problema neste ponto. Em vez disso, a prioridade mais alta atualmente é garantir que o desempenho dos recursos do ES2015+ esteja no mesmo nível de seu equivalente inocente no ES5 e, mais importante ainda, da versão gerada pelo Babel. Convenientemente, já havia um projeto chamado [SixSpeed](https://github.com/kpdecker/six-speed), desenvolvido por [Kevin Decker](http://www.incaseofstairs.com/), que realiza mais ou menos exatamente o que precisávamos: uma comparação de desempenho dos recursos do ES2015 em relação ao ES5 inocente e ao código gerado por transpilers.

![O benchmark SixSpeed](/_img/high-performance-es2015/sixspeed.png)

Então decidimos adotar isso como base para nosso trabalho inicial de desempenho do ES2015+. Nós [forkamos o SixSpeed](https://fhinkel.github.io/six-speed/) e adicionamos alguns benchmarks. Focamos primeiro nas regressões mais sérias, ou seja, itens de linha onde a desaceleração do ES5 inocente para a versão recomendada do ES2015+ era superior a 2x, porque nossa suposição fundamental é que a versão inocente do ES5 será pelo menos tão rápida quanto a versão relativamente conforme à especificação gerada pelo Babel.

## Uma arquitetura moderna para uma linguagem moderna

No passado, o V8 teve dificuldades em otimizar os tipos de recursos de linguagem encontrados no ES2015+. Por exemplo, nunca foi viável adicionar suporte ao tratamento de exceções (ou seja, try/catch/finally) ao Crankshaft, o compilador clássico de otimização do V8. Isso significava que a capacidade do V8 de otimizar um recurso do ES6 como for...of, que essencialmente possui uma cláusula finally implícita, era limitada. As limitações do Crankshaft e a complexidade geral de adicionar novos recursos de linguagem ao full-codegen, o compilador de linha de base do V8, tornavam intrinsecamente difícil garantir que novos recursos do ES fossem adicionados e otimizados no V8 tão rapidamente quanto eram padronizados.

Felizmente, o Ignition e o TurboFan ([a nova pipeline de interpretador e compilador do V8](/blog/test-the-future)) foram projetados para oferecer suporte a toda a linguagem JavaScript desde o início, incluindo controle de fluxo avançado, tratamento de exceções e, mais recentemente, `for`-`of` e destruturação do ES2015. A integração estreita da arquitetura do Ignition e do TurboFan torna possível adicionar novos recursos rapidamente e otimizá-los de forma rápida e incremental.

Muitas das melhorias que alcançamos para recursos modernos de linguagem só foram viáveis com a nova pipeline do Ignition/TurboFan. O Ignition e o TurboFan provaram ser especialmente críticos para otimizar geradores e funções assíncronas. Os geradores há muito eram suportados pelo V8, mas não eram otimizáveis devido a limitações de controle de fluxo no Crankshaft. Funções assíncronas são essencialmente açúcar sintático sobre geradores, então caem na mesma categoria. A nova pipeline do compilador aproveita o Ignition para interpretar a AST e gerar bytecodes que simplificam o controle de fluxo complexo do gerador em bytecodes de controle de fluxo local mais simples. O TurboFan pode otimizar mais facilmente os bytecodes resultantes, pois não precisa saber nada específico sobre o controle de fluxo do gerador, apenas como salvar e restaurar o estado de uma função em yields.

![Como os geradores JavaScript são representados no Ignition e no TurboFan](/_img/high-performance-es2015/generators.svg)

## Situação atual

Nosso objetivo de curto prazo era atingir menos de 2× de desaceleração em média o mais rápido possível. Começamos analisando o teste mais crítico, e do Chrome 54 ao Chrome 58 (Canary) conseguimos reduzir o número de testes com desaceleração acima de 2× de 16 para 8 e, ao mesmo tempo, reduzir a pior desaceleração de 19× no Chrome 54 para apenas 6× no Chrome 58 (Canary). Também reduzimos significativamente a desaceleração média e mediana durante esse período:

![Desaceleração do ES2015+ em comparação com o equivalente nativo do ES5](/_img/high-performance-es2015/slowdown.svg)

Você pode ver uma tendência clara em direção à paridade entre ES2015+ e ES5. Em média, melhoramos o desempenho em relação ao ES5 em mais de 47%. Aqui estão alguns destaques que abordamos desde o Chrome 54.

![Desempenho do ES2015+ em comparação com o equivalente inocente do ES5](/_img/high-performance-es2015/comparison.svg)

Mais notavelmente, melhoramos o desempenho de novos construtos de linguagem baseados em iteração, como o operador spread, destruturação e loops `for`-`of`. Por exemplo, usando destruturação de arrays:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…agora é tão rápido quanto a versão inocente do ES5:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…e muito mais rápido (e curto) do que o código gerado pelo Babel:

```js
&apos;use strict&apos;;

var _slicedToArray = function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i[&apos;return&apos;]) _i[&apos;return&apos;]();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError(&apos;Invalid attempt to destructure non-iterable instance&apos;);
    }
  };
}();

function fn() {
  var _data = data,
      _data2 = _slicedToArray(_data, 1),
      c = _data2[0];

  return c;
}
```

Você pode conferir a palestra [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk) que apresentamos no último encontro do [Munich NodeJS User Group](http://www.mnug.de/) para mais detalhes:

Estamos comprometidos em continuar melhorando o desempenho dos recursos do ES2015+. Caso você esteja interessado nos detalhes, veja o [Plano de desempenho do V8 para ES2015 e além](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY).
