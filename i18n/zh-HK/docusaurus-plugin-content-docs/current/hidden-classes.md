---
title: "Maps (隱藏類別) 在 V8"
description: "V8 如何追蹤和優化對象的結構感知？"
---

我們來看一下 V8 如何構建其隱藏類別。主要的數據結構有以下幾種：

- `Map`: 隱藏類別本身。它是對象中的第一個指針值，因此可以輕鬆比較兩個對象是否具有相同的類別。
- `DescriptorArray`: 這個類別擁有的完整屬性列表以及關於它們的資訊。在某些情況下，屬性值甚至包含在這個數組中。
- `TransitionArray`: 從此 `Map` 到兄弟 Maps 的「邊」數組。每個邊都是一個屬性名稱，可以被認為是「如果我向當前類別添加一個具有此名稱的屬性，我將會過渡到哪個類別？」。

由於許多 `Map` 對象只有一個過渡到另一個對象（即，它們是「過渡性」 Maps，只在過渡到其他東西的途中使用），V8 並不總是為它創建一個完整的 `TransitionArray`。相反，它會直接鏈接到這個「下一個」`Map`。系統需要在指向的 `Map` 的 `DescriptorArray` 中進行一些探測，以確定與過渡相關聯的名稱。

這是一個非常豐富的主題。不過，儘管如此，如果你理解了本文中的概念，未來的變化應該能夠逐步理解。

## 為何需要隱藏類別？

V8 可以沒有隱藏類別，當然。它可以將每個對象視為屬性的集合。然而，這樣會丟失一個非常有用的原則：智能設計原則。V8 假設你只會創建有限的**不同**類型的對象。每種對象類型最終都能被看到是以典型的方式使用的。我說「最終被看到」是因為 JavaScript 是一種腳本語言，而不是預編譯語言。因此，V8 從不確定下一步會發生什麼。為了利用智能設計（即，假設背後的代碼來自人的思維），V8 必須觀察並等待，讓結構的感覺滲透進來。隱藏類別機制是實現這項工作的主要手段。當然，它預設了一個複雜的監聽機制，這個機制就是我們在很多文章中提到的 Inline Caches (IC)。

所以，如果你相信這是值得且必要的工作，跟隨我一起探索吧！

## 一個範例

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "good");
```

通過這段代碼，我們已經從根映射（也稱為初始映射）構建了一棵有趣的映射樹，該映射附加在函式 `Peak` 上：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="隱藏類別範例" loading="lazy"/>
</figure>

每個藍色框都代表一個映射，從初始映射開始。這是如果我們以某種方式運行函式 `Peak` 而沒有添加任何屬性時返回的對象的映射。隨後的映射則是由根據各映射之間的邊上給出的屬性名稱添加屬性而產生的。每個映射都列出了與該映射的對象相關聯的屬性列表。此外，它描述了每個屬性的準確位置。最後，從這些映射之一，例如 `Map3`（即你在 `Peak()` 中為 `extra` 參數傳遞數字時的對象的隱藏類別），可以一直向上鏈接到初始映射。

我們再用這些額外的資訊繪製一次。註釋 (i0), (i1) 表示對象內字段位置 0、1 等：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="隱藏類別範例" loading="lazy"/>
</figure>

現在，如果你在創建至少 7 個 `Peak` 對象之前花時間查看這些映射，你會遇到 **slack tracking**，這可能會讓人困惑。我有另一篇文章[這裡](https://v8.dev/blog/slack-tracking)解釋了這部分內容。只需再創建 7 個對象，它就會完成。在這一點上，你的 `Peak` 對象將有整整 3 個對象內屬性，並且無法在對象中直接添加更多屬性。任何額外的屬性都將被卸載到對象的屬性後備存儲中。它只是一個屬性值的數組，其索引來自映射（技術上，來自與映射相關的 `DescriptorArray`）。讓我們在新的一行為 `m2` 添加一個屬性，並重新檢查映射樹：

```javascript
m2.cost = "one arm, one leg";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="隱藏類別範例" loading="lazy"/>
</figure>

我偷偷地加了些東西進來。注意，所有屬性都用 "const" 註釋，這意味著從 V8 的角度來看，自從構造函數以來，沒有人更改過這些屬性，因此在初始化之後，它們可以被視為常量。TurboFan（優化編譯器）非常喜歡這個。假設一個函數將 `m2` 作為常量全域引用。那麼，由於該字段被標記為常量，因此可以在編譯時完成 `m2.cost` 的查找。我會在文章後面再回到這一點。

注意屬性 "cost" 被標記為 `const p0`，這意味著它是存儲在 **properties backing store** 的索引零處的一個常量屬性，而不是直接存儲在對象中。這是因為對象中已經沒有更多空間儲存屬性了。我們可以在 `%DebugPrint(m2)` 中看到這些資訊：

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

你可以看到我們有 4 個屬性，全部標記為 const。前三個屬性存儲在對象中，最後一個存儲在 `properties[0]`，即屬性備份存儲區的第一個插槽中。我們可以看看這裡：

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

額外的屬性存儲在這裡，以防你突然決定要添加更多屬性。

## 真實的結構

此時我們可以做很多不同的事情，但既然你如此熱愛 V8，看到了這裡，我想嘗試描繪我們使用的真實數據結構，就是開頭提到的 `Map`、`DescriptorArray` 和 `TransitionArray`。既然你對幕後的隱藏類概念有了一些了解，那麼你可以通過正確的名稱和結構把你的思維更接近於代碼。讓我試著用 V8 的表示法來重現上面的圖表。首先，我將繪製 **DescriptorArrays**，它們保存了特定 Map 的屬性列表。這些數組可以共用——關鍵是 Map 本身知道它允許在 DescriptorArray 中查看多少屬性。由於屬性按添加的時間順序排列，因此可以由多個 Map 共用這些數組。看這裡：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="隱藏類示例" loading="lazy"/>
</figure>

