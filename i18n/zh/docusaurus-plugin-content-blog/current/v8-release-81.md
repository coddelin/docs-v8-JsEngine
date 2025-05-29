---
title: "V8 发布 v8.1"
author: "Dominik Inführ，国际化的神秘人物"
avatars:
  - "dominik-infuehr"
date: 2020-02-25
tags:
  - 发布
description: "V8 v8.1 通过新的 Intl.DisplayNames API 提供了改进的国际化支持功能。"
---

每六周，我们根据[发布流程](https://v8.dev/docs/release-process)创建一个新的 V8 分支。每个版本都基于 V8 的 Git 主分支，在 Chrome Beta 里程碑之前立即分支出来。今天我们很高兴宣布我们的最新分支，[V8 版本 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1)，该版本处于测试阶段，直到数周后与 Chrome 81 稳定版协调发布。V8 v8.1 包含各种开发者相关的好东西。这篇文章预览了一些亮点，以期待该版本的发布。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

新的 `Intl.DisplayNames` API 让程序员可以轻松显示语言、地区、脚本和货币的翻译名称。

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → 'United States'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Japanischer Yen'
```

今天将翻译数据维护的负担转移到运行时吧！查看[我们的功能说明](https://v8.dev/features/intl-displaynames)了解完整的 API 和更多示例。

## V8 API

请使用 `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` 获取 API 更改的列表。

拥有[活跃的 V8 检出](/docs/source-code#using-git)的开发人员可以使用 `git checkout -b 8.1 -t branch-heads/8.1` 来实验 V8 v8.1 中的新功能。或者您可以[订阅 Chrome 的测试渠道](https://www.google.com/chrome/browser/beta.html)，并很快自行尝试新功能。
