---
title: 'Lançamento do V8 v5.1'
author: 'a equipe do V8'
date: 2016-04-23 13:33:37
tags:
  - lançamento
description: 'V8 v5.1 traz melhorias de desempenho, redução de interrupções e consumo de memória, e maior suporte aos recursos da linguagem ECMAScript.'
---
O primeiro passo no [processo de lançamento](/docs/release-process) do V8 é a criação de um novo branch a partir do Git master, imediatamente antes de o Chromium criar um branch para uma versão beta do Chrome (aproximadamente a cada seis semanas). Nosso mais novo branch de lançamento é [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1), que permanecerá em beta até lançarmos uma versão estável em conjunto com o Chrome 51 Stable. Aqui está um resumo dos novos recursos voltados para desenvolvedores nesta versão do V8.

<!--truncate-->
## Suporte aprimorado ao ECMAScript

V8 v5.1 contém várias alterações em direção à conformidade com o rascunho da especificação ES2017.

### `Symbol.species`

Métodos como `Array.prototype.map` constroem instâncias da subclasse como sua saída, com a opção de personalizar isso alterando [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species). Alterações análogas foram feitas em outras classes embutidas.

### Personalização de `instanceof`

Construtores podem implementar seu próprio método [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols), que substitui o comportamento padrão.

### Fechamento de iteradores

Iteradores criados como parte de um loop [`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) (ou outra iteração embutida, como o operador [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)) agora são verificados para um método close, que é chamado se o loop terminar precocemente. Isso pode ser usado para limpeza após a conclusão da iteração.

### Método `exec` de subclasses de RegExp

Subclasses de RegExp podem sobrescrever o método `exec` para alterar apenas o algoritmo principal de correspondência, com a garantia de que ele será chamado por funções de alto nível como `String.prototype.replace`.

### Inferência de nomes de funções

Nomes de funções inferidos para expressões de funções agora geralmente estão disponíveis na propriedade [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) de funções, seguindo a formalização das regras do ES2015. Isso pode alterar rastros de pilha existentes e fornecer nomes diferentes das versões anteriores do V8. Também dá nomes úteis para propriedades e métodos com nomes de propriedade computados:

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

Análogo a outros tipos de coleções, o método [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) em `Array` retorna um iterador sobre o conteúdo do array.

## Melhorias de desempenho

V8 v5.1 também traz algumas melhorias notáveis de desempenho para os seguintes recursos do JavaScript:

- Execução de loops como `for`-`in`
- `Object.assign`
- Instanciação de Promise e RegExp
- Chamadas para `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round` e `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` & `Array.prototype.toString`
- Redução de strings repetidas, por exemplo `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 tem suporte preliminar para [WebAssembly](/blog/webassembly-experimental). Você pode habilitá-lo usando a flag `--expose_wasm` no `d8`. Alternativamente, você pode testar os [demos do Wasm](https://webassembly.github.io/demo/) com o Chrome 51 (Canal Beta).

## Memória

O V8 implementou mais partes do [Orinoco](/blog/orinoco):

- Evacuação paralela da geração jovem
- Conjuntos de lembrança escaláveis
- Alocação de espaço negro

O impacto é a redução de interrupções e consumo de memória em momentos de necessidade.

## API do V8

Por favor, veja nosso [resumo das alterações na API](https://bit.ly/v8-api-changes). Este documento é atualizado regularmente algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 5.1 -t branch-heads/5.1` para experimentar os novos recursos do V8 v5.1. Alternativamente, você pode [inscrever-se no canal beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
