---
title: "一個附加的無回溯正規表示法引擎"
author: "Martin Bidlingmaier"
date: 2021-01-11
tags:
 - internals
 - RegExp
description: "V8 現在擁有一個附加的正規表示法引擎，作為備援並防止許多災難性回溯情況。"
tweet: "1348635270762139650"
---
從 v8.8 開始，V8 提供一個新的實驗性無回溯正規表示法引擎（除了現有的 [Irregexp 引擎](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)以外），該引擎保證相對於主串大小以線性時間執行。實驗性引擎可通過下面的功能標誌開啟。

<!--truncate-->
![Runtime of `/(a*)*b/.exec('a'.repeat(n))` for n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

以下是如何配置新正規表示法引擎：

- `--enable-experimental-regexp_engine-on-excessive-backtracks` 允許在過度回溯時使用備援的無回溯引擎。
- `--regexp-backtracks-before-fallback N`（默認 N = 50,000）指定多少次回溯被視為“過度”，即備援觸發的時候。
- `--enable-experimental-regexp-engine` 啟用非標準 `l`（“線性”）標誌的正規表示法識別，例如 `/(a*)*b/l`。使用此標誌構造的正則表達式會始終使用新引擎立即執行；Irregexp 完全不參與。如果新正規表示法引擎無法處理帶有 `l`-正則表達式的模式，則在構造時拋出異常。我們希望此功能可以在某些時候用於加固對受信任輸入運行正則表達式的應用。目前它仍然是實驗性功能，因為在大多數常見模式下，Irregexp 的速度比新引擎快數個數量級。

備援機制並不適用於所有模式。要觸發備援機制，正規表示法必須：

- 不包含回溯引用，
- 不包含前瞻或後瞻，
- 不包含大範圍或深度嵌套的有限重複，例如 `/a{200,500}/`，以及
- 沒有設置 `u`（Unicode）或 `i`（Insensitive，大小寫不敏感）標誌。

## 背景：災難性回溯

V8 中的正規表示法匹配由 Irregexp 引擎處理。Irregexp 將正則表達式 JIT 編譯為專門的原生代碼（或 [字節碼](/blog/regexp-tier-up)），因此對於大多數模式來說非常快。然而，對於某些模式，Irregexp 的運行時間可能隨輸入字符串大小而呈指數級增長。上面提到的例子 `/(a*)*b/.exec('a'.repeat(100))` 如果使用 Irregexp 執行，在我們的生命週期內是不可能完成的。

所以這裡到底發生了什麼呢？Irregexp 是一個 *回溯* 引擎。當面臨匹配可以繼續的方式選擇時，Irregexp 會完整探索第一種替代方案，如果必要則回溯以探索第二種替代方案。比如，考慮模式 `/abc|[az][by][0-9]/` 與主串 `'ab3'` 匹配。此時 Irregexp 嘗試首先匹配 `/abc/`，並在第二個字符失敗。然後它回溯兩個字符並成功匹配第二個替代方案 `/[az][by][0-9]/`。在帶有量詞的模式例如 `/(abc)*xyz/` 中，Irregexp 必須在匹配主體之後選擇是再次匹配主體還是繼續剩餘模式。

讓我們試著理解當用小一些的主串例如 `'aaa'` 匹配 `/(a*)*b/` 時發生了什麼。該模式包含嵌套量詞，所以我們要求 Irregexp 匹配 `'a'` 的*序列的序列*，然後匹配 `'b'`。顯然沒有匹配，因為主串不包含 `'b'`。然而，`/(a*)*/` 匹配了，而且以指數級方式匹配了很多不同的方式：

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

從理論上講，Irregexp 不能排除最終匹配 `/b/` 的失敗是因為選擇了匹配 `/(a*)*/` 的錯誤方式，因此它必須嘗試所有變體。這一問題被稱為“指數”或“災難性”回溯。

## 正規表示法作為自動機和字節碼

為了理解一種免疫於災難性回溯的替代算法，我們需要快速繞道到 [自動機](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton)。每個正則表達式都等價於一個自動機。例如，上面提到的正則表達式 `/(a*)*b/` 對應於以下的自動機：

![Automaton corresponding to `/(a*)*b/`](/_img/non-backtracking-regexp/example-automaton.svg)

注意，自動機不是由模式唯一確定的；上面你看到的是通過機械翻譯過程獲得的自動機，也是 V8 新的正規表達式引擎內部用於 `/(a*)*/` 的自動機。
未標記的邊是ε轉移：它們不消耗輸入。ε轉移是必要的，用以保持自動機的大小接近模式的大小。天真的消除ε轉移可能導致轉移數量的二次增長。
ε轉移也允許從以下四種基本狀態構建與正則表達式相對應的自動機：

![正則表達式字節碼指令](/_img/non-backtracking-regexp/state-types.svg)

在這裡，我們僅對狀態的 *輸出* 轉移進行分類，而進入狀態的轉移仍然可以是任意的。僅使用這些類型的狀態構建的自動機可以表示為 *字節碼程序*，每個狀態對應於一個指令。例如，一個具有兩個ε轉移的狀態表示為一個 `FORK` 指令。

## 回溯算法

讓我們重新審視Irregexp的回溯算法，並以自動機的術語進行描述。假設我們有一個與模式相對應的字節碼數組 `code`，並希望檢查 `input` 是否匹配該模式。我們假定 `code` 的結構如下：

```js
const code = [
  {opcode: 'FORK', forkPc: 4},
  {opcode: 'CONSUME', char: '1'},
  {opcode: 'CONSUME', char: '2'},
  {opcode: 'JMP', jmpPc: 6},
  {opcode: 'CONSUME', char: 'a'},
  {opcode: 'CONSUME', char: 'b'},
  {opcode: 'ACCEPT'}
];
```

這段字節碼與模式 `/12|ab/y`（粘性模式）對應。FORK指令的forkPc欄位表示可繼續執行的備選狀態/指令的索引（“程序計數器”），JMP指令的jmpPc類似。索引是零基的。回溯算法可以用JavaScript實現如下。

```js
let ip = 0; // 輸入位置
let pc = 0; // 程序計數器：下一條指令的索引。
const stack = []; // 回溯棧
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case 'CONSUME':
      if (ip < input.length && input[ip] === inst.char) {
        // 輸入匹配預期：繼續。
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // 輸入字符錯誤，但我們可以回溯。
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // 錯誤字符，無法回溯。
        return false;
      }
      break;
    case 'FORK':
      // 保存備選狀態以供稍後回溯。
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case 'JMP':
      pc = inst.jmpPc;
      break;
    case 'ACCEPT':
      return true;
  }
}
```

如果字節碼程序包含不消耗任何字符的循環，也就是說，自動機中僅含由ε轉移組成的循環，該實現會無限循環。此問題可以通過前瞻一個字符解決。Irregexp比這個簡單的實現要複雜得多，但根本上仍基於相同的算法。

## 非回溯算法

回溯算法對應於自動機的 *深度優先* 遍歷：我們總是完全探索 `FORK` 指令的第一個備選項，然後在需要時回溯到第二個備選項。非回溯算法的替代方案，毫不意外地是自動機的 *廣度優先* 遍歷。此算法將同時考慮所有備選項，與輸入字符串中的當前位置同步進行。我們因此維護一個當前狀態列表，然後通過採取與每個輸入字符相應的轉移來推進所有狀態。最關鍵的是，我們會從當前狀態列表中移除重複項。

一個簡單的JavaScript實現如下：

```js
// 輸入位置。
let ip = 0;
// 當前程序計數器值或找到匹配時的 `'ACCEPT'`。我們從程序計數器 0 開始，並按ε轉移跟進。
let pcs = followEpsilons([0]);

while (true) {
  // 如果我們找到匹配，就完成了。
  if (pcs === 'ACCEPT') return true;
  // 或者如果我們已經耗盡輸入字符串。
  if (ip >= input.length) return false;

  // 只繼續處理那些消耗了正確字符的程序計數器。
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // 將剩餘的程序計數器進入下一條指令。
  pcs = pcs.map(pc => pc + 1);
  // 跟進ε轉移。
  pcs = followEpsilons(pcs);

  ++ip;
}
```

函數 `followEpsilons` 接受一個程序計數器列表，並計算通過ε轉移（僅執行FORK和JMP）可到達 `CONSUME` 指令程序計數器的列表。返回的列表不得包含重複項。如果可以到達 `ACCEPT` 指令，函數返回 `'ACCEPT'`。可以這樣實現：

```js
function followEpsilons(pcs) {
  // 我們到目前為止看到的程序計數器集合。
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // 如果我們之前已經看到過該程序計數器，可以忽略。
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case 'CONSUME':
        result.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACCEPT';
    }
  }

  return result;
}
```

由於透過 `visitedPcs` 集消除重複，我們知道每個程式計數器只會在 `followEpsilons` 中被檢查一次。這保證了 `result` 清單中不包含重複項，並且 `followEpsilons` 的執行時間受限於 `code` 陣列的大小，也就是模式的大小。`followEpsilons` 最多被呼叫 `input.length` 次，因此正則表達式匹配的總執行時間受限於 `𝒪(pattern.length * input.length)`。

此非回溯演算法可擴展以支援 JavaScript 正則表達式的大部分功能，例如單詞邊界或（子）匹配邊界的計算。不幸的是，回引用、先行檢查和後行檢查如果不進行重大更改以改變漸近最差複雜度，則無法支援。

V8 的新正則表達式引擎基於此演算法及其於 [re2](https://github.com/google/re2) 和 [Rust regex](https://github.com/rust-lang/regex) 庫中的實現。該演算法在 Russ Cox 撰寫的出色[部落格文章系列](https://swtch.com/~rsc/regexp/)中有更深入的討論，Russ Cox 也是 re2 庫的原作者。
