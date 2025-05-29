---
title: &apos;入门集成 V8&apos;
description: &apos;本文档介绍了一些 V8 的关键概念，并提供了一个“hello world”示例，帮助您开始使用 V8 代码。&apos;
---
本文档介绍了一些 V8 的关键概念，并提供了一个“hello world”示例，帮助您开始使用 V8 代码。

## 目标受众

本文档适用于希望将 V8 JavaScript 引擎嵌入到 C++ 应用程序中的 C++ 程序员。它可帮助您将自己的应用程序的 C++ 对象和方法提供给 JavaScript，同时也能让 JavaScript 对象和函数在您的 C++ 应用程序中使用。

## Hello world 示例

让我们看一个 [Hello World 示例](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc)，它将一个 JavaScript 语句作为字符串参数、将其作为 JavaScript 代码执行，并将结果打印到标准输出。

首先，一些关键概念：

- `isolate` 是一个具有自己堆的虚拟机实例。
- `local handle` 是一个指向对象的指针。所有 V8 对象都通过句柄访问。它们是必要的，因为 V8 垃圾收集器的工作方式。
- `handle scope` 可以被认为是任意数量句柄的容器。当您完成使用句柄时，不需要单独删除每个句柄，只需删除它们的作用域。
- `context` 是允许在单个 V8 实例中运行独立、无关的 JavaScript 代码的执行环境。您必须显式指定要运行任何 JavaScript 代码的上下文。

