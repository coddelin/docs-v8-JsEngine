---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;Lidar com plurais é um dos muitos problemas que podem parecer simples, até você perceber que cada idioma tem suas próprias regras de pluralização. A API Intl.PluralRules pode ajudar!&apos;
tweet: &apos;915542989493202944&apos;
---
Iñtërnâtiônàlizætiøn é difícil. Lidar com plurais é um dos muitos problemas que podem parecer simples, até você perceber que cada idioma tem suas próprias regras de pluralização.

Para a pluralização em inglês, existem apenas dois resultados possíveis. Vamos usar a palavra “cat” como exemplo:

- 1 cat, ou seja, a forma `&apos;one&apos;`, conhecida como singular em inglês
- 2 cats, mas também 42 cats, 0.5 cats, etc., ou seja, a forma `&apos;other&apos;` (a única outra), conhecida como plural em inglês.

A nova [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) informa qual forma se aplica em um idioma de sua escolha com base em um número fornecido.

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (ex: &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (ex: &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (ex: &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (ex: &apos;0.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (ex: &apos;0.5 cats&apos;)
```

<!--truncate-->
Diferentemente de outras APIs de internacionalização, `Intl.PluralRules` é uma API de baixo nível que não realiza nenhuma formatação por si só. Em vez disso, você pode construir seu próprio formatador em cima dela:

```js
const suffixes = new Map([
  // Nota: em cenários do mundo real, você não codificaria os plurais
  // desta forma; eles fariam parte de seus arquivos de tradução.
  [&apos;one&apos;,   &apos;cat&apos;],
  [&apos;other&apos;, &apos;cats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 cat&apos;
formatCats(0);   // &apos;0 cats&apos;
formatCats(0.5); // &apos;0.5 cats&apos;
formatCats(1.5); // &apos;1.5 cats&apos;
formatCats(2);   // &apos;2 cats&apos;
```

Para as relativamente simples regras de pluralização em inglês, isso pode parecer exagero; no entanto, nem todos os idiomas seguem as mesmas regras. Alguns idiomas têm apenas uma única forma de pluralização, e outros têm múltiplas formas. [Galês](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), por exemplo, possui seis diferentes formas de pluralização!

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // Nota: a forma `two` é igual à forma `&apos;one&apos;`
  // especificamente para esta palavra, mas isso não é verdade para
  // todas as palavras no galês.
  [&apos;two&apos;,   &apos;gath&apos;],
  [&apos;few&apos;,   &apos;cath&apos;],
  [&apos;many&apos;,  &apos;chath&apos;],
  [&apos;other&apos;, &apos;cath&apos;],
]);
const pr = new Intl.PluralRules(&apos;cy&apos;);
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // &apos;0 cathod&apos;
formatWelshCats(1);   // &apos;1 gath&apos;
formatWelshCats(1.5); // &apos;1.5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

Para implementar uma pluralização correta enquanto suporta múltiplos idiomas, é necessário um banco de dados de idiomas e suas regras de pluralização. [O Unicode CLDR](http://cldr.unicode.org/) inclui esses dados, mas para usá-los em JavaScript, eles precisam ser incorporados e enviados juntamente com seu outro código JavaScript, aumentando os tempos de carregamento, de análise e o uso de memória. A API `Intl.PluralRules` transfere esse fardo para o motor JavaScript, possibilitando pluralizações internacionalizadas mais eficientes.

:::note
**Nota:** Embora os dados do CLDR incluam os mapeamentos de formas por idioma, eles não vêm com uma lista de formas singular/plural para palavras individuais. Você ainda precisa traduzir e fornecê-las por conta própria, como anteriormente.
:::

## Números ordinais

A API `Intl.PluralRules` suporta várias regras de seleção por meio da propriedade `type` no argumento opcional `options`. Seu valor padrão implícito (como usado nos exemplos acima) é `&apos;cardinal&apos;`. Para determinar o indicador ordinal para um número específico (ex.: `1` → `1st`, `2` → `2nd`, etc.), use `{ type: &apos;ordinal&apos; }`:

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;st&apos;],
  [&apos;two&apos;,   &apos;nd&apos;],
  [&apos;few&apos;,   &apos;rd&apos;],
  [&apos;other&apos;, &apos;th&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0th&apos;
formatOrdinals(1);   // &apos;1st&apos;
formatOrdinals(2);   // &apos;2nd&apos;
formatOrdinals(3);   // &apos;3rd&apos;
formatOrdinals(4);   // &apos;4th&apos;
formatOrdinals(11);  // &apos;11th&apos;
formatOrdinals(21);  // &apos;21st&apos;
formatOrdinals(42);  // &apos;42nd&apos;
formatOrdinals(103); // &apos;103rd&apos;
```

`Intl.PluralRules` é uma API de baixo nível, especialmente em comparação com outros recursos de internacionalização. Como tal, mesmo que você não a utilize diretamente, pode estar usando uma biblioteca ou framework que depende dela.

À medida que esta API se torna mais amplamente disponível, você encontrará bibliotecas como [Globalize](https://github.com/globalizejs/globalize#plural-module) abandonando sua dependência em bancos de dados CLDR codificados e favorecendo a funcionalidade nativa, melhorando assim o desempenho na carga, análise, execução e uso de memória.

## Suporte a `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
