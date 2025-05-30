---
title: "V8 Torque內建功能"
description: "此文件旨在作為撰寫Torque內建功能的介紹，目標讀者為V8開發人員。"
---
此文件旨在作為撰寫Torque內建功能的介紹，目標讀者為V8開發人員。Torque取代了CodeStubAssembler，成為實現新內建功能的建議方式。請參閱[CodeStubAssembler內建功能](/docs/csa-builtins)了解本指南的CSA版本。

## 內建功能

在V8中，內建功能可以被視為運行時由VM執行的代碼塊。一個常見的用例是實現內建對象的函數（例如`RegExp`或`Promise`），但內建功能也可用於提供其他內部功能（例如作為IC系統的一部分）。

V8的內建功能可以使用多種不同的方法來實現（每種方法都有不同的權衡）：

- **與平台相關的匯編語言**：效率很高，但需要手動移植到所有平台且難以維護。
- **C++**：風格與運行時函數非常相似，可訪問V8的強大運行時功能，但通常不適合性能敏感的領域。
- **JavaScript**：代碼簡潔且可讀性高，可獲取快速內部功能，但頻繁使用慢速運行時調用，容易受類型污染影響性能，並且存在與（複雜且不明顯的）JS語義相關的細微問題。JavaScript內建功能已被棄用，不應再新增。
- **CodeStubAssembler**：提供接近匯編語言的高效低層次功能，同時保持平台無關性和可讀性。
- **[V8 Torque](/docs/torque)**：是與V8特定的域特定語言，會被翻譯成CodeStubAssembler。因此，它擴展了CodeStubAssembler，提供靜態類型以及更具可讀性與表達力的語法。

本文檔接下來將專注於最後一種方法，並提供為JavaScript開發簡單Torque內建功能的簡單教程。如需更完整的Torque信息，請參閱[V8 Torque使用手冊](/docs/torque)。

## 編寫Torque內建功能

在本節中，我們將編寫一個簡單的CSA內建功能，它接收一個參數，並返回該參數是否為數字`42`。此內建功能將通過安裝到`Math`對象上暴露於JS（因為我們可以）。

此示例展示了：

- 創建具有JavaScript鏈接的Torque內建功能，這樣可以像JS函數一樣調用。
- 使用Torque實現簡單邏輯：類型區分、Smi與HeapNumber的處理、條件語句。
- 在`Math`對象上安裝CSA內建功能。

如果你希望在本地跟隨進度，以下代碼基於修訂版[589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614)。

## 定義`MathIs42`

Torque代碼位於`src/builtins/*.tq`文件中，大致按主題組織。由於我們將編寫一個`Math`內建功能，我們會將其定義放在`src/builtins/math.tq`中。由於此文件尚不存在，我們需要將其添加到[`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614)中的[`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn)。

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // 在此處，x基本上可以是任何東西 - 一個Smi，一個HeapNumber，
    // undefined，或任何其他任意JS對象。ToNumber_Inline在CodeStubAssembler中定義。
    // 它在快速路徑中內聯（如果參數已經是數字），否則調用ToNumber內建功能。
    const number: Number = ToNumber_Inline(x);
    // 一個typeswitch允許我們根據值的動態類型進行切換。類型系統
    // 知道Number只能是Smi或HeapNumber，因此這個切換是全面的。
    typeswitch (number) {
      case (smi: Smi): {
        // smi == 42的結果不是一個JavaScript布林值，因此我們使用
        // 條件語句創建一個JavaScript布林值。
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

我們將定義置於Torque命名空間`math`中。由於此命名空間此前並不存在，因此我們需要將其添加到[`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614)中的[`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn)。

## 添加`Math.is42`

內建物件（如 `Math`）主要是在 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) 中設定（部分設定在 `.js` 文件中進行）。附加新內建方法非常簡單：

```cpp
// 現有的設定 Math 的程式碼，此處包含以便清晰說明。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […省略…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

現在 `is42` 已附加，可以從 JS 中調用：

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

## 使用 Stub 連結定義和調用內建方法

內建方法也可以使用 Stub 連結（而不是我們在 `MathIs42` 中使用的 JS 連結）來創建。這樣的內建方法可以用於提取常用的程式碼到一個單獨的程式碼物件中，讓多個調用者能使用，而程式碼只生成一次。我們來提取處理 Heap 數字的程式碼到一個名為 `HeapNumberIs42` 的單獨內建方法中，並從 `MathIs42` 中調用它。

定義也很簡單。與具有 Javascript 連結的內建方法相比，唯一的不同在於我們省略了關鍵字 `javascript`，並且沒有接收器參數。

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // 我們現在不是直接處理 Heap 數字，而是調用新的內建方法。
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

為什麼需要關注內建方法？為什麼不將程式碼直接寫在行內（或者提取到宏中以提高可讀性）？

一個重要的原因是程式碼空間：內建方法在編譯時生成並包含在 V8 快照中或嵌入到二進位檔案中。提取大塊的常用程式碼到單獨的內建方法可以迅速實現 10KB 到 100KB 的空間節省。

## 測試使用 Stub 連結的內建方法

即使我們的內建方法使用的是非標準（至少不是 C++）的調用約定，也可以為它編寫測試用例。以下程式碼可以添加到 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) 中以在所有平台上測試內建方法：

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
