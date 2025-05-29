---
title: "V8 中的 Slack 追蹤"
author: "Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), 著名的 *slack* 大師"
description: "深入探討 V8 的 Slack 追蹤機制。"
avatars:
 - "michael-stanton"
date: 2020-09-24 14:00:00
tags:
 - internals
---
Slack 追蹤是一種給新對象一個 **比實際使用更大的初始大小** 的方法，便於快速新增屬性。然後，經過一段時間後，將未使用的空間 **神奇地返回到系統**。很棒吧？

<!--truncate-->
這個機制特別有用，因為 JavaScript 沒有靜態類別。系統無法“快速”看到你有多少屬性。引擎需逐一處理。所以當你讀到：

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

你可能認為引擎已經擁有足夠的資訊來優化性能——畢竟你已經告訴它這個對象有兩個屬性。然而，實際上 V8 根本不知道接下來會發生什麼。這個對象 `m1` 可以被傳遞給另一個函數並新增 10 個屬性。Slack 追蹤的目的便是為了應對這種情況，當靜態編譯無法推斷整體結構時提高響應性。它和 V8 中許多其他機制類似，其基礎僅僅是執行過程的一些一般性特徵，例如：

- 大多數對象很快死亡，少數存活時間較久——垃圾回收中的“代假設”。
- 程式確實擁有一種組織結構——我們基於[形狀或“隱藏類別”](https://mathiasbynens.be/notes/shapes-ics)（在 V8 中稱為 **maps**）為開發者操作的對象構建這些結構，因為我們相信它們會派上用場。*順便提一句，[V8 中的快速屬性](/blog/fast-properties) 是一篇關於 maps 和屬性訪問的很棒的文章，充滿有趣的細節。*
- 程式有初始化狀態，所有東西都是新的，很難判斷什麼是重要的。隨後，可以透過穩定的使用情況識別出重要的類別與函數——我們的反饋機制和編譯器管道由此誕生。

最後，也是最重要的一點，執行環境必須非常快，否則我們不過是空談哲學。

現在，V8 可以簡單地將屬性存儲在附加於主對象的後備存儲中。與直接存放在對象中的屬性不同，這種後備存儲可以通過複製和替換指針無限擴展。然而，訪問屬性的最快方式是避免這種間接存取，檢查從對象起始位置的固定偏移量。以下是 V8 堆中帶有兩個對象內屬性的普通 JavaScript 對象佈局。前三個字是每個對象的標準部分（指向 maps 的指針、指向屬性後備存儲的指針，以及指向元素後備存儲的指針）。您可以看到這個對象無法“增長”，因為它在堆中緊靠下一個對象：

![](/_img/slack-tracking/property-layout.svg)

:::note
**注意：** 我省略了屬性後備存儲的細節，因為目前唯一重要的是它可以隨時替換為更大的存儲。然而，它本身也是 V8 堆上的對象，像所有駐留在此的對象一樣有一個 maps 指針。
:::

總之，由於對象內屬性提供的性能優勢，V8 願意在每個對象中給你額外空間，而 **Slack 追蹤** 就是實現這一目標的方式。最終，你會安定下來，停止新增屬性，開始進行挖比特幣等操作。

V8 給你多少“時間”？巧妙的是，它根據你構建特定對象的次數來判斷。事實上，maps 中有一個計數器，並以系統中更神秘的魔法數字之一：**七** 初始化。

另一個問題：V8 如何知道提供多少額外空間給對象本體？實際上，它從編譯過程中獲得了一個提示，對初始屬性數量進行估算。這個計算包括來自原型對象的屬性數量，並遞歸向上鏈接的原型。最後，為了保守起見，它再額外添加 **八** 個（另一個魔法數字！）。你可以在 `JSFunction::CalculateExpectedNofProperties()` 中看到：

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // 超類建構函數應針對可用的預期屬性數量進行編譯。
    // 屬性可用。
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // 檢查預估是否合理。
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // 如果編譯有錯誤，則繼續迭代。
      // 在原型鏈上可能會有內建函數需要某些數量的物件內屬性。
      // 覆蓋物件屬性限制。
      continue;
    }
  }
  // 物件內空間追蹤稍後會回收冗餘的物件內空間，
  // 因此我們可以大方地調整估計值。
  // 這意味著在開始時至少多分配了8個插槽。
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

