---
title: '堆疊追蹤 API'
description: '本文檔概述 V8 的 JavaScript 堆疊追蹤 API。'
---
所有在 V8 中拋出的內部錯誤在創建時都會捕獲堆疊追蹤。可以通過非標準的 `error.stack` 屬性從 JavaScript 中訪問此堆疊追蹤。V8 還提供了各種鉤子以控制如何收集和格式化堆疊追蹤，以及允許自定義錯誤也可以收集堆疊追蹤。本文檔概述了 V8 的 JavaScript 堆疊追蹤 API。

## 基本堆疊追蹤

默認情況下，幾乎所有由 V8 拋出的錯誤都具有一個保存最上層 10 個堆疊幀的 `stack` 屬性，並以字符串格式存儲。以下是一個完全格式化的堆疊追蹤示例：

```
ReferenceError: FAIL is not defined
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

堆疊追蹤是在錯誤創建時收集的，無論錯誤在何處或多次拋出，其內容都是相同的。我們收集 10 個幀，因為一般來說足以實用，同時不會對性能產生明顯的負面影響。可以通過設置變量來控制收集幀數：

```js
Error.stackTraceLimit
```

將其設置為 `0` 可以禁用堆疊追蹤收集。可以使用任何有限的整數值來作為收集幀的最大數量。設置為 `Infinity` 則意味著所有幀都會被收集。此變量僅影響當前的上下文，必須為每個需要不同值的上下文顯式設置。（注意，在 V8 的術語中，“上下文”指的是 Google Chrome 中的一個頁面或 `<iframe>`）。若要設置影響所有上下文的不同默認值，可以使用以下 V8 命令行標誌：

```bash
--stack-trace-limit <value>
```

在使用 Google Chrome 運行 V8 時，可以使用以下方式傳遞此標誌：

```bash
--js-flags='--stack-trace-limit <value>'
```

## 異步堆疊追蹤

`--async-stack-traces` 標誌（自 [V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces) 默認啟用）啟用了新的 [零成本異步堆疊追蹤](https://bit.ly/v8-zero-cost-async-stack-traces)，它可以在 `Error` 實例的 `stack` 屬性中添加異步堆疊幀，即代碼中的 `await` 位置。這些異步幀在 `stack` 字符串中用 `async` 標記：

```
ReferenceError: FAIL is not defined
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

在本文檔編寫時，此功能僅限於 `await` 位置、`Promise.all()` 和 `Promise.any()`，因為在這些情況下，引擎可以在不增加任何額外開銷的情況下重建必要的信息（這就是為什麼它是零成本）。

## 自定義異常的堆疊追蹤收集

用於內置錯誤的堆疊追蹤機制是通過一個通用的堆疊追蹤收集 API 實現的，該 API 同樣可供用戶腳本使用。函數

```js
Error.captureStackTrace(error, constructorOpt)
```

向指定的 `error` 對象添加一個堆疊屬性，該屬性在調用 `captureStackTrace` 時生成堆疊追蹤。通過 `Error.captureStackTrace` 收集的堆疊追蹤會立即被收集、格式化並附加到指定的 `error` 對象。

