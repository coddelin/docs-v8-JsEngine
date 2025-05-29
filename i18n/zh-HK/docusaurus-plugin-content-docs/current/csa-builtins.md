---
title: "CodeStubAssembler builtins"
description: "本文件旨在介紹如何撰寫 CodeStubAssembler builtins，目標讀者為 V8 開發者。"
---
本文件旨在介紹如何撰寫 CodeStubAssembler builtins，目標讀者為 V8 開發者。

:::note
**注意：** [Torque](/docs/torque) 已取代 CodeStubAssembler 成為實作新 builtins 的推薦方式。請參考 [Torque builtins](/docs/torque-builtins) 以獲得此指南的 Torque 版本。
:::

## Builtins

在 V8 中，builtins 可以理解為在運行時由 VM 執行的程式碼片段。常见應用包括實現內建對象的功能（如 RegExp 或 Promise），但 builtins 也可以用於提供其他內部功能（例如作為 IC 系統的一部分）。

V8 的 builtins 可通過數種不同的方法來實現（每種方法各有優劣）：

- **與平台相關的組合語言**：效率極高，但需要手動移植到所有平台且難以維護。
- **C++**：風格與運行時函數非常相似，可以使用 V8 強大的運行時功能，但通常不適合對性能敏感的領域。
- **JavaScript**：代碼簡潔且可讀性高，能使用快速內置函數，但頻繁調用慢速運行時函數，容易受到類型污染影響性能，且存在與複雜且不明顯的 JavaScript 語義相關的微妙問題。
- **CodeStubAssembler**：提供了接近組合語言的高效低級功能，同時保持與平台無關並提高代碼可讀性。

本文主要關注最後一個方法，並簡單介紹如何開發一個用於 JavaScript 的 CodeStubAssembler (CSA) builtin。

## CodeStubAssembler

V8 的 CodeStubAssembler 是一種定制的、與平台無關的組合器，它以組合語言為基礎提供低級原語抽象，並提供豐富的高級功能庫。

```cpp
// 低級操作：
// 將 addr 地址上的字長數據加載到 value。
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// 和高級操作：
// 執行 ToString(object) 的 JS 操作。
// ToString 的語義在 https://tc39.es/ecma262/#sec-tostring 中規範。
Node* object = /* ... */;
Node* string = ToString(context, object);
```

CSA builtins 通過部分 TurboFan 編譯管線（包括塊調度和寄存器分配，但不包括優化過程）生成最終可執行代碼。

## 撰寫 CodeStubAssembler builtin

在本節中，我們會撰寫一個簡單的 CSA builtin，它接受單一參數，並返回該參數是否為數字 `42`。該 builtin 將通過安裝在 `Math` 對象上暴露給 JS（因為我們可以）。

這個示例展示了：

- 建立一個具有 JavaScript 鏈接的 CSA builtin，它可以像 JS 函數一樣被調用。
- 使用 CSA 實現簡単邏輯：處理 Smi 和 heap-number，條件判斷，及調用 TFS builtins。
- 使用 CSA 變數。
- 將 CSA builtin 安裝到 `Math` 對象上。

如果你想在本地跟著操作，以下代碼基於修訂版 [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0)。

## 宣告 `MathIs42`

