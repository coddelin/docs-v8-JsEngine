---
title: "V8 Torque 使用手冊"
description: "本文件講解 V8 Torque 語言，在 V8 程式碼庫中的使用方式。"
---
V8 Torque 是一種語言，讓那些對 V8 專案進行貢獻的開發者能夠透過專注於他們對虛擬機器（VM）變更的目標，來表達改變，而非被無關的實現細節困擾。該語言被設計得足夠簡單，使得可以輕鬆將[ECMAScript 規範](https://tc39.es/ecma262/)直接翻譯成 V8 中的實現，同時亦足夠強大，可以以穩健的方式表達 V8 的低層次優化技巧，例如基於對特定物件形狀進行測試來創建快速路徑。

Torque 對 V8 工程師和 JavaScript 開發者來說會很熟悉，它結合了一種 TypeScript 類語法，既簡化了編寫也便於理解 V8 的程式碼，同時這種語法和型別能反映出在 [`CodeStubAssembler`](/blog/csa) 中已經很常見的概念。透過強大的型別系統及結構化的控制流程，Torque 可以在構建時確保正確性。Torque 的表達能力足以表達[目前在 V8 的內建函數](/docs/builtin-functions)中幾乎所有的功能。它與用 C++ 撰寫的 `CodeStubAssembler` 內建函數和 `macro` 亦有非常良好的互操作性，使 Torque 程式碼能夠使用手寫的 CSA 功能，反之亦然。

Torque 提供了語言構造體來表現 V8 實現中的高階、語意豐富的細節，而 Torque 編譯器會將這些細節轉換成使用 `CodeStubAssembler` 的高效組件碼。Torque 的語言結構和 Torque 編譯器的錯誤檢查方法都保證了正確性，這與直接使用 `CodeStubAssembler` 時的耗時且易出錯情形形成了鮮明對比。傳統上，使用 `CodeStubAssembler` 撰寫優化程式碼需要 V8 工程師記住大量專門的知識，其中很多知識從未以任何書面形式正式記錄，這樣才能在實現中避免微妙的陷阱。缺少這些知識的話，撰寫高效的內建函數的學習曲線就會非常陡峭。即使擁有必要的知識，非顯而易見且未被檢控的陷阱仍然常導致正確性或[安全性](https://bugs.chromium.org/p/chromium/issues/detail?id=775888)[錯誤](https://bugs.chromium.org/p/chromium/issues/detail?id=785804)。使用 Torque，可以自動避免並識別許多這類陷阱。

## 開始使用

大多數使用 Torque 撰寫的程式碼都會檢入 V8 程式庫下的[`src/builtins` 目錄](https://github.com/v8/v8/tree/master/src/builtins)，且使用 `.tq` 作為檔案擴展名。V8 的堆分配類的 Torque 定義與 C++ 定義相並列，存放在名稱與 `src/objects` 中對應 C++ 檔案相同的 `.tq` 檔案中。實際的 Torque 編譯器則位於[`src/torque`](https://github.com/v8/v8/tree/master/src/torque)。Torque 功能相關的測試則會檢入 [`test/torque`](https://github.com/v8/v8/tree/master/test/torque)、[`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque) 和 [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque)。

為了讓你快速了解該語言，我們來撰寫一個 V8 的內建函數來印出 “Hello World!”。為此，我們需要在測試案例內新增 Torque `macro`，並使用 `cctest` 測試框架調用它。

首先打開 `test/torque/test-torque.tq` 檔案，並在檔案的結尾（但最終閉合的 `}` 之前）新增以下程式碼：

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

接著，打開 `test/cctest/torque/test-torque.cc` 檔案，新增以下測試案例以使用新的 Torque 程式碼來構建一個 Code Stub：

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

然後[建置 `cctest` 執行檔](/docs/test)，最後執行 `cctest` 測試以印出 ‘Hello world’:

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Torque 如何生成程式碼

Torque 編譯器並不直接生成機器碼，而是產生使用 V8 現有 `CodeStubAssembler` 界面的 C++ 程式碼。`CodeStubAssembler` 使用[TurboFan 編譯器](https://v8.dev/docs/turbofan)的後端來生成高效的程式碼。因此，Torque 編譯需要多個步驟：

1. `gn` 建構過程首先執行 Torque 編譯器。它會處理所有 `*.tq` 檔案。每個 Torque 檔案 `path/to/file.tq` 會產生以下檔案：
    - `path/to/file-tq-csa.cc` 和 `path/to/file-tq-csa.h` 含有生成的 CSA 宏定義。
    - `path/to/file-tq.inc` 包含類別定義，需被對應的頭文件 `path/to/file.h` 引入。
    - `path/to/file-tq-inl.inc` 包含類別定義的 C++ 存取器，需被對應的內聯頭文件 `path/to/file-inl.h` 引入。
    - `path/to/file-tq.cc` 包含生成的堆驗證器、打印器等。

    Torque 編譯器還生成其他各種已知的 `.h` 文件，供 V8 構建使用。
1. 接著，`gn` 構建將第 1 步生成的 `-csa.cc` 文件編譯到 `mksnapshot` 執行檔中。
1. 當執行 `mksnapshot` 時，會生成 V8 所有的 builtins，並打包到快照文件中，包括那些在 Torque 中定義的和使用 Torque 定義功能的其他 builtins。
1. 然後構建 V8 的其他部分。所有 Torque 編寫的 builtins 透過链接入 V8 的快照文件被設置為可存取。它們可以像其他 builtins 一樣被調用。此外，`d8` 或 `chrome` 執行檔還直接包含相關生成的與類別定義有關的編譯單元。

圖形上，構建過程如下所示：

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Torque 工具

Torque 提供了基本工具和開發環境支持。

- Torque 有一個 [Visual Studio Code 插件](https://github.com/v8/vscode-torque)，它使用自定義語言伺服器提供如“跳至定義”等功能。
- 還有一個格式化工具，用於更改 `.tq` 文件後使用：`tools/torque/format-torque.py -i <filename>`

## 涉及 Torque 的構建故障排除

為什麼需要了解這些？了解 Torque 文件如何轉換為機器碼很重要，因為在將 Torque 轉換為嵌入快照的二進制位的不同階段，可能會出現不同的問題（和錯誤）：

- 如果 Torque 代碼（例如 `.tq` 文件）中有語法或語義錯誤，Torque 編譯器會失敗。在此階段，V8 構建中止，且您無法看到構建後續部分可能暴露的其他錯誤。
- 當您的 Torque 代碼語法正確並通過了 Torque 編譯器（比較嚴格）的語義檢查後，`mksnapshot` 的構建仍可能失敗。這最常發生於 `.tq` 文件中提供的外部定義不一致。Torque 代碼中的 `extern` 關鍵字表示所需功能的定義在 C++ 中。當前， `.tq` 文件中 `extern` 定義與其參考的 C++ 代碼之間的耦合較鬆散，Torque 編譯時也不會核實這種耦合度。當 `extern` 定義與它們在 `code-stub-assembler.h` 標頭文件或其他 V8 標頭中文件不匹配（或在最微妙的情況下掩蓋）時，`mksnapshot` 的 C++ 构建會失敗。
- 即使 `mksnapshot` 成功構建，它在執行時仍可能失敗。例如，Turbofan 無法編譯生成的 CSA 代碼，這可能是因為 Torque 的 `static_assert` 無法被 Turbofan 驗證。此外，在生成快照期間運行的 Torque 提供的 builtin 可能存在錯誤。例如，Torque 寫的 `Array.prototype.splice` builtin 是作為 JavaScript 快照初始化過程的一部分被調用以設置默認 JavaScript 環境。如果該實現中有錯誤，`mksnapshot` 在執行時會崩潰。當 `mksnapshot` 崩潰時，有時需要傳遞 `--gdb-jit-full` 標誌來調用 `mksnapshot`，以生成額外的調試信息提供有用的上下文，例如 `gdb` 堆疊爬取中的 Torque 生成的 builtin 的名稱。
- 當然，即使通過了 `mksnapshot`，Torque 編寫的代碼還是可能有錯誤或崩潰。向 `torque-test.tq` 和 `torque-test.cc` 添加測試用例，是確保 Torque 代碼按照您的預期運行的好方法。如果 Torque 代碼最終在 `d8` 或 `chrome` 中崩潰，再次使用 `--gdb-jit-full` 標誌非常有用。

## `constexpr`：編譯時與運行時

理解 Torque 構建過程對於理解 Torque 語言中的一個核心功能也很重要：`constexpr`。

Torque 允許在運行時執行 Torque 代碼中的表達式（即當 V8 builtins 作為執行 JavaScript 的一部分被執行時）。同時，它還允許在編譯時執行表達式（即在 Torque 構建過程中，V8 庫和 `d8` 執行檔被創建之前）。

Torque 使用 `constexpr` 關鍵字來表示表達式必須在建置時評估。它的用法與 [C++ 的 `constexpr`](https://en.cppreference.com/w/cpp/language/constexpr) 有些類似：除了借用 C++ 的 `constexpr` 關鍵字及部分語法外，Torque 也用 `constexpr` 來表明編譯時與執行時的評估差異。

然而，Torque 的 `constexpr` 語意與 C++ 存在一些細微差異。在 C++ 中，`constexpr` 表達式可以完全由 C++ 編譯器評估。而在 Torque 中，`constexpr` 表達式無法完全由 Torque 編譯器評估，但會映射到 C++ 的型別、變數及表達式，並且必須在執行 `mksnapshot` 時完全評估。從 Torque 作者的視角看，`constexpr` 表達式並不會生成在執行時執行的程式碼，因此就意義而言它們屬於編譯時，即使技術上它們是由 Torque 外部的 C++ 程式碼在執行 `mksnapshot` 時評估。所以在 Torque 中，`constexpr` 本質上意味著「`mksnapshot` 時間」，而不是「編譯時間」。

結合泛型，`constexpr` 是一個強大的 Torque 工具，可用來自動生成多個非常高效且專門化的內建函數。這些函數彼此之間僅在少許特定細節上有所不同，而 V8 開發者可以提前預期這些細節。

## 檔案

Torque 程式碼打包成獨立的源碼檔案。每個源碼檔案由一系列宣告組成，這些宣告本身可以選擇包含在命名空間宣告中，以分隔宣告的命名空間。如下的語法描述可能已過時。真正的來源在 [Torque 編譯器中的語法定義](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar)，它採用上下文無關的文法規則編寫。

Torque 檔案是一系列宣告的序列。可能的宣告列在 [`torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration)。

## 命名空間

Torque 的命名空間允許宣告位於獨立的命名空間中。它們類似於 C++ 的命名空間。使用 Torque 的命名空間可創建在其他命名空間中不自動可見的宣告。命名空間可以嵌套，嵌套命名空間中的宣告可以在包含它們的命名空間內無條件地訪問。在未顯式包含在命名空間宣告的情況下，宣告被放置在共享的全域預設命名空間中，該命名空間對所有其他命名空間都可見。命名空間可以重新打開，允許它們跨多個檔案定義。

例如：

```torque
macro IsJSObject(o: Object): bool { … }  // 在預設命名空間中

namespace array {
  macro IsJSArray(o: Object): bool { … }  // 在 array 命名空間中
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK，全域命名空間在此可見
    IsJSArray(o);  // ERROR，此命名空間中不可見
    array::IsJSArray(o);  // OK，顯式命名空間限定
  }
  // …
};

namespace array {
  // OK，命名空間已重新打開。
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## 宣告

### 型別

Torque 是強型別的。它的型別系統是許多安全性及正確性保證的基礎。

對於許多基本型別而言，Torque 實際上並未固有地了解它們。許多型別僅通過顯式的型別映射與 `CodeStubAssembler` 和 C++ 型別鬆散地結合，並依賴 C++ 編譯器來強制執行該映射的嚴謹性。此類型別實現為抽象型別。

#### 抽象型別

Torque 的抽象型別直接映射到 C++ 編譯時及 CodeStubAssembler 執行時值。它們的宣告指定名稱以及與 C++ 型別的關係：

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName` 指定抽象型別的名稱，而 `ExtendsDeclaration` 可選地指定所宣告型別衍生自的型別。`GeneratesDeclaration` 可選地指定字串字面值，其對應於 `CodeStubAssembler` 程式碼中用於包含其型別的執行時值的 C++ `TNode` 型別。`ConstexprDeclaration` 是指定 Torque 型別的 `constexpr` 版本對應於用於建置時（`mksnapshot` 時間）評估的 C++ 型別的字串字面值。

以下是 Torque 的 31 位及 32 位有符號整數型別，取自 `base.tq` 的範例：

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### 聯合型別

聯合型別表示一個值屬於多個可能型別之一。我們僅允許標籤值的聯合型別，因為它們可以通過 map 指針在執行時區分。例如，JavaScript 數字要麼是 Smi 值，要麼是分配的 `HeapNumber` 物件。

```torque
type Number = Smi | HeapNumber;
```

Union 類型滿足以下等式：

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` 如果 `B` 是 `A` 的子類型

僅允許從標記類型形成 Union 類型，因為未標記類型在運行時無法區分。

將 Union 類型映射到 CSA 時，選擇所有 Union 類型的最具特定性的共同超類型，`Number` 和 `Numeric` 除外，它們映射到相應的 CSA Union 類型。

#### 類型

類型使得可以從 Torque 代碼定義、分配和操作 V8 GC 堆上的結構化對象。每個 Torque 類型必須對應於 C++ 代碼中的 HeapObject 子類。為了最大限度地減少在 V8 的 C++ 和 Torque 實現之間維護樣板對象訪問代碼的開銷，Torque 類型定義被用於生成所需的 C++ 對象訪問代碼（在可能且適合的情況下），以減少手動同步 C++ 和 Torque 的麻煩。

```grammar
類型聲明：
  類型註解* extern 可選 transient 可選 類型 識別名稱 擴展聲明 可選 生成聲明 可選 {
    類型方法聲明*
    類型字段聲明*
  }

類型註解：
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( 數值字面量 )
  @apiExposedInstanceTypeValue ( 數值字面量 )

類型方法聲明：
  transitioning 可選 識別名稱 隱式參數 可選 明確參數 返回類型 可選 標籤聲明 可選 語句塊

類型字段聲明：
  類型字段註解* weak 可選 const 可選 字段聲明;

類型字段註解：
  @noVerifier
  @if ( 識別符 )
  @ifnot ( 識別符 )

字段聲明：
  識別符 數組規格 可選 : 類型 ;

數組規格：
  [ 表達式 ]
```

一個示例類型：

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` 表示此類型在 C++ 中定義，而不是僅在 Torque 中定義。

類型中的字段聲明隱式生成字段 getter 和 setter，可從 CodeStubAssembler 使用，例如：

```cpp
// 在 TorqueGeneratedExportedMacrosAssembler 中：
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

如上所述，在 Torque 類型中定義的字段生成 C++ 代碼，消除了重複樣板訪問器和堆訪問器代碼的需要。手動定義的 JSProxy 必須繼承生成的類模板，如下所示：

```cpp
// 在 js-proxy.h 中：
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // 類需要的其他內容放在這裡...

  // 最後，因為它影響公開/私有：
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// 在 js-proxy-inl.h 中：
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

生成的類提供轉換函數、字段訪問器函數和字段偏移常量（例如 `kTargetOffset` 和 `kHandlerOffset` 就是這個例子中表示每個字段到類起始位置字節偏移量的常量）。

##### 類型註解

某些類型不能使用上述示例中顯示的繼承模式。在這些情況下，類型可以指定 `@doNotGenerateCppClass`，直接從其超類型繼承，並包含 Torque 生成的字段偏移常量宏。這些類必須實現自己的訪問器和轉換函數。使用該宏如下所示：

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // 類其他部分省略...
}
```

`@generateBodyDescriptor` 使 Torque 在生成的類型內生成一個表示垃圾收集器如何訪問對象的 `BodyDescriptor`。否則 C++ 代碼必須自行定義對象訪問，或者使用現有模式（例如，繼承自 `Struct` 並將類型包含在 `STRUCT_LIST` 中意味著該類型預期僅包含標記值）。

如果添加了 `@generatePrint` 註解，則生成器將實現一個 C++ 函數，用於根據 Torque 布局打印字段值。使用 JSProxy 示例，簽名將是 `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`，該方法可被 `JSProxy` 繼承。

Torque 編譯器也會為所有的 `extern` 類別生成驗證代碼，除非該類別使用 `@noVerifier` 註解選擇不生成。例如，上述 JSProxy 類別定義將生成一個 C++ 方法 `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)`，該方法根據 Torque 類型定義驗證其字段是否有效。同時，它還會在生成的類別上生成對應的函數 `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`，該函數調用來自 `TorqueGeneratedClassVerifiers` 的靜態函數。如果你想為某個類別添加額外的驗證（例如，對數字範圍的接受值進行限制，或者需求字段 `foo` 在字段 `bar` 非空時為真等），那麼可以在 C++ 類別中添加 `DECL_VERIFIER(JSProxy)` （這將隱藏繼承的 `JSProxyVerify`），並在 `src/objects-debug.cc` 中實現它。任何此類自定義驗證器的第一個步驟應為調用生成的驗證器，例如 `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`。（要在每次 GC 前後運行這些驗證器，請使用 `v8_enable_verify_heap = true` 編譯並使用 `--verify-heap` 運行。）

`@abstract` 表示該類本身不會實例化，而且沒有自己的實例類型：邏輯上屬於該類的實例類型是派生類別的實例類型。

`@export` 註解使 Torque 編譯器生成具體的 C++ 類別（例如上例中的 `JSProxy`）。這顯然只有在你不想添加任何超出 Torque 自動生成代碼的 C++ 功能時才有用。不能與 `extern` 一起使用。對於僅在 Torque 中定義和使用的類別，最合適的方式是既不使用 `extern` 也不使用 `@export`。

`@hasSameInstanceTypeAsParent` 表示與其父類別具有相同實例類型的類別，但重命名了一些字段，或者可能擁有不同的映射。在這種情況下，父類別不是抽象類。

`@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType` 和 `@apiExposedInstanceTypeValue` 這些註解都會對實例類型的生成產生影響。一般情況下，你可以忽略這些註解而不會出問題。Torque 負責在枚舉 `v8::internal::InstanceType` 中為每個類分配一個唯一值，以便 V8 能夠在運行時確定 JS 堆中任何對象的類型。Torque 分配的實例類型在絕大多數情況下應該足夠，但在某些情況下，我們希望某一類的實例類型在不同編譯版本之間保持穩定，或者位於其超類型分配範圍的開始或結束處，或者保留一組可以在 Torque 外部定義的值範圍。

##### 類別字段

與簡單值一樣，如上述例子所示，類別字段可以包含索引數據。以下是一個例子：

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

這意味著 `CoverageInfo` 的實例根據 `slot_count` 中的數據大小各不相同。

與 C++ 不同的是，Torque 不會在字段之間隱式添加填充；相反，如果字段未正確對齊，它將失敗並發出錯誤。Torque 還要求強字段、弱字段和標量字段在字段順序中與其他相同類別的字段放置在一起。

`const` 表示字段在運行時不能被更改（或者至少不容易改變；如果你試圖設置它，Torque 將無法完成編譯）。這對於長度字段來說是個好主意，因為它們應該僅在極其謹慎的情況下被重設，因為這需要釋放任何已釋放的空間，並可能與標記線程引發數據競爭。
事實上，Torque 要求用於索引數據的長度字段必須是 `const`。

`weak` 在字段聲明的開頭表示該字段是一個自定義的弱引用，而不是弱字段的 `MaybeObject` 標籤機制。
此外，`weak` 也會影響常量生成，例如 `kEndOfStrongFieldsOffset` 和 `kStartOfWeakFieldsOffset`，這是一個遺留功能，它在某些自定義的 `BodyDescriptor` 中使用，目前仍然需要將標記為 `weak` 的字段組合在一起。我們希望一旦 Torque 完全能生成所有的 `BodyDescriptor`，就可以移除這個關鍵字。

如果存儲在字段中的對象可能是 `MaybeObject` 式的弱引用（設置了第二位），那麼應該在類型中使用 `Weak<T>`，而不應使用 `weak` 關鍵字。目前情況仍然有一些例外，例如 `Map` 中的這個字段，它可以包含一些強引用類型和一些弱引用類型，並且也為了包含在弱部分中被標記為 `weak`：

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` 和 `@ifnot` 用於標記僅在某些構建配置中包含的字段。它們接受 `src/torque/torque-parser.cc` 中 `BuildFlags` 列表中的值。

##### 完全在 Torque 外部定義的類別

某些類別並未在 Torque 中定義，但 Torque 必須了解每一個類別，因為它負責實例類型的分配。對於這種情況，可以聲明沒有本體的類別，Torque 除了實例類型外不會為它們生成任何其他內容。示例：

```torque
extern class OrderedHashMap extends HashTable;
```

#### 形狀（Shapes）

定義 `shape` 看起來與定義 `class` 幾乎相同，但它使用關鍵字 `shape` 而不是 `class`。 `shape` 是 `JSObject` 的子類型，表示在某個時間點內-對象內部屬性的排列（在規範術語中，這些是 "數據屬性" 而不是 "內部插槽"）。`shape` 沒有自己的實例類型。具有特定形狀的對象可能隨時改變並失去該形狀，因為對象可能進入字典模式並將所有屬性移動到分開的備份存儲中。

#### 結構（Structs）

`struct` 是一種可以輕鬆一起傳遞的數據集合（與名為 `Struct` 的類完全無關）。與類一樣，它們可以包含操作數據的宏（macro）。與類不同的是，它們還支持泛型。語法看起來與類似的類相似：

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Struct註解

任何標記為 `@export` 的 struct 都會以可預測的名稱包含在生成的檔案 `gen/torque-generated/csa-types.h` 中。名稱以 `TorqueStruct` 為前綴，例如 `PromiseResolvingFunctions` 會變成 `TorqueStructPromiseResolvingFunctions`。

Struct 的字段可以標記為 `const`，這意味著它們不應被寫入。但整個 struct 仍然可以被重寫。

##### Struct 作為類的字段

Struct 可以作為類字段的類型。在這種情況下，它代表類內按順序排列的數據（否則，struct 沒有對齊要求）。這對於類中的索引字段尤其有用。例如，`DescriptorArray` 包含一個由三個值的 struct 組成的數組：

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### 引用與切片

`Reference<T>` 和 `Slice<T>` 是特殊的 struct，表示指向堆物件中保存的數據的指針。它們都包含一個物件和一個偏移量，而 `Slice<T>` 還包含長度。與其直接構造這些 struct，不如使用特殊語法：`&o.x` 創建一個指向物件 `o` 內字段 `x` 的 `Reference`，或者如果 `x` 是索引字段，則創建指向其數據的 `Slice`。對於引用和切片，存在常數和可變版本。對於引用，這些類型分別用 `&T` 和 `const &T` 表示可變和常數引用。可變性指的是它們指向的數據，可能不具有全域性，也就是說，您可以創建指向可變數據的常數引用。對於切片，類型中沒有特殊語法，這兩個版本分別用 `ConstSlice<T>` 和 `MutableSlice<T>` 表示。引用可以用 `*` 或 `->` 解引用，與 C++ 一致。

引用和切片未標記數據也可以指向非堆數據。

#### 位域struct

一個 `bitfield struct` 表示被打包到單個數值中的數字數據集合。其語法與普通 `struct` 類似，但每個字段添加位數。

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

如果位域 struct（或任何其他數字數據）存儲在 Smi 中，可以使用類型 `SmiTagged<T>` 表示。

#### 函數指針類型

函數指針只能指向 Torque 中定義的 builtins，因為這保證了默認的 ABI。它們特別有助於減少二進制代碼大小。

雖然函數指針類型是匿名的（如同 C），但可以綁定到類型別名（如同 C 中的 `typedef`）。

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### 特殊類型

有兩種特殊類型由關鍵字 `void` 和 `never` 指示。`void` 用作不返回值的可調用對象的返回類型，而 `never` 用作永遠不返回（即僅通過異常路徑退出）的可調用對象的返回類型。

#### 瞬態類型

在 V8 中，堆物件的佈局可以在運行時改變。為了在類型系統中表達可能改變或其他臨時假設的物件佈局，Torque 支持“瞬態類型”的概念。聲明抽象類型時，添加關鍵字 `transient` 將其標記為瞬態類型。

```torque
// 一個具有 JSArray map 的 HeapObject，並且要麼快速打包的元素，要麼
// 全局 NoElementsProtector 未失效時快速稀疏元素。
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

例如，在 `FastJSArray` 的情況下，如果數組更改為字典元素或全局 `NoElementsProtector` 被失效，瞬態類型將被失效。為了在 Torque 中表達這一點，所有可能執行此操作的可調用對象都需要標註為 `transitioning`。例如，調用 JavaScript 函數可以執行任意 JavaScript，因此它是 `transitioning`。

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

在型別系統中，這種管理方式是透過禁止在轉換操作中訪問瞬態型別的值來實現的。

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // 型別錯誤：fastArray 在此處無效。
```

#### 列舉

列舉提供了一種定義一組常數並以類似 C++ 的列舉類（enum classes）的名稱對它們進行分組的方式。
聲明由 `enum` 關鍵字引入，並遵循以下語法結構：

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

基本示例如下所示：

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

此聲明定義了一個新型別 `LanguageMode`，其中 `extends` 子句指定了基礎型別，即表示枚舉值的運行時型別。此示例中，基礎型別為 `TNode<Smi>`，因為 `Smi` 所生成的型別是這個型別。一個 `constexpr LanguageMode` 會在生成的 CSA 文件中轉換為 `LanguageMode`，因為在枚舉中沒有指定用來替換預設名稱的 `constexpr` 子句。
如果省略 `extends` 子句，Torque 只會生成該型別的 `constexpr` 版本。`extern` 關鍵字告訴 Torque 該枚舉有對應的 C++ 定義。目前，僅支持 `extern` 枚舉。

Torque 為枚舉的每個項目生成一個獨立的型別和常數。這些定義位於與枚舉名稱匹配的命名空間內。必要的 `FromConstexpr<>` 特化被生成以從項目的 `constexpr` 型別轉換為枚舉型別。在 C++ 文件中，為枚舉項目生成的值是 `<enum-constexpr>::<entry-name>`，其中 `<enum-constexpr>` 是為枚舉生成的 `constexpr` 名稱。在上述示例中，它們是 `LanguageMode::kStrict` 和 `LanguageMode::kSloppy`。

Torque 的枚舉與 `typeswitch` 構造非常配合，因為枚舉值是用獨立型別定義的：

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

如果 C++ 定義的枚舉包含比 `.tq` 文件中使用的更多的值，Torque 需要知道這一點。這可以通過在最後一個項目後添加 `...` 來聲明枚舉為「開放」。例如考慮 `ExtractFixedArrayFlag`，其中只有部分選項在 Torque 中可用或被使用：

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### 可調用項目

可調用項目在概念上類似於 JavaScript 或 C++ 中的函數，但它們具有一些額外的語義，可以便捷地與 CSA 代碼和 V8 執行時交互。Torque 提供了多種不同型別的可調用項目：`macro`、`builtin`、`runtime` 和 `intrinsic`。

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` 可調用項目

宏是一種與生成的 CSA 生成 C++ 代碼片段對應的可調用項目。`macro` 可以完全在 Torque 中定義，這種情況下 CSA 代碼由 Torque 生成；或者被標記為 `extern`，這種情況下實現必須以手寫的 CSA 代碼形式提供，並存在於 CodeStubAssembler 類中。在概念上，可以將 `macro` 想像成可在呼叫點內嵌的 CSA 代碼片段。

`macro` 的聲明形式如下：

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

每個非 `extern` 的 Torque `macro` 都使用 `macro` 的 `StatementBlock` 主體來在其命名空間的生成 `Assembler` 類中創建一個 CSA 生成函數。這些代碼看起來與 `code-stub-assembler.cc` 中的其他代碼相似，儘管由於是機器生成的，可能可讀性稍差。被標記為 `extern` 的 `macro` 沒有在 Torque 中撰寫主體，只提供介面給手寫的 C++ CSA 代碼，使其可以在 Torque 中使用。

`macro` 定義指定了隱性和顯性參數、可選的返回型別以及可選的標籤。參數和返回型別的詳細信息將在下面更詳盡地討論，目前只需知道它們在某種程度上類似於 TypeScript 的參數，可以參考 TypeScript 文檔中有關函數型別的部分 [這裡](https://www.typescriptlang.org/docs/handbook/functions.html)。

Labels 是一種用於從 `macro` 中異常退出的機制。它們與 CSA 的標籤一一對應，並作為 `CodeStubAssemblerLabels*` 類型的參數添加到為 `macro` 生成的 C++ 方法中。它們的具體語義在下面將會詳細討論，但對於 `macro` 聲明而言，可以使用 `labels` 關鍵字提供標籤的逗號分隔列表，並將其放置於 `macro` 的參數列表和返回類型之後。

以下是一個來自 `base.tq` 的外部和由 Torque 定義的 `macro` 示例：

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin` 可調用函數

`builtin` 與 `macro` 類似，可以完全用 Torque 定義或標記為 `extern`。在基於 Torque 的 builtin 情況下，builtin 的主體用于生成一個 V8 builtin，該 builtin 可以像其他 V8 builtin 一樣被調用，包括自動在 `builtin-definitions.h` 中添加相關信息。與 `macro` 類似，Torque 中標記為 `extern` 的 `builtin` 沒有基於 Torque 的主體，而僅僅提供了一個接口以使用現有的 V8 `builtin`，使得它們可以在 Torque 代碼中使用。

Torque 中的 `builtin` 聲明具有如下形式：

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Torque builtin 的代碼只有一個副本，位於生成的 builtin 代碼對象中。與 `macro` 不同，當 Torque 代碼中調用 `builtin` 時，CSA 代碼不會在調用點內嵌，而是生成對 builtin 的調用。

`builtin` 無法擁有標籤。

如果您在編寫 `builtin` 的具體實現，並且某一內建函數或運行時函數是 builtin 中的最終調用，您可以構造一個 [tailcall](https://en.wikipedia.org/wiki/Tail_call)。在這種情況下，編譯器可能能夠避免創建新的堆棧幀。只需在調用之前添加 `tail`，例如 `tail MyBuiltin(foo, bar);`。

#### `runtime` 可調用函數

`runtime` 與 `builtin` 類似，可以將外部功能的接口暴露給 Torque。然而，它提供的功能不是在 CSA 中實現的，而是必須在 V8 中作為標準運行時回調進行實現。

Torque 中的 `runtime` 聲明具有如下形式：

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

以名稱 <i>IdentifierName</i> 指定的 `extern runtime` 對應於由 <code>Runtime::k<i>IdentifierName</i></code> 指定的運行時函數。

與 `builtin` 類似，`runtime` 無法擁有標籤。

在合適的情況下，您也可以以 tailcall 的方式調用運行時函數。只需在調用之前添加 `tail` 關鍵字即可。

運行時函數聲明通常放置在名為 `runtime` 的命名空間中。這將它們與同名 builtin 區分開來，並使得可以在調用點更容易地看到我們正在調用運行時函數。我們應該考慮使其強制執行。

#### `intrinsic` 可調用函數

`intrinsic` 是內置 Torque 可調用函數，提供了對無法以其他方式在 Torque 中實現的內部功能的訪問。它們在 Torque 中聲明，但不定義，因為其實現由 Torque 編譯器提供。`intrinsic` 聲明使用以下語法：

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

大多數情況下，“用戶” Torque 代碼應該很少直接使用 `intrinsic`。
以下是一些支持的 intrinsics：

```torque
// %RawObjectCast 從 Object 向 Object 子類型進行向下轉型，
// 無需嚴格測試該對象是否實際上是目標類型。
// RawObjectCasts 不應該（實際上幾乎永遠不會）
// 在 Torque 代碼中的任何地方使用，
// 除非在前置類型 assert() 條件下，作為 Torque 基於 UnsafeCast 操作符。
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast 從 RawPtr 向 RawPtr 子類型進行向下轉型，
// 無需嚴格測試該對象是否實際上是目標類型。
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast 將一個編譯時常量值轉換為另一常量值。
// 源類型和目標類型均應是 'constexpr'。
// %RawConstexprCast 在生成的 C++ 代碼中轉化為 static_cast。
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr 將一個 constexpr 值轉換為非 constexpr
// 值。目前僅支持轉換到以下非 constexpr 類型：
// Smi、Number、String、uintptr、intptr 和 int32。
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate 從 V8 的 GC 堆分配一個未初始化
// 的對象，大小為 'size' 並"reinterpret casts"
// 指定的 Torque 類別，允許建構函式隨後使用
// 標準欄位存取運算子來初始化物件。
// 此內建函式不應該從 Torque 程式碼中呼叫。它's 用於
// 在糖化 'new' 運算子時內部使用。
intrinsic %Allocate<Class: type>(size: intptr): Class;
```

與 `builtin` 和 `runtime` 一樣，`intrinsic` 不可以有標籤。

### 明確參數

Torque 定義的 Callable 的聲明，例如 Torque 的 `macro` 和 `builtin`，具有明確的參數列表。它們是使用類似於型別標註的 TypeScript 函式參數列表的語法的標識符與型別對組成的列表，但 Torque 不支援可選參數或預設參數。此外，如果內建函式使用 V8 的內部 JavaScript 呼叫約定（例如，被標記為 `javascript` 關鍵字），則 Torque 實現的 `builtin` 可以選擇性地支援剩餘參數。

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

例如：

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### 隱式參數

Torque Callable 可以使用類似於 [Scala 的隱式參數](https://docs.scala-lang.org/tour/implicit-parameters.html) 的方式指定隱式參數：

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

具體來說：`macro` 除了明確參數外，還可以聲明隱式參數：

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

當映射到 CSA 時，隱式參數和明確參數被同等對待，並構成聯合參數列表。

隱式參數不在呼叫位置提及，而是以隱式方式傳遞：`Foo(4, 5)`。為使其能運作，`Foo(4, 5)` 必須在提供名為 `context` 值的上下文中呼叫。例如：

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

與 Scala 相比，如果隱式參數的名稱不相同，我們禁止這樣使用。

由於重載解析可能導致困惑的行為，我們確保隱式參數完全不影響重載解析。即：比較重載集合的候選項時，我們不考慮呼叫位置的隱式綁定。在找到唯一的最佳重載後，我們才檢查是否有可用的隱式參數綁定。

將隱式參數放在明確參數的左側與 Scala 不同，但更符合 CSA 中將 `context` 參數放在前面的現有約定。

#### `js-implicit`

對於在 Torque 中定義的具有 JavaScript 連結的內建函式，應使用關鍵字 `js-implicit` 而不是 `implicit`。參數僅限於以下呼叫約定的四個組成部分：

- context: `NativeContext`
- receiver: `JSAny`（JavaScript 中的 `this`）
- target: `JSFunction`（JavaScript 中的 `arguments.callee`）
- newTarget: `JSAny`（JavaScript 中的 `new.target`）

不必全部聲明，僅聲明想使用的部分即可。例如，以下是我們的 `Array.prototype.shift` 程式碼：

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

請注意，`context` 參數是一個 `NativeContext`。這是因為在 V8 中，內建函式的閉包中始終嵌入本地上下文。在 js-implicit 約定中對此進行編碼，允許程式設計師省去從函數上下文載入本地上下文的操作。

### 重載解析

Torque `macro` 和運算子（它們只是 `macro` 的別名）允許參數類型重載。重載規則受 C++ 的啟發：如果某個重載嚴格優於所有替代方案，就會選擇它。這意味著它在至少一個參數上需要嚴格更好，並且在所有其他參數上需要相同或更好。

比較兩個重載對應參數的時候...

- …如果符合下列條件，則它們被認為同樣好：
    - 它們是相等的；
    - 它們都需要某些隱式轉換。
- …如果符合下列條件之一，則其中一個被認為更好：
    - 它是另一個的嚴格子類型；
    - 它不需要隱式轉換，而另一個需要。

如果沒有任何重載嚴格優於所有替代方案，則會導致編譯錯誤。

### 延遲區塊

可以選擇性地將語句塊標記為`deferred`，這是向編譯器發出的一個信號，表明它進入的頻率較低。編譯器可能選擇將這些塊定位在函數的末尾，從而提高非延遲代碼區域的緩存局部性。例如，在`Array.prototype.forEach`的實現中的這段代碼中，我們預期會保持在"快速"路徑上，僅偶爾採取回退情況：

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

這裡是另一個例子，其中字典元素情況被標記為延遲，以改善更可能情況的代碼生成（來自`Array.prototype.join`的實現）：

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <等其他代碼>...
```

## 將CSA代碼遷移至Torque

[移植`Array.of`的補丁](https://chromium-review.googlesource.com/c/v8/v8/+/1296464)作為將CSA代碼移植到Torque的一個簡單示例。
