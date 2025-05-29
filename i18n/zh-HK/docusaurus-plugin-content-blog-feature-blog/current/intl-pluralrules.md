---
title: '`Intl.PluralRules`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-10-04
tags:
  - Intl
description: '處理複數是許多看似簡單的問題之一，直到你意識到每種語言都有自己的複數規則。`Intl.PluralRules` API 可以幫助！'
tweet: '915542989493202944'
---
Iñtërnâtiônàlizætiøn 很難。處理複數是許多看似簡單的問題之一，直到你意識到每種語言都有自己的複數規則。

對於英文複數規則，只有兩種可能的結果。讓我們以“cat”這個詞為例：

- 1 cat，也就是 'one' 形式，英文中稱為單數
- 2 cats，但也包括 42 cats、0.5 cats 等，也就是 'other' 形式（唯一的另一種），英文中稱為複數。

全新的 [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) 告訴你根據給定的數字，某種語言應使用哪種形式。

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (例如 '0 cats')
pr.select(0.5); // 'other' (例如 '0.5 cats')
pr.select(1);   // 'one'   (例如 '1 cat')
pr.select(1.5); // 'other' (例如 '0.5 cats')
pr.select(2);   // 'other' (例如 '0.5 cats')
```

<!--truncate-->
與其他國際化 API 不同，`Intl.PluralRules` 是一個低階的 API，它自身並不執行任何格式化。相反，你可以基於它自己建立格式化器：

```js
const suffixes = new Map([
  // 注意：在真實世界的場景中，你不會像這樣硬性編寫複數，
  // 它們應該是翻譯文件的一部分。
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

對於相對簡單的英文複數規則，這可能顯得有些過於複雜；然而，並非所有語言都遵循相同的規則。一些語言只有一種複數形式，而一些語言有多種形式。例如，[威爾士語](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules) 有六種不同的複數形式！

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // 注意：對於此特定單詞，'two' 形式恰好與 'one' 形式相同，
  // 但對威爾士語中的所有單詞並非如此。
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

為了實現正確的複數形式並支持多種語言，需要一個語言及其複數規則的資料庫。[Unicode CLDR](http://cldr.unicode.org/) 包括了這些數據，但在 JavaScript 中使用它，必須將數據嵌入並與其他 JavaScript 代碼一起提供，這會增加加載時間、解析時間和內存使用。`Intl.PluralRules` API 將這個負擔轉移至 JavaScript 引擎，使基於多國語言的複數處理更高效。

:::note
**注意：** 雖然 CLDR 數據包括每種語言的形式映射，但它並不包含單詞的單數/複數形式列表。你仍然需要像以前一樣翻譯並提供它們。
:::

## 序數

`Intl.PluralRules` API 通過可選 `options` 參數的 `type` 屬性支持多種選擇規則。隱式的默認值（如上述示例中使用）是 `'cardinal'`。要弄清楚某個數字的序數指示符（例如 `1` → `1st`、`2` → `2nd` 等），可以使用 `{ type: 'ordinal' }`:

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

`Intl.PluralRules` 是一個低階的 API，尤其是與其他國際化功能相比。因此，即使您不直接使用它，您可能正在使用依賴於它的某些庫或框架。

隨著此 API 的可用性越來越廣泛，您會發現像 [Globalize](https://github.com/globalizejs/globalize#plural-module) 這樣的庫會逐漸放棄對硬編碼 CLDR 資料庫的依賴，轉而使用原生功能，從而改善加載時間效能、解析時間效能、運行時間效能以及記憶體使用率。

## `Intl.PluralRules` 支援

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
