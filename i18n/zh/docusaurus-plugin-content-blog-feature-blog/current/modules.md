---
title: 'JavaScript 模块'
author: 'Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) 和 Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
- 'addy-osmani'
- 'mathias-bynens'
date: 2018-06-18
tags:
  - ECMAScript
  - ES2015
description: '本文解释了如何使用 JavaScript 模块、如何合理地部署它们，以及 Chrome 团队如何努力在未来使模块更加完善。'
tweet: '1008725884575109120'
---
JavaScript 模块现在已经在[所有主流浏览器中支持](https://caniuse.com/#feat=es6-module)！

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

本文解释了如何使用 JS 模块、如何合理地部署它们，以及 Chrome 团队如何努力在未来使模块更加完善。

## 什么是 JS 模块？

JS 模块（也称为“ES 模块”或“ECMAScript 模块”）是一个重要的新功能，或者说是一组新功能集合。你可能以前使用过用户级的 JavaScript 模块系统。可能使用过[类似 Node.js 的 CommonJS](https://nodejs.org/docs/latest-v10.x/api/modules.html)，或者[AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)，或者其他什么。这些模块系统都有一个共同点：它们允许你导入和导出内容。

<!--truncate-->
JavaScript 现在针对这一点有了标准化的语法。在一个模块中，你可以使用 `export` 关键字导出几乎任何内容。你可以导出 `const`、`function` 或其他变量绑定或声明。只需在变量语句或声明前加上 `export` 即可：

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

然后你可以使用 `import` 关键字从另一个模块中导入这个模块。在这里，我们从 `lib` 模块中导入 `repeat` 和 `shout` 功能，并在我们的 `main` 模块中使用它们：

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('模块正在运行');
// → '模块正在运行！'
```

你还可以从模块导出一个默认值：

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

这样的 `default` 导出可以使用任何名称导入：

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

模块与经典脚本略有不同：

- 模块默认启用了[严格模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)。

- 模块不支持 HTML 风格的注释语法，尽管它在经典脚本中有效。

    ```js
    // 不要在 JavaScript 中使用 HTML 风格的注释语法！
    const x = 42; <!-- TODO: 重命名 x 为 y。
    // 改用普通的单行注释：
    const x = 42; // TODO: 重命名 x 为 y。
    ```

- 模块具有词法上的顶级作用域。这意味着，例如，在模块中运行 `var foo = 42;` *不会* 创建一个名为 `foo` 的全局变量，无法通过浏览器中的 `window.foo` 访问，而在经典脚本中则会这样。

- 同样地，模块中的 `this` 不指向全局 `this`，而是 `undefined`。（如果需要访问全局 `this`，请使用 [`globalThis`](/features/globalthis)）。

- 新的静态 `import` 和 `export` 语法仅在模块中可用——在经典脚本中不起作用。

- [顶级 `await`](/features/top-level-await) 可在模块中使用，但在经典脚本中无法使用。此外，`await` 不能作为模块中的变量名称，尽管在经典脚本中，变量可以在异步函数外部命名为 `await`。

由于这些差异，*相同的 JavaScript 代码在作为模块或经典脚本处理时可能表现不同*。因此，JavaScript 运行时需要知道哪些脚本是模块。

## 在浏览器中使用 JS 模块

在 Web 中，你可以通过设置 `<script>` 元素的 `type` 属性为 `module` 来告诉浏览器将其作为模块处理。

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

支持`type="module"`的浏览器会忽略带有`nomodule`属性的脚本。这意味着您可以向支持模块的浏览器提供基于模块的内容，同时为其他浏览器提供回退选项。能够进行这种区分非常棒，哪怕仅仅是为了性能！想一想：只有现代浏览器支持模块。如果一个浏览器理解您的模块代码，它也支持[早于模块出现的功能](https://codepen.io/samthor/pen/MmvdOM)，比如箭头函数或`async`-`await`。您不再需要在模块包中对这些功能进行转换了！您可以[向现代浏览器提供更小且基本未转换的基于模块的内容负载](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)。只有旧版浏览器会接收到`nomodule`的内容负载。

由于[模块默认是延迟的](#defer)，您可能也希望以延迟方式加载`nomodule`脚本：

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### 浏览器中模块与经典脚本的特定差异

如您所知，模块不同于经典脚本。除了我们上面概述的与平台无关的区别之外，还有一些浏览器特有的差异。

例如，模块只会被评估一次，而经典脚本会每次添加到DOM时都会被评估。

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js 会被多次执行。 -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import './module.mjs';</script>
<!-- module.mjs 只会被执行一次。 -->
```

另外，模块脚本及其依赖通过 CORS 获取。这意味着任何跨域的模块脚本都必须带有适当的响应头，例如`Access-Control-Allow-Origin: *`。而经典脚本则不受此限制。

另一个差异与`async`属性有关，`async`属性会使脚本下载时不阻塞HTML解析（类似于`defer`），但它还会在可能的情况下立即执行脚本，没有执行顺序的保证，并且不会等待HTML解析完成。`async`属性对内联的经典脚本不起作用，但对内联的`<script type="module">`起作用。

### 关于文件扩展名的说明

您可能已经注意到我们使用了`.mjs`文件扩展名来表示模块。在Web上，只要文件以[JavaScript MIME类型`text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type)提供，文件扩展名并不重要。浏览器通过脚本元素上的`type`属性知道它是模块。

尽管如此，我们还是推荐为模块使用`.mjs`扩展名，原因有两个：

1. 在开发过程中，`.mjs`扩展名可以非常清楚地向您和任何查看您项目的人表明该文件是模块而不是经典脚本。（仅通过查看代码并不总是能确定。）如前所述，模块和经典脚本被区别对待，因此这种差别非常重要！
1. 它确保您的文件可以被[Node.js](https://nodejs.org/api/esm.html#enabling)和[`d8`](/docs/d8)等运行时环境，或[译码工具如Babel](https://babeljs.io/docs/en/options#sourcetype)解析为模块。虽然这些环境和工具能通过配置将其他扩展名的文件解释为模块，但`.mjs`扩展名是确保文件被作为模块处理的跨环境方法。

:::note
**注意：** 在Web上部署`.mjs`时，您的Web服务器需要被配置为使用正确的`Content-Type: text/javascript`头提供此扩展名的文件，如上所述。此外，您可能希望将编辑器配置为将`.mjs`文件视为`.js`文件，以获得语法高亮功能。大多数现代编辑器默认已经这样做。
:::

### 模块说明符

当`import`模块时，指定模块位置的字符串称为“模块说明符”或“导入说明符”。在我们之前的例子中，模块说明符是`'./lib.mjs'`：

```js
import {shout} from './lib.mjs';
//                  ^^^^^^^^^^^
```

模块说明符在浏览器中有限制。所谓的“裸”模块说明符目前尚不支持。该限制已[规范化](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)，以便未来浏览器可以允许自定义模块加载器为裸模块说明符赋予特殊含义，例如以下情况：

```js
// 尚未支持：
import {shout} from 'jquery';
import {shout} from 'lib.mjs';
import {shout} from 'modules/lib.mjs';
```

另一方面，以下示例都受支持：

```js
// 支持：
import {shout} from './lib.mjs';
import {shout} from '../lib.mjs';
import {shout} from '/modules/lib.mjs';
import {shout} from 'https://simple.example/modules/lib.mjs';
```

目前，模块说明符必须是完整的URL，或以`/`、`./`或`../`开头的相对URL。

### 模块默认是延迟的

经典`<script>`默认会阻塞HTML解析。您可以通过添加[`defer`属性](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer)来避免这种情况，该属性确保脚本下载与HTML解析并行进行。

![](/_img/modules/async-defer.svg)

模块脚本默认是被延迟执行的。因此，不需要在`<script type="module">`标签中添加`defer`属性！不仅主模块的下载和HTML解析是并行进行，所有依赖模块的下载也是如此！

## 其他模块特性

### 动态`import()`

目前为止，我们只使用了静态`import`。通过静态`import`，需要在主代码运行之前下载并执行整个模块图。有时你可能不希望提前加载模块，而是根据需要按需加载，例如用户点击某个链接或按钮时。这可以提升初始加载性能。[动态`import()`](/features/dynamic-import)可以实现这一目标！

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './lib.mjs';
    const {repeat, shout} = await import(moduleSpecifier);
    repeat('hello');
    // → 'hello hello'
    shout('Dynamic import in action');
    // → 'DYNAMIC IMPORT IN ACTION!'
  })();
</script>
```

与静态`import`不同，动态`import()`可以在常规脚本中使用。这是一种在现有代码库中开始渐进式使用模块的简单方法。有关更多详细信息，请参阅[我们关于动态`import()`的文章](/features/dynamic-import)。

:::note
**注意:** [webpack有自己的`import()`版本](https://web.dev/use-long-term-caching/)，它可以巧妙地将导入的模块拆分到单独的代码块中，与主包分离。
:::

### `import.meta`

另一个与模块相关的新特性是`import.meta`，它提供有关当前模块的元数据。这些元数据的具体内容没有在ECMAScript中指定，取决于宿主环境。例如，在浏览器中可能获得与Node.js中不同的元数据。

以下是在网络中使用`import.meta`的示例。HTML文档中图片默认是相对于当前URL加载的，而通过`import.meta.url`可以实现相对于当前模块加载图片。

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail('../img/thumbnail.png');
container.append(thumbnail);
```

## 性能推荐

### 保持模块打包

通过模块，可以在不使用像webpack、Rollup或Parcel这样的打包工具的情况下开发网站。在以下情况下，可以直接使用原生JS模块：

- 本地开发期间
- 用于小型Web应用程序，总模块数量少于100且依赖树较浅（最大深度小于5）

然而，根据我们在[加载一个由约300个模块组成的模块化库时对Chrome加载管道的瓶颈分析](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub)中学到的经验，打包后的应用程序的加载性能优于未打包的应用程序。

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

造成这种情况的一个原因是静态`import`/`export`语法是可以静态分析的，因此可以帮助打包工具优化你的代码，通过消除未使用的导出进行优化。静态`import`和`export`不仅仅是语法，它们还是关键的工具功能！

*我们的一般建议是在将模块部署到生产环境之前继续使用打包工具。*从某种意义上说，打包是一种类似于代码压缩的优化：它能带来性能上的好处，因为最终会传输更少的代码。打包也有相同的效果！继续保持模块打包。

和往常一样，[DevTools代码覆盖率功能](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)可以帮助你识别是否向用户推送了不必要的代码。我们还推荐使用[代码分割](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading)，以分割代码包并延迟加载非第一次有意义绘制的关键脚本。

#### 模块打包与未打包模块的权衡

和Web开发中的通常情况一样，一切都是权衡。未打包模块可能会降低初始加载性能（冷缓存），但相比于未进行代码分割直接传送的单个包而言，未打包模块可能会改善后续访问（热缓存）的加载性能。对于一个200 KB的代码库，只修改一个细粒度模块，并在后续访问时仅从服务器获取该模块，比重新获取整个代码包要好得多。

如果你更关注热缓存访问者的体验，而不是第一次访问性能，并且网站的细粒度模块数量少于几百个，可以尝试传送未打包的模块，测量冷加载和热加载性能的影响，然后基于数据做出决策！

浏览器工程师正在努力改进模块的性能，以便开箱即用。随着时间的推移，我们期望在更多情况下可以直接使用未打包的模块。

### 使用细粒度模块

养成使用小型、细粒度模块编写代码的习惯。在开发过程中，与其手动将多个导出组合到一个文件中，不如让每个模块只包含少量导出。

考虑一个名为`./util.mjs`的模块，它导出了三个函数，分别是`drop`、`pluck`和`zip`：

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

如果你的代码库只需要`pluck`功能，你可能会像下面这样导入它：

```js
import {pluck} from './util.mjs';
```

在这种情况下，（没有构建时的打包步骤）浏览器仍需要下载、解析和编译整个`./util.mjs`模块，即使它只需要一个导出。这是很浪费的！

如果`pluck`没有与`drop`和`zip`共享任何代码，那么最好将其移动到单独的细粒度模块中，例如`./pluck.mjs`。

```js
export function pluck() { /* … */ }
```

我们可以在不处理`drop`和`zip`的额外开销情况下导入`pluck`：

```js
import {pluck} from './pluck.mjs';
```

:::note
**注意：** 根据个人偏好，你可以在这里使用`default`导出代替命名导出。
:::

这不仅使你的源代码保持简洁，还减少了由打包工具执行的无用代码删除的需求。如果你的源树中的某个模块未被使用，那么它永远不会被导入，因此浏览器也不会下载它。实际上被使用的模块可以单独通过浏览器[代码缓存](/blog/code-caching-for-devs)。（使这一切成真的基础设施已经在V8中实现，[相关工作正在进行](https://bugs.chromium.org/p/chromium/issues/detail?id=841466)，以在Chrome中启用它。）

使用小型、细粒度模块有助于为将来可能出现的[原生打包解决方案](#web-packaging)做好准备。

### 预加载模块

你可以通过使用[`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload)进一步优化模块的交付方式。这样，浏览器可以预加载甚至预解析和预编译模块及其依赖项。

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

对于较大的依赖树来说，这尤其重要。如果没有`rel="modulepreload"`，浏览器需要执行多个HTTP请求以确定完整的依赖树。然而，如果你用`rel="modulepreload"`声明了所有依赖模块脚本的完整列表，浏览器就不需要逐步发现这些依赖项。

### 使用HTTP/2

在可能的情况下使用HTTP/2总是好的性能建议，尤其是因为[它的多路复用支持](https://web.dev/performance-http2/#request-and-response-multiplexing)。通过HTTP/2多路复用，多个请求和响应消息可以同时进行，对于加载模块树是有益的。

Chrome团队调查了是否可以通过另一个HTTP/2特性，特别是[HTTP/2服务器推送](https://web.dev/performance-http2/#server-push)，来部署高度模块化的应用程序。不幸的是，[HTTP/2服务器推送很难正确实现](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/)，而网络服务器和浏览器的实现目前并未针对高度模块化的网络应用使用场景进行优化。例如，很难只推送用户尚未缓存的资源，而通过将一个来源的完整缓存状态传递给服务器来解决这个问题则会带来隐私风险。

因此，请继续使用HTTP/2！但请记住，HTTP/2服务器推送（不幸地）并不是万能的解决方案。

## JS模块在网络上的采用情况

JS模块正在逐步被网络采用。[我们的使用计数器](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062)显示，目前有0.08%的页面加载使用了`<script type="module">`。请注意，这个数字不包括其他入口点，例如动态`import()`或[worklets](https://drafts.css-houdini.org/worklets/)。

## JS模块的发展方向

Chrome团队正在以多种方式改进JS模块的开发时体验。让我们讨论其中一些。

### 更快且确定性的模块解析算法

我们提出了一项针对模块解析算法的改进，解决了速度和确定性方面的不足。新的算法现已在[HTML规范](https://github.com/whatwg/html/pull/2991)和[ECMAScript规范](https://github.com/tc39/ecma262/pull/1006)中上线，并在[Chrome 63](http://crbug.com/763597)中实现。预计此改进将很快在更多浏览器中上线！

新的算法效率更高、速度更快。旧算法的计算复杂度为依赖图大小的二次方，即𝒪(n²)，Chrome当时的实现也是如此。而新算法的复杂度为线性，即𝒪(n)。

此外，新的算法以确定性的方式报告解析错误。针对包含多个错误的图，旧算法的不同运行可能报告不同错误是导致解析失败的原因，这使得调试变得不必要地复杂。而新的算法保证每次都报告相同的错误。

### Worklets和Web Workers

Chrome现已实现[Worklets](https://drafts.css-houdini.org/worklets/)，它允许Web开发人员定制浏览器“底层部分”中的硬编码逻辑。通过Worklets，Web开发人员可以将JS模块注入渲染管道或音频处理管道（未来可能还有更多管道）。

Chrome 65支持[`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi)（即CSS Paint API）来控制DOM元素的绘制方式。

```js
const result = await css.paintWorklet.addModule('paint-worklet.mjs');
```

Chrome 66支持[`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet)，允许使用自己的代码控制音频处理。同一版本的Chrome还启动了[`AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)的[OriginTrial](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)，它支持创建滚动关联的或其他高性能过程动画。

最后，[`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/)（即CSS Layout API）已在Chrome 67中实现。

我们在[努力](https://bugs.chromium.org/p/chromium/issues/detail?id=680046)为Chrome的专用Web Workers添加JS模块支持。您可以启用`chrome://flags/#enable-experimental-web-platform-features`进行尝试。

```js
const worker = new Worker('worker.mjs', { type: 'module' });
```

对共享Workers和服务Workers的JS模块支持即将推出：

```js
const worker = new SharedWorker('worker.mjs', { type: 'module' });
const registration = await navigator.serviceWorker.register('worker.mjs', { type: 'module' });
```

### Import Maps

在Node.js/npm中，通常通过“包名称”导入JS模块。例如：

```js
import moment from 'moment';
import {pluck} from 'lodash-es';
```

目前，根据[HTML规范](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)，这种“裸导入符号”会抛出异常。[我们的Import Maps提案](https://github.com/domenic/import-maps)允许此类代码在Web上使用，包括生产应用中。Import Map是一种JSON资源，帮助浏览器将裸导入符号转换为完整的URL。

Import Maps仍处于提案阶段。虽然我们已考虑到它如何解决各种用例，但我们还在与社区进行交流，并尚未完成完整规范文档。欢迎提供反馈！

### Web包装：原生Bundle

Chrome加载团队目前正在探索[一种原生Web包装格式](https://github.com/WICG/webpackage)，作为分发Web应用的新方式。Web包装的核心功能包括：

[已签名的HTTP交换](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)，允许浏览器信任单个HTTP请求/响应对是由其声明的来源生成的；[捆绑的HTTP交换](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00)，即一组交换，每个交换可以是签名或未签名的，并带有一些描述如何解释整个捆绑内容的元数据。

结合起来，这种Web包装格式将使*多个同源资源*能够*安全嵌入*到*单个*HTTP `GET`响应中。

现有捆绑工具如webpack、Rollup或Parcel目前输出单个JavaScript捆绑包，其中原始独立模块和资源的语义丢失。通过原生Bundle，浏览器可以将资源还原为其原始形式。简单来说，您可以将捆绑的HTTP交换视为一个资源包，可以通过目录（清单）以任何顺序访问，其中包含的资源可以根据其相对重要性高效存储和标记，同时仍保留单个文件的概念。正因如此，原生Bundle可改善调试体验。在DevTools中查看资源时，浏览器可以直接定位到原始模块，而无需复杂的源映射。

原生包格式的透明性为各种优化机会打开了大门。例如，如果浏览器已经在本地缓存了部分原生包，它可以将此信息传递给网络服务器，然后只下载缺失的部分。

Chrome 已支持提案的一部分（[`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)），但打包格式的本身及其在高度模块化应用中的应用仍处于探索阶段。欢迎您通过仓库或电子邮件 loading-dev@chromium.org 提供您的反馈！

### 分层 API

发布新功能和网络 API 会带来持续的维护和运行成本——每个新功能都会污染浏览器的命名空间、增加启动成本，并成为在代码库中引入漏洞的新表面。[分层 API](https://github.com/drufball/layered-apis) 是一种以更可扩展的方式在网络浏览器中实现和发布高级 API 的努力。JS 模块是分层 API 的关键技术支持：

- 由于模块是明确导入的，要求通过模块暴露分层 API 确保开发者只需为他们使用的分层 API 付费。
- 由于模块加载是可配置的，分层 API 可以在不支持分层 API 的浏览器中自动加载 polyfill 的内置机制。

模块和分层 API 如何协作的细节[仍在制定中](https://github.com/drufball/layered-apis/issues)，但目前的提案看起来像这样：

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

<script>元素从浏览器的内置分层 API 集（`std:virtual-scroller`）或指向 polyfill 的后备 URL 加载 `virtual-scroller` API。此 API 可以在网络浏览器中执行 JS 模块可以执行的任何操作。例如，可以定义[自定义 `<virtual-scroller>` 元素](https://www.chromestatus.com/feature/5673195159945216)，使以下 HTML 按需实现渐进增强：

```html
<virtual-scroller>
  <!-- 内容放置在这里。 -->
</virtual-scroller>
```

## 致谢

感谢 Domenic Denicola、Georg Neis、Hiroki Nakagawa、Hiroshige Hayashizaki、Jakob Gruber、Kouhei Ueno、Kunihiko Sakamoto 和 Yang Guo，为使 JavaScript 模块运行速度更快而作出的贡献！

另外，还要感谢 Eric Bidelman、Jake Archibald、Jason Miller、Jeffrey Posnick、Philip Walton、Rob Dodson、Sam Dutton、Sam Thorogood 和 Thomas Steiner 阅读本指南的草稿并提供反馈。
