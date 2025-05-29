---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;處理複數是許多看似簡單的問題之一，直到你意識到每種語言都有自己的複數規則。`Intl.PluralRules` API 可以幫助！&apos;
tweet: &apos;915542989493202944&apos;
---
Iñtërnâtiônàlizætiøn 很難。處理複數是許多看似簡單的問題之一，直到你意識到每種語言都有自己的複數規則。

對於英文複數規則，只有兩種可能的結果。讓我們以“cat”這個詞為例：

- 1 cat，也就是 &apos;one&apos; 形式，英文中稱為單數
- 2 cats，但也包括 42 cats、0.5 cats 等，也就是 &apos;other&apos; 形式（唯一的另一種），英文中稱為複數。

全新的 [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) 告訴你根據給定的數字，某種語言應使用哪種形式。

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (例如 &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (例如 &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (例如 &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (例如 &apos;0.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (例如 &apos;0.5 cats&apos;)
```

<!--truncate-->
與其他國際化 API 不同，`Intl.PluralRules` 是一個低階的 API，它自身並不執行任何格式化。相反，你可以基於它自己建立格式化器：

```js
const suffixes = new Map([
  // 注意：在真實世界的場景中，你不會像這樣硬性編寫複數，
  // 它們應該是翻譯文件的一部分。
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

對於相對簡單的英文複數規則，這可能顯得有些過於複雜；然而，並非所有語言都遵循相同的規則。一些語言只有一種複數形式，而一些語言有多種形式。例如，[威爾士語](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules) 有六種不同的複數形式！

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // 注意：對於此特定單詞，&apos;two&apos; 形式恰好與 &apos;one&apos; 形式相同，
  // 但對威爾士語中的所有單詞並非如此。
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

為了實現正確的複數形式並支持多種語言，需要一個語言及其複數規則的資料庫。[Unicode CLDR](http://cldr.unicode.org/) 包括了這些數據，但在 JavaScript 中使用它，必須將數據嵌入並與其他 JavaScript 代碼一起提供，這會增加加載時間、解析時間和內存使用。`Intl.PluralRules` API 將這個負擔轉移至 JavaScript 引擎，使基於多國語言的複數處理更高效。

:::note
**注意：** 雖然 CLDR 數據包括每種語言的形式映射，但它並不包含單詞的單數/複數形式列表。你仍然需要像以前一樣翻譯並提供它們。
:::

## 序數

`Intl.PluralRules` API 通過可選 `options` 參數的 `type` 屬性支持多種選擇規則。隱式的默認值（如上述示例中使用）是 `&apos;cardinal&apos;`。要弄清楚某個數字的序數指示符（例如 `1` → `1st`、`2` → `2nd` 等），可以使用 `{ type: &apos;ordinal&apos; }`:

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

`Intl.PluralRules` 是一個低階的 API，尤其是與其他國際化功能相比。因此，即使您不直接使用它，您可能正在使用依賴於它的某些庫或框架。

隨著此 API 的可用性越來越廣泛，您會發現像 [Globalize](https://github.com/globalizejs/globalize#plural-module) 這樣的庫會逐漸放棄對硬編碼 CLDR 資料庫的依賴，轉而使用原生功能，從而改善加載時間效能、解析時間效能、運行時間效能以及記憶體使用率。

## `Intl.PluralRules` 支援

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
