---
title: &apos;理解 ECMAScript 規範，第2部分&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh)，推測規範觀察員&apos;
avatars:
  - marja-holtta
date: 2020-03-02
tags:
  - ECMAScript
  - 理解 ECMAScript
description: &apos;閱讀 ECMAScript 規範的教程，第2部分&apos;
tweet: &apos;1234550773629014016&apos;
---

讓我們來多練習一些我們驚人的規範閱讀技巧。如果你還沒看過上一集，現在是個好機會！

[所有篇章](/blog/tags/understanding-ecmascript)

## 準備好進入第2部分了嗎？

了解規範的一個有趣的方法是從我們已知的 JavaScript 功能入手，找出它是如何被規範定義的。

> 警告！本集包含來自 [ECMAScript 規範](https://tc39.es/ecma262/)（截至 2020 年 2 月）的複製粘貼算法，最終它們可能會過時。

我們知道屬性會在原型鏈中查找：如果一個物件沒有我們試圖讀取的屬性，我們會沿著原型鏈往上找到它（或找到一個不再有原型的物件）。

例如：

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## 原型鏈的查找定義在哪裡？

讓我們嘗試找出這種行為的定義位置。一個不錯的起點是 [物件內部方法清單](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)。

這裡既有 `[[GetOwnProperty]]` 也有 `[[Get]]` ——我們關心的是不限於 _自有_ 屬性的版本，所以我們選擇 `[[Get]]`。

不幸的是，[屬性描述符的規範類型](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) 也有一個名為 `[[Get]]` 的欄位，因此在瀏覽規範時，我們需要小心區分這兩種不同的用法。

<!--truncate-->
`[[Get]]` 是一個 **基本內部方法**。**普通物件**實現基本內部方法的預設行為。**特殊物件**可以定義他們自己的 `[[Get]]` 方法，與預設行為不同。在這篇文章中，我們專注於普通物件。

`[[Get]]` 的預設實作委派給 `OrdinaryGet`：

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> 當 `O` 的 `[[Get]]` 內部方法以屬性鍵 `P` 和 ECMAScript 值 `Receiver` 被呼叫時，按照以下步驟執行：
>
> 1. 返回 `? OrdinaryGet(O, P, Receiver)`。

我們很快會看到，`Receiver` 是在調用訪問器屬性（accessor property）中的 getter 函數時作為 **this 值** 使用的值。

`OrdinaryGet` 的定義如下：

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> 當抽象操作 `OrdinaryGet` 以物件 `O`，屬性鍵 `P` 和 ECMAScript 值 `Receiver` 被呼叫時，按照以下步驟執行：
>
> 1. 斷言：`IsPropertyKey(P)` 是 `true`。
> 1. 令 `desc` 為 `? O.[[GetOwnProperty]](P)`。
> 1. 如果 `desc` 是 `undefined`，則
>     1. 令 `parent` 為 `? O.[[GetPrototypeOf]]()`。
>     1. 如果 `parent` 是 `null`，返回 `undefined`。
>     1. 返回 `? parent.[[Get]](P, Receiver)`。
> 1. 如果 `IsDataDescriptor(desc)` 是 `true`，返回 `desc.[[Value]]`。
> 1. 斷言：`IsAccessorDescriptor(desc)` 是 `true`。
> 1. 令 `getter` 為 `desc.[[Get]]`。
> 1. 如果 `getter` 是 `undefined`，返回 `undefined`。
> 1. 返回 `? Call(getter, Receiver)`。

原型鏈的查找在第 3 步：如果我們沒有找到該屬性作為自有屬性，我們調用原型的 `[[Get]]` 方法，該方法再次委派給 `OrdinaryGet`。如果還是找不到，我們繼續調用其原型的 `[[Get]]` 方法，依次類推，直到找到該屬性或到達一個沒有原型的物件。

讓我們看看當我們訪問 `o2.foo` 時該算法如何工作。我們首先以 `O` 為 `o2`，`P` 為 `"foo"` 調用 `OrdinaryGet`。`O.[[GetOwnProperty]]("foo")` 返回 `undefined`，因為 `o2` 沒有名為 `"foo"` 的自有屬性，所以我們進入第 3 步的 if 分支。在第 3.a 步中，我們將 `parent` 設置為 `o2` 的原型，即 `o1`。`parent` 不是 `null`，所以我們不在第 3.b 步返回。在第 3.c 步中，我們以屬性鍵 `"foo"` 調用父物件的 `[[Get]]` 方法，並返回它的結果。

父物件（`o1`）是一個普通物件，所以其 `[[Get]]` 方法再次調用 `OrdinaryGet`，此時以 `O` 為 `o1` 和 `P` 為 `"foo"`。`o1` 有一個名為 `"foo"` 的自有屬性，因此在第 2 步中，`O.[[GetOwnProperty]]("foo")` 返回相關的屬性描述符，我們將其存儲在 `desc` 中。

[財產描述符](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)是一種規範型別。資料屬性描述符直接將屬性值儲存在`[[Value]]`欄位。訪問器屬性描述符將訪問器函數儲存在`[[Get]]`和/或`[[Set]]`欄位中。在這種情況下，與`"foo"`相關聯的財產描述符是一個資料屬性描述符。

我們在步驟2中儲存在`desc`中的資料屬性描述符不是`undefined`，因此我們不會執行步驟3中的`if`分支。接下來，我們執行步驟4。財產描述符是一個資料屬性描述符，因此我們在步驟4中返回其`[[Value]]`欄位`99`，完成操作。

## `Receiver`是什麼以及從哪裡來？

`Receiver`參數僅在步驟8中的訪問器屬性情況下使用。當調用訪問器屬性中的getter函數時，它作為**this值**傳遞。

`OrdinaryGet`在整個遞歸過程中保持原始`Receiver`不變（步驟3.c）。讓我們找出`Receiver`最初是從哪裡來的！

搜尋`[[Get]]`被調用的地方，我們找到了一個作用於References的抽象操作`GetValue`。Reference是一種規範型別，由基值、引用名稱和嚴格引用標誌組成。在`o2.foo`的情況下，基值是Object `o2`，引用名稱是字串`"foo"`，而嚴格引用標誌是`false`，因為示例代碼是鬆散的。

### 插曲：為什麼Reference不是記錄（Record）？

插曲：Reference不是記錄（Record），儘管看起來它可以是。它包含三個組件，這三個組件完全可以表述為三個命名欄位。Reference不是記錄只是因為歷史原因。

### 回到`GetValue`

讓我們看看`GetValue`是如何定義的：

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`。
> 1. If `Type(V)` is not `Reference`, return `V`。
> 1. Let `base` be `GetBase(V)`。
> 1. If `IsUnresolvableReference(V)` is `true`, throw a `ReferenceError` exception。
> 1. If `IsPropertyReference(V)` is `true`, then
>     1. If `HasPrimitiveBase(V)` is `true`, then
>         1. Assert: In this case, `base` will never be `undefined` or `null`。
>         1. Set `base` to `! ToObject(base)`。
>     1. Return `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`。
> 1. Else,
>     1. Assert: `base` is an Environment Record。
>     1. Return `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`

我們示例中的Reference是`o2.foo`，它是一個財產引用（Property Reference）。因此，我們採取分支5。我們不採取分支5.a，因為基值`o2`不是[原始值](/blog/react-cliff#javascript-types)（如Number、String、Symbol、BigInt、Boolean、Undefined或Null）。

然後我們在步驟5.b中調用`[[Get]]`。我們傳遞的`Receiver`是`GetThisValue(V)`。在這種情況下，它只是Reference的基值：

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. Assert: `IsPropertyReference(V)` is `true`。
> 1. If `IsSuperReference(V)` is `true`, then
>     1. Return the value of the `thisValue` component of the reference `V`。
> 1. Return `GetBase(V)`。

對於`o2.foo`，我們不採取步驟2中的分支，因為它不是超級引用（如`super.foo`），但我們採取步驟3並返回Reference的基值`o2`。

將所有東西拼湊在一起，我們發現我們將`Receiver`設置為原始Reference的基值，然後在原型鏈遍歷過程中保持其不變。最後，如果我們找到的屬性是一個訪問器屬性，我們使用`Receiver`作為調用它的**this值**。

特別是，getter中的**this值**指的是我們嘗試獲取屬性所在的原始對象，而不是我們在原型鏈遍歷過程中找到屬性所在的對象。

讓我們試試看！

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

在此示例中，我們有一個名為`foo`的訪問器屬性，我們為其定義了一個getter。getter返回`this.x`。

然後我們訪問`o2.foo`——getter返回什麼？

我們發現當我們調用getter時，**this值**是我們最初嘗試獲取屬性所在的對象，而不是我們在原型鏈遍歷過程中找到屬性所在的對象。在此情況下，**this值**是`o2`，而不是`o1`。我們可以通過檢查getter是返回`o2.x`還是`o1.x`來驗證，事實上，它返回的是`o2.x`。

成功了！我們能夠根據規範中讀到的內容預測此代碼片段的行為。

## 訪問屬性 — 為什麼它會調用`[[Get]]`？

規範在哪裡說當訪問屬性如`o2.foo`時，Object內部方法`[[Get]]`會被調用？這一定在某處有所定義。別只聽我的說法！

我們發現Object內部方法`[[Get]]`是從操作於References的抽象操作`GetValue`中調用的。但`GetValue`是從哪裡調用的？

### `MemberExpression`的執行語義

規範的語法規則定義了語言的語法。[執行時語意](https://tc39.es/ecma262/#sec-runtime-semantics)定義了語法構造的「含義」（如何在執行時進行評估）。

如果你不熟悉[上下文無關文法](https://en.wikipedia.org/wiki/Context-free_grammar)，現在看看是個好主意！

我們将在後續章節中深入探討語法規則，目前我們保持簡單！尤其是，對於本章，我們可以忽略生成式中的下標（`Yield`、`Await`等）。

以下生成式描述了[`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression)的結構：

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