來看看之前的物件 `m1` 的例子：

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

根據 `JSFunction::CalculateExpectedNofProperties` 的計算以及 `Peak()` 函數，我們應該有2個物件內屬性，並且由於空閒追蹤，再增加8個額外的屬性。我們可以用 `%DebugPrint()` 印出 `m1` （此方便的函數揭露了映射結構。您可以通過使用 `--allow-natives-syntax` 標誌運行 `d8` 來使用它）：

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

注意物件的實例大小是52。V8中的物件佈局如下：

| word | 所屬內容                                          |
| ---- | ------------------------------------------------ |
| 0    | 映射                                              |
| 1    | 指向屬性陣列的指針                                |
| 2    | 指向元素陣列的指針                                |
| 3    | 物件內字段1（指向字串 `"Matterhorn"` 的指針）       |
| 4    | 物件內字段2（整數值 `4478`）                      |
| 5    | 未使用的物件內字段3                               |
| …    | …                                                |
| 12   | 未使用的物件內字段10                              |

指針大小在此32位元二進制中為4，因此我們擁有所有普通JavaScript物件的3個初始字，而且物件內有額外的10個字。上面清楚顯示還有8個“未使用的屬性字段”。我們正在使用空閒追蹤。物件變得臃腫、貪婪地消耗寶貴的字節！

如何縮減？我們使用映射中的建構計數器字段。我們達到零並決定我們完成了空閒追蹤。然而，如果您構造更多物件，您不會看到上述的計數器減少。為什麼？

因為上面顯示的映射不是 `Peak` 物件的“映射”。它僅僅是映射鏈中的一個末端映射，該鏈由 **初始映射** 向下繼承，`Peak` 物件在執行構造函數代碼之前被賦予。