注意 **Map1**、**Map2** 和 **Map3** 都指向 **DescriptorArray1**。每個 Map 中 "descriptors" 欄位旁的數字表示 DescriptorArray 中屬於該 Map 的屬性數量。所以 **Map1** 只知道 "name" 屬性，僅查看 **DescriptorArray1** 中的第一個屬性。而 **Map2** 則有兩個屬性，分別是 "name" 和 "height"，因此它會查看 **DescriptorArray1** 中的第一項和第二項（name 和 height）。這樣的共用節省了大量空間。

很自然地，在出現分裂的情況下，我們無法共用。如果在添加 "experience" 屬性後，從 Map2 過渡到 Map4，如果添加 "prominence" 屬性，則過渡到 Map3。你可以看到 Map4 和 Map5 以與 DescriptorArray1 被三個 Map 共用相同的方式，正在共用 DescriptorArray2。

我們的 "真實版" 圖表中唯一缺少的是仍然比喻化的 `TransitionArray`。讓我們改變這一點。我冒昧地刪除了 **返回指針** 線，這使得圖表更簡潔一些。只需記住，從樹中的任何 Map，你也可以向上遍歷樹。

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="隱藏類示例" loading="lazy"/>
</figure>

認真研究這個圖表。**問題：如果在 "name" 之後添加新屬性 "rating"，而不是繼續添加 "height" 或其他屬性，會發生什麼情況？**

**回答**：Map1 將獲得一個真正的 **TransitionArray**，以便跟蹤分叉。如果添加屬性 *height*，我們應過渡到 **Map2**。但是，如果添加屬性 *rating*，我們應過渡到新的 Map，**Map6**。此 Map 將需要一個新的 DescriptorArray，其中提到 *name* 和 *rating*。此時對象中有額外的自由插槽（只有三個中的一個被使用），因此屬性 *rating* 將被分配到這些插槽之一。

*我使用 `%DebugPrintPtr()` 驗證了我的回答，畫出了以下內容：*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="隱藏類示例" loading="lazy"/>
</figure>

不用求我停止，我明白這已經是此類圖表的上限了！但我認為你應該能感受到各部分的流動。想像一下，如果在添加這個模仿的屬性 *rating* 之後，繼續添加 *height*、*experience* 和 *cost*，我們就必須創建地圖 **Map7**、**Map8** 和 **Map9**。由於我們堅持在已建立的地圖鏈中間添加這個屬性，我們將重複很多結構。我沒辦法再畫出那個圖了——不過如果你寄給我，我會把它加入這份文檔 :)。

我使用了方便的 [DreamPuf](https://dreampuf.github.io/GraphvizOnline) 專案來輕鬆製作這些圖表。以下是此前圖表的 [連結](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D)。

## TurboFan 和 const 屬性

到目前為止，所有這些字段都在 `DescriptorArray` 中標記為 `const`。讓我們來嘗試一下。使用調試版本運行如下代碼：

```javascript
// 使用如下方式運行：
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// 確保 slack tracking 完成。
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "one arm, one leg";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

你將會看到優化的函數 `foo()` 的打印輸出。代碼非常短。你會在函數末尾看到以下內容：

```
...
40  mov eax,0x2a812499          ;; 對象: 0x2a812499 <String[16]: #one arm, one leg>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; 返回 "one arm, one leg"！
```

TurboFan 真是個調皮鬼，它直接插入了 `m2.cost` 的值。你覺得如何！

當然，在最後一次調用 `foo()` 之後，你可以插入如下行：

```javascript
m2.cost = "priceless";
```

你認為會發生什麼？可以確定的是，我們不能讓 `foo()` 保持不變。它會返回錯誤的答案。重新運行程序，並添加標誌 `--trace-deopt`，這樣你會知道系統何時移除優化代碼。在打印出優化過的 `foo()` 後，你將會看到以下行：

```
[marking dependent code 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) for deoptimization,
    reason: field-const]
[deoptimize marked code in all contexts]
```

哇。

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="I like it a lot" loading="lazy"/>
</figure>

如果您強制重新優化，您將獲得質量不如從前的代碼，但仍然能夠大大受益於我們一直在描述的地圖結構。記住從我們的圖表中，屬性 *cost* 是物件的屬性備份存儲中的第一個屬性。嗯，它可能失去了它的常量標記，但我們仍然有它的地址。基本上，在具有地圖 **Map5** 的物件中，我們可以肯定全域變數 `m2` 仍然擁有它，我們只需——

1. 加載屬性備份存儲，以及
2. 讀取出第一個陣列元素。

來看看這個。將此代碼新增到最後一行下方：

```javascript
// 強制重新優化 foo()。
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

現在看看生成的代碼：

```
...
40  mov ecx,0x42cc8901          ;; 物件: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; 加載屬性備份存儲
48  mov eax,[ecx+0x7]           ;; 獲取第一個元素。
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; 返回它到寄存器 eax！
```

這就是我們說的應該發生的情況。或許，我們開始明白了。

TurboFan 也足夠聰明，若變數 `m2` 曾經改變為不同的類別，它會自動取消優化。您可以通過某些滑稽的操作再次觀察最新的優化代碼取消優化，例如：

```javascript
m2 = 42;  // 呵呵。
```

## 後續可以做什麼

很多選項。地圖遷移。字典模式（又名「慢模式」）。有很多可探索的區域，希望您能像我一樣享受其中的樂趣——感謝閱讀！