這裡我們有7個`MemberExpression`的生成式。一個`MemberExpression`可以僅僅是一個`PrimaryExpression`。或者可以從另一個`MemberExpression`和`Expression`通過拼接它們來構造，例如`MemberExpression [ Expression ]`，如`o2[&apos;foo&apos;]`。或者可以是`MemberExpression . IdentifierName`，如`o2.foo`——這是與我們示例相關的生成式。

生成式`MemberExpression : MemberExpression . IdentifierName`的執行時語意定義了在評估它時需要執行的步驟：

:::ecmascript-algorithm
> **[執行時語意：針對`MemberExpression : MemberExpression . IdentifierName`的評估](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. 令`baseReference`為評估`MemberExpression`的結果。
> 1. 令`baseValue`為`? GetValue(baseReference)`。
> 1. 如果此`MemberExpression`匹配的代碼是嚴格模式代碼，則令`strict`為`true`；否則令`strict`為`false`。
> 1. 返回`? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`。

該算法委托給抽象操作`EvaluatePropertyAccessWithIdentifierKey`，因此我們也需要閱讀它：

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict)`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> 抽象操作`EvaluatePropertyAccessWithIdentifierKey`將`baseValue`作為值，`identifierName`作為解析節點，以及`strict`作為布林參數。它執行以下步驟：
>
> 1. 斷言：`identifierName` 是`IdentifierName`。
> 1. 令`bv`為`? RequireObjectCoercible(baseValue)`。
> 1. 令`propertyNameString`為`identifierName`的`StringValue`。
> 1. 返回一個類型為引用的值，其基值組件為`bv`，其被引用的名稱組件為`propertyNameString`，其嚴格引用標記為`strict`。

也就是說：`EvaluatePropertyAccessWithIdentifierKey`構造了一個引用，該引用使用提供的`baseValue`作為基值，使用`identifierName`的字符串值作為屬性名稱，並使用`strict`作為嚴格模式標誌。

最終，該引用被傳遞給`GetValue`。這在規範的多個地方有定義，具體依賴於引用最終的使用方式。

### `MemberExpression`作為參數

在我們的示例中，我們使用屬性訪問作為參數：

```js
console.log(o2.foo);
```

在這種情況下，行為在`ArgumentList`生成式的執行時語意中進行定義，該語意調用了該參數的`GetValue`：

:::ecmascript-algorithm
> **[執行時語意：`ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. 令`ref`為評估`AssignmentExpression`的結果。
> 1. 令`arg`為`? GetValue(ref)`。
> 1. 返回唯一項`arg`的列表。

`o2.foo`看起來不像`AssignmentExpression`，但它正是如此，所以此生成式適用。要了解原因，你可以查看這個[額外內容](/blog/extras/understanding-ecmascript-part-2-extra)，但目前這不是絕對必要的。

第1步中的`AssignmentExpression`是`o2.foo`。`ref`是評估`o2.foo`的結果，即上述提到的引用。在第2步中，我們在其上調用`GetValue`。因此，我們知道內部方法`[[Get]]`將被調用，原型鏈遍歷將會發生。

## 總結

在本章中，我們研究了規範如何在不同層次定義語言特性，此處是原型查找，包括觸發該特性的語法構造和定義它的算法。
