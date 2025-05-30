---
title: "堆栈追踪API"
description: "本文档概述了V8的JavaScript堆栈追踪API。"
---
V8中抛出的所有内部错误都会在创建时捕获堆栈追踪信息。这些堆栈追踪信息可以通过JavaScript中的非标准`error.stack`属性访问。V8还具备多种钩子，用于控制堆栈追踪的收集和格式化方式，并支持定制错误同样能够收集堆栈追踪信息。本文档概述了V8的JavaScript堆栈追踪API。

## 基本堆栈追踪

默认情况下，V8抛出的几乎所有错误都具有一个`stack`属性，该属性保存了前10个堆栈帧，并格式化为字符串。以下是完全格式化的堆栈追踪示例：

```
ReferenceError: FAIL is not defined
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

堆栈追踪是在错误创建时收集的，并且无论错误在哪里或被抛出多少次都保持一致。我们收集10个帧，因为它通常足够实用，同时不会对性能产生明显的负面影响。你可以通过设置变量来控制收集的堆栈帧数量

```js
Error.stackTraceLimit
```

将其设置为`0`会禁用堆栈追踪收集。可以使用任何有限的整数值作为可收集的最大帧数。将其设置为`Infinity`表示所有帧都会被收集。此变量仅影响当前上下文；对于需要不同值的每个上下文必须显式设置它。（注意，在V8术语中，“上下文”对应于Google Chrome中的页面或`<iframe>`）。要设置一个影响所有上下文的不同默认值，可以使用以下V8命令行标志：

```bash
--stack-trace-limit <value>
```

要在运行Google Chrome时将此标志传递给V8，请使用：

```bash
--js-flags='--stack-trace-limit <value>'
```

## 异步堆栈追踪

`--async-stack-traces`标志（从[V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces)开始默认启用）提供了新的[零成本异步堆栈追踪](https://bit.ly/v8-zero-cost-async-stack-traces)，它通过异步堆栈帧丰富了`Error`实例的`stack`属性，也就是说代码中的`await`位置。这些异步帧在`stack`字符串中以`async`标记：

```
ReferenceError: FAIL is not defined
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

在撰写本文时，此功能仅限于`await`位置、`Promise.all()`和`Promise.any()`，因为对于这些情况，引擎可以在没有任何额外开销的情况下重建所需信息（这就是零成本的原因）。

## 自定义异常的堆栈追踪收集

内置错误使用的堆栈追踪机制是通过一个通用堆栈追踪收集API实现的，该API同样适用于用户脚本。函数

```js
Error.captureStackTrace(error, constructorOpt)
```

将一个`stack`属性添加到给定的`error`对象，提供了调用`captureStackTrace`时的堆栈追踪信息。通过`Error.captureStackTrace`收集的堆栈追踪会立即被收集、格式化，并附加到给定的`error`对象。

