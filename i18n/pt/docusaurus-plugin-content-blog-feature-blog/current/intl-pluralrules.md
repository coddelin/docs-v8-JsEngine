---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-04
tags: 
  - Intl
description: "Lidar com plurais é um dos muitos problemas que podem parecer simples, até você perceber que cada idioma tem suas próprias regras de pluralização. A API Intl.PluralRules pode ajudar!"
tweet: "915542989493202944"
---
Iñtërnâtiônàlizætiøn é difícil. Lidar com plurais é um dos muitos problemas que podem parecer simples, até você perceber que cada idioma tem suas próprias regras de pluralização.

Para a pluralização em inglês, existem apenas dois resultados possíveis. Vamos usar a palavra “cat” como exemplo:

- 1 cat, ou seja, a forma `'one'`, conhecida como singular em inglês
- 2 cats, mas também 42 cats, 0.5 cats, etc., ou seja, a forma `'other'` (a única outra), conhecida como plural em inglês.

A nova [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) informa qual forma se aplica em um idioma de sua escolha com base em um número fornecido.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (ex: '0 cats')
pr.select(0.5); // 'other' (ex: '0.5 cats')
pr.select(1);   // 'one'   (ex: '1 cat')
pr.select(1.5); // 'other' (ex: '0.5 cats')
pr.select(2);   // 'other' (ex: '0.5 cats')
```

<!--truncate-->
Diferentemente de outras APIs de internacionalização, `Intl.PluralRules` é uma API de baixo nível que não realiza nenhuma formatação por si só. Em vez disso, você pode construir seu próprio formatador em cima dela:

```js
const suffixes = new Map([
  // Nota: em cenários do mundo real, você não codificaria os plurais
  // desta forma; eles fariam parte de seus arquivos de tradução.
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

Para as relativamente simples regras de pluralização em inglês, isso pode parecer exagero; no entanto, nem todos os idiomas seguem as mesmas regras. Alguns idiomas têm apenas uma única forma de pluralização, e outros têm múltiplas formas. [Galês](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), por exemplo, possui seis diferentes formas de pluralização!

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // Nota: a forma `two` é igual à forma `'one'`
  // especificamente para esta palavra, mas isso não é verdade para
  // todas as palavras no galês.
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

Para implementar uma pluralização correta enquanto suporta múltiplos idiomas, é necessário um banco de dados de idiomas e suas regras de pluralização. [O Unicode CLDR](http://cldr.unicode.org/) inclui esses dados, mas para usá-los em JavaScript, eles precisam ser incorporados e enviados juntamente com seu outro código JavaScript, aumentando os tempos de carregamento, de análise e o uso de memória. A API `Intl.PluralRules` transfere esse fardo para o motor JavaScript, possibilitando pluralizações internacionalizadas mais eficientes.

:::note
**Nota:** Embora os dados do CLDR incluam os mapeamentos de formas por idioma, eles não vêm com uma lista de formas singular/plural para palavras individuais. Você ainda precisa traduzir e fornecê-las por conta própria, como anteriormente.
:::

## Números ordinais

A API `Intl.PluralRules` suporta várias regras de seleção por meio da propriedade `type` no argumento opcional `options`. Seu valor padrão implícito (como usado nos exemplos acima) é `'cardinal'`. Para determinar o indicador ordinal para um número específico (ex.: `1` → `1st`, `2` → `2nd`, etc.), use `{ type: 'ordinal' }`:

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules` é uma API de baixo nível, especialmente em comparação com outros recursos de internacionalização. Como tal, mesmo que você não a utilize diretamente, pode estar usando uma biblioteca ou framework que depende dela.

À medida que esta API se torna mais amplamente disponível, você encontrará bibliotecas como [Globalize](https://github.com/globalizejs/globalize#plural-module) abandonando sua dependência em bancos de dados CLDR codificados e favorecendo a funcionalidade nativa, melhorando assim o desempenho na carga, análise, execução e uso de memória.

## Suporte a `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
