---
title: "快速的 `for`-`in` 在 V8"
author: "Camillo Bruni ([@camillobruni](http://twitter.com/camillobruni))"
avatars: 
  - "camillo-bruni"
date: "2017-03-01 13:33:37"
tags: 
  - internals
description: "本文是一篇技術深入解析，說明了 V8 如何讓 JavaScript 的 for-in 儘可能快。"
---
`for`-`in` 是許多框架中廣泛使用的語言特性。儘管它的廣泛應用，從實現角度來看，它卻是較為晦澀的語言構造之一。V8 為了讓這個特性儘可能快付出了極大的努力。在過去的一年中，`for`-`in` 在符合規範的同時變得最多快了三倍，這取決於使用的上下文。

<!--truncate-->
許多熱門網站大量依賴 for-in，並從其優化中受益。例如，2016 年初 Facebook 在啟動過程中，大約用了 7% 的 JavaScript 時間在執行 `for`-`in` 本身。在 Wikipedia 上這個數字甚至更高，約為 8%。通過改善某些慢速案例的性能，Chrome 51 顯著提高了這兩個網站的性能：

![](/_img/fast-for-in/wikipedia.png)

![](/_img/fast-for-in/facebook.png)

由於各種 `for`-`in` 的改進，Wikipedia 和 Facebook 的整體腳本時間都提高了 4%。需要注意的是，在同一期間，V8 的其他部分也變得更快，這使得整體腳本改進超過了 4%。

在這篇博客的其餘部分，我們將解釋我們如何設法加速這個核心語言特性，同時修復了長期存在的規範違反。

## 規範

_**總結；** 為了性能原因，for-in 的迭代語義有些模糊。_