Builtins 通過宏 `BUILTIN_LIST_BASE` 在 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) 中宣告。要創建一個具有 JS 鏈接且帶有一個名為 `X` 的參數的 CSA builtin：

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […省略…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […省略…]
```

請注意，`BUILTIN_LIST_BASE` 接受一些不同類型的宏，這些宏代表不同種類的 builtin（詳細信息請參閱內嵌文檔）。特定於 CSA builtins 的種類包括：

- **TFJ**：JavaScript 鏈接。
- **TFS**：Stub 鏈接。
- **TFC**：需要自定義介面描述符的 stub 鏈接 builtin（例如如果參數未經標記或需要在特定寄存器中傳遞）。
- **TFH**：用於 IC 處理程序的專門 stub 鏈接 builtin。

## 定義 `MathIs42`

Builtin 定義位於 `src/builtins/builtins-*-gen.cc` 文件中，大致按照主題進行組織。由於我們要編寫的是一個 `Math` builtin，因此我們將定義放在 [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)。

```cpp
// TF_BUILTIN 是一個方便的宏，它在幕後創建一個給定組合器的新子類。
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // 加載目前函數上下文（每個存根的隱式參數）
  // 和 X 參數。請注意，我們可以通過內建聲明中定義的名稱引用參數。
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // 在此時，x 基本上可以是任何東西 - 一個 Smi，一個 HeapNumber，
  // undefined，或任何其他任意的 JS 對象。我們來調用 ToNumber
  // 內建動作來將 x 轉換為一個我們可以使用的數字。
  // CallBuiltin 可用於方便地調用任何 CSA 內建動作。
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // 創建一個 CSA 變量來存儲結果值。變量的類型是 kTagged，
  // 因為我們只會在其中存儲標籤指針。
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // 我們需要定義幾個標籤作為跳轉目標。
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber 總是返回一個數字。我們需要區分 Smi
  // 和 HeapNumbers - 在這裡，我們檢查 number 是否是 Smi，並有條件地
  // 跳轉到相應的標籤。
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // 綁定標籤開始為其生成代碼。
  BIND(&if_issmi);
  {
    // SelectBooleanConstant 根據條件是否為真返回 JS 的 true/false 值。
    // 結果綁定到我們的 var_result 變量，然後無條件跳轉到 out 標籤。
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber 僅能返回 Smi 或 HeapNumber。只是為了確保
    // 我們在此處添加了一個斷言，用於驗證 number 是否確實是 HeapNumber。
    CSA_ASSERT(this, IsHeapNumber(number));
    // HeapNumber 包裝了一個浮點值。我們需要顯式提取
    // 此值，進行浮點比較，並基於結果再次綁定
    // var_result。
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## 附加 `Math.Is42`

像 `Math` 這樣的內建對象大部分是在 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) 中設置的（有些設置在 `.js` 文件中完成）。附加新的內建對象很簡單：

```cpp
// 設置 Math 的現有代碼，此處為清楚起見包含。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

現在 `Is42` 已附加，可以從 JS 中調用：

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## 定義和調用具有存根鏈接的內建

CSA 內建也可以使用存根鏈接（而不是我們在 `MathIs42` 中使用的 JS 鏈接）創建。此類內建可用於將常用代碼提取到一個可以被多個調用者使用的單獨代碼對象，而該代碼僅生成一次。我們來將處理 HeapNumbers 的代碼提取到一個名為 `MathIsHeapNumber42` 的單獨內建，並從 `MathIs42` 中調用它。

定義和使用 TFS 存根很簡單；聲明同樣放置在 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) 中：

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

請注意，目前在 `BUILTIN_LIST_BASE` 中的順序確實很重要。由於 `MathIs42` 調用 `MathIsHeapNumber42`，因此前者需要列在後者之後（此要求應該在某些時候被解除）。

定義也很簡單。在 [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1) 中：

```cpp
// 定義 TFS 內建的工作方式與 TFJ 內建完全一樣。
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

最後，我們從 `MathIs42` 調用新的內建函數：

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // 現在我們呼叫新的 TFS stub，而不是內聯處理 heap numbers。
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

為什麼你要在意 TFS builtins？為什麼不將程式碼保留內聯（或為了可讀性提取到一個輔助方法中）？

一個重要的原因是程式碼佔用空間：builtins 在編譯時生成，並包含在 V8 的快照中，因此無條件地在每個建立的 isolate 中佔用（顯著的）空間。將通用的程式碼大塊提取到 TFS builtins 中可以快速節省 10 到 100 KB 的空間。

## 測試 stub-linkage builtins

即使我們的新 builtin 使用的是非標準（至少不是 C++ 的）呼叫約定，也可以為其撰寫測試案例。以下程式碼可以加入到 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) 中，來測試該 builtin 在所有平台上的行為：

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
