---
title: "V8への貢献"
description: "この文書は、V8に貢献する方法を説明します。"
---
このページの情報は、V8に貢献する方法を説明しています。貢献を提出する前に必ず全体を読んでください。

## コードを取得する

[V8ソースコードのチェックアウト](/docs/source-code)をご覧ください。

## 貢献する前に

### V8のメーリングリストでガイダンスを求める

大きなV8の貢献を始める前に、[V8の貢献者メーリングリスト](https://groups.google.com/group/v8-dev)を通じてまず私たちに連絡してください。そうすればお手伝いや指導が可能です。事前調整を行うことで、後の苛立ちを回避しやすくなります。

### CLAに署名する

私たちがあなたのコードを使用する前に、[Google個人貢献者ライセンス契約](https://cla.developers.google.com/about/google-individual)に署名する必要があります。これはオンラインで行うことができます。主にあなたが変更の著作権を所有しているため、あなたのコードを使用および配布する許可が必要です。また、コードが他者の特許を侵害していると認識している場合は知らせることなど、いくつかの点について私たちは確信する必要があります。コードを提出してメンバーが承認した後にこれを行う必要はありませんが、コードをコードベースに取り込む前には行う必要があります。

企業による貢献は、上記とは異なる契約である[ソフトウェア譲渡および企業貢献者ライセンス契約](https://cla.developers.google.com/about/google-corporate)に基づいています。

オンラインで署名するには[こちら](https://cla.developers.google.com/)をご覧ください。

## コードを提出する

V8のソースコードは[Google C++スタイルガイド](https://google.github.io/styleguide/cppguide.html)に従っていますので、それに精通しておいてください。コードを提出する前に、すべての[テスト](/docs/test)に合格し、事前送信チェックを成功させる必要があります:

```bash
git cl presubmit
```

事前送信スクリプトはGoogleのリンター[`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py)を使用します。これは[`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools)の一部であり、`PATH`に設定する必要があります — つまり、`PATH`に`depot_tools`を追加すれば、すべてが正常に動作するはずです。

### V8のコードレビューツールにアップロードする

プロジェクトメンバーによる提出も含め、すべての提出物にはレビューが必要です。当プロジェクトではChromiumのコードレビューのツールとプロセスを使用しています。パッチを提出するには[`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools)を取得し、[レビューを依頼する](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md)際の手順に従ってください（Chromiumワークスペースの代わりにV8ワークスペースを使用します）。

### 障害や回帰に注意する

コードレビューの承認を得たら、コミットキューを使用してパッチを適用できます。コミットキューは大量のテストを実行し、すべてのテストが合格するとパッチをコミットします。変更がコミットされたら、変更後にボットが緑色になるまで[コンソール](https://ci.chromium.org/p/v8/g/main/console)を監視することをお勧めします。なぜならコンソールでは、コミットキューよりも多くのテストが実行されるためです。
