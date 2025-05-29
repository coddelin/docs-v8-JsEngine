---
title: "V8 版本 v4.8"
author: "V8 團隊"
date: 2015-11-25 13:33:37
tags:
  - 發佈
description: "V8 v4.8 新增了多項 ES2015 語言功能的支持。"
---
大約每六週，我們按照 [發佈流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都從 V8 的 Git 主分支在 Chrome 的 Beta 里程碑分支之前分支出來。今天，我們很高興宣佈我們的最新分支，[V8 版本 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8)，該版本將處於 Beta 階段，直到與 Chrome 48 穩定版協同發佈為止。V8 4.8 包含了一些面向開發者的功能，因此我們希望在幾週後的正式發佈之前，向您預覽一些亮點。

<!--truncate-->
## 改進的 ECMAScript 2015 (ES6) 支持

此版本的 V8 提供了對兩個 [著名符號](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols) 的支持，這些是來自 ES2015 規範的內建符號，允許開發者利用之前無法訪問的多項底層語言結構。

### `@@isConcatSpreadable`

這是一個布爾值屬性的名稱，如果為 `true`，則表明該對象應由 `Array.prototype.concat` 展平成其陣列元素。

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
  // 輸出 [1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

一個方法的名稱，用於在對象進行隱式轉換為原始值時調用。

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

ES2015 規範調整了對類型轉換的抽象操作，以將參數轉換為適合作為類似陣列對象的長度的整數。（雖然無法直接觀察到，但在處理具有負長度的類似陣列時，這一更改可能會間接可見。）

## V8 API

請參閱我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。這份文檔通常會在每次主要版本發佈後的幾週內定期更新。

擁有 [有效 V8 檢出](https://v8.dev/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 4.8 -t branch-heads/4.8` 來嘗試 V8 v4.8 的新功能。或者，您也可以[訂閱 Chrome's Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快就可以自己嘗試這些新功能。
