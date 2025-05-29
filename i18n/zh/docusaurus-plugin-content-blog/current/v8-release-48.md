---
title: 'V8 发布 v4.8'
author: 'V8 团队'
date: 2015-11-25 13:33:37
tags:
  - 发布
description: 'V8 v4.8 增加了对几个新的 ES2015 语言特性的支持。'
---
大约每六周，我们会按照我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都直接从 V8 的 Git 主分支分支出来，时间点正好是 Chrome 分支用于 Chrome Beta 里程碑之前。今天我们很高兴地宣布我们的最新分支 [V8 版本 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8)，该版本将在与 Chrome 48 稳定版同步发布之前处于测试阶段。V8 4.8 包含一些面向开发者的功能，下面我们将为即将发布的几个星期内的亮点功能做一个预览。

<!--truncate-->
## 改进的 ECMAScript 2015 (ES6) 支持

此次发布的 V8 提供了对两个[知名符号](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)的支持，它们是 ES2015 规范中内置的符号，可以让开发者利用一些之前隐藏的底层语言结构。

### `@@isConcatSpreadable`

一个布尔值属性的名称，如果为 `true`，表示对象在 `Array.prototype.concat` 中应该被展开为它的数组元素。

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // 输出 [1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

一个方法名称，用于在对象进行隐式转换为原始值时调用。

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

ES2015 规范调整了类型转换的抽象操作，将参数转换为适用于作为类似数组对象长度的整数。（虽然无法直接观察到该变化，但在处理具有负长度的类似数组对象时可能会间接可见。）

## V8 API

请查看我们的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档在每次主要版本发布后的几周内会定期更新。

拥有[活跃 V8 检出](https://v8.dev/docs/source-code#using-git)的开发者可以使用 `git checkout -b 4.8 -t branch-heads/4.8` 来试验 V8 v4.8 中的新功能。或者，您也可以[订阅 Chrome 的 Beta 通道](https://www.google.com/chrome/browser/beta.html)，很快自己尝试新功能。
