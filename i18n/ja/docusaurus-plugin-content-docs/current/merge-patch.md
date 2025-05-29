---
title: 'マージとパッチ'
description: 'この文書は、リリースブランチへのV8パッチのマージ方法を説明します。'
---
もし`main`ブランチへのパッチ（例えば重要なバグ修正）があり、それをリリースV8ブランチの1つ（refs/branch-heads/12.5）にマージする必要がある場合、次をお読みください。

以下の例では、12.3バージョンのV8を使用します。`12.3`をあなたのバージョン番号に置き換えてください。[V8のバージョン番号に関するドキュメント](/docs/version-numbers)を読んで詳細を確認してください。

パッチがマージされる場合、V8のイシュー管理ツールに関連するイシューが**必須**です。これにより、マージを追跡しやすくなります。

## マージ候補の資格は何ですか？

- パッチが*重大な*バグを修正する場合（重要度順）：
    1. セキュリティバグ
    1. 安定性バグ
    1. 正当性バグ
    1. パフォーマンスバグ
- パッチがAPIを変更しないこと。
- パッチがブランチカット前の動作を変更しないこと（バグ修正のための動作変更を除く）。

詳細については、[関連するChromiumページ](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md)をご覧ください。疑問がある場合は、[v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) にメールを送信してください。

## マージプロセス

V8トラッカーにおけるマージプロセスは属性によって制御されます。そのため、関連するChromeマイルストーンに‘Merge-Request’を設定してください。マージがV8の[移植](https://v8.dev/docs/ports)のみに影響する場合は、HW属性を適切に設定してください。例：

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

レビュー後、これは以下のように調整されます：

```
Merge: Approved-123
または
Merge: Rejected-123
```

CLが適用された後、これはさらに以下のように調整されます：

```
Merge: Merged-123, Merged-12.3
```

## コミットがすでにマージ/リバートされているか、Canaryカバレッジがあるかを確認する方法

[chromiumdash](https://chromiumdash.appspot.com/commit/)を使用して、関連するCLにCanaryカバレッジがあるか確認してください。


上部の**リリース**セクションにCanaryが表示されるはずです。

## マージCLを作成する方法

### オプション1：[gerrit](https://chromium-review.googlesource.com/)を使用 - 推奨


1. バックマージしたいCLを開く。
1. 拡張メニュー（三つの縦の点のアイコン、右上）から"Cherry pick"を選択する。
1. 宛先ブランチに"refs/branch-heads/*XX.X*"を入力する（*XX.X*を適切なブランチに置き換え）。
1. コミットメッセージを修正する：
   1. タイトルの先頭に"Merged: "を付ける。
   1. フッターの元のCLに対応する行（"Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"）を削除する。「(cherry picked from commit XXX)」という行はツールでマージを元のCLに関連付けるために必要なので残す。
1. マージコンフリクトが発生した場合は、それでもCLを作成する。コンフリクトを解決するには、gerrit UIを使うか、メニュー（三つの縦の点のアイコン、右上）から"download patch"コマンドを使用してローカルにパッチを簡単に取得して解決する。
1. レビューに提出する。

### オプション2：自動スクリプトを使用

リビジョンaf3cf11をブランチ12.2にマージする場合（完全なGitハッシュを指定してください。ここでは簡単のため省略形で記載）。

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### 適用後： [ブランチウォーターフォール](https://ci.chromium.org/p/v8)を観察する

パッチ適用後にビルダーの1つが緑色でない場合、マージを直ちにリバートしてください。`AutoTagBot`というボットが10分間の待機後に正しいバージョン管理を行います。

## Canary/Devで使用されているバージョンにパッチを適用する

Canary/Devバージョンにパッチを適用する必要がある場合（めったに起こらないはずです）、問題にvahl@またはmachenbach@をCCしてください。Googleの社員は、CLを作成する前に[内部サイト](http://g3doc/company/teams/v8/patching_a_version)を確認してください。

