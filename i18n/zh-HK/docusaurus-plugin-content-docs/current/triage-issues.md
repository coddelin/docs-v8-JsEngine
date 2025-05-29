---
title: '分類問題'
description: '本文檔解釋了如何處理 V8 錯誤跟蹤器中的問題。'
---
本文檔解釋了如何處理 [V8 錯誤跟蹤器](/bugs) 中的問題。

## 如何對問題進行分類

- *V8 跟蹤器*: 將狀態設置為 `Untriaged`
- *Chromium 跟蹤器*: 將狀態設置為 `Untriaged` 並添加組件 `Blink>JavaScript`

## 如何在 Chromium 跟蹤器中指派 V8 問題

請將問題移到以下分類之一的 V8 專項主值組列隊：

- 記憶體: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - 可以在 [此處](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles) 查詢到
- 穩定性: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - 可以在 [此處](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) 查詢到
    - 不需要 CC，將自動由主值分類
- 效能: `status=untriaged component:Blink>JavaScript label:Performance`
    - 可以在 [此處](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2) 查詢到
    - 不需要 CC，將自動由主值分類
- Clusterfuzz: 將錯誤設置為以下狀態：
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - 可以在 [此處](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) 查詢到。
    - 不需要 CC，將自動由主值分類
- 安全性: 所有安全性問題都由 Chromium 安全性主值分類。請參閱 [報告安全性錯誤](/docs/security-bugs) 獲取更多信息。

如果需要主值關注，請參考輪值信息。

在所有問題上使用組件 `Blink>JavaScript`。

**請注意，這僅適用於 Chromium 問題跟蹤器中跟蹤的問題。**
