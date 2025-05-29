---
title: "問題のトリアージ方法"
description: "このドキュメントはV8のバグトラッカー上での問題の対処方法を説明します。"
---
このドキュメントは[V8のバグトラッカー](/bugs)での問題の対処方法を説明します。

## 問題をトリアージする方法

- *V8トラッカー*: 状態を`Untriaged`に設定
- *Chromiumトラッカー*: 状態を`Untriaged`に設定し、コンポーネント`Blink>JavaScript`を追加

## ChromiumトラッカーでV8の問題を割り当てる方法

以下のカテゴリーのいずれかにV8専門のシェリフキューに問題を移動してください:

- メモリ: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - [この](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles)クエリに表示されます
- 安定性: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - [この](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)クエリに表示されます
    - CCは不要で、シェリフが自動的にトリアージします
- パフォーマンス: `status=untriaged component:Blink>JavaScript label:Performance`
    - [この](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2)クエリに表示されます
    - CCは不要で、シェリフが自動的にトリアージします
- Clusterfuzz: 以下の状態にバグを設定:
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - [この](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)クエリに表示されます
    - CCは不要で、シェリフが自動的にトリアージします
- セキュリティ: 全てのセキュリティ問題はChromiumセキュリティ・シェリフによってトリアージされます。[セキュリティバグの報告](/docs/security-bugs)をご参照ください。

シェリフの注意が必要な場合は、回転情報を確認してください。

全ての問題にコンポーネント`Blink>JavaScript`を使用してください。

**これはChromiumの問題トラッカーで追跡されている問題にのみ適用されますのでご注意ください。**