當我們查看 [`for`-`in` 的規範文本](https://tc39.es/ecma262/#sec-for-in-and-for-of-statements) 時，可以看到它的描述方式出乎意料的模糊，這在不同的實現中是可觀察到的。我們來看一個當迭代具有適當攔截器設置的 [Proxy](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 對象的例子。

```js
const proxy = new Proxy({ a: 1, b: 1},
  {
    getPrototypeOf(target) {
    console.log('getPrototypeOf');
    return null;
  },
  ownKeys(target) {
    console.log('ownKeys');
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    console.log('getOwnPropertyDescriptor name=' + prop);
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
});
```

在 V8/Chrome 56 中，您會得到以下輸出：

```
ownKeys
getPrototypeOf
getOwnPropertyDescriptor name=a
a
getOwnPropertyDescriptor name=b
b
```

相比之下，在 Firefox 51 中對相同代碼段執行，您會得到不同的語句順序：

```
ownKeys
getOwnPropertyDescriptor name=a
getOwnPropertyDescriptor name=b
getPrototypeOf
a
b
```

兩個瀏覽器都遵守了規範，但規範並未對指令的明確順序進行強制規定。為了正確理解這些規範灰色地帶，讓我們看一下規範文本：

> EnumerateObjectProperties ( O )
> 當以參數 O 調用抽象操作 EnumerateObjectProperties 時，按以下步驟進行：
>
> 1. 確保：Type(O) 是 Object。
> 2. 返回一個 Iterator 對象 (25.1.1.2)，其 next 方法迭代 O 可枚舉屬性的所有字符串值鍵。該迭代器對象無法直接被 ECMAScript 代碼訪問。枚舉屬性的機制和順序未指定，但必須符合以下規則中指定的規定。

通常，規範指令對需要執行的精確步驟非常嚴謹。但在這裡，它只是引用了一個簡單的描述清單，甚至執行的順序也留給實現者。這通常是因為該部分規範是在 JavaScript 引擎已有不同實現後才撰寫的。規範通過提供以下指令來彌補這些未定之處：

1. 迭代器的 throw 和 return 方法是 null，且永遠不會被調用。
1. 迭代器的 next 方法處理對象屬性以確定是否應將屬性鍵作為迭代器值返回。
1. 返回的屬性鍵不包括符號作為鍵。
1. 在枚舉期間，目標對象的屬性可能被刪除。
1. 在迭代器的 next 方法處理之前被刪除的屬性會被忽略。如果在枚舉期間向目標對象添加了新屬性，則新增的屬性不保證會被處理於當前枚舉中。
1. 在一次枚舉中，迭代器的 next 方法最多會返回一次屬性名稱。
1. 枚舉目標對象的屬性包括枚舉其原型的屬性，以及原型的原型，依次遞歸；但如果原型的一個屬性和一個已被迭代器的 next 方法處理的屬性同名，則該原型屬性不會被處理。
1. 判斷一個原型物件的屬性是否已被處理時，不會考慮 `[[Enumerable]]` 屬性的值。
1. 必須通過調用 EnumerateObjectProperties 並將原型物件作為參數，來獲取原型物件的可列舉屬性名稱。
1. EnumerateObjectProperties 必須通過調用目標物件的內部方法 `[[OwnPropertyKeys]]` 來獲取其自身屬性鍵。

這些步驟聽起來很繁瑣，不過規範文檔還提供了一個範例實現，這個範例更顯示化且更容易閱讀：

```js
function* EnumerateObjectProperties(obj) {
  const visited = new Set();
  for (const key of Reflect.ownKeys(obj)) {
    if (typeof key === 'symbol') continue;
    const desc = Reflect.getOwnPropertyDescriptor(obj, key);
    if (desc && !visited.has(key)) {
      visited.add(key);
      if (desc.enumerable) yield key;
    }
  }
  const proto = Reflect.getPrototypeOf(obj);
  if (proto === null) return;
  for (const protoKey of EnumerateObjectProperties(proto)) {
    if (!visited.has(protoKey)) yield protoKey;
  }
}
```

既然你已經閱讀到這裡，你可能已經注意到從之前的範例中，V8 並不完全遵循規範中的範例實現。首先，範例的 `for`-`in` 生成器是逐步工作的，而 V8 則是為了性能原因提前收集所有鍵值。這是完全可以接受的，事實上規範文檔明確表示操作的順序 A - J 是未定義的。然而，正如您稍後在本文中會發現的，有一些極端情況，直到 2016 年 V8 才完全遵守規範。

## 枚舉緩存

`for`-`in` 生成器的範例實現遵循了按步驟收集並生成鍵值的模式。在 V8 中，屬性鍵值先被收集，然後在迭代階段使用。對於 V8 來說，這使得某些事情更加簡單。我們需要看一下物件模型來理解原因。

一個像 `{a:'value a', b:'value b', c:'value c'}` 這樣的簡單物件在 V8 中可以有多種內部表示形式。在我們即將發表的詳盡文章中，我們將探討屬性資料。這意味著，根據屬性類型（如：內部、快速或慢），實際的屬性名稱存儲在不同位置。這使得收集可列舉鍵值成為一項非簡單的任務。

V8 使用隱藏的類或所謂的 Map 來追踪物件的結構。具有相同 Map 的物件擁有相同的結構。此外每個 Map 都有一個共享的數據結構，即名為 descriptor array 的描述符陣列，其中包含了每個屬性的細節，比如屬性存儲位置、屬性名稱以及屬性的可列舉性。

假設我們的 JavaScript 物件已達到最終形狀，且不會再新增或刪除屬性。在這種情況下，我們可以將描述符陣列作為鍵值的來源。前提是只有可列舉屬性。為了避免每次都篩選非可列舉屬性的負擔，V8 通過 Map 的描述符陣列使用了單獨的 EnumCache。

![](/_img/fast-for-in/enum-cache.png)

考慮到 V8 假設慢字典物件通常會頻繁改變（即新增或刪除屬性），因此對於具有字典屬性的慢物件沒有描述符陣列。因此，V8 不為慢屬性提供 EnumCache。相似的假設也適用於索引屬性，因此它們也被排除在 EnumCache 之外。

讓我們總結幾個重點事實：

- Map 用於追踪物件的形狀。
- 描述符陣列存儲了屬性（名稱、可配置性、可見性）的信息。
- 描述符陣列可以在 Map 之間共享。
- 每個描述符陣列可以有一個 EnumCache，該緩存僅列出可列舉的命名鍵值，而非索引屬性名稱。

## `for`-`in` 的機制

現在你已部分了解 Map 的工作原理以及 EnumCache 與描述符陣列的關係。V8 通過 Ignition（字節碼解譯器）和 TurboFan（優化編譯器）執行 JavaScript，兩者以類似的方式處理 `for`-`in`。為簡化起見，我們將使用類似 C++ 的格式來解釋 `for`-`in` 在內部是如何實現的：

```js
// For-In Prepare:
FixedArray* keys = nullptr;
Map* original_map = object->map();
if (original_map->HasEnumCache()) {
  if (object->HasNoElements()) {
    keys = original_map->GetCachedEnumKeys();
  } else {
    keys = object->GetCachedEnumKeysWithElements();
  }
} else {
  keys = object->GetEnumKeys();
}

// For-In Body:
for (size_t i = 0; i < keys->length(); i++) {
  // For-In Next:
  String* key = keys[i];
  if (!object->HasProperty(key) continue;
  EVALUATE_FOR_IN_BODY();
}
```

`for`-`in` 可以分為三個主要步驟：

1. 準備要迭代的鍵值，
2. 獲取下一個鍵值，
3. 評估 `for`-`in` 主體。

在這三個步驟中，"準備"步驟是最複雜的，也是 EnumCache 發揮作用的地方。在上述的例子中可以看到，如果 EnumCache 存在並且對象（及其原型）上沒有元素（整數索引屬性），V8 會直接使用 EnumCache。若存在索引屬性名，V8 會跳到 C++ 實現的運行時函數中，將它們添加到現有的 EnumCache 中，如以下例子所示：

```cpp
FixedArray* JSObject::GetCachedEnumKeysWithElements() {
  FixedArray* keys = object->map()->GetCachedEnumKeys();
  return object->GetElementsAccessor()->PrependElementIndices(object, keys);
}

FixedArray* Map::GetCachedEnumKeys() {
  // 從可能共享的 EnumCache 中獲取可枚舉屬性鍵
  FixedArray* keys_cache = descriptors()->enum_cache()->keys_cache();
  if (enum_length() == keys_cache->length()) return keys_cache;
  return keys_cache->CopyUpTo(enum_length());
}

FixedArray* FastElementsAccessor::PrependElementIndices(
      JSObject* object, FixedArray* property_keys) {
  Assert(object->HasFastElements());
  FixedArray* elements = object->elements();
  int nof_indices = CountElements(elements)
  FixedArray* result = FixedArray::Allocate(property_keys->length() + nof_indices);
  int insertion_index = 0;
  for (int i = 0; i < elements->length(); i++) {
    if (!HasElement(elements, i)) continue;
    result[insertion_index++] = String::FromInt(i);
  }
  // 在結尾插入屬性鍵。
  property_keys->CopyTo(result, nof_indices - 1);
  return result;
}
```

如果未找到現有的 EnumCache，我們會再次跳到 C++，並遵循前面介紹的規範步驟：

```cpp
FixedArray* JSObject::GetEnumKeys() {
  // 獲取接收者的 Enum 鍵。
  FixedArray* keys = this->GetOwnEnumKeys();
  // 遍歷原型鏈。
  for (JSObject* object : GetPrototypeIterator()) {
     // 將未重複的鍵附加到列表。
     keys = keys->UnionOfKeys(object->GetOwnEnumKeys());
  }
  return keys;
}

FixedArray* JSObject::GetOwnEnumKeys() {
  FixedArray* keys;
  if (this->HasEnumCache()) {
    keys = this->map()->GetCachedEnumKeys();
  } else {
    keys = this->GetEnumPropertyKeys();
  }
  if (this->HasFastProperties()) this->map()->FillEnumCache(keys);
  return object->GetElementsAccessor()->PrependElementIndices(object, keys);
}

FixedArray* FixedArray::UnionOfKeys(FixedArray* other) {
  int length = this->length();
  FixedArray* result = FixedArray::Allocate(length + other->length());
  this->CopyTo(result, 0);
  int insertion_index = length;
  for (int i = 0; i < other->length(); i++) {
    String* key = other->get(i);
    if (other->IndexOf(key) == -1) {
      result->set(insertion_index, key);
      insertion_index++;
    }
  }
  result->Shrink(insertion_index);
  return result;
}
```

這段簡化的 C++ 代碼對應於 V8 的實現，直到 2016 年初我們開始研究 UnionOfKeys 方法。仔細觀察可以發現，我們使用了一種簡單的算法來排除列表中的重複項，這可能會在原型鏈上有很多鍵的情況下產生糟糕的性能。因此我們決定採取以下部分中的優化措施。

## `for`-`in` 的問題

如我們在上一節中暗示的，UnionOfKeys 方法具有糟糕的最壞情況性能。它基於一個有效的假設，即大多數對象擁有快速屬性，因此會從 EnumCache 中受益。另一個假設是原型鏈上只有少量可枚舉屬性，從而限製查找重複項的時間。然而，如果對象具有慢速字典屬性且原型鏈上有許多鍵，UnionOfKeys 會成為瓶頸，因為每次進入 for-in 時必須收集可枚舉屬性名稱。

除了性能問題外，現有算法還存在不符合規範的另一個問題。V8 在很多年中都錯誤地處理了以下示例：

```js
var o = {
  __proto__ : {b: 3},
  a: 1
};
Object.defineProperty(o, 'b', {});

for (var k in o) console.log(k);
```

輸出：

```
a
b
```

可能出乎意料的是，這應該只打印出 `a` 而不是 `a` 和 `b`。如果回想起本文開頭的規範文本，步驟 G 和 J 表明接收者上的非枚舉屬性會遮蔽原型鏈上的屬性。

讓事情更加複雜的是，ES6 引入了 [proxy](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 對象。這打破了 V8 代碼的許多假設。為了以符合規範的方式實現 for-in，我們必須觸發以下 13 個代理陷阱中的 5 個：

:::table-wrapper
| 內部方法           | 處理器方法                 |
| -------------------- | -------------------------- |
| `[[GetPrototypeOf]]`  | `getPrototypeOf`           |
| `[[GetOwnProperty]]`  | `getOwnPropertyDescriptor` |
| `[[HasProperty]]`     | `has`                      |
| `[[Get]]`             | `get`                      |
| `[[OwnPropertyKeys]]` | `ownKeys`                  |
:::

這需要原始 GetEnumKeys 代碼的重複版本，該版本試圖更緊密地遵循規範示例實現。ES6 代理以及缺乏對遮蔽屬性的處理是我們在 2016 年初重構如何提取所有 for-in 鍵的核心動機。

## `KeyAccumulator`

我們引入了一個單獨的輔助類 `KeyAccumulator`，該類處理了收集 `for`-`in` 鍵的復雜性。隨著 ES6 規範的增長，像 `Object.keys` 或 `Reflect.ownKeys` 這樣的新功能需要自己稍作修改的鍵收集版本。通過擁有一個可配置的單個位置，我們可以提高 `for`-`in` 的性能並避免代碼重複。

`KeyAccumulator` 包含一個僅支持有限操作的快速部分，但能非常高效地完成它們。慢速累加器支持所有復雜情況，例如 ES6 代理。

![](/_img/fast-for-in/keyaccumulator.png)

為了正確篩選遮蔽屬性，我們必須維護一個單獨的列表來記錄到目前為止已看到的非枚舉屬性。出於性能原因，我們僅在確定原型鏈上存在可枚舉屬性後執行此操作。

## 性能改進

借助 `KeyAccumulator`，一些模式變得更容易優化。第一個是避免使用原始 UnionOfKeys 方法的嵌套循環，該方法造成了緩慢的邊界情況。在第二步中，我們執行了更詳細的預檢，以利用現有 EnumCaches 並避免不必要的複製步驟。

為了說明符合規範的實現更快，我們來看看以下四個不同物件的性能測試:

```js
var fastProperties = {
  __proto__ : null,
  'property 1': 1,
  …
  'property 10': n
};

var fastPropertiesWithPrototype = {
  'property 1': 1,
  …
  'property 10': n
};

var slowProperties = {
  __proto__ : null,
  'dummy': null,
  'property 1': 1,
  …
  'property 10': n
};
delete slowProperties['dummy']

var elements = {
  __proto__: null,
  '1': 1,
  …
  '10': n
}
```

- `fastProperties` 物件具有標準快速屬性。
- `fastPropertiesWithPrototype` 物件在使用 `Object.prototype` 時，原型鏈上有額外的非枚舉屬性。
- `slowProperties` 物件具有緩慢詞典屬性。
- `elements` 物件只包含索引屬性。

以下圖表比較了在不使用我們的優化編譯器的幫助下, 在緊湊循環中運行 `for`-`in` 循環一百萬次的原始性能。

![](/_img/fast-for-in/keyaccumulator-benchmark.png)

正如我們在介紹中所概述的，這些改進在 Wikipedia 和 Facebook 等平台上變得尤為顯著。

![](/_img/fast-for-in/wikipedia.png)

![](/_img/fast-for-in/facebook.png)

除了 Chrome 51 中的初步改進之外，第二次性能調整帶來了另一顯著改進。以下圖表顯示了我們在 Facebook 頁面加載和啟動時花費於腳本執行的全部時間的跟蹤數據。在 V8 修訂版 37937 附近選定的區間內，額外的性能增長達到了 4%！

![](/_img/fast-for-in/fastkeyaccumulator.png)

為了突顯改進 `for`-`in` 的重要性，我們可以依據我們在 2016 年構建的一個工具的數據，該工具允許我們提取一組網站上的 V8 測量數據。以下表格顯示了在大約 [25 個代表性現實世界網站](/blog/real-world-performance) 範圍內，Chrome 49 的 V8 C++ 入口點（運行時函數和內建函數）相對花費時間。

:::table-wrapper
| 排名    | 名稱                                  | 總時間     |
| :------: | ------------------------------------- | ---------- |
| 1        | `CreateObjectLiteral`                 | 1.10%      |
| 2        | `NewObject`                           | 0.90%      |
| 3        | `KeyedGetProperty`                    | 0.70%      |
| 4        | `GetProperty`                         | 0.60%      |
| 5        | `ForInEnumerate`                      | 0.60%      |
| 6        | `SetProperty`                         | 0.50%      |
| 7        | `StringReplaceGlobalRegExpWithString` | 0.30%      |
| 8        | `HandleApiCallConstruct`              | 0.30%      |
| 9        | `RegExpExec`                          | 0.30%      |
| 10       | `ObjectProtoToString`                 | 0.30%      |
| 11       | `ArrayPush`                           | 0.20%      |
| 12       | `NewClosure`                          | 0.20%      |
| 13       | `NewClosure_Tenured`                  | 0.20%      |
| 14       | `ObjectDefineProperty`                | 0.20%      |
| 15       | `HasProperty`                         | 0.20%      |
| 16       | `StringSplit`                         | 0.20%      |
| 17       | `ForInFilter`                         | 0.10%      |
:::
