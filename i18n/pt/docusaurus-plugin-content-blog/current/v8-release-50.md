---
title: "Lançamento do V8 v5.0"
author: "a equipe V8"
date: 2016-03-15 13:33:37
tags:
  - lançamento
description: "V8 v5.0 vem com melhorias de desempenho e adiciona suporte a vários novos recursos de linguagem ES2015."
---
O primeiro passo no [processo de lançamento](/docs/release-process) do V8 é o início de um novo branch a partir do Git master imediatamente antes que o Chromium faça o branch para um marco Beta do Chrome (aproximadamente a cada seis semanas). Nosso mais novo branch de lançamento é [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0), que permanecerá em beta até lançarmos uma versão estável em conjunto com o Chrome 50 Stable. Aqui estão os destaques dos novos recursos voltados para desenvolvedores nesta versão do V8.

<!--truncate-->
:::note
**Nota:** O número da versão 5.0 não possui significado semântico ou marca um lançamento maior (em oposição a um lançamento menor).
:::

## Suporte aprimorado ao ECMAScript 2015 (ES6)

O V8 v5.0 contém vários recursos ES2015 relacionados à correspondência de expressões regulares (regex).

### Flag Unicode do RegExp

A [Flag Unicode do RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters), `u`, ativa um novo modo Unicode para correspondência de expressões regulares. A Flag Unicode trata padrões e cadeias de caracteres regex como uma série de codepoints Unicode. Ela também expõe uma nova sintaxe para escapes de codepoints Unicode.

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

A flag `u` também faz com que o átomo `.` (também conhecido como o correspondente de um único caractere) corresponda a qualquer símbolo Unicode, em vez de apenas os caracteres no Plano Multilíngue Básico (BMP).

```js
const string = 'o 🅛 trem';

/o\s.\strem/.test(string);
// false

/o\s.\strem/u.test(string);
// true
```

### Hooks para customização do RegExp

O ES2015 inclui hooks para subclasses de RegExp que permitem alterar a semântica de correspondência. Subclasses podem sobrescrever métodos chamados `Symbol.match`, `Symbol.replace`, `Symbol.search` e `Symbol.split` para mudar como subclasses de RegExp se comportam em relação aos métodos `String.prototype.match` e similares.

## Melhorias de desempenho em recursos do ES2015 e ES5

A versão 5.0 também traz algumas melhorias notáveis de desempenho para recursos do ES2015 e ES5 já implementados.

A implementação de parâmetros de repouso está 8-10 vezes mais rápida do que na versão anterior, tornando mais eficiente reunir um grande número de argumentos em uma única matriz após uma chamada de função. `Object.keys`, útil para iterar sobre as propriedades enumeráveis de um objeto na mesma ordem retornada por `for`-`in`, agora é aproximadamente 2 vezes mais rápido.

## API do V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada lançamento principal.

Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 5.0 -t branch-heads/5.0` para experimentar os novos recursos do V8 5.0. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar você mesmo os novos recursos em breve.
