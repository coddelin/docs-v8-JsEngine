---
title: "開始嵌入 V8"
description: "本文介紹了一些關鍵的 V8 概念，並提供了一個 “Hello World” 示例，幫助您開始使用 V8 代碼。"
---
本文介紹了一些關鍵的 V8 概念，並提供了一個 “Hello World” 示例，幫助您開始使用 V8 代碼。

## 目標讀者

本文面向希望將 V8 JavaScript 引擎嵌入 C++ 應用程序的 C++ 程序員。它幫助您將應用程序的 C++ 對象和方法提供給 JavaScript，同時讓 JavaScript 的對象和函數對您的 C++ 應用程序可用。

## Hello World

我們來看一個 [Hello World 示例](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc)，它接受一個 JavaScript 語句作為字串參數，將其執行為 JavaScript 代碼，並將結果列印到標準輸出。

首先，一些關鍵概念：

- Isolate 是一個具有自己堆內存的 VM 實例。
- Local handle 是指向對象的指針。所有的 V8 對象都通過 handles 訪問。由於 V8 垃圾收集器的工作方式，它們是必需的。
- Handle scope 可以被視為任何數量 handles 的容器。當您使用完 handles 時，不必逐個刪除它們，只需刪除它們的 scope 即可。
- Context 是允許在單個 V8 實例中運行獨立、無關的 JavaScript 代碼的執行環境。您必須明確指定希望執行任何 JavaScript 代碼的上下文。

