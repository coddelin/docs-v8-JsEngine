---
title: '动态 `import()`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-11-21
tags:
  - ECMAScript
  - ES2020
description: '动态导入(import())相比于静态导入解锁了新的功能。这篇文章对比了两者并概述了新功能。'
tweet: '932914724060254208'
---
[动态 `import()`](https://github.com/tc39/proposal-dynamic-import) 引入了一种类似函数的新形式的 `import`，相比静态 `import` 解锁了新的功能。这篇文章对比了两者并概述了新功能。

<!--truncate-->
## 静态 `import` (回顾)

Chrome 61 支持 ES2015 的 `import` 语句，并集成在 [模块](/features/modules)中。

考虑以下模块，位于 `./utils.mjs`：

```js
// 默认导出
export default () => {
  console.log('来自默认导出的问候！');
};

// 命名导出 `doStuff`
export const doStuff = () => {
  console.log('正在执行任务…');
};
```

以下是静态导入并使用 `./utils.mjs` 模块的方法：

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → 打印 '来自默认导出的问候！'
  module.doStuff();
  // → 打印 '正在执行任务…'
</script>
```

:::note
**注意:** 上一个示例使用 `.mjs` 扩展名来表明这是一个模块而不是常规脚本。在 Web 上，只要文件使用正确的 MIME 类型（例如 JavaScript 文件对应 `Content-Type` 为 `text/javascript`），文件扩展名其实无关紧要。

`.mjs` 扩展名在其他平台上特别有用，例如 [Node.js](https://nodejs.org/api/esm.html#esm_enabling) 和 [`d8`](/docs/d8)，因为这些平台没有 MIME 类型的概念或者诸如 `type="module"` 的强制性钩子来区分模块与常规脚本。我们在这里使用相同的扩展名，以在不同平台上保持一致，并明显区分模块与常规脚本。
:::

这种导入模块的语法形式是一种 *静态* 声明：它只接受字符串文字作为模块指定符，通过运行时之前的 “连接” 过程将绑定引入到本地作用域。静态 `import` 语法只能用于文件的顶级位置。

静态 `import` 支持静态分析、打包工具以及消除未使用代码等重要场景。

不过在一些情况下，我们希望：

- 按需（或根据条件）导入模块
- 在运行时计算模块指定符
- 从普通脚本（而非模块）中导入模块

这些场景静态 `import` 都无法支持。

## 动态 `import()` 🔥

[动态 `import()`](https://github.com/tc39/proposal-dynamic-import) 引入了一种类似函数的新形式的 `import`，用于支持上述场景。`import(moduleSpecifier)` 返回一个 Promise，该 Promise 提供请求模块的模块命名空间对象，它在完成模块及其所有依赖的获取、实例化和评估之后创建。

以下是动态导入并使用 `./utils.mjs` 模块的方法：

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → 打印 '来自默认导出的问候！'
      module.doStuff();
      // → 打印 '正在执行任务…'
    });
</script>
```

由于 `import()` 返回一个 Promise，我们可以使用 `async`/`await` 替代 `then` 回调方式：

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → 打印 '来自默认导出的问候！'
    module.doStuff();
    // → 打印 '正在执行任务…'
  })();
</script>
```

:::note
**注意:** 尽管 `import()` *看起来像* 一个函数调用，它实际上是 *语法*，只是碰巧使用了括号（类似于 [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)）。这意味着 `import` 不继承于 `Function.prototype`，因此不能使用 `call` 或 `apply` 调用它，并且像 `const importAlias = import` 这样的写法也不工作——实际上，`import` 甚至不是一个对象！但这通常并不会影响实际使用。
:::

下面是一个示例，展示如何通过动态 `import()` 在一个小型单页面应用中实现模块导航时的按需加载：

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>我的图书馆</title>
<nav>
  <a href="books.html" data-entry-module="books">书籍</a>
  <a href="movies.html" data-entry-module="movies">电影</a>
  <a href="video-games.html" data-entry-module="video-games">电子游戏</a>
</nav>
<main>这是一个占位符，用于加载按需内容。</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener(&apos;click&apos;, async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // 模块导出了一个名为 `loadPageInto` 的函数。
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

动态 `import()` 启用的懒加载能力在正确应用时非常强大。为了演示，[Addy](https://twitter.com/addyosmani) 修改了[一个示例 Hacker News PWA](https://hnpwa-vanilla.firebaseapp.com/)，它在首次加载时静态导入了所有依赖项，包括评论。[更新版本](https://dynamic-import.firebaseapp.com/) 使用动态 `import()` 来懒加载评论，避免了加载、解析和编译成本，直到用户真正需要它们。

:::note
**注意：** 如果您的应用从另一个域导入脚本（无论是静态的还是动态的），这些脚本需要带有有效的 CORS 头（例如 `Access-Control-Allow-Origin: *`）。这是因为与常规脚本不同，模块脚本（及其导入）是通过 CORS 获取的。
:::

## 建议

静态 `import` 和动态 `import()` 都很有用。它们各自有非常明确的使用场景。对于初始渲染依赖项，尤其是首屏内容，使用静态 `import`。在其他情况下，可以考虑使用动态 `import()` 按需加载依赖项。

## 动态 `import()` 支持

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