这些概念更详细地在 [高级指南](/docs/embed#advanced-guide) 中讨论。

## 运行示例

按照以下步骤亲自运行示例：

1. 按照 [Git 指南](/docs/source-code#using-git) 下载 V8 源代码。
2. 此 Hello World 示例的说明已在 V8 v13.1 上测试过。您可以使用 `git checkout branch-heads/13.1 -b sample -t` 检出此分支。
3. 使用辅助脚本创建一个构建配置：

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    您可以通过运行以下命令检查并手动编辑构建配置：

    ```bash
    gn args out.gn/x64.release.sample
    ```

4. 在 Linux 64 系统上构建静态库：

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

5. 编译 `hello-world.cc`，并链接到构建过程中创建的静态库。例如，在 64 位 Linux 上使用 GNU 编译器和 LLD 链接器：

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

6. 对于更复杂的代码，没有 ICU 数据文件 V8 将失败。将此文件复制到您的二进制文件存放位置：

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

7. 在命令行运行 `hello_world` 可执行文件。例如，在 Linux 上，进入 V8 目录，然后运行：

    ```bash
    ./hello_world
    ```

8. 它会打印 `Hello, World!`。太好了！
    注意：截至 2024 年 11 月，可能会在进程启动的早期崩溃。调查尚在进行。如果您遇到此问题并能找到问题所在，请在 [问题 377222400](https://issues.chromium.org/issues/377222400) 上发表评论，或 [提交补丁](https://v8.dev/docs/contribute)。

如果您需要与主分支同步的示例，请查看文件 [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc)。这是非常简单的一个示例，您可能希望做的不仅仅是将脚本作为字符串执行。[下面的高级指南](#advanced-guide) 为 V8 嵌入者提供了更多信息。

## 更多示例代码

以下示例作为源代码下载的一部分提供。

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

此示例提供了扩展一个假想的 HTTP 请求处理应用程序（例如可能是一个 Web 服务器的一部分）所需的代码，使其可以脚本化。它将 JavaScript 脚本作为参数，该脚本必须提供一个名为 `Process` 的函数。JavaScript 的 `Process` 函数可以用于例如收集信息，如虚构的 Web 服务器所服务的每个页面的访问次数。

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

此示例将文件名作为参数，然后读取并执行其内容。包括一个命令提示符，您可以在其中输入并执行 JavaScript 代码片段。在此示例中，通过使用对象和函数模板，向 JavaScript 添加了相应的附加功能，如 `print`。

## 高级指南

现在您已经熟悉了将 V8 用作独立的虚拟机，并且掌握了一些关键的 V8 概念，例如句柄、作用域和上下文，让我们进一步讨论这些概念，并介绍其他一些将 V8 嵌入到您自己的 C++ 应用程序中的关键概念。

V8 API 提供了编译和执行脚本、访问 C++ 方法和数据结构、处理错误以及启用安全检查的功能。您的应用程序可以像使用其他 C++ 库一样使用 V8。通过包含头文件 `include/v8.h`，您的 C++ 代码通过 V8 API 访问 V8。

### 句柄与垃圾回收

句柄提供对 JavaScript 对象在堆中的位置的引用。V8 垃圾回收器回收不能再被访问的对象所占用的内存。在垃圾回收期间，垃圾回收器通常会将对象移动到堆中的不同位置。当垃圾回收器移动对象时，它还会更新所有引用该对象的句柄，使其指向对象的新位置。

如果一个对象在 JavaScript 中不可访问，并且没有句柄引用它，则该对象被视为垃圾。垃圾回收器会定期移除所有被视为垃圾的对象。V8 的垃圾回收机制是 V8 性能的核心。

句柄有几种类型：

- 局部句柄存储在栈上，并在调用适当的析构函数时被删除。这些句柄的生存期由句柄作用域决定，句柄作用域通常在函数调用的开始处创建。当句柄作用域被删除时，如果 JavaScript 或其他句柄不再访问这些对象，垃圾回收器就可以释放由句柄作用域引用的对象的内存。这种句柄类型在上面的 hello world 示例中已经使用过。

    局部句柄的类为 `Local<SomeType>`。

    **注意：**句柄栈并不是 C++ 调用栈的一部分，但句柄作用域嵌入在 C++ 栈中。句柄作用域只能在栈上分配，而不能用 `new` 分配。

- 持久句柄为堆分配的 JavaScript 对象提供引用，与局部句柄类似。有两种类型，其区别在于它们对引用的生命周期管理方式。使用持久句柄可以在多个函数调用之间保持对对象的引用，或者当句柄生命周期与 C++ 作用域不对应时使用。例如，谷歌浏览器使用持久句柄来引用文档对象模型 (DOM) 节点。通过使用 `PersistentBase::SetWeak`，持久句柄可以设置为弱引用，这样当对象的唯一引用来自弱持久句柄时，垃圾回收器会触发回调。

    - `UniquePersistent<SomeType>` 句柄依赖 C++ 的构造函数和析构函数来管理底层对象的生命周期。
    - `Persistent<SomeType>` 可以用其构造函数来构造，但必须使用 `Persistent::Reset` 显式清除。

- 还有其他几种句柄类型，这里只会简单提及：

    - `Eternal` 是一种持久句柄，针对预期永远不会被删除的 JavaScript 对象使用。它成本更低，因为它让垃圾回收器无需确定该对象的存活状态。
    - `Persistent` 和 `UniquePersistent` 都不能被复制，因此不适合作为 pre-C++11 标准库容器的值。`PersistentValueMap` 和 `PersistentValueVector` 提供了持久值的容器类，具有 map 和 vector 类的语义。对于使用C++11的嵌入器来说则无需担心这一问题，因为C++11的移动语义解决了潜在问题。

当然，每次创建对象都创建一个局部句柄可能会导致产生大量句柄！在这种情况下，句柄作用域非常有用。您可以将句柄作用域视为一个容器，其中包含许多句柄。当句柄作用域的析构函数被调用时，该作用域内创建的所有句柄都会被从栈中移除。正如您所想，这会使垃圾回收器能够从堆中删除这些句柄所指向的对象。

回到[我们非常简单的 hello world 示例](#hello-world)，在下图中您可以看到句柄栈和堆分配的对象。注意 `Context::New()` 返回一个 `Local` 句柄，我们基于它创建了一个新的 `Persistent` 句柄以演示 `Persistent` 句柄的使用。

![](/_img/docs/embed/local-persist-handles-review.png)

当调用析构函数`HandleScope::~HandleScope`时，句柄作用域会被删除。如果在已删除的句柄作用域中引用的对象没有其他引用，它们将在下一次垃圾回收中有机会被移除。垃圾回收器还可以从堆中移除`source_obj`和`script_obj`对象，因为它们不再被任何句柄引用或通过其他方式从JavaScript中访问。由于上下文句柄是一个持久化句柄，当退出句柄作用域时它不会被移除。唯一移除上下文句柄的方法是显式调用其`Reset`方法。

:::note
**注意：** 在本文档中，“句柄”一词始终指的是本地句柄。当讨论持久化句柄时，会明确使用“持久化句柄”这个术语。
:::

需要注意这种模型中的一个常见陷阱：*不能直接从声明了句柄作用域的函数中返回本地句柄*。如果这样做，那么在函数返回之前，您试图返回的本地句柄将会被句柄作用域的析构函数立即删除。正确的方式是构造一个`EscapableHandleScope`而不是`HandleScope`，然后调用句柄作用域的`Escape`方法，将您想要返回的句柄作为参数传递给它。以下是一个实际案例的演示：

```cpp
// 此函数返回一个包含三个元素 x、y 和 z 的新数组。
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // 我们将创建临时句柄，所以使用句柄作用域。
  v8::EscapableHandleScope handle_scope(isolate);

  // 创建一个新的空数组。
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // 如果创建数组时发生错误，返回一个空结果。
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // 填充数组值
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // 通过 Escape 方法返回值。
  return handle_scope.Escape(array);
}
```

`Escape`方法将其参数的值复制到外层作用域，删除其本地句柄，并返回新的句柄副本，可以安全地返回该副本。

### 上下文

在V8中，上下文是一个执行环境，它允许单个V8实例中运行多个独立、不相关的JavaScript应用程序。您必须明确指定在何种上下文中运行任何JavaScript代码。

为何这是必要的？因为JavaScript提供了一组内置的工具函数和对象，而这些可以被JavaScript代码更改。例如，如果两个完全不相关的JavaScript函数以相同的方式更改了全局对象，则很可能会产生意想不到的结果。

从CPU时间和内存的角度来看，考虑到需要构建的大量内置对象，创建新的执行上下文可能看起来是一项昂贵的操作。然而，V8的高级缓存技术确保了，尽管创建第一个上下文的成本较高，但后续上下文的创建成本要低得多。这是因为第一个上下文需要创建内置对象并解析内置JavaScript代码，而后续上下文仅需要为其上下文创建内置对象。利用V8的快照功能（通过构建选项`snapshot=yes`启用，默认启用），创建第一个上下文的时间将被大幅优化，因为快照包含一个已序列化的堆，其中包含已编译的内置JavaScript代码。结合垃圾回收，V8的高级缓存技术对于V8的性能也是至关重要的。

创建一个上下文后，您可以多次进入和退出它。在上下文A中，您也可以进入另一个上下文B，这意味着用B替换A作为当前上下文。当您退出B时，A将恢复为当前上下文。如图所示：

![](/_img/docs/embed/intro-contexts.png)

请注意，每个上下文的内置工具函数和对象是彼此独立的。您还可以选择在创建上下文时设置一个安全令牌。更多信息请参见[安全模型](#security-model)部分。

在V8中使用上下文的动机是为了使浏览器中的每个窗口和iframe可以拥有其自己的新鲜JavaScript环境。

### 模板

模板是上下文中JavaScript函数和对象的蓝图。您可以使用模板将C++函数和数据结构封装到JavaScript对象中，以便JavaScript脚本可以操作它们。例如，Google Chrome使用模板将C++ DOM节点封装为JavaScript对象，并在全局命名空间中安装函数。您可以创建一组模板，然后在每次创建的新上下文中使用相同的模板。您可以根据需要创建任意多的模板。然而，在任意给定上下文中，任何一个模板只能有一个实例。

在JavaScript中，函数和对象之间具有很强的二元性。要在Java或C++中创建一种新的对象类型，通常会定义一个新的类。而在JavaScript中，您则是创建一个新的函数，并使用该函数作为构造函数来实例化对象。JavaScript对象的布局和功能与构造它的函数密切相关。这一点在V8模板的工作方式中得到了体现。模板分为两种类型：

- 函数模板

    函数模板是单个函数的蓝图。您可以通过调用模板的 `GetFunction` 方法，以希望实例化 JavaScript 函数的上下文中创建模板的 JavaScript 实例。您还可以将 C++ 回调与函数模板关联，当调用 JavaScript 函数实例时，该回调会被调用。

- 对象模板

    每个函数模板都有一个关联的对象模板。此模板用于配置使用此函数作为其构造函数创建的对象。您可以将两种类型的 C++ 回调与对象模板关联：

    - 访问器回调在某个特定对象属性被脚本访问时被调用
    - 拦截器回调在任何对象属性被脚本访问时被调用

  本文后续讨论了[访问器](#accessors)和[拦截器](#interceptors)。

以下代码提供了为全局对象创建模板并设置内置全局函数的示例。

```cpp
// 为全局对象创建模板并设置
// 内置全局函数。
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// 每个处理器都有自己的上下文，因此不同的处理器
// 不会相互影响。
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

此示例代码取自 `process.cc` 示例中的 `JsHttpProcessor::Initializer`。

### 访问器

访问器是一种 C++ 回调，当 JavaScript 脚本访问对象属性时会计算并返回值。访问器通过对象模板配置，使用 `SetAccessor` 方法。该方法接受与其关联的属性名称以及两个在脚本尝试读取或写入属性时运行的回调。

访问器的复杂性取决于您正在处理的数据类型：

- [访问静态全局变量](#accessing-static-global-variables)
- [访问动态变量](#accessing-dynamic-variables)

### 访问静态全局变量

假设有两个 C++ 整数变量 `x` 和 `y`，它们将作为上下文中的全局变量供 JavaScript 使用。为此，您需要在脚本读取或写入这些变量时调用 C++ 访问器函数。这些访问器函数使用 `Integer::New` 将 C++ 整数转换为 JavaScript 整数，并使用 `Int32Value` 将 JavaScript 整数转换为 C++ 整数。下面提供了示例：

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter 非常类似，为简洁起见省略

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

请注意，上述代码中的对象模板是在创建上下文的同时创建的。此模板可以提前创建，然后用于任意数量的上下文。

### 访问动态变量

在前面的示例中，变量是静态的并且是全局的。如果被操作的数据是动态的，例如浏览器中的 DOM 树，会怎么样？假设 `x` 和 `y` 是 C++ 类 `Point` 的对象字段：

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

为了使任意数量的 C++ `point` 实例可供 JavaScript 使用，我们需要为每个 C++ `point` 创建一个 JavaScript 对象，并在 JavaScript 对象和 C++ 实例之间建立一个连接。此操作通过外部值和内部对象字段完成。

首先为 `point` 包装对象创建一个对象模板：

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

每个 JavaScript `point` 对象使用一个内部字段引用其所包装的 C++ 对象。这些字段之所以得名，是因为它们无法从 JavaScript 内部访问，只能从 C++ 代码访问。对象可以拥有任意数量的内部字段，内部字段的数量被设置在对象模板上，如下所示：

```cpp
point_templ->SetInternalFieldCount(1);
```

此处将内部字段数设置为 `1`，这意味着对象有一个内部字段，索引为 `0`，指向一个 C++ 对象。

将 `x` 和 `y` 访问器添加到模板中：

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

接下来，通过创建模板的新实例来包装一个C++点，然后将内部字段`0`设置为围绕点`p`的外部包装器。

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

外部对象只是一个围绕`void*`的包装器。外部对象只能用于在内部字段中存储引用值。JavaScript对象不能直接引用C++对象，因此外部值用作从JavaScript到C++的“桥梁”。从这个意义上说，外部值与句柄相反，因为句柄允许C++引用JavaScript对象。

以下是`x`的`get`和`set`存取器的定义，`y`存取器的定义是相同的，只是将`x`替换为`y`：

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

存取器提取了由JavaScript对象包装的`point`对象的引用，然后读取和写入关联的字段。通过这种方式，这些通用存取器可以用于任意数量的包装点对象。

### 拦截器

您还可以为脚本访问任何对象属性时指定一个回调函数。这些称为拦截器。出于效率的考虑，有两种类型的拦截器：

- *命名属性拦截器* - 当访问具有字符串名称的属性时调用。例如，在浏览器环境中是`document.theFormName.elementName`。
- *索引属性拦截器* - 当访问索引属性时调用。例如，在浏览器环境中是`document.forms.elements[0]`。

V8源代码中提供的示例`process.cc`，包括一个使用拦截器的示例。在以下代码片段中，`SetNamedPropertyHandler`指定了`MapGet`和`MapSet`拦截器：

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

`MapGet`拦截器如下所示：

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // 获取此对象包装的map。
  map<string, string> *obj = UnwrapMap(info.Holder());

  // 将JavaScript字符串转换为std::string。
  string key = ObjectToString(name);

  // 使用标准STL惯用法查找值（如果存在）。
  map<string, string>::iterator iter = obj->find(key);

  // 如果键不存在，则返回一个空句柄作为信号。
  if (iter == obj->end()) return;

  // 否则获取值并将其包装在JavaScript字符串中。
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

与存取器一样，指定的回调函数会在访问属性时调用。存取器和拦截器的区别在于，拦截器处理所有属性，而存取器仅与一个特定属性关联。

### 安全模型

“同源策略”（最早由Netscape Navigator 2.0引入）禁止从一个“源”加载的文档或脚本获取或设置来自不同“源”的文档的属性。这里“源”一词定义为域名（例如`www.example.com`）、协议（例如`https`）和端口的组合。例如，`www.example.com:81`与`www.example.com`不属于相同的源。三个部分都必须匹配，两个网页才被视为具有相同的源。没有这种保护，恶意网页可能会破坏其他网页的完整性。

在V8中，“源”被定义为上下文。默认情况下，不允许访问除调用上下文之外的任何上下文。要访问调用上下文之外的上下文，您需要使用安全令牌或安全回调。安全令牌可以是任何值，但通常是符号，即不存在于其他任何地方的规范字符串。设置上下文时，您可以选择通过`SetSecurityToken`指定一个安全令牌。如果不指定安全令牌，V8将在创建上下文时为其自动生成一个。


当尝试访问全局变量时，V8安全系统首先检查被访问的全局对象的安全令牌与尝试访问该全局对象的代码的安全令牌。如果令牌匹配，则允许访问；如果令牌不匹配，V8会执行回调以检查是否应该允许访问。您可以通过在对象上设置安全回调（使用对象模板的`SetAccessCheckCallbacks`方法）指定是否允许对对象的访问。然后，V8安全系统可以获取被访问对象的安全回调并调用它以确定是否允许其他上下文访问该对象。此回调会提供被访问的对象、被访问属性的名称、访问类型（例如读取、写入或删除），并返回是否允许访问。

此机制在Google Chrome中实现，因此当安全令牌不匹配时，会使用特殊回调仅允许以下操作：`window.focus()`，`window.blur()`，`window.close()`，`window.location`，`window.open()`，`history.forward()`，`history.back()`，以及`history.go()`。

### 异常

如果发生错误，V8会抛出异常——例如，当脚本或函数尝试读取不存在的属性，或者调用一个并非函数的函数时。

如果操作未成功，V8会返回一个空句柄。因此，您的代码需确保在继续执行之前检查返回值是否为空句柄。可以通过使用`Local`类的公共成员函数`IsEmpty()`检查空句柄。

您可以使用`TryCatch`捕获异常，例如：

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("异常: %s\n", *exception_str);
  // ...
}
```

如果返回值是空句柄，且您的代码没有使用`TryCatch`，则必须终止继续执行。如果使用了`TryCatch`，异常会被捕获，并且代码仍然可以继续处理。

### 继承

JavaScript是一种*无类*的面向对象语言，因此它使用原型继承而不是经典继承。这对于受传统面向对象语言（如C++和Java）训练的程序员来说可能会感到困惑。

基于类的面向对象语言，例如Java和C++，基于两个不同实体的概念：类和实例。JavaScript是一种基于原型的语言，因此不存在这种区分：它仅有对象。JavaScript原生不支持类继承的声明；然而，JavaScript的原型机制简化了为对象的所有实例添加自定义属性和方法的过程。在JavaScript中，您可以为对象添加自定义属性。例如：

```js
// 创建一个名为`bicycle`的对象。
function bicycle() {}
// 创建一个名为`roadbike`的`bicycle`实例。
var roadbike = new bicycle();
// 在`roadbike`上定义一个自定义属性`wheels`。
roadbike.wheels = 2;
```

以这种方式添加的自定义属性仅存在于该对象的实例中。如果我们创建另一个`bicycle()`实例（例如称为`mountainbike`），`mountainbike.wheels`将返回`undefined`，除非显式添加了`wheels`属性。

有时这正是需求所在，而在其他时候，添加自定义属性到对象的所有实例会更有帮助——毕竟，所有自行车都有轮子。这就是JavaScript的原型对象非常有用的地方。要使用原型对象，请在对象上引用关键字`prototype`，然后向其添加自定义属性，如下所示：

```js
// 首先，创建“bicycle”对象
function bicycle() {}
// 将wheels属性赋予对象的原型
bicycle.prototype.wheels = 2;
```

所有`bicycle()`的实例现在都会预先拥有`wheels`属性。

在V8中，模板也使用相同的方法。每个`FunctionTemplate`都有一个`PrototypeTemplate`方法，它为函数的原型提供模板。您可以在`PrototypeTemplate`上设置属性，并将这些属性与C++函数关联，这些属性随后会存在于相应`FunctionTemplate`的所有实例中。例如：

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

这使得`biketemplate`的所有实例在它们的原型链中都有一个`wheels`方法，当调用时，会触发C++函数`MyWheelsMethodCallback`。

V8的`FunctionTemplate`类提供了公共成员函数`Inherit()`，您可以在希望函数模板继承其他函数模板时调用，例如：

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
