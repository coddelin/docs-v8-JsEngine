---
title: "更快初始化具有新類特性的實例"
author: "[Joyee Cheung](https://twitter.com/JoyeeCheung)，實例初始化器"
avatars: 
  - "joyee-cheung"
date: 2022-04-20
tags: 
  - internals
description: "自從 V8 v9.7 以來，具有新類特性的實例初始化速度變得更快。"
tweet: "1517041137378373632"
---

自 v8 v7.2 開始，類字段已在 V8 中推出，而私有類方法自 v8.4 啟用。隨著相關提案於 2021 年達到第 4 階段，針對 V8 中新類特性的支持改進工作開始啟動 —— 在此之前，這些特性的採用主要受到兩個問題的影響：

<!--truncate-->
1. 類字段和私有方法的初始化比普通屬性的賦值慢得多。
2. 類字段初始化器在由 Node.js 和 Deno 等嵌入器使用的[啟動快照](https://v8.dev/blog/custom-startup-snapshots)中無法正確工作，從而影響自身或用戶應用的啟動速度。

第一個問題已在 V8 v9.7 中解決，第二個問題的修復也已在 V8 v10.0 中釋出。本篇文章主要介紹第一個問題的修復方式，要了解快照問題的修復，請參閱[此文章](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/)。

## 優化類字段

為了消除普通屬性賦值與類字段初始化之間的性能差距，我們更新了現有的[內聯快取（IC）系統](https://mathiasbynens.be/notes/shapes-ics)以支持後者。在 v9.7 之前，V8 始終對類字段初始化使用成本較高的運行時調用。而自 v9.7 起，當 V8 判斷初始化模式足夠可預測時，會採用新的 IC 來加速操作，就像處理普通屬性的賦值一樣。

![初始化性能，優化版](/_img/faster-class-features/class-fields-performance-optimized.svg)

![初始化性能，解釋版](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### 類字段的原始實現

為了實現私有字段，V8 使用內部私有符號（private symbols）——它們是類似標準 `Symbol` 的內部 V8 數據結構，但作為屬性鍵時不可枚舉。以這個類為例：


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8 將收集類字段初始化器（如`#a = 0` 和 `b = this.#a`），並生成一個合成實例成員函數，其中包含初始化器作為函數主體。該合成函數生成的字節碼以前是這樣的：

```cpp
// 將 `#a` 的私有名稱符號加載到 r1
LdaImmutableCurrentContextSlot [2]
Star r1

// 將 0 加載到 r2
LdaZero
Star r2

// 將目標移入 r0
Mov <this>, r0

// 使用 %AddPrivateField() 運行時函數將 0
// 設置為實例中以私有名稱符號 `#a` 為鍵的屬性值，
// 即 `#a = 0`。
CallRuntime [AddPrivateField], r0-r2

// 將屬性名稱 `b` 加載到 r1
LdaConstant [0]
Star r1

// 加載 `#a` 的私有名稱符號
LdaImmutableCurrentContextSlot [2]

// 從實例中加載以 `#a` 為鍵的屬性的值到 r2
LdaKeyedProperty <this>, [0]
Star r2

// 將目標移入 r0
Mov <this>, r0

// 使用 %CreateDataProperty() 運行時函數，將 `#a` 為鍵的屬性值，
// 設置為 `b` 為鍵的屬性值，即 `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

將前面代碼段中的類與以下這個類進行比較：

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

從技術上講，這兩個類並不完全相同，即使忽略 `this.#a` 和 `this._a` 在可見性上的區別。規範規定了 "define" 語義，而非 "set" 語義。即，類字段的初始化不會觸發 setter 或者 `set` 的 Proxy 陷阱。因此，第一個類的近似實現應該使用 `Object.defineProperty()` 而不是簡單的賦值來初始化屬性。此外，當私有字段已存在於實例中時，應該拋出錯誤（以防初始化的目標在基類構造函數中被覆蓋為另一個實例）：

```js
class A {
  constructor() {
    // %AddPrivateField() 調用的大致翻譯：
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('無法重複初始化 #a 在同一對象上');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // %CreateDataProperty() 調用的大致翻譯：
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

在提案最終定案之前，要實現指定的語義，V8 使用了調用運行時函數的方法，因為這種方法更具靈活性。如上面的位元碼所示，公共字段的初始化是通過 `%CreateDataProperty()` 運行時調用實現的，而私有字段的初始化是通過 `%AddPrivateField()` 實現的。由於調用運行時會帶來顯著的開銷，導致類字段的初始化速度比普通物件屬性的賦值慢得多。

然而，在大多數使用案例中，語義差異並不顯著。在這些情況下，如果能有優化屬性賦值的效能就更好了 &mdash; 所以在提案最終定案後，V8 創建了更優化的實現。

### 優化私有類字段和計算的公共類字段

為了加快私有類字段和計算的公共類字段的初始化速度，實現引入了一種新機制來接入[內聯快取（IC）系統](https://mathiasbynens.be/notes/shapes-ics)，以處理這些操作。這種新機制由三個協作部分組成：

- 在位元碼生成器中，一個新的位元碼 `DefineKeyedOwnProperty`。在生成 `ClassLiteral::Property` AST 節點（表示類字段初始化器）的程式碼時會發出該位元碼。
- 在 TurboFan JIT 中，一個對應的 IR 運算碼 `JSDefineKeyedOwnProperty`，可以從新的位元碼編譯而來。
- 在 IC 系統中，一個新的 `DefineKeyedOwnIC` 用於新位元碼的解釋器處理程序以及從新的 IR 運算碼編譯的程式碼。為了簡化實現，該新的 IC 重用了 `KeyedStoreIC` 中的一些程式碼，該程式碼是專為普通屬性存儲設計的。

現在當 V8 遇到以下類：

```js
class A {
  #a = 0;
}
```

它會為初始化器 `#a = 0` 生成如下位元碼：

```cpp
// 將`#a`的私有名稱符號加載到 r1 中
LdaImmutableCurrentContextSlot [2]
Star0

// 使用 DefineKeyedOwnProperty 位元碼將 0 作為值存儲到
// 索引鍵由私有名稱符號 `#a` 表示的屬性中，
// 即 `#a = 0`。
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

當初始化器執行足夠多次時，V8 為每個正在初始化的字段分配一個[反饋向量槽](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)。該槽包含正在添加的字段的索引鍵（對於私有字段，是私有名稱符號）以及一對[隱藏類](https://v8.dev/docs/hidden-classes)，這些隱藏類是實例因字段初始化而進行轉換的起點和終點。在後續初始化中，IC 使用反饋來檢查字段是否按照相同順序初始化於具有相同隱藏類的實例上。如果初始化匹配 V8 之前見過的模式（通常是這種情況），V8 使用預生成的程式碼執行初始化，而不是調用運行時，以此加快操作。如果初始化未匹配 V8 之前見過的模式，它會回退到運行時調用以處理慢速情況。

### 優化命名的公共類字段

為了加快命名公共類字段的初始化，我們重用了現有的 `DefineNamedOwnProperty` 位元碼，它通過解釋器中的 `DefineNamedOwnIC` 或從 `JSDefineNamedOwnProperty` IR 運算碼編譯的程式碼附件。

現在當 V8 遇到以下類：

```js
class A {
  #a = 0;
  b = this.#a;
}
```

它會為初始化器 `b = this.#a` 生成如下位元碼：

```cpp
// 加載`#a`的私有名稱符號
LdaImmutableCurrentContextSlot [2]

// 將由 `#a` 索引鍵的屬性值從實例加載到 r2
// 注意：LdaKeyedProperty 在重構中重命名為 GetKeyedProperty
GetKeyedProperty <this>, [2]

// 使用 DefineNamedOwnProperty 位元碼將由 `#a` 索引鍵的屬性值
// 存儲為由 `b` 索引鍵的屬性值，即 `b = this.#a;`
DefineNamedOwnProperty <this>, [0], [4]
```

原始的 `DefineNamedOwnIC` 機制無法簡單地插入命名的公共類字段的處理中，因為它最初僅旨在用於物件文字字面值初始化。之前它預期目標是尚未被使用者觸碰的物件，該物件從創建到初始化一直保持此狀態，這對於物件文字字面值而言是始終成立的，但類字段可以在使用者定義的物件上初始化，當類繼承的基類的構造函數覆蓋了目標時會是如此：

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // 不可觀察。
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

為了處理這些目標，我們修補了 IC，使其在初始化的物件是代理、欄位已經存在於物件上，或者物件有一個 IC 未曾見過的隱藏類的情境下，退回到執行期間。雖然如果這些邊界情況變得足夠普遍，我們仍然可以進一步優化，但目前看來，為了實現的簡潔性，我們最好放棄它們的性能。

## 優化私有方法

### 私有方法的實現

在[規範](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd)中，私有方法被描述為似乎安裝於實例上，而不是類上。然而，為了節省記憶體，V8 的實現將私有方法與私有品牌符號一起儲存在與類相關聯的上下文中。當構造函數被調用時，V8 僅在實例上儲存一個指向該上下文的引用，並使用私有品牌符號作為鍵。

![帶有私有方法的類的評估與實例化](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

當訪問私有方法時，V8 從執行上下文開始遍歷上下文鏈以找到類的上下文，從找到的上下文讀取一個靜態已知的槽以獲取類的私有品牌符號，然後檢查實例是否具有由此品牌符號鍵入的屬性，以確認實例是否由該類構造。如果品牌檢查通過，V8 從同一上下文中的另一個已知槽加載私有方法並完成訪問。

![私有方法的訪問](/_img/faster-class-features/access-private-methods.svg)

以下是示例代碼：

```js
class A {
  #a() {}
}
```

V8 過去會為 `A` 的構造函數生成以下字節碼：

```cpp
// 從上下文中加載類 A 的私有品牌符號
// 並將其儲存到 r1。
LdaImmutableCurrentContextSlot [3]
Star r1

// 將目標加載到 r0。
Mov <this>, r0
// 將當前上下文加載到 r2。
Mov <context>, r2
// 調用運行時函數 %AddPrivateBrand() 將上下文存儲到
// 用私有品牌作為鍵的實例中。
CallRuntime [AddPrivateBrand], r0-r2
```

由於還調用了運行時函數 `%AddPrivateBrand()`，這使得構造函數比僅具有公共方法的類的構造函數慢得多。

### 優化私有品牌的初始化

為了加速私有品牌的安裝，在大多數情況下，我們僅重用了為私有字段優化添加的 `DefineKeyedOwnProperty` 機制：

```cpp
// 從上下文中加載類 A 的私有品牌符號
// 並將其儲存到 r1
LdaImmutableCurrentContextSlot [3]
Star0

// 使用 DefineKeyedOwnProperty 字節碼將
// 上下文存儲到實例中，私有品牌作為鍵
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![帶有不同方法的類的實例初始化性能](/_img/faster-class-features/private-methods-performance.svg)

然而有一個警告：如果類是一個其構造函數調用 `super()` 的衍生類，那麼私有方法的初始化 - 就我們而言，即私有品牌符號的安裝 - 必須在 `super()` 返回後進行：

```js
class A {
  constructor() {
    // 此處會因 super() 尚未返回而在 new B() 調用中丟擲錯誤。
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

如前所述，在初始化品牌時，V8 還在實例中儲存指向類上下文的引用。這個引用並未在品牌檢查中使用，而是用於偵錯工具在不知道該實例由哪個類構造的情況下，從實例檢索私有方法列表。當 `super()` 直接在構造函數中調用時，V8 可以簡單地從上下文註冊寄存器中加載上下文（這就是上述字節碼中 `Mov <context>, r2` 或 `Ldar <context>` 所做的事情）來執行初始化，但 `super()` 也可以由嵌套箭頭函數調用，而該箭頭函數則可能在不同的上下文中被調用。在這種情況下，V8 退回到一個運行時函數（同樣命名為 `%AddPrivateBrand()`），在上下文鏈中尋找類上下文，而不是依賴上下文寄存器。例如，對於下面的 `callSuper` 函數：

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...執行某些操作
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8 現在生成以下字節碼：

```cpp
// 調用超類構造函數以構造實例
// 並將其存儲到 r3。
...

// 從當前上下文的深度 1 的類上下文中
// 加載私有品牌符號並存儲到 r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// 將深度 1 作為 Smi 加載到 r6
LdaSmi [1]
Star6

// 加載當前上下文到 r5
Mov <context>, r5

// 使用 %AddPrivateBrand() 定位類上下文的深度 1
// 從當前上下文並儲存到實例中
// 使用私有品牌符號作為鍵
CallRuntime [AddPrivateBrand], r3-r6
```

在這種情況下，運行時調用的成本回來了，所以初始化此類的實例仍然會比僅有公共方法的類的實例初始化慢。可以使用專門的字節碼來實現`%AddPrivateBrand()`的功能，但由於在嵌套箭頭函數中調用`super()`相當少見，我們再次在實現的簡單性和性能之間進行了取捨。

## 最後說明

本博客文章中提到的工作也被包含在[Node.js 18.0.0 发布](https://nodejs.org/en/blog/announcements/v18-release-announce/)中。此前，Node.js在一些內建類中轉而使用符號屬性，這些類本來使用的是私有字段，這是為了將它們包含到嵌入式引導程序快照中，以及提高構造函數的性能（參考[這篇博客文章](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/)了解更多上下文）。隨著V8對類特性支持的改進，Node.js在這些類中[改回了使用私有類字段](https://github.com/nodejs/node/pull/42361)，並且Node.js的基準測試顯示，[這些改變並未引入任何性能回退](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385)。

感謝Igalia和Bloomberg對此實現的貢獻！
