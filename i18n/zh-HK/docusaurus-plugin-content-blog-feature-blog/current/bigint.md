---
title: "BigInt：JavaScript 中的任意精度整數"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: "BigInts 是 JavaScript 中一種新的數值型原始類型，能夠表示具有任意精度的整數。本文通過一些使用案例，並將 BigInt 與 JavaScript 中的數值進行比較，來解釋 Chrome 67 中的新功能。"
tweet: "990991035630206977"
---
`BigInt` 是 JavaScript 中一種新的數值型原始類型，能夠表示具有任意精度的整數。通過 `BigInt`，您可以安全地存儲並操作超出數值類型安全整數範圍的大整數。本文通過一些使用案例，並將 `BigInt` 與 JavaScript 中的 `Number` 進行比較，來解釋 Chrome 67 中的新功能。

<!--truncate-->
## 使用案例

任意精度的整數為 JavaScript 解鎖了許多新的使用場景。

`BigInt` 使正確執行整數運算無溢出成為可能。這一點本身就帶來了無數新的可能性。例如，在金融技術中，大數的數學運算很常見。

[大型整數 ID](https://developer.twitter.com/en/docs/basics/twitter-ids) 和 [高精度時間戳](https://github.com/nodejs/node/pull/20220) 無法安全地用 JavaScript 的 `Number` 表示。這 [經常](https://github.com/stedolan/jq/issues/1399) 導致 [現實中的 Bug](https://github.com/nodejs/node/issues/12115)，迫使 JavaScript 開發者將它們表示為字符串。而使用 `BigInt` 後，這些數據現在可以用數值來表示。

`BigInt` 可以成為最終 `BigDecimal` 實現的基礎。這對表示具有小數精度的金額以及對其進行準確運算（即解決 `0.10 + 0.20 !== 0.30` 問題）非常有用。

以前，有這類使用場景的 JavaScript 應用程序必須依靠用戶空間的庫來模擬類似 `BigInt` 的功能。當 `BigInt` 廣泛可用後，此類應用程序可以拋棄這些運行時依賴，轉而使用原生的 `BigInt`。這有助於減少加載時間、解析時間和編譯時間，此外還能顯著提升運行時性能。

![Chrome 中的原生 `BigInt` 實現比常見的用戶空間庫的性能更好。](/_img/bigint/performance.svg)

## 現狀：`Number`

JavaScript 中的 `Number` 是以 [雙精度浮點數](https://en.wikipedia.org/wiki/Floating-point_arithmetic) 表示的。這意味著它們具有有限的精度。`Number.MAX_SAFE_INTEGER` 常量表示可以安全遞增的最大整數。它的值是 `2**53-1`。

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**注意：** 為了方便閱讀，我將這個大數的數字以千為單位進行分組，使用下劃線作為分隔符。[數值文字分隔符提案](/features/numeric-separators) 使得通用的 JavaScript 數值文字也可以這樣表示。
:::

將它遞增一次會得到預期的結果：

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

但是，如果再遞增一次，結果將不再是 JavaScript `Number` 可以精確表示的：

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

注意 `max + 1` 和 `max + 2` 的結果是一樣的。在 JavaScript 中，當我們得到這個特定值時，無法判斷是否準確。對於超出安全整數範圍的整數進行任何計算（即從 `Number.MIN_SAFE_INTEGER` 到 `Number.MAX_SAFE_INTEGER` 之外），都可能導致精度損失。因此，我們只能依賴於安全範圍內的數值整數。

## 新熱點：`BigInt`

`BigInt` 是 JavaScript 中一種新的數值型原始類型，能夠表示具有[任意精度](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic)的整數。通過`BigInt`，您可以安全地存儲並操作超出`Number`安全整數範圍的大整數。

要創建 `BigInt`，請在任意整數文字後添加 `n` 後綴。例如，將 `123` 轉換為 `123n`。全球的 `BigInt(number)` 函數可以用來將 `Number` 轉換為 `BigInt`。換句話說，`BigInt(123) === 123n`。讓我們使用這兩種技術來解決前面的問題：

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

這裡是另一個例子，我們在其中乘以兩個 `Number`：

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

看著最不重要的位數，`9` 和 `3`，我們知道乘法的結果應該以 `7` 結尾（因為 `9 * 3 === 27`）。然而，結果卻以一堆零結尾。這顯然是錯的！讓我們改用 `BigInt` 再試一次：

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

這次我們得到了正確的結果。

`Number` 的安全整數限制並不適用於 `BigInt`。因此，使用 `BigInt` 我們可以進行正確的整數算術，而無需擔心精度丟失。

### 一個新的原始型別

`BigInt` 是 JavaScript 語言中的一個新原始型別。作為一個新的型別，`BigInt` 可以通過 `typeof` 運算子檢測其型別:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

因為 `BigInt` 是一個獨立的型別，所以 `BigInt` 與 `Number` 在嚴格相等時永遠不相等，例如 `42n !== 42`。要將 `BigInt` 與 `Number` 進行比較，請在執行比較之前將其中之一轉換為另一個型別，或者使用抽象等於 (`==`):

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

當強制轉換為布林值 (例如在使用 `if`, `&&`, `||` 或 `Boolean(int)` 時)， `BigInt` 遵循與 `Number` 相同的邏輯。

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → logs 'else', 因為 `0n` 是假值。
```

### 運算子

`BigInt` 支援最常用的運算子。二元 `+`, `-`, `*` 和 `**` 都能如預期工作。`/` 和 `%` 也能工作，並根據需要向零取整。按位運算子 `|`, `&`, `<<`, `>>`, 和 `^` 假定以[二補數表示](https://en.wikipedia.org/wiki/Two%27s_complement)負值，正如它們在 `Number` 中所做的。

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

一元 `-` 可以用於表示負的 `BigInt` 值，例如 `-42n`。一元 `+` **不支持**，因為它會破壞 asm.js 代碼中對 `+x` 一直生成 `Number` 或拋出例外的期望。

需要注意的是，不允許將 `BigInt` 和 `Number` 混合操作。這是一件好事，因為任何隱式的強制轉換可能會丟失資訊。考慮這個例子:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

結果應該是什麼？這裡沒有好的答案。`BigInt` 無法表示小數，而 `Number` 無法在安全整數範圍外表示 `BigInt`。因此，混合操作會導致 `TypeError` 例外。

唯一的例外是比較運算子，例如 `===`（如前所述）、`<` 和 `>=` ——因為它們返回布林值，沒有精度丟失的風險。

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

因為 `BigInt` 和 `Number` 通常不能混合，因此請避免重載或魔術般地將現有代碼“升級”為使用 `BigInt` 而不是 `Number`。決定您要在哪個範疇內操作，然後堅持該選擇。對於_新的_潛在大整數操作的 API，`BigInt` 是最佳選擇。而對於已知在安全整數範圍內的整數值，`Number` 仍然是合理的。

需要注意另一件事是，[無符號右移 (`>>>`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift)對 `BigInt` 無意義，因為它們總是有符號的。因此，`BigInt` 不支持 `>>>`。

### API

一些新的 `BigInt` 特定 API 可供使用。

全域的 `BigInt` 建構函數類似於 `Number` 建構函數：它將其引數轉換為 `BigInt`（如前面所述）。如果轉換失敗，則拋出 `SyntaxError` 或 `RangeError` 例外。

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

第一個例子中我們向 `BigInt()` 傳遞了一個數字字面值。這是一個不好的寫法，因為 `Number` 存在精度丟失的問題，因此在 `BigInt` 的轉換發生之前我們可能已經丟失了精度：

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

基於此原因，我們建議要麼使用 `BigInt` 字面量語法（帶 `n` 後綴），要麼將字串（而不是 `Number`！）傳遞給 `BigInt()`：

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

兩個函數庫可用於將 `BigInt` 值包裹為有限位元的有符號或無符號整數。`BigInt.asIntN(width, value)` 將 `BigInt` 值包裹為 `width` 位元的二進位有符號整數，而 `BigInt.asUintN(width, value)` 將 `BigInt` 值包裹為 `width` 位元的二進位無符號整數。例如，如果您在執行 64 位算術操作，可以使用這些 API 在適當範圍內工作：

```js
// 能夠表示為有符號64位整數的最大可能 BigInt 值。
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
// → 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ 因為溢出的負值
```

注意當我們傳入超過 64 位元整數範圍（即絕對數值 63 位元 + 1 位元符號）的 `BigInt` 值時，溢位會立即發生。

`BigInt` 使準確表示 64 位元有符號和無符號整數成為可能，這在其他程式語言中經常使用。新增的兩種類型化陣列類型 `BigInt64Array` 和 `BigUint64Array` 讓表示和操作此類數值的清單更加高效：

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

`BigInt64Array` 類型確保其值保持在有符號的 64 位元限制內。

```js
// 可以表示為有符號 64 位元整數的最大 BigInt 值。
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ 因為溢位導致為負
```

`BigUint64Array` 類型則使用無符號的 64 位元限制完成相同操作。

## Polyfilling 與轉譯 BigInts

撰寫本文時，只有 Chrome 支援 `BigInt`。其他瀏覽器積極在實現這項功能。但如果你希望 *今天* 就使用 `BigInt` 功能而不犧牲瀏覽器相容性呢？很高興你問了！答案至少可以說是有趣的。

與大多數其他現代 JavaScript 功能不同，`BigInt` 無法合理地轉譯至 ES5。

`BigInt` 提案[更改了運算符的行為](#operators)（例如 `+`、`>=` 等）以支援 `BigInt`。這些更改無法直接 Polyfill，這也使得在大多數情況下難以使用 Babel 或類似工具將 `BigInt` 程式碼轉譯為回退程式碼。原因是在這種轉譯中必須以某個函數呼叫替換程式中的*每一個運算符*，以對輸入進行型別檢查，這會帶來無法接受的運行時性能損失。此外，這還會大幅增加任何轉譯後的程式包的檔案大小，不利於下載、解析和編譯時間。

更可行和面向未來的解決方案是暫時使用 [JSBI 庫](https://github.com/GoogleChromeLabs/jsbi#why)來撰寫程式碼。JSBI 是 `BigInt` 在 V8 和 Chrome 的 JavaScript 移植版本——根據設計，它的行為與原生 `BigInt` 功能完全一致。不同之處在於它不是依賴語法，而是公開 [一個 API](https://github.com/GoogleChromeLabs/jsbi#how)：

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

一旦你關心的所有瀏覽器都原生支援 `BigInt`，你可以[使用 `babel-plugin-transform-jsbi-to-bigint` 將你的程式碼轉譯為原生 `BigInt` 程式碼](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint)，並移除對 JSBI 的依賴。例如，上述範例會轉譯為：

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## 延伸閱讀

如果你對 `BigInt` 背後的運作方式感興趣（例如它們如何在記憶體中表示，以及如何執行其操作），[請閱讀我們的 V8 部落格文章，其中包含實現細節](/blog/bigint)。

## `BigInt` 支援情況

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
