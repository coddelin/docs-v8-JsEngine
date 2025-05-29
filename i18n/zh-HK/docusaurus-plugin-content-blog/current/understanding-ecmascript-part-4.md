---
title: &apos;理解 ECMAScript 規範，第 4 部份&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh)，規範推測觀察者&apos;
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - 理解 ECMAScript
description: &apos;閱讀 ECMAScript 規範的教程&apos;
tweet: &apos;1262815621756014594&apos;
---

[所有章節](/blog/tags/understanding-ecmascript)

## 同時在網絡的其他部分

[Jason Orendorff](https://github.com/jorendorff)自 Mozilla 發佈了[一篇深入分析 JS 語法怪癖的文章](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme)。即使實現細節不同，每個 JS 引擎都面臨著相同的這些怪癖問題。

<!--truncate-->
## 掩覆語法

在本章節中，我們更深入地研究 *掩覆語法*。它們是一種用來指定看似模糊的語法構造的方法。

同樣，我們將省略 `[In, Yield, Await]` 的下標簡寫，此處對本博客文章並不重要。請參閱[第 3 部份](/blog/understanding-ecmascript-part-3)了解其含義和用法。

## 有限前瞻

通常，解析器根據有限的前瞻（固定數量的後續詞）來決定使用哪個生成規範。

在某些情況下，下一個詞可以明確地決定要使用哪個生成規範。[例如](https://tc39.es/ecma262/#prod-UpdateExpression)：

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

如果我們正在解析 `UpdateExpression`，且下一個詞是 `++` 或 `--`，我們可以立即知道要使用的生成規範。如果下一個詞既不是 `++` 也不是 `--`，情況仍然不會太糟糕：我們可以從當前位置開始解析一個 `LeftHandSideExpression`，解析後再決定下一步的操作。

如果緊接在 `LeftHandSideExpression` 之後的詞是 `++`，則使用的生成規範為 `UpdateExpression : LeftHandSideExpression ++`。`--` 的情況類似。而如果緊接在 `LeftHandSideExpression` 之後的詞既不是 `++`，也不是 `--`，我們則使用生成規範 `UpdateExpression : LeftHandSideExpression`。

### 箭頭函數參數列表還是括號表達式？

區分箭頭函數參數列表和括號表達式則更加復雜。

例如：

```js
let x = (a,
```

這是像這樣的箭頭函數的開頭嗎？

```js
let x = (a, b) => { return a + b };
```

或者可能是像這樣的括號表達式？

```js
let x = (a, 3);
```

括號中的內容可以任意長——我們對其內容的判斷不能依賴有限數量的詞。

假設我們有以下簡單的生成規範：

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

現在我們無法通過有限的前瞻選擇合適的生成規範。如果我們需要解析一個 `AssignmentExpression`，而下一個詞是 `(`，如何決定解析哪個生成規範呢？我們既可以解析 `ArrowParameterList`，也可以解析 `ParenthesizedExpression`，但我們的猜測可能是錯的。

### 非常寬鬆的新符號：`CPEAAPL`

規範通過引入符號 `CoverParenthesizedExpressionAndArrowParameterList`（簡稱為 `CPEAAPL`）來解決此問題。`CPEAAPL` 實際上是一個 `ParenthesizedExpression` 或 `ArrowParameterList` 的符號，但我們目前還不知道是哪一個。

[生成規範](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList)對 `CPEAAPL` 非常寬鬆，允許 `ParenthesizedExpression` 和 `ArrowParameterList` 中出現的所有構造：

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

例如，以下表達式都是有效的 `CPEAAPL`：

```js
// 有效的 ParenthesizedExpression 和 ArrowParameterList：
(a, b)
(a, b = 1)

// 有效的 ParenthesizedExpression：
(1, 2, 3)
(function foo() { })

// 有效的 ArrowParameterList：
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// 非有效的表達式，但仍屬於 CPEAAPL：
(1, ...b)
(1, )
```

尾隨逗號和 `...` 只能在 `ArrowParameterList` 中出現。一些構造，例如 `b = 1` 可以出現在兩者中，但它們的含義不同：在 `ParenthesizedExpression` 中，它是賦值，在 `ArrowParameterList` 中，它是帶有默認值的參數。數字和其他 `PrimaryExpressions`（無效的參數名稱或參數解構模式）只能出現在 `ParenthesizedExpression` 中。但它們都可以出現在 `CPEAAPL` 中。

### 在生成規範中使用 `CPEAAPL`

現在我們可以在 [`AssignmentExpression` 的產物](https://tc39.es/ecma262/#prod-AssignmentExpression) 中使用非常寬鬆的 `CPEAAPL`。（注意：`ConditionalExpression` 通過一長串的產物鏈引向 `PrimaryExpression`，這裡未顯示）。

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

想像我們再次處於需要解析 `AssignmentExpression` 且下一個符號是 `(` 的情境。現在我們可以解析 `CPEAAPL` 並稍後再決定使用哪一個產物。無論我們是在解析 `ArrowFunction` 還是 `ConditionalExpression`，下一個需要解析的符號都是 `CPEAAPL`！

在解析完 `CPEAAPL` 之後，我們可以根據 `CPEAAPL` 後面的符號來決定使用原始的 `AssignmentExpression`（包含 `CPEAAPL` 的那個）的哪一個產物。

如果符號是 `=>`，我們使用以下產物：

```grammar
AssignmentExpression :
  ArrowFunction
```

如果符號是其他的東西，我們使用以下產物：

```grammar
AssignmentExpression :
  ConditionalExpression
```

例如：

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             CPEAAPL 後面的符號

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            CPEAAPL 後面的符號
```

在這個時候我們可以保留 `CPEAAPL` 原樣並繼續解析程式的其餘部分。例如，如果 `CPEAAPL` 位於 `ArrowFunction` 內，我們暫時不需要檢查它是否是一個有效的箭頭函數參數列表——這可以稍後完成。（實際上的解析器可能選擇立即進行有效性檢查，但從規範的角度來看，我們不需要這樣做。）

### 限制 CPEAAPL

如之前所述，`CPEAAPL` 的文法產物非常寬鬆，允許一些永遠不合法的構造（例如 `(1, ...a)`）。在根據文法解析程式之後，我們需要禁止對應的不合法構造。

規範通過添加以下限制來實現此目的：

:::ecmascript-algorithm
> [靜態語義：早期錯誤](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> 如果 `CPEAAPL` 沒有覆蓋一個 `ParenthesizedExpression` 則語法錯誤。

:::ecmascript-algorithm
> [補充語法](https://tc39.es/ecma262/#sec-primary-expression)
>
> 在處理以下產物的實例時
>
> `PrimaryExpression : CPEAAPL`
>
> 使用以下文法來細化對 `CPEAAPL` 的解釋：
>
> `ParenthesizedExpression : ( Expression )`

這表示：如果在語法樹的 `PrimaryExpression` 位置出現 `CPEAAPL`，則實際上它是一個 `ParenthesizedExpression`，並且這是唯一有效的產物。

`Expression` 永遠不可以是空的，因此 `( )` 不是有效的 `ParenthesizedExpression`。透過 [逗號操作符](https://tc39.es/ecma262/#sec-comma-operator) 可以創建用逗號分隔的列表，例如 `(1, 2, 3)`：

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

類似地，如果 `CPEAAPL` 出現在 `ArrowParameters` 的位置，則適用以下限制：

:::ecmascript-algorithm
> [靜態語義：早期錯誤](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> 如果 `CPEAAPL` 沒有覆蓋一個 `ArrowFormalParameters` 則語法錯誤。

:::ecmascript-algorithm
> [補充語法](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> 當產物
>
> `ArrowParameters` : `CPEAAPL`
>
> 被識別時，使用以下文法來細化對 `CPEAAPL` 的解釋：
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### 其他覆蓋文法

除了 `CPEAAPL`，規範還對其他看似模糊的構造使用覆蓋文法。

`ObjectLiteral` 被用作 `ObjectAssignmentPattern` 的覆蓋文法，後者出現在箭頭函數參數列表內。這意味著 `ObjectLiteral` 允許一些不能出現在實際物件字面值中的構造。

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

例如：

```js
let o = { a = 1 }; // 語法錯誤

// 帶有預設值的解構賦值參數的箭頭函數：
//
let f = ({ a = 1 }) => { return a; };
f({}); // 返回 1
f({a : 6}); // 返回 6
```

有限前瞻下，非同步箭頭函數看起來也會模糊不清：

```js
let x = async(a,
```

這是在呼叫名為 `async` 的函數還是非同步箭頭函數？

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

為此，文法定義了一個類似於 `CPEAAPL` 的覆蓋文法符號 `CoverCallExpressionAndAsyncArrowHead`。

## 摘要

在本集節目中，我們深入探討了規範如何定義覆蓋語法，並在無法基於有限前瞻確定當前語法結構的情況下使用它們。

尤其是，我們研究了如何區分箭頭函數參數列表與括號表達式，以及規範如何使用覆蓋語法先寬鬆地解析模糊的結構，然後用靜態語義規則進一步限制它們。