可選的 `constructorOpt` 參數允許傳遞一個函數值。在收集堆疊追蹤時，堆疊追蹤中不會包括此函數頂部的所有幀，包括該函數本身。這可以用於隱藏對用戶無用的實現細節。定義一個捕獲堆疊追蹤的自定義錯誤的一般方法是：

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // 其他初始化代碼放在這裡。
}
```

將 MyError 作為第二個參數傳遞意味著構造函數 MyError 的調用不會出現在堆疊追蹤中。

## 自定義堆疊追蹤

與 Java 不同的是，在 Java 中，異常的堆疊追蹤是一個可供檢查堆疊狀態的結構值，而 V8 中的堆疊屬性僅包含格式化的堆疊追蹤的純字符串。這僅僅是為了與其他瀏覽器保持兼容性。然而，這並不是硬編碼的，而是默認行為，也可以被用戶腳本覆蓋。

為了提高效率，堆疊追蹤在捕獲時不進行格式化，而是在第一次訪問堆疊屬性時按需格式化。堆疊追蹤的格式化是通過調用

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

並使用此調用返回的值作為 `stack` 屬性的值。如果您將不同的函數值賦給 `Error.prepareStackTrace`，該函數將用於格式化堆棧追踪。它會傳遞為該錯誤物件準備堆棧追踪的錯誤物件，以及堆棧的結構化表示。使用者堆棧追踪格式化器可以自由地以任何他們想要的方式格式化堆棧追踪，甚至返回非字串值。可以安全地保留對 `prepareStackTrace` 調用完成後的結構化堆棧追踪物件的引用，這也使其成為一個有效的返回值。請注意，自定義的 `prepareStackTrace` 函數僅在訪問 `Error` 物件的 stack 屬性時調用一次。

結構化堆棧追踪是一個 `CallSite` 物件陣列，每個物件都代表一個堆棧框架。一個 `CallSite` 物件定義了以下方法

- `getThis`: 返回 `this` 的值
- `getTypeName`: 返回 `this` 的類型作為字串。這是存儲在 `this` 的 constructor 字段中的函數名稱（如果可用），否則為該物件的 `[[Class]]` 內部屬性。
- `getFunction`: 返回當前函數
- `getFunctionName`: 返回當前函數的名稱，通常是其 `name` 屬性。如果沒有 `name` 屬性，會嘗試從函數的上下文推斷名稱。
- `getMethodName`: 返回持有當前函數的 `this` 或其原型之一的屬性名稱
- `getFileName`: 如果此函數是在腳本中定義的，返回腳本名稱
- `getLineNumber`: 如果此函數是在腳本中定義的，返回當前行號
- `getColumnNumber`: 如果此函數是在腳本中定義的，返回當前列號
- `getEvalOrigin`: 如果此函數是通過調用 `eval` 創建的，返回代表調用 `eval` 的位置的字串
- `isToplevel`: 是否是頂層調用，即是全局物件嗎？
- `isEval`: 此調用是否發生在由 `eval` 調用定義的程式碼中？
- `isNative`: 此調用是否在原生 V8 程式碼中？
- `isConstructor`: 是否是構造函數調用？
- `isAsync`: 是否是異步調用（例如 `await`、`Promise.all()` 或 `Promise.any()`）？
- `isPromiseAll`: 是否異步調用 `Promise.all()`？
- `getPromiseIndex`: 返回在異步堆棧追踪中 `Promise.all()` 或 `Promise.any()` 跟隨的 promise 元素索引，或者如果 `CallSite` 不是異步 `Promise.all()` 或 `Promise.any()` 調用則返回 `null`。

使用 CallSite API 創建的默認堆棧追踪，因此任何可用的信息也可以通過該 API 獲得。

為了維持對嚴格模式函數施加的限制，擁有嚴格模式函數的框架以及其下的所有框架（如調用者等）都不允許訪問它們的接收者或函數物件。對於這些框架，`getFunction()` 和 `getThis()` 返回 `undefined`。

## 兼容性

此處描述的 API 是 V8 特有的，其他 JavaScript 實現不支持。大多數實現確實提供了一個 `error.stack` 屬性，但堆棧追踪的格式可能與此處描述的格式不同。建議使用此 API 的方式是：

- 僅在確定程式碼運行在 V8 中時依賴格式化堆棧追踪的佈局。
- 無論哪種實現運行您的程式碼，設置 `Error.stackTraceLimit` 和 `Error.prepareStackTrace` 是安全的，但請注意這僅在程式碼運行在 V8 時才有效果。

## 附錄：堆棧追踪格式

V8 使用的默認堆棧追踪格式可以為每個堆棧框架提供以下信息：

- 調用是否為構造調用。
- `this` 值的類型 (`Type`)。
- 調用的函數名稱 (`functionName`)。
- 持有該函數的 `this` 或其原型之一的屬性名稱 (`methodName`)。
- 源碼中的當前位置 (`location`)

上述任何信息可能不可用，並且根據這些信息的可用程度，使用不同的堆棧框架格式。如果上述所有信息均可用，格式化的堆棧框架如下：

```
at Type.functionName [as methodName] (location)
```

或者，在構造調用的情況下：

```
at new functionName (location)
```

或者，在異步調用的情況下：

```
at async functionName (location)
```

如果僅有 `functionName` 和 `methodName` 中的一個可用，或者如果它們都可用但相同，格式如下：

```
at Type.name (location)
```

如果兩者都不可用，則使用 `<anonymous>` 作為名稱。

`Type` 值是存儲在 `this` 的 constructor 字段中的函數名稱。在 V8 中，所有構造調用都會將該屬性設置為構造函數，因此除非在物件創建後該字段被主動更改，它包含該物件創建時的函數名稱。如果不可用，則使用物件的 `[[Class]]` 屬性。

一個特例是全局物件，其 `Type` 不會顯示。在這種情況下，堆棧框架的格式如下：

```
at functionName [as methodName] (location)
```

位置本身有幾種可能的格式。最常見的是定義當前函數的腳本中的檔名、行號和列號：

```
fileName:lineNumber:columnNumber
```

如果當前函數是使用 `eval` 創建的，格式如下：

```
eval at position
```

…其中 `position` 是調用 `eval` 發生的完整位置。請注意，如果有嵌套的 `eval` 調用，位置可能是嵌套的，例如：

```
eval 於 Foo.a (eval 於 Bar.z (myscript.js:10:3))
```

如果堆疊框架在 V8 的庫中，位置是：

```
native
```

…如果位置不可用，則是：

```
未知位置
```