如何找到初始映射？好消息是，函數 `Peak()` 有一個指針指向它。我們使用初始映射中的建構計數器來控制空閒追蹤：

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 功能原型：0x37449c89 <Object map = 0x2a287335>
 - 初始地圖：0x46f07295 <Map(HOLEY_ELEMENTS)>   // 這是初始地圖。
 - 共用資訊：0x31c12495 <SharedFunctionInfo Peak>
 - 名稱：0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr 可讓你列印初始地圖。
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Map]
 - 類型：JS_OBJECT_TYPE
 - 實例大小：52
 - 物件內屬性：10
 - 元素類型：HOLEY_ELEMENTS
 - 未使用的屬性欄位：10
 - 列舉長度：無效
 - 返回指針：0x28c02329 <undefined>
 - 原型有效性單元格：0x47f0232d <Cell value= 1>
 - 實例描述符（自有） #0：0x28c02135 <DescriptorArray[0]>
 - 轉換 #1：0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9: [String] in ReadOnlySpace: #name:
         (轉換到（常量數據欄位，屬性：[WEC]）於 Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - 原型：0x5cc09c7d <Object map = 0x46f07335>
 - 建構函數：0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - 依賴程式碼：0x28c0212d <其他堆塊物件 (WEAK_FIXED_ARRAY_TYPE)>
 - 建構計數器：5


看到建構計數器減少到 5 嗎？如果您想從我們上面顯示的兩屬性地圖尋找初始地圖，您可以透過 `%DebugPrintPtr()` 的幫助，沿著其返回指針一直追踪，直到您找到返回指針槽中帶有 `undefined` 的地圖。那將是上面的這個地圖。

現在，一個地圖樹從初始地圖開始生長，每個新增的屬性都有一個分支。我們稱這些分支為 _轉換_。在上面初始地圖的列印中，您看到轉換到下一地圖並帶有標籤 "name" 嗎？迄今為止整個地圖樹看起來就是這樣：

![(X, Y, Z) 表示 (實例大小，物件內屬性數量，未使用屬性數量)。](/_img/slack-tracking/root-map-1.svg)

根據屬性名稱的這些轉換就是 JavaScript 背後的 ["盲鼴鼠"](https://www.google.com/search?q=blind+mole&tbm=isch) 是如何構建它的地圖的。該初始地圖也存於函數 `Peak` 中，因此當它被用作建構函數時，該地圖可以用來設置 `this` 物件。

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

有趣的是，在創建 `m7` 之後，重新運行 `%DebugPrint(m1)` 會產生一個奇妙的新結果：

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - map: 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - 原型：0x5cd086cd <Object map = 0x4b387335>
 - 元素：0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 屬性：0x586421a1 <FixedArray[0]> {
    0x586446f9: [String] in ReadOnlySpace: #name:
        0x51112439 <String[10]: #Matterhorn> (常量數據欄位 0)
    0x51112415: [String] in OldSpace: #height:
        4478 (常量數據欄位 1)
 }
0x4b387385: [Map]
 - 類型：JS_OBJECT_TYPE
 - 實例大小：20
 - 物件內屬性：2
 - 元素類型：HOLEY_ELEMENTS
 - 未使用的屬性欄位：0
 - 列舉長度：無效
 - 穩定地圖
 - 返回指針：0x4b38735d <Map(HOLEY_ELEMENTS)>
 - 原型有效性單元格：0x511128dd <Cell value= 0>
 - 實例描述符（自有） #2：0x5cd087e5 <DescriptorArray[2]>
 - 原型：0x5cd086cd <Object map = 0x4b387335>
 - 建構函數：0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - 依賴程式碼：0x5864212d <其他堆塊物件（WEAK_FIXED_ARRAY_TYPE）>
 - 建構計數器：0
```

我們的實例大小現在為 20，即 5 個字：

| 字     | 意義                              |
| ---- | ---------------------------------- |
| 0    | 地圖                               |
| 1    | 指向屬性數組的指針                   |
| 2    | 指向元素數組的指針                   |
| 3    | 名稱                               |
| 4    | 高度                               |

您可能想知道這是如何發生的。畢竟，如果這個對象是在內存中佈局的，並且曾經擁有 10 個屬性，系統如何能容忍這些無人擁有的 8 個字四處散亂？確實，我們從未用任何有趣的東西填滿它們 —— 也許這可能幫助我們。

如果您想知道為何我擔心留下這些字四處散亂，關於垃圾收集器您需要了解一些背景知識。物件是一個接一個地布置，而 V8 垃圾收集器透過一遍又一遍地遍歷該內存來跟踪事物。從內存中的第一個字開始，它期望找到一個指向地圖的指針。它從地圖中讀取實例大小，然後知道怎樣前進到下一個有效的物件。對於某些類別，它還需要額外計算長度，但基本就這樣。

![](/_img/slack-tracking/gc-heap-1.svg)

在上圖中，紅色方塊是**地圖**，白色方塊是填充物件實例大小的詞。垃圾回收器可以通過從地圖跳到地圖來“遍歷”堆。

那麼，如果地圖突然改變其實例大小會發生什麼？現在當垃圾回收器（GC）遍歷堆時，將會看到一個之前未見過的詞。以我們的 `Peak` 類為例，我們從占用 13 個詞改為僅占用 5 個（我將“未使用屬性”詞標記為黃色）：

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

我們可以通過巧妙地初始化這些未使用屬性，使用一個 **“填充”實例大小為 4 的地圖** 來解決這個問題。這樣，當它們暴露於遍歷時，垃圾回收器就能輕易地跨過它們。

![](/_img/slack-tracking/gc-heap-4.svg)

這在 `Factory::InitializeJSObjectBody()` 代碼中表達如下：

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <省略的代碼行>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <省略的代碼行>
}
```

這就是 Slack Tracking 的實際運作。對於您創建的每個類，您可以預期它會暫時占用更多的內存，但在第七次實例化時我們“覺得完成了”，並將剩餘的空間暴露給 GC。這些占用一個詞的對象沒有擁有者——即沒有人指向它們——因此當進行垃圾回收時它們會被釋放，活躍的對象可能會被壓縮以節省空間。

下面的圖表反映了該初始地圖的 Slack Tracking **完成**。注意，現在的實例大小為 20（5 個詞：地圖、屬性和元素數組，以及另外 2 個槽）。Slack Tracking 遵守整個從初始地圖開始的鏈條。換言之，如果初始地圖的後代最終使用所有 10 個初始額外屬性，則初始地圖保留它們，並標記它們為未使用：

![(X, Y, Z) 表示 (實例大小，對象內屬性數量，未使用屬性數量)。](/_img/slack-tracking/root-map-2.svg)

現在 Slack Tracking 已完成，如果向這些 `Peak` 對象之一添加另一個屬性，會發生什麼？

```js
m1.country = 'Switzerland';
```

V8 必須進入屬性後備存儲區。我們最終得到如下的對象佈局：

| 詞   | 值                                    |
| ---- | ------------------------------------- |
| 0    | 地圖                                  |
| 1    | 指向屬性後備存儲的指針                 |
| 2    | 指向元素（空數組）的指針               |
| 3    | 指向字符串 `"Matterhorn"` 的指針       |
| 4    | `4478`                                |

屬性後備存儲的佈局如下所示：

| 詞   | 值                                |
| ---- | --------------------------------- |
| 0    | 地圖                              |
| 1    | 長度 (3)                          |
| 2    | 指向字符串 `"Switzerland"` 的指針 |
| 3    | `undefined`                       |
| 4    | `undefined`                       |
| 5    | `undefined`                       |

我們保留這些額外的 `undefined` 值，為您未來添加更多屬性提供準備。我們根據您目前的行為，認為您可能會添加更多屬性！

## 可選屬性

有時，您可能僅在某些情況下添加屬性。例如，如果高度達到 4000 米或更高，您希望跟蹤兩個額外的屬性，`prominence` 和 `isClimbed`：

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

您可以添加一些不同的變體：

```js
const m1 = new Peak('Wendelstein', 1838);
const m2 = new Peak('Matterhorn', 4478, 1040, true);
const m3 = new Peak('Zugspitze', 2962);
const m4 = new Peak('Mont Blanc', 4810, 4695, true);
const m5 = new Peak('Watzmann', 2713);
const m6 = new Peak('Zinalrothorn', 4221, 490, true);
const m7 = new Peak('Eiger', 3970);
```

在這種情況下，`m1`、`m3`、`m5` 和 `m7` 對象擁有一個地圖，而 `m2`、`m4` 和 `m6` 對象則因為額外的屬性擁有來自初始地圖鏈的更下游的地圖。當該地圖族完成 Slack Tracking 時，會有 **4** 個對象內屬性，而不是之前的 **2**，因為 Slack Tracking 確保保留足夠的空間，用於地圖族樹中的任何後代所使用的最大數量的對象內屬性。

下面顯示了執行上述代碼後的地圖族，並且顯然 Slack Tracking 已完成：

![(X, Y, Z) 表示 (實例大小，對象內屬性數量，未使用屬性數量)。](/_img/slack-tracking/root-map-3.svg)

## 那優化過的代碼呢？

在結束 slack 追蹤之前，我們來編譯一些優化過的程式碼。我們將使用一些原生語法命令，強制在結束 slack 追蹤之前進行一次優化編譯：

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo('Wendelstein', 1838);
const m2 = foo('Matterhorn', 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo('Zugspitze', 2962);
```

這應該足以編譯並執行優化過的程式碼。我們在 TurboFan（優化編譯器）中做了一些稱為[**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27)的工作，將物件的分配內聯化。這意味著，我們生成的原生程式碼會發出指令，要求 GC 提供要分配的物件的實例大小，然後仔細初始化那些欄位。但如果 slack 追蹤在稍後停止，這段程式碼將無效。那該怎麼辦呢？

輕而易舉！我們只需提前結束這個映射族的 slack 追蹤就可以了。這合情合理，因為通常情況下——我們不會在創建了數千個物件之前編譯優化函數。所以 slack 追蹤*應該*已經完成。如果還沒有的話，那就太糟糕了！反正，如果到目前為止創建的物件少於 7 個，那它應該也不那麼重要。（通常，記住，我們只有在程式長時間執行後才開始優化。）

### 在背景執行緒中編譯

我們可以在主執行緒中編譯優化過的程式碼，在這種情況下，由於程式已經停止運行，我們可以提前結束 slack 追蹤，通過一些調用來改變初始映射。然而，我們會在背景執行緒中盡可能多地進行編譯。在這個執行緒中，觸及初始映射可能非常危險，因為它*可能正在主執行緒上（JavaScript 正在運行的地方）發生變化*。因此，我們的方法如下：

1. **猜測**如果現在終止 slack 追蹤，實例大小會是多少。記住這個大小。
2. 當編譯即將完成時，我們返回主執行緒，在這裡可以安全地強制完成 slack 追蹤（如果它還沒有完成的話）。
3. 檢查：實例大小是否與我們的預測一致？如果是，**就沒問題了！** 如果不是，就丟掉這段程式碼物件，稍後再試。

如果您希望看到代碼中的實現，可以查看類別[`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc)以及它如何在 `js-create-lowering.cc` 中被用來創建內聯分配。您會看到，在主執行緒中調用了 `PrepareInstall()` 方法，這會強制完成 slack 追蹤。然後 `Install()` 方法會檢查我們對實例大小的猜測是否成立。

以下是帶有內聯分配的優化程式碼。首先，您會看到與 GC 的通信，檢查我們是否可以通過提升指針的大小來獲得實例大小（這被稱為提升指針分配）。然後，我們開始填充新物件的欄位：

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; 嘿 GC，我們能要 28 (0x1c) 個位元組嗎？
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; 好了 GC，我們拿走了。謝啦，再見。
61  add ecx,0x1                 ;; 太棒了。ecx 是我的新物件。
64  mov edi,0x46647295          ;; 物件: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; 儲存初始映射。
6c  mov edi,0x56f821a1          ;; 物件: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; 儲存屬性後援儲存區（空）
74  mov [ecx+0x7],edi           ;; 儲存元素後援儲存區（空）
77  mov edi,0x56f82329          ;; 物件: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; 物件內屬性 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; 物件內屬性 2 <-- undefined
82  mov [ecx+0x13],edi          ;; 物件內屬性 3 <-- undefined
85  mov [ecx+0x17],edi          ;; 物件內屬性 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; 取得參數 {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; 物件: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; 向前推進映射
9e  mov [ecx+0xb],edi           ;; name = {a1}
a1  mov eax,[ebp+0x10]          ;; 取得參數 {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; 物件: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; 向前推進映射
b4  mov [ecx+0xf],eax           ;; height = {a2}
b7  cmp eax,0x1f40              ;; height 是否 >= 4000？
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 start --
                  -- B9 start --
c2  mov edx,[ebp+0x14]          ;; 取得參數 {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; 物件: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; 向前推進映射
d6  mov [ecx+0x13],edx          ;; prominence = {a3}
d9  mov esi,[ebp+0x18]          ;; 取回參數 {a4}
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; 物件: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; 向前推進映射到葉子映射
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- B10 開始 (解構框架) --
f2  mov eax,ecx                 ;; 準備返回這個絕佳的峰值物件!
…
```

順帶一提，要看到這些內容，您需要有一個除錯版本並傳遞一些標誌。我將代碼放進檔案並執行:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

希望這是一次有趣的探索。我特別感謝 Igor Sheludko 和 Maya Armyanova 細心地審查這篇文章。
