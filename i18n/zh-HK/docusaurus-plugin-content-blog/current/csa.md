---
title: "駕馭 V8 架構複雜性 — CodeStubAssembler"
author: "[Daniel Clifford](https://twitter.com/expatdanno), CodeStubAssembler 組裝器"
date: 2017-11-16 13:33:37
tags:
  - 內部結構
description: "V8 在組合語言基礎上擁有自己的抽象層：CodeStubAssembler。CSA 允許 V8 在低層級快速且可靠地優化 JS 特性，同時支持多種平台。"
tweet: "931184976481177600"
---
在本文中，我們將介紹 CodeStubAssembler (CSA)，這是一個對 V8 非常有幫助的組件，它在最近幾個版本中幫助實現了一些 [重大](/blog/optimizing-proxies) [性能](https://twitter.com/v8js/status/918119002437750784) [突破](https://twitter.com/_gsathya/status/900188695721984000)。CSA 也大幅提升了 V8 團隊快速在低層次优化 JavaScript 特性的能力，同時能夠保持高度的可靠性，進一步加快了開發速度。

<!--truncate-->
## V8 中內建函數與手寫組合語言的簡要歷史

要了解 CSA 在 V8 中的角色，有必要了解其開發背景和歷史。

V8 通過多種技術結合方式來提升 JavaScript 的性能。對於執行時間較長的 JavaScript 程式碼，V8 的 [TurboFan](/docs/turbofan) 優化編譯器出色地提升了 ES2015+ 功能的整體性能表現。然而，為了確保基礎性能，V8 也需要高效執行短暫運行的 JavaScript，尤其是預定義對象中的 **內建函數**，這些函數可供所有 JavaScript 程式使用，並由 [ECMAScript 規範](https://tc39.es/ecma262/) 定義。

歷史上，許多這些內建函數是 [自主托管](https://en.wikipedia.org/wiki/Self-hosting) 的，也就是由 V8 開發者使用 JavaScript（一種特別的 V8 內部方言）編寫的。為了獲得良好的性能，這些自主托管的內建函數使用了 V8 優化用戶提供的 JavaScript 的相同機制。與用戶提供的代碼一樣，自主托管的內建函數需要經歷收集類型反饋的啟動和需由優化編譯器編譯的過程。

雖然這項技術在某些情況下提供了良好的內建性能，但仍有改進空間。`Array.prototype` 上的預定義函數的準確語義在規範中有 [詳細規定](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object)。對於重要且常見的特殊案例，V8 的實現者根據理解規範事先精確地知道這些內建函數應該如何運行，並利用這些知識精心設計出量身定制的版本，這些版本在首次調用時就已達到最佳性能，無需啟動或調用優化編譯器。

為了從手寫的內建 JavaScript 函數（以及其他快速執行的 V8 代碼，這些代碼有時也令人混淆地被稱作內建函數）中榨取最高性能，V8 開發人員傳統上使用組合語言編寫优化的內建函數。通過使用組合語言，手寫內建函數能變得格外快速，例如通過避免使用昂貴的跳板調用 V8 的 C++ 代碼，以及利用 V8 的自定義寄存器基於的 [ABI](https://en.wikipedia.org/wiki/Application_binary_interface)，在內部調用 Javascript 函數。

由於手寫組合語言的優勢，V8 多年來累積了每個平台上數以萬行計的手寫組合語言代碼這些內建函數。這些手寫組合語言代碼對提高性能非常有用，但新語言特性不斷被標準化，維護和擴展這些手寫組合語言代碼變得繁重且容易出錯。

## 迎接 CodeStubAssembler

V8 開發人員多年來都在困擾一個難題：是否有可能創建出擁有手寫組合語言優勢但同時不易出錯且易於維護的內建函數？

隨著TurboFan的出現，這個問題的答案最終是“是的”。TurboFan的後端使用了一種跨平台的[中間表示](https://en.wikipedia.org/wiki/Intermediate_representation) (IR)，用於低層級的機器操作。這種低層級的機器IR被輸入到指令選擇器、寄存器分配器、指令調度器和代碼生成器中，這些組件在所有平台上都能生成非常出色的代碼。後端還了解許多在V8手寫匯編內建函數中使用的技巧，例如如何使用和調用基於自定義寄存器的ABI，如何支持機器級的尾調用，以及如何在葉子函數中省略堆疊框架的構造。這些知識使得TurboFan後端特別適合生成能與V8其他部分良好集成的高效代碼。

這種功能的組合首次使得取代手寫匯編內建函數成為可行且具有良好可維護性的選擇。團隊構建了一個新的V8組件，稱為CodeStubAssembler或CSA，它在TurboFan的後端之上定義了一種可移植的匯編語言。CSA添加了一個API，以便直接生成TurboFan機器級IR，而無需編寫和解析JavaScript或應用TurboFan的JavaScript特定優化。雖然這種快速產生代碼的途徑只有V8開發人員能用來在內部加速V8引擎，但該高效的跨平台優化匯編代碼生成方法卻直接使得所有開發人員受益於CSA構造的內建函數中的JavaScript代碼，包括V8解釋器[Ignition](/docs/ignition)的性能關鍵字節碼處理程序。

![CSA與JavaScript編譯管道](/_img/csa/csa.svg)

CSA介面包括了非常底層的操作，這些操作對於任何曾經編寫過匯編代碼的人來說都非常熟悉。例如，它包括像“從給定地址加載此對象指針”和“將這兩個32位數字相乘”這樣的功能。CSA在IR層進行類型驗證，能在編譯時捕捉到許多正確性問題，而不是在運行時。舉例來說，它可以確保V8開發人員不會意外地將從記憶體中加載的對象指針用作32位乘法的輸入。這種類型驗證在手寫匯編存根中是無法實現的。

## CSA試駕

為了更好地了解CSA的功能，我們來看一個簡單的例子。我們將在V8中添加一個新的內部內建函數，用於從對象中返回字符串長度（如果該對象是字符串）。如果輸入對象不是字符串，該內建函數將返回`undefined`。

首先，我們在V8的[`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h)文件中的`BUILTIN_LIST_BASE`宏中添加一行，聲明新內建函數`GetStringLength`並指定它有一個輸入參數，該參數由常數`kInputObject`標識：

```cpp
TFS(GetStringLength, kInputObject)
```

`TFS`宏將該內建函數聲明為基於標準CodeStub鏈接的**T**urbo**F**an內建函數，這意味著它使用CSA生成其代碼，並期望參數通過寄存器傳遞。

隨後，我們可以在[`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc)中定義內建函數的內容：

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // 使用我們為第一個參數定義的常量提取傳入的對象。
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // 檢查輸入是否為Smi（一種小數字的特殊表示形式）。
  // 這需要在下面的IsString檢查之前完成，因為IsString假設其參數是對象指針而不是Smi。
  // 如果參數的確是一個Smi，跳至標籤|not_string|。
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // 檢查輸入對象是否為字符串。如果不是，跳至標籤|not_string|。
  GotoIfNot(IsString(maybe_string), &not_string);

  // 加載字符串的長度（由於我們在上面驗證它是字符串，因此進入此代碼路徑）並使用CSA“宏”LoadStringLength返回它。
  Return(LoadStringLength(maybe_string));

  // 定義上述IsString檢查失敗時的目標標籤位置。
  BIND(&not_string);

  // 輸入對象不是字符串。返回JavaScript的`undefined`常量。
  Return(UndefinedConstant());
}
```

注意在上述例子中，有兩種類型的指令被使用。一種是 _基本_ 的CSA指令，如`GotoIf`和`Return`，它們直接轉化為一到兩條匯編指令。CSA基元指令的集合是固定的，通常對應於V8支持的某個芯片架構中最常用的匯編指令。另一種類型的指令是 _宏_ 指令，比如`LoadStringLength`、`TaggedIsSmi`和`IsString`，它們是為了便捷地在代碼內聯輸出一個或多個基元或宏指令而設計的功能函數。宏指令被用來封裝常用的V8實現慣用法，便於重用。V8開發人員可以隨時輕鬆地定義新的宏指令。

在對 V8 進行上述更改後，我們可以使用 `mksnapshot` 工具搭配 `--print-code` 命令列選項來運行，該工具能將內建函數編譯以準備用於 V8 的快照。此選項會輸出生成的每個內建函數的組合語言代碼。如果我們在輸出中使用 `grep` 搜尋 `GetStringLength`，在 x64 平台下我們會獲得以下結果（為了更易閱讀，代碼輸出進行了一些清理）：

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

在 32 位元 ARM 平台上，`mksnapshot` 生成以下代碼：

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

儘管我們的新內建函數使用了非標準（至少非 C++）的調用約定，我們仍然可以為其編寫測試案例。以下代碼可以添加到 [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc)，以在所有平臺上測試該內建函數：

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // 測試輸入為字串的情況
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // 測試輸入不是字串的情況（例如 undefined）
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

有關使用 CSA 處理不同類型內建函數以及進一步的範例，請參閱[此 Wiki 頁面](/docs/csa-builtins)。

## V8 開發者效率倍增器

CSA 不僅僅是一種針對多平台的通用組合語言。與以前為每個架構手寫代碼相比，它使實現新功能時的迭代速度大大加快。它通過提供手寫組合語言的所有優勢，同時防止開發者陷入其潛在的重大陷阱，達到這一目的：

- 使用 CSA，開發者可以使用跨平台的低階原語來編寫內建代碼，這些原語直接轉譯為組合指令。CSA 的指令選擇器確保該代碼在所有 V8 支援的平台上都是最優的，而不需要 V8 開發者對每個平台的組合語言都精通。
- CSA 的接口提供可選類型，以確保低階生成的組合代碼所處理的值類型與代碼作者期望的一致。
- 組合指令之間的寄存器分配由 CSA 自動完成，而不是手動完成，包括建立堆疊框架和將值溢出至堆疊（如果內建函數使用超過可用寄存器或進行調用）。這消除了整組容易出現且難以發現的手寫組合內建函數中的錯誤。通過使生成代碼更穩固，CSA 大幅減少編寫正確低階內建函數所需的時間。
- CSA 瞭解 ABI 調用約定——包括標準 C++ 和內部 V8 基於寄存器的約定——因此可以輕鬆實現 CSA 生成代碼與 V8 其他部分之間的互操作性。
- 由於 CSA 代碼是 C++，因此輕鬆可將常見代碼生成模式封裝在可重用的巨集中，用於多個內建函數。
- 因為 V8 使用 CSA 為 Ignition 生成字節碼處理器，所以很容易將基於 CSA 的內建函數功能直接內聯到處理器中，以提升解釋器性能。
- V8 的測試框架支援從 C++ 測試 CSA 功能和 CSA 生成的內建函數，而不需要編寫組合適配器。

總而言之，CSA 徹底改變了 V8 的開發。它顯著提升了團隊優化 V8 的能力。這也意味著我們能夠更快地優化更多 JavaScript 語言特性，從而惠及 V8 的嵌入者。
