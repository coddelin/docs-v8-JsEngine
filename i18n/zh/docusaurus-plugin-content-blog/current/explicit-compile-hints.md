---
 title: '给 V8 一个提醒：通过显式编译提示加速 JavaScript 启动'
 author: 'Marja Hölttä'
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "显式编译提示控制哪些 JavaScript 文件和函数被提前解析和编译"
 tweet: ''
---

快速运行 JavaScript 是响应式网络应用的关键。即使有 V8 的高级优化，在启动时解析和编译关键 JavaScript 仍然会导致性能瓶颈。知道在初始脚本编译期间应编译哪些 JavaScript 函数可以加速网页加载。

<!--truncate-->
在处理从网络加载的脚本时，V8 对每个函数都需要选择：是立即（"急迫"地）编译它还是推迟这个过程。如果稍后调用了一个尚未编译的函数，V8 必须随时编译它。

如果在页面加载期间调用了一个 JavaScript 函数，则急迫地编译它是有益的，因为：

- 在脚本的初始处理中，我们至少需要做一个轻量解析以找到函数的结束。在 JavaScript 中，找到函数的结束需要解析完整的语法（我们无法通过计数花括号来快捷完成 - 语法太复杂）。先进行轻量解析，然后进行实际解析是重复的工作。
- 如果我们决定急迫地编译一个函数，这部分工作会在后台线程上进行，并与从网络加载脚本的部分工作交错。如果我们仅在函数被调用时才编译它，已经太晚了无法并行化工作，因为主线程在函数编译完成前无法继续。

您可以在[这里](https://v8.dev/blog/preparser)阅读有关 V8 如何解析和编译 JavaScript 的详细信息。

许多网页会从选择正确的函数进行急迫编译中受益。例如，在我们对流行网页进行的实验中，20 个网页中有 17 个显示出改进，前台解析和编译时间平均减少了 630 毫秒。

我们正在开发一个名为[显式编译提示](https://github.com/WICG/explicit-javascript-compile-hints-file-based)的功能，它允许网页开发人员控制哪些 JavaScript 文件和函数被急迫编译。Chrome 136 现已推出一个版本，您可以选择单个文件进行急迫编译。

这个版本特别适用于您有一个可以选择急迫编译的"核心文件"，或者如果您能够在源文件之间移动代码以创建这样的核心文件。

您可以通过在文件顶部插入魔法注释触发整个文件的急迫编译

```js
//# allFunctionsCalledOnLoad
```

此功能应谨慎使用 - 编译过多将消耗时间和内存！

## 自己体验 - 编译提示如何起作用

您可以通过让 V8 记录函数事件来观察编译提示如何工作。例如，您可以使用以下文件来设置一个最小测试。

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log('testfunc1 调用了！');
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log('testfunc2 调用了！');
}

testfunc2();
```

请记住运行 Chrome 时使用干净的用户数据目录，以免代码缓存干扰您的实验。一个示例命令行是：

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

在您导航到测试页面之后，您可以在日志中看到以下函数事件：

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

由于`testfunc1`是懒编译的，因此在其最终调用时我们可以看到`parse-function`事件：

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

对于`testfunc2`，我们看不到相应的事件，因为编译提示强制它被急迫解析和编译。

## 显式编译提示的未来

从长远来看，我们希望能够选择单个函数进行急迫编译。这赋予网页开发人员精确控制他们想要编译的函数的能力，并通过优化其网页的编译性能挖掘最后一点潜力。敬请期待！
