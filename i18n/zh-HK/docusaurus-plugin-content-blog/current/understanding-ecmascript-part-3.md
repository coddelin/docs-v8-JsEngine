---
title: '瞭解 ECMAScript 規範，第 3 部分'
author: '[Marja Hölttä](https://twitter.com/marjakh)，推測規範觀察者'
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - 瞭解 ECMAScript
description: '閱讀 ECMAScript 規範的教程'
tweet: '1245400717667577857'
---

[所有集數](/blog/tags/understanding-ecmascript)

在這一集中，我們將更深入地探討 ECMAScript 語言及其語法的定義。如果您不熟悉上下文無關文法，那麼現在正是了解基礎知識的好時機，因為規範使用上下文無關文法來定義語言。請參閱[《Crafting Interpreters》中關於上下文無關文法的章節](https://craftinginterpreters.com/representing-code.html#context-free-grammars)以獲得易於理解的介紹，或者查看[維基百科頁面](https://en.wikipedia.org/wiki/Context-free_grammar)以獲得更數學化的定義。

<!--truncate-->
## ECMAScript 文法

ECMAScript 規範定義了四種文法：

[詞彙文法](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar)描述了如何將 [Unicode 代碼點](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology) 翻譯為一系列 **輸入元素**（標記、行終止符、注釋、空白）。

[語法文法](https://tc39.es/ecma262/#sec-syntactic-grammar) 定義了語法正確的程序如何由標記組成。

[RegExp 文法](https://tc39.es/ecma262/#sec-patterns) 描述了如何將 Unicode 代碼點轉換為正則表達式。

[數值字符串文法](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type) 描述了字符串如何翻譯為數值。

每種文法都定義為一種上下文無關文法，由一組生成式組成。

這些文法使用略有不同的符號：語法文法使用 `LeftHandSideSymbol :`，而詞彙文法和 RegExp 文法使用 `LeftHandSideSymbol ::`，數值字符串文法則使用 `LeftHandSideSymbol :::`。

接下來，我們將更詳細地研究詞彙文法和語法文法。

## 詞彙文法

規範將 ECMAScript 源文本定義為 Unicode 代碼點的序列。例如，變量名稱不限於 ASCII 字符，也可以包括其他 Unicode 字符。規範不涉及實際編碼（如 UTF-8 或 UTF-16）。它假設源代碼已根據其所處的編碼轉換為 Unicode 代碼點的序列。

無法預先對 ECMAScript 源代碼進行標記化，這使得詞彙文法的定義稍微複雜一些。

例如，我們無法判斷 `/` 是除法運算符還是正則表達式的開始，除非查看其出現的更大上下文：

```js
const x = 10 / 5;
```

此處 `/` 是 `DivPunctuator`。

```js
const r = /foo/;
```

此處第一個 `/` 是 `RegularExpressionLiteral` 的開始。

模板引入了類似的歧義—`}` 的解釋取決於其出現的上下文：

```js
const what1 = 'temp';
const what2 = 'late';
const t = `I am a ${ what1 + what2 }`;
```

此處 <code>\`I am a $\{</code> 是 `TemplateHead`，而 <code>\}\`</code> 是 `TemplateTail`。

```js
if (0 == 1) {
}`not very useful`;
```

此處 `}` 是 `RightBracePunctuator`，而 <code>\`</code> 是 `NoSubstitutionTemplate` 的開始。

儘管 `/` 和 <code>}`</code> 的解釋取決於它們的“上下文”——它們在代碼語法結構中的位置——但我們接下來描述的文法仍然是上下文無關的。

詞彙文法使用多種目標符號來區分某些輸入元素被允許或不被允許的上下文。例如，目標符號 `InputElementDiv` 用於 `/` 是除法和 `/=` 是除法賦值的上下文中。[`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv) 的生成式列出了在此上下文中可能產生的標記：

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

在此上下文中，遇到 `/` 會產生 `DivPunctuator` 輸入元素。在這裡生成 `RegularExpressionLiteral` 是不可能的。

另一方面，[`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp) 是指 `/` 是正則表達式開始的上下文的目標符號：

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

從這些生成式可以看出，這可能會生成 `RegularExpressionLiteral` 輸入元素，但生成 `DivPunctuator` 則不可能。

類似地，還有另一個目標符號 `InputElementRegExpOrTemplateTail`，用於允許 `TemplateMiddle` 和 `TemplateTail` 的上下文中，此外還包括 `RegularExpressionLiteral`。最後，`InputElementTemplateTail` 是僅允許 `TemplateMiddle` 和 `TemplateTail` 但不允許 `RegularExpressionLiteral` 的上下文的目標符號。

在實現中，語法分析器（“解析器”）可以調用詞法分析器（“分詞器”或“詞法分析器”），將目標符號作為參數傳遞並請求下一個適合該目標符號的輸入元素。

## 語法分析

我們探討了詞法分析，該分析定義了如何從 Unicode 代碼點構造標記。語法分析建立在其基礎之上：它定義了語法正確的程序如何由標記組成。

### 示例：允許舊版標識符

向語法中引入新的關鍵字可能是一個破壞性更改——如果現有代碼已經使用該關鍵字作為標識符怎麼辦？

例如，在 `await` 成為關鍵字之前，有人可能會寫出以下代碼：

```js
function old() {
  var await;
}
```

ECMAScript 語法小心翼翼地引入了 `await` 關鍵字，以確保此代碼繼續工作。在異步函數內部，`await` 是一個關鍵字，因此以下代碼無法正常運行：

```js
async function modern() {
  var await; // 語法錯誤
}
```

在非生成器中將 `yield` 作為標識符允許，但在生成器中不允許的處理方式類似。

了解 `await` 如何被允許作為標識符需要理解 ECMAScript 特定的語法標記法。讓我們深入了解！

### 生成式及簡寫

讓我們看看 [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) 的生成規範是如何定義的。乍一看，語法可能有些令人望而生畏：

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

下標 (`[Yield, Await]`) 和前綴 (`+` 在 `+In` 以及 `?` 在 `?Async`) 的意思是什麼？

該標記法在 [語法標記法](https://tc39.es/ecma262/#sec-grammar-notation) 一節中有詳細解釋。

下標是一種簡寫，用於一次表達一組生成規範，對於一組左側符號。左側符號有兩個參數，這將展開成四個「真實」的左側符號：`VariableStatement`、`VariableStatement_Yield`、`VariableStatement_Await` 和 `VariableStatement_Yield_Await`。

注意，這裡純粹的 `VariableStatement` 意思是「沒有 `_Await` 和 `_Yield` 的 `VariableStatement`」。它不應與 <code>VariableStatement<sub>[Yield, Await]</sub></code> 混淆。

在生成式的右側，我們看到簡寫 `+In`，意味著「使用帶有 `_In` 的版本」，以及 `?Await`，表示「僅當左側符號具有 `_Await` 時使用帶有 `_Await` 的版本」（`?Yield` 亦是類似）。

第三個簡寫 `~Foo`，表示「使用不帶 `_Foo` 的版本」，在此生成式中並未使用。

有了這些信息，我們可以展開生成規範如下：

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

最終，我們需要弄清楚兩件事：

1. 在哪裡決定我們處於具有 `_Await` 的情況還是沒有 `_Await` 的情況？
2. 什麼地方產生區別——`Something_Await` 的生成規範與 `Something`（沒有 `_Await`）的生成規範在何處分歧？

### `_Await` 或非 `_Await`？

讓我們先處理第一個問題。不難猜測非異步函數和異步函數在選擇函數主體是否使用 `_Await` 參數上有所不同。讀取異步函數聲明的生成規範，我們發現 [這裡](https://tc39.es/ecma262/#prod-AsyncFunctionBody)：

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

注意 `AsyncFunctionBody` 沒有參數——參數被添加到了右側的 `FunctionBody`。

如果展開此生成規範，我們得到：

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

換句話說，異步函數使用 `FunctionBody_Await`，即處理函數主體中 `await` 作為關鍵字。

另一方面，如果我們處於非異步函數內部，[相關生成規範](https://tc39.es/ecma262/#prod-FunctionDeclaration) 是：

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

（`FunctionDeclaration` 還有另一個生成規範，但與我們的代碼示例無關。）

為了避免組合展開，我們忽略了該生成規範中未使用的 `Default` 參數。

生成規範的展開形式為：

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

在這個語法生產中，我們總是得到 `FunctionBody` 和 `FormalParameters`（沒有 `_Yield` 和 `_Await`），因為在未展開的語法生產中，它們都帶有 `[~Yield, ~Await]` 的參數化。

函式名稱處理方式不同：如果左側符號具有 `_Await` 和 `_Yield`，則它會取得這些參數。

總結一下：非同步函數具有 `FunctionBody_Await`，而非非同步函數則具有 `FunctionBody`（沒有 `_Await`）。由於我們在討論非生成器函數，無論是非同步範例函數還是非非同步範例函數，其參數化都不包含 `_Yield`。

也許記住哪個是 `FunctionBody`，哪個是 `FunctionBody_Await` 有點難。`FunctionBody_Await` 是用於將 `await` 作為識別符的函數，還是將 `await` 作為關鍵字的函數？

可以將 `_Await` 參數理解為「`await` 是關鍵字」。這種方法也是未來可擴展的。想像新增了一個關鍵字 `blob`，但僅存在於 "blob" 函數中。非 "blob" 的非非同步非生成器函數仍具有 `FunctionBody`（沒有 `_Await`、`_Yield` 或 `_Blob`），就像現在一樣。"blob" 函數會具有 `FunctionBody_Blob`，非同步 "blob" 函數會具有 `FunctionBody_Await_Blob`，依此類推。我們仍需將 `Blob` 次標記添加至語法生產，但已有函數的 `FunctionBody` 展開形式保持不變。

### 禁用 `await` 作為識別符

接下來，我們需要了解在 `FunctionBody_Await` 中如何禁用 `await` 作為識別符。

我們可以進一步跟蹤語法生產，查看 `_Await` 參數如何從 `FunctionBody` 一直到我們之前研究的 `VariableStatement` 的語法生產保持不變。

因此，在非同步函數中，我們將擁有 `VariableStatement_Await`；在非非同步函數中，我們將擁有 `VariableStatement`。

我們可以進一步跟蹤語法生產並追蹤參數。我們已看到 [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) 的語法生產如下：

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

所有 [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) 的語法生產僅保持參數不變：

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

（此處僅顯示與我們範例相關的 [語法生產](https://tc39.es/ecma262/#prod-VariableDeclaration)。）

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

`opt` 符號表示右側的符號是可選的；事實上有兩種生產，一種具有可選符號，一種沒有。

在與我們範例相關的簡單情況下，`VariableStatement` 包括關鍵字 `var`，後跟一個未初始化的單一 `BindingIdentifier`，最後以分號結束。

要禁用或允許 `await` 作為 `BindingIdentifier`，我們希望最終能得到如下：

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

這將禁用非同步函數中作為識別符的 `await`，並允許非非同步函數中作為識別符的 `await`。

但規範並未以這種方式定義，反而我們看到如下 [語法生產](https://tc39.es/ecma262/#prod-BindingIdentifier)：

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

展開後，這意味著以下幾種生產：

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

（我們省略了 `BindingIdentifier_Yield` 和 `BindingIdentifier_Yield_Await` 的生產，因為它們在我們的範例中並不需要。）

這似乎表示無論何時都允許將 `await` 和 `yield` 作為識別符。這到底是怎麼回事呢？整篇博文是否毫無意義？

### 靜態語義來解救

事實證明，需要 **靜態語義** 來禁止在非同步函數中使用 `await` 作為識別符。

靜態語義描述靜態規則——即程序運行之前被檢查的規則。

在這種情況下，[`BindingIdentifier` 的靜態語義](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) 定義以下的語法導向規則：

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> 如果該生產具有 <code><sub>[Await]</sub></code> 參數，則會產生語法錯誤。

實際上，這禁止了 `BindingIdentifier_Await : await` 的語法生產。

規範解釋了為什麼要有這種產物但通過靜態語義將其定義為語法錯誤的理由，是因為與自動分號插入（ASI）的干擾。

記住，當我們無法根據語法產物解析一行代碼時，ASI 就會啟動。ASI 嘗試添加分號以滿足語句和聲明必須以分號結束的要求。（我們稍後會更詳細地描述 ASI。）

考慮以下代碼（規範中的示例）：

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

如果語法不允許 `await` 作為標識符，ASI 就會啟動並將代碼轉換為以下語法正確的代碼，這也使用 `let` 作為標識符：

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

這種形式的干擾被認為太過混淆，因此使用靜態語義來禁止 `await` 作為標識符。

### 禁止標識符的 `StringValues`

還有另一個相關規則：

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> 如果此產物有一個 <code><sub>[Await]</sub></code> 參數且 `Identifier` 的 `StringValue` 是 `"await"`，則為語法錯誤。

這一點一開始可能會令人困惑。[`Identifier`](https://tc39.es/ecma262/#prod-Identifier) 定義如下：

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName but not ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await` 是一個 `ReservedWord`，那麼 `Identifier` 怎麼可能是 `await`？

事實證明，`Identifier` 不可能是 `await`，但它可能是某種其他的東西，其 `StringValue` 是 `"await"`——`await` 字符序列的另一種表示形式。

[標識符名稱的靜態語義](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue) 定義了如何計算標識符名稱的 `StringValue`。例如，字符 `a` 的 Unicode 轉義序列是 `\u0061`，因此 `\u0061wait` 的 `StringValue` 是 `"await"`。語法詞法不會將 `\u0061wait` 認為是關鍵字，而是將其視為 `Identifier`。靜態語義禁止在異步函數內使用它作為變量名稱。

因此這樣是可以的：

```js
function old() {
  var \u0061wait;
}
```

而這樣不可以：

```js
async function modern() {
  var \u0061wait; // 語法錯誤
}
```

## 總結

在這一節中，我們熟悉了詞法語法、句法語法以及用於定義句法語法的速記。作為示例，我們研究了禁止在異步函數中使用 `await` 作為標識符，但允許在非異步函數中使用它。

句法語法的其他有趣部分，例如自動分號插入和覆蓋語法，將在稍後的篇章中介紹。敬請期待！
