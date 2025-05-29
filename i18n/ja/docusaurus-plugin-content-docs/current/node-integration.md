---
title: "Node.js統合ビルドがCLで壊れた場合の対処方法"
description: "このドキュメントは、CLがNode.js統合ビルドを壊した場合の対処方法を説明します。"
---
[Node.js](https://github.com/nodejs/node)はV8の安定版またはベータ版を使用しています。追加の統合のため、V8チームはV8の[メインブランチ](https://chromium.googlesource.com/v8/v8/+/refs/heads/main)、つまり今日のV8バージョンでNodeをビルドします。我々は[Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64)用の統合ボットを提供しており、[Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64)および[Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64)用は現在準備中です。

[`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel)ボットがV8コミットキューで失敗した場合、CLに正当な問題がある（修正が必要です）か、[Node](https://github.com/v8/node/)を修正する必要があります。Nodeテストが失敗した場合、ログファイルで「Not OK」を検索してください。**このドキュメントは、問題をローカルで再現する方法と、V8 CLが原因でビルドが失敗した場合に[V8のNodeフォーク](https://github.com/v8/node/)に変更を加える方法を説明しています。**

## ソース

node-ciリポジトリの[指示](https://chromium.googlesource.com/v8/node-ci)に従ってソースをチェックアウトしてください。

## V8の変更をテストする

V8はnode-ciのDEPS依存関係として設定されています。テストのため、または失敗を再現するためにV8に変更を加えたい場合があります。そのためには、メインのV8チェックアウトをリモートとして追加してください：

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

コンパイルする前にgclient hooksを実行することを忘れないでください。

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Node.jsに変更を加える

Node.jsもnode-ciの`DEPS`依存関係として設定されています。V8の変更が原因で発生した破損を修正するためにNode.jsに変更を加えたい場合もあります。V8は[Node.jsのフォーク](https://github.com/v8/node)をテストします。そのフォークに変更を加えるにはGitHubアカウントが必要です。

### Node.jsのソースを取得する

[V8のNode.jsリポジトリ](https://github.com/v8/node/)をGitHubでフォークしてください（フォークボタンをクリック）※以前フォークしている場合は不要です。

既存のチェックアウトにあなたのフォークとV8のフォークの両方をリモートとして追加します：

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **注** `<sync-date>`は、アップストリームのNode.jsと同期した日付です。最新の日付を選択してください。

Node.jsのチェックアウトに変更を加え、コミットしてください。その後、GitHubに変更をプッシュします：

```bash
git push <your-user-name> $BRANCH_NAME
```

そして、`node-ci-<sync-date>`ブランチに対するプルリクエストを作成します。


プルリクエストがV8のNode.jsフォークにマージされたら、node-ciの`DEPS`ファイルを更新してCLを作成する必要があります。

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Nodeの更新'
git cl upload
```