這些概念在[高級指南](/docs/embed#advanced-guide)中有更詳盡的討論。

## 執行示例

按照以下步驟自行運行此示例：

1. 按照[Git 指南](/docs/source-code#using-git)下載 V8 源代碼。
1. 本示例的操作已在 V8 v13.1 中測試過，可以使用以下命令檢出該分支：`git checkout branch-heads/13.1 -b sample -t`
1. 使用輔助腳本創建構建配置：

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    您可以運行以下命令檢查並手動編輯構建配置：

    ```bash
    gn args out.gn/x64.release.sample
    ```

1. 在 Linux 64 系統上編譯靜態庫：

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

1. 編譯 `hello-world.cc`，並鏈接到構建過程中生成的靜態庫。例如，在使用 GNU 編譯器和 LLD 鏈接器的 64 位 Linux 系統上：

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

1. 對於更複雜的代碼，沒有 ICU 數據文件 V8 會失敗。將該文件複製到您的二進制文件存放位置：

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

1. 在命令行運行 `hello_world` 可執行文件。例如，在 V8 目錄下的 Linux 上運行：

    ```bash
    ./hello_world
    ```

1. 它會列印出 `Hello, World!`。太棒了！
   注意：截至 2024 年 11 月，在進程啟動時可能會出現崩潰。如果您遇到此問題並能找到原因，請評論[問題 377222400](https://issues.chromium.org/issues/377222400)，或[提交補丁](https://v8.dev/docs/contribute)。

如果您在尋找與主分支同步的示例，請查看文件 [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc)。這是一個非常簡單的示例，您可能希望不僅僅執行作為字串的腳本。[下面的高級指南](#advanced-guide)包含了更多關於嵌入 V8 的資訊。

## 更多示例代碼

以下示例是作為源代碼下載的一部分提供的。

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

此示例提供了將假想的 HTTP 請求處理應用程序（例如可能是 Web 伺服器的一部分）擴展為可腳本化所需的代碼。它接受一個 JavaScript 腳本作為參數，該腳本必須提供一個名為 `Process` 的函數。JavaScript 的 `Process` 函數可以用來，例如收集資訊，如提供的虛構 Web 伺服器每頁的訪問量。

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

此示例接受文件名作為參數，然後讀取並執行其內容。包括一個命令提示符，您可以在其中輸入將執行的 JavaScript 代碼片段。在此示例中，通過使用對象和功能範本，還向 JavaScript 新增了額外的函數，如 `print`。

## 高級指南

現在您已熟悉使用 V8 作為獨立的虛擬機器，並了解一些關鍵的 V8 概念，如句柄、範疇和上下文，接下來讓我們進一步探討這些概念，並介紹一些在您的 C++ 應用中嵌入 V8 的關鍵概念。

V8 API 提供了編譯和執行腳本、訪問 C++ 方法和數據結構、處理錯誤以及啟用安全檢查的功能。您的應用程序可以像使用其他 C++ 庫一樣使用 V8。您的 C++ 代碼可以通過包含標頭 `include/v8.h` 使用 V8 API 訪問 V8。

### 句柄與垃圾回收

句柄為 JavaScript 對象在堆中的位置提供了一個引用。V8 的垃圾回收器負責回收那些無法再被訪問的對象所占用的內存。在垃圾回收過程中，垃圾回收器經常將對象移到堆中的不同位置。當垃圾回收器移動一個對象時，垃圾回收器也會更新所有引用該對象的句柄，使其指向對象的新位置。

如果一個對象無法從 JavaScript 中訪問，且沒有任何句柄引用它，該對象就被認為是垃圾。垃圾回收器會定期刪除所有被認為是垃圾的對象。V8 的垃圾回收機制是 V8 性能的關鍵。

句柄有幾種類型：

- 本地句柄存儲在堆棧中，並在適當的析構函數被調用時刪除。這些句柄的生命週期由句柄範疇決定，句柄範疇通常在函數調用開始時創建。當句柄範疇被刪除時，垃圾回收器可以釋放那些不再被 JavaScript 或其他句柄訪問的對象。這種類型的句柄在上面的 Hello World 示例中使用過。

    本地句柄的類型為 `Local<SomeType>`。

    **注意：** 句柄堆棧不是 C++ 調用堆棧的一部分，但句柄範疇嵌套在 C++ 堆棧中。句柄範疇只能堆棧分配，無法通過 `new` 分配。

- 持久句柄提供對堆分配的 JavaScript 對象的引用，就像本地句柄一樣。持久句柄有兩種類型，其差別在於它們管理引用生命週期的方式。當您需要在多次函數調用中保留對對象的引用，或者當句柄的生命週期與 C++ 範疇無關時，應該使用持久句柄。比如說，Google Chrome 使用持久句柄來引用文檔物件模型 (DOM) 節點。持久句柄可以通過使用 `PersistentBase::SetWeak` 設置為弱引用，當唯一的引用來自弱持久句柄時，垃圾回收器將觸發回調函數。

    - `UniquePersistent<SomeType>` 句柄依賴於 C++ 構造函數和析構函數來管理底層對象的生命週期。
    - `Persistent<SomeType>` 可以通過構造函數構建，但必須通過 `Persistent::Reset` 顯式清除。

- 還有一些很少使用的句柄類型，我們这里只簡要提及：

    - `Eternal` 是一種用於預期永遠不會被刪除的 JavaScript 對象的持久句柄。使用它的成本更低，因為它免除了垃圾回收器判斷該對象是否仍然存活的工作。
    - `Persistent` 和 `UniquePersistent` 都不能被複製，因此作為標準 C++11 之前的標準庫容器中的值是不合適的。`PersistentValueMap` 和 `PersistentValueVector` 提供了具有映射和向量語意的持久值容器類。C++11 嵌入者不需要這些，因為 C++11 的 move 語義解決了底層問題。

當然，每次創建對象時都創建一個本地句柄可能會導致產生大量句柄！這就是句柄範疇非常有用的原因。您可以將句柄範疇視為包含許多句柄的容器。當句柄範疇的析構函數被調用時，該範疇中創建的所有句柄都會從堆棧中移除。如您所料，這會導致垃圾回收器認為這些句柄指向的對象可以從堆中刪除。

再次回到[我們非常簡單的 Hello World 示例](#hello-world)，在以下圖中，您可以看到句柄堆棧和堆分配的對象。注意 `Context::New()` 返回一個 `Local` 句柄，我們基於它創建了一個新的 `Persistent` 句柄，以示範 `Persistent` 句柄的用法。

![](/_img/docs/embed/local-persist-handles-review.png)

當析構函式 `HandleScope::~HandleScope` 被調用時，handle 範圍會被刪除。如果刪除的 handle 範圍內的 handle 所參考的物件沒有其它引用，這些物件將在下一次垃圾回收中有資格被移除。垃圾回收器也可以將堆上的 `source_obj` 和 `script_obj` 物件移除，因為它們不再由任何 handle 引用，也無法從 JavaScript 中訪問到。由於 context handle 是一個持久性 handle，因此在 handle 範圍退出時不會被移除。唯一移除 context handle 的方法是明確調用其 `Reset` 方法。

:::note
**注意：** 本文件中所提到的“handle”是指本地 handle。如果討論的是持久性 handle，將完整使用該術語。
:::

需要注意的是，這種模型有一個常見的陷阱：*你不能直接從聲明了 handle 範圍的函式中返回一個本地 handle*。如果這樣做，試圖返回的本地 handle 會在函式返回之前被 handle 範圍的析構函式即刻刪除。正確的返回本地 handle 的方式是構造一個 `EscapableHandleScope`，而不是使用 `HandleScope`，然後調用 handle 範圍的 `Escape` 方法，將希望返回的 handle 傳入。以下是這種方法的實際範例：

```cpp
// 這個函式返回一個包含三個元素 x, y 和 z 的新陣列。
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // 我們將創建臨時 handle，因此使用 handle 範圍。
  v8::EscapableHandleScope handle_scope(isolate);

  // 創建一個新的空陣列。
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // 如果創建陣列時發生錯誤，則返回空結果。
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // 填充值
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // 通過 Escape 返回值。
  return handle_scope.Escape(array);
}
```

`Escape` 方法會將其參數的值複製到外層範圍，刪除它的所有本地 handle，然後返回新的 handle 副本，該副本可以安全地返回。

### Contexts (上下文)

在 V8 中，context 是一個執行環境，允許分離的、不相關的 JavaScript 應用在單一 V8 實例中運行。你必須明確指定在何種 context 中執行任何 JavaScript 程式碼。

為什麼這是必要的？因為 JavaScript 提供了一組內建的工具函式和物件，這些函式和物件可以由 JavaScript 程式碼進行更改。例如，如果兩個完全無關的 JavaScript 函式以同樣方式修改了全局物件，則很可能會發生非預期的結果。

從 CPU 時間和記憶體的角度看，考慮到需要構建的內建物件數量，創建新的執行 context 似乎是一個昂貴的操作。然而，V8 的廣泛緩存確保了第一個 context 的創建成本較高，但後續 context 的創建成本較低。這是因為第一個 context 需要創建內建物件並解析內建 JavaScript 程式碼，而後續 context 只需要為其 context 創建內建物件。啟用 V8 的快照功能（通過建置選項 `snapshot=yes`，這是預設值），創建第一個 context 所花費的時間將得到高度優化，因為快照包含序列化的堆，其中包括了已經編譯的內建 JavaScript 程式碼。隨著垃圾回收，V8 的廣泛緩存也是 V8 性能的關鍵。

當你創建了一個 context 後，你可以多次進入和退出該 context。在 context A 中，你也可以進入另一個 context B，這意味著你將當前的 context A 替換為 B。當你退出 B 時，A 會恢復為當前 context。這在以下內容中示意：

![](/_img/docs/embed/intro-contexts.png)

請注意，每個 context 的內建工具函式和物件是分開的。你在創建 context 時可以選擇性設置一個安全令牌。有關更多資訊，請參見[安全模型](#security-model)部分。

在 V8 中使用 context 的動機是讓瀏覽器中的每個視窗和 iframe 都具有自己的 JavaScript 環境。

### Templates (模板)

模板是某個 context 中 JavaScript 函式和物件的藍圖。你可以使用模板將 C++ 函數和資料結構包裝在 JavaScript 物件中，以便能夠通過 JavaScript 腳本操作它們。例如，Google Chrome 使用模板將 C++ DOM 節點包裝成 JavaScript 物件，並在全域命名空間中安裝函式。你可以創建一組模板，然後在每個新建的 context 中使用相同的模板。你可以根據需要創建多個模板。然而，在任一給定 context 中，每種模板只能有一個實例。

在 JavaScript 中，函式和物件之間存在強烈的二元性。要在 Java 或 C++ 中創建新的物件類型，你通常會定義一個新的類。在 JavaScript 中，你則是創建一個函式，並使用該函式作為構造函式來創建實例。JavaScript 物件的佈局和功能與構造它的函式密切相關。這一點也在 V8 模板的工作方式中得到了體現。模板有兩種類型：

- 函數模板

    函數模板是單個函數的藍圖。通過在希望實例化 JavaScript 函數的上下文中調用模板的 `GetFunction` 方法，可以創建模板的 JavaScript 實例。您還可以將 C++ 回調與函數模板關聯，當 JavaScript 函數實例被調用時，該回調會被觸發。

- 物件模板

    每個函數模板都有一個相關的物件模板。這用於配置使用此函數作為構造函數所創建的物件。您可以將兩種類型的 C++ 回調與物件模板關聯：

    - 存取器回調：當腳本訪問特定物件屬性時被調用
    - 攔截器回調：當腳本訪問任何物件屬性時被調用

  [存取器](#accessors) 和 [攔截器](#interceptors) 稍後在本文中討論。

以下代碼提供了一個為全域物件創建模板並設置內建全域函數的示例。

```cpp
// 為全域物件創建模板並設置內建全域函數。
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// 每個處理器都有自己的上下文，因此不同的處理器
// 不會互相影響。
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

此示例代碼摘自 `process.cc` 示例中的 `JsHttpProcessor::Initializer`。

### 存取器

存取器是一種 C++ 回調，當 JavaScript 腳本訪問物件屬性時計算並返回值。存取器通過物件模板配置，使用 `SetAccessor` 方法。此方法接受屬性名稱及當腳本嘗試讀取或寫入該屬性時執行的兩個回調。

存取器的複雜性取決於您操縱的數據類型：

- [訪問靜態全局變數](#accessing-static-global-variables)
- [訪問動態變數](#accessing-dynamic-variables)

### 訪問靜態全局變數

假設有兩個 C++ 整數變數，`x` 和 `y`，需要作為全局變數在上下文中供 JavaScript 使用。為此，您需要在腳本讀取或寫入這些變數時調用 C++ 存取器函數。這些存取器函數使用 `Integer::New` 將 C++ 整數轉化為 JavaScript 整數，並使用 `Int32Value` 將 JavaScript 整數轉化為 C++ 整數。以下提供了一個示例：

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter 是如此相似，這裡省略以簡化示例

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

請注意，上述代碼中的物件模板是在創建上下文的同時創建的。模板可以提前創建，然後可用於任意數量的上下文。

### 訪問動態變數

在前面的示例中，變數是靜態全局的。如果被操縱的數據是動態的，比如瀏覽器中的 DOM 樹會怎樣？假設 `x` 和 `y` 是 C++ 類 `Point` 的物件字段：

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

為了使任意數量的 C++ `point` 實例對 JavaScript 可用，我們需要為每個 C++ `point` 創建一個 JavaScript 物件並在 JavaScript 物件與 C++ 實例之間建立連接。這是通過外部值和內部物件字段完成的。

首先為 `point` 包裝物件創建物件模板：

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

每個 JavaScript `point` 物件保留對其所作為包裝物件的 C++ 物件的引用，方式是使用內部字段。這些字段因無法從 JavaScript 內部訪問而被命名，僅能從 C++ 代碼訪問。一個物件可以有任意數量的內部字段，內部字段的數量通過物件模板設置如下：

```cpp
point_templ->SetInternalFieldCount(1);
```

這裡內部字段數量設置為 `1`，這意味著物件有一個內部字段，索引為 `0`，指向一個 C++ 物件。

將 `x` 和 `y` 存取器添加到模板：

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

接下來，通過創建模板的新實例，然後將內部字段 `0` 設置為圍繞點 `p` 的外部封裝，包裝 C++ 點。

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

外部對象僅僅是 `void*` 的一個封裝。外部對象只能用來在內部字段中存儲引用值。JavaScript 對象無法直接引用 C++ 對象，所以外部值被用作從 JavaScript 到 C++ 的"橋梁"。從這個意義上說，外部值與句柄相反，因為句柄使得 C++ 可以引用 JavaScript 對象。

以下是 `x` 的 `get` 和 `set` 訪問器的定義，和 `y` 的訪問器定義相同，只需將 `x` 替換為 `y`：

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

訪問器提取被 JavaScript 對象封裝的 `point` 對象的引用，然後讀取和寫入關聯字段。這樣，這些通用訪問器可以用於任意數量的封裝點對象。

### 攔截器

您還可以為每次腳本訪問任何對象屬性時指定一個回調函數。這些被稱為攔截器。為了提高效率，攔截器有兩種類型：

- *命名屬性攔截器* - 在訪問具有字符串名稱的屬性時調用。例如，在瀏覽器環境中為 `document.theFormName.elementName`。
- *索引屬性攔截器* - 在訪問索引屬性時調用。例如，在瀏覽器環境中為 `document.forms.elements[0]`。

隨 V8 源代碼提供的示例 `process.cc` 包括一個使用攔截器的示例。在以下代碼片段中，`SetNamedPropertyHandler` 指定了 `MapGet` 和 `MapSet` 攔截器：

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

`MapGet` 攔截器如下所示：

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // 獲取此對象封裝的地圖。
  map<string, string> *obj = UnwrapMap(info.Holder());

  // 將 JavaScript 字符串轉換為 std::string。
  string key = ObjectToString(name);

  // 使用標準 STL 習慣查找值（如果存在）。
  map<string, string>::iterator iter = obj->find(key);

  // 如果鍵不存在，返回空句柄作為信號。
  if (iter == obj->end()) return;

  // 否則，獲取值並將其封裝在一個 JavaScript 字符串中。
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

與訪問器類似，每當訪問屬性時，會調用指定的回調。訪問器與攔截器的區別在於，攔截器處理所有屬性，而訪問器則與某一個特定屬性相關聯。

### 安全模型

“同源策略”（最早由 Netscape Navigator 2.0 引入）阻止來自一個“原始”加載的文檔或腳本獲取或設置來自另一個“原始”的文檔屬性。這裡的原始定義為域名（例如 `www.example.com`）、協議（例如 `https`）和端口的組合。例如，`www.example.com:81` 和 `www.example.com` 不是同一原始。三者必須匹配，兩個網頁才能被認為源相同。沒有這種保護，惡意網頁可能會損害另一網頁的完整性。

在 V8 中，“原始”定義為上下文。默認情況下，不允許訪問非調用上下文。在訪問非調用上下文時，您需要使用安全令牌或安全回調。安全令牌可以是任何值，但通常是一個不在其他任何地方存在的符號或典型的字符串。在設置上下文時，您可以使用 `SetSecurityToken` 選擇性地指定安全令牌。如果您沒有指定安全令牌，V8 將為您創建的上下文自動生成一個。

當試圖存取全域變數時，V8的安全性系統首先會檢查被存取的全域物件的安全權杖是否與嘗試存取全域物件的程式碼的安全權杖匹配。如果權杖匹配，則授權存取。如果權杖不匹配，V8會執行回呼以檢查是否應允許存取。您可以透過在物件上設定安全性回呼（使用物件範本的`SetAccessCheckCallbacks`方法）來指定是否允許存取該物件。V8安全性系統接著可以擷取被存取物件的安全性回呼並呼叫該回呼以詢問是否允許其他上下文存取。該回呼會提供被存取的物件、被存取的屬性名稱、存取類型（例如讀取、寫入或刪除），並返回是否允許存取。

此機制在Google Chrome中實現，因此如果安全權杖不匹配，便會使用特殊的回呼僅允許存取以下內容：`window.focus()`、`window.blur()`、`window.close()`、`window.location`、`window.open()`、`history.forward()`、`history.back()`以及`history.go()`。

### 異常

如果出現錯誤，例如腳本或函式嘗試讀取一個不存在的屬性，或者調用了不是函式的函式，V8會拋出異常。

如果操作未成功，V8則會返回空的句柄。因此，您的程式碼必須在繼續執行之前檢查返回值是否不是空的句柄。可使用`Local`類的公有成員函式`IsEmpty()`來檢查空句柄。

您可以使用`TryCatch`來捕捉異常，例如：

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Exception: %s\n", *exception_str);
  // ...
}
```

如果返回的值是空句柄，並且您未設置`TryCatch`，則您的程式碼必須退出。如果您設置了`TryCatch`，異常則會被捕捉，您的程式碼可以繼續處理。

### 繼承

JavaScript是一種*無類*、面向物件的程式語言，因此它使用的是原型繼承，而非傳統的類繼承。這可能會讓受過傳統物件導向語言訓練的程式員（例如C++和Java）感到困惑。

基於類的物件導向語言（例如Java和C++）以兩種不同的實體為基礎：類和實例。JavaScript是一種基於原型的語言，因此不做此區分：它僅具備物件。JavaScript本地不支援類階層的聲明；然而，JavaScript的原型機制簡化了向所有物件實例添加自訂屬性和方法的過程。在JavaScript中，您可以向物件新增自訂屬性。例如：

```js
// 建立一個名為`bicycle`的物件。
function bicycle() {}
// 建立`bicycle`的實例，命名為`roadbike`。
var roadbike = new bicycle();
// 在`roadbike`上定義一個自訂屬性`wheels`。
roadbike.wheels = 2;
```

以這種方式新增的自訂屬性僅存在於該物件的實例中。如果我們建立另一個`bicycle()`的實例，例如命名為`mountainbike`，則`mountainbike.wheels`會返回`undefined`，除非明確新增`wheels`屬性。

有時候這正是我們需要的，但在其他情況下，對於所有物件實例新增自訂屬性可能會更有幫助 —— 畢竟所有腳踏車都有輪子。此時JavaScript的原型物件會非常有用。要使用原型物件，請在新增自訂屬性之前使用`prototype`關鍵字引用該物件，如下所示：

```js
// 首先，建立“bicycle”物件
function bicycle() {}
// 將wheels屬性指派給物件的prototype
bicycle.prototype.wheels = 2;
```

現在，`bicycle()`的所有實例都會內建`wheels`屬性。

在V8中使用範本時也採用了相同的方式。每個`FunctionTemplate`都有一個`PrototypeTemplate`方法來提供該函式的原型範本。您可以在`PrototypeTemplate`上設定屬性，並將C++函式與這些屬性關聯，這樣它們就會存在於所有對應`FunctionTemplate`的實例中。例如：

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

這會使得所有`biketemplate`的實例在其原型鏈中都有一個`wheels`方法，當被調用時，會執行C++函式`MyWheelsMethodCallback`。

V8的`FunctionTemplate`類提供了公有成員函式`Inherit()`，在希望一個函式範本從另一個函式範本繼承時，可以呼叫它，如下所示：

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