可选的`constructorOpt`参数允许传入一个函数值。在收集堆栈追踪时，该函数的顶部调用及以上的所有帧（包括该次调用）都会从堆栈追踪中剔除。这对于隐藏对用户无用的实现细节十分有用。定义一个捕获堆栈追踪的自定义错误通常方式是：

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // 此处进行任何其它初始化。
}
```

传入MyError作为第二个参数意味着MyError的构造函数调用不会显示在堆栈追踪中。

## 定制堆栈追踪

与Java不同，在Java中异常的堆栈追踪是可以检查堆栈状态的结构化值，而V8中的堆栈属性仅仅保存了一个包含已格式化堆栈追踪信息的平面字符串。这只是为了与其它浏览器兼容而设计的。然而，这并不是硬编码的，仅仅是默认行为，可以通过用户脚本重写。

为了提高效率，堆栈追踪不是在捕获时被格式化，而是按需在第一次访问`stack`属性时进行格式化。堆栈追踪的格式化是通过调用

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

并使用此调用返回的任何内容作为 `stack` 属性的值。如果将一个不同的函数赋值给 `Error.prepareStackTrace`，该函数将用于格式化堆栈追踪。它会接收需要准备堆栈追踪的错误对象以及堆栈的结构化表示。用户堆栈追踪格式化器可以自由地按需要格式化堆栈追踪，甚至返回非字符串值。在调用 `prepareStackTrace` 完成后，保留对结构化堆栈追踪对象的引用是安全的，因此它也可以作为有效的返回值。请注意，自定义的 `prepareStackTrace` 函数仅在访问 `Error` 对象的 `stack` 属性时才会被调用。

结构化堆栈追踪是 `CallSite` 对象的数组，每个 `CallSite` 对象表示一个堆栈帧。`CallSite` 对象定义以下方法：

- `getThis`: 返回 `this` 的值
- `getTypeName`: 返回 `this` 的类型，作为字符串。这是存储在 `this` 的构造函数字段中的函数名（如果可用），否则是对象的 `[[Class]]` 内部属性。
- `getFunction`: 返回当前函数
- `getFunctionName`: 返回当前函数的名称，通常是其 `name` 属性。如果 `name` 属性不可用，会尝试从函数的上下文中推断出名称。
- `getMethodName`: 返回持有当前函数的 `this` 或其原型的属性名称
- `getFileName`: 如果此函数是在脚本中定义的，返回脚本的名称
- `getLineNumber`: 如果此函数是在脚本中定义的，返回当前行号
- `getColumnNumber`: 如果此函数是在脚本中定义的，返回当前列号
- `getEvalOrigin`: 如果此函数是通过 `eval` 调用创建的，返回一个字符串，表示调用 `eval` 的位置
- `isToplevel`: 此调用是否为顶层调用，即是否为全局对象？
- `isEval`: 此调用是否发生在由 `eval` 调用定义的代码中？
- `isNative`: 此调用是否在原生 V8 代码中？
- `isConstructor`: 此调用是否为构造函数调用？
- `isAsync`: 此调用是否为异步调用（即 `await`、`Promise.all()` 或 `Promise.any()`）？
- `isPromiseAll`: 此调用是否为异步调用 `Promise.all()`？
- `getPromiseIndex`: 返回 `Promise.all()` 或 `Promise.any()` 中跟踪的 Promise 元素索引，用于异步堆栈追踪。若 `CallSite` 不是异步的 `Promise.all()` 或 `Promise.any()` 调用，则返回 `null`。

默认堆栈追踪是使用 CallSite API 创建的，因此那里可用的任何信息也可以通过此 API 获得。

为了维护严格模式函数施加的限制，具有严格模式函数的帧及其以下帧（例如调用方等）不允许访问其接收者和函数对象。对于这些帧，`getFunction()` 和 `getThis()` 返回 `undefined`。

## 兼容性

此处描述的 API 是 V8 特有的，不被其他 JavaScript 实现支持。大多数实现确实提供了 `error.stack` 属性，但堆栈追踪的格式可能与此处描述的格式不同。推荐的使用方式如下：

- 只有在知道代码运行在 V8 中时才依赖格式化堆栈追踪的布局。
- 无论代码运行在哪个实现中，设置 `Error.stackTraceLimit` 和 `Error.prepareStackTrace` 都是安全的，但请注意，它只有在代码运行在 V8 中时才有效。

## 附录：堆栈追踪格式

V8 使用的默认堆栈追踪格式可以为每个堆栈帧提供以下信息：

- 调用是否为构造调用。
- `this` 值的类型 (`Type`)。
- 调用的函数名称 (`functionName`)。
- 持有此函数的 `this` 或其原型的属性名称 (`methodName`)。
- 当前源代码位置 (`location`)。

以上信息可能不可用，堆栈帧的格式根据可用的信息量而有所不同。如果以上所有信息都可用，则格式化的堆栈帧如下：

```
at Type.functionName [as methodName] (location)
```

或者，如果是构造调用：

```
at new functionName (location)
```

或者，如果是异步调用：

```
at async functionName (location)
```

如果 `functionName` 和 `methodName` 中只有一个可用，或者两者都可用但相同，则格式如下：

```
at Type.name (location)
```

如果两者都不可用，则使用 `<anonymous>` 作为名称。

`Type` 值是 `this` 的构造函数字段中存储的函数名称。在 V8 中，所有的构造调用都会设置此字段为构造函数，因此除非此字段在对象创建后被主动更改，否则它保存的是创建该对象的函数名称。如果不可用，则使用对象的 `[[Class]]` 属性。

一种特殊情况是全局对象，其中 `Type` 不显示。在这种情况下，堆栈帧格式如下：

```
at functionName [as methodName] (location)
```

位置本身有几种可能的格式。最常见的是文件名、脚本内的行号和列号：

```
fileName:lineNumber:columnNumber
```

如果当前函数是通过 `eval` 创建的，格式为：

```
eval at position
```

…其中 `position` 是调用 `eval` 的完整位置。请注意，如果有嵌套的 `eval` 调用，则位置可以是嵌套的，例如：

```
在 Foo.a 中的 eval （在 Bar.z 中的 eval （myscript.js:10:3））
```

如果堆栈帧在 V8 的库中，则位置为：

```
原生
```

如果不可用，则为：

```
未知位置
```
