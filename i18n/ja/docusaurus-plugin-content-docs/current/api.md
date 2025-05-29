---
title: &apos;V8のパブリックAPI&apos;
description: &apos;このドキュメントでは、V8のパブリックAPIの安定性と、開発者がそれに変更を加える方法について説明します。&apos;
---
このドキュメントでは、V8のパブリックAPIの安定性と、開発者がそれに変更を加える方法について説明します。

## APIの安定性

Chromiumのカナリア版でV8がクラッシュする場合、以前のカナリア版のV8バージョンにロールバックされます。そのため、V8のAPIをカナリア版間で互換性がある状態に保つことが重要です。

私たちは常に[ボット](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability)を実行しており、APIの安定性違反を検出します。このボットはChromiumのHEADをV8の[現在のカナリア版バージョン](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary)でコンパイルします。

このボットの失敗は現時点で単なるFYIであり、特に対応は必要ありません。ロールバックの場合に依存CLを簡単に特定するためにブレームリストを使用できます。

このボットに破損を引き起こした場合、次回はV8の変更と依存するChromiumの変更との間の期間を増やすことを思い出してください。

## V8のパブリックAPIを変更する方法

V8は、多くの異なる埋め込みアプリケーション（Chrome、Node.js、gjstestなど）で使用されています。V8のパブリックAPI（基本的に`include/`ディレクトリ内のファイル）を変更する場合、埋め込みアプリケーションが新しいV8バージョンへスムーズに更新できることを保証する必要があります。特に、埋め込みアプリケーションが新しいV8バージョンに更新したり、新しいAPIに合わせてコードを調整したりすることが、一度の原子的な変更で行われると仮定することはできません。

埋め込みアプリケーションは、以前のV8バージョンを使用しながら新しいAPIにコードを調整できるべきです。以下の指示はこのルールに従っています。

- 新しい型、定数、関数を追加することは安全ですが、一つの注意点があります: 既存のクラスに新しい純粋仮想関数を追加しないでください。新しい仮想関数にはデフォルト実装を持たせる必要があります。
- 関数に新しいパラメータを追加することは、そのパラメータにデフォルト値がある場合に安全です。
- 型、定数、関数を削除または名前変更することは安全ではありません。[`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde)および[`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde)マクロを使用してください。これにより、埋め込みアプリケーションが非推奨メソッドを呼び出した際にコンパイル時警告が発生します。例えば、関数`foo`を関数`bar`に名前変更したい場合、以下を実行する必要があります:
    - 現在の関数`foo`の近くに新しい関数`bar`を追加します。
    - ChromeにCLがロールインするまで待ちます。Chromeを調整して`bar`を使用するようにします。
    - `foo`を`V8_DEPRECATED("代わりにbarを使用してください") void foo();`でアノテーションします。
    - 同じCL内で`foo`を使用しているテストを調整して`bar`を使用するようにします。
    - CLの動機と高レベルな更新指示を書きます。
    - 次のV8ブランチを待ちます。
    - 関数`foo`を削除します。

    `V8_DEPRECATE_SOON`は`V8_DEPRECATED`のより柔らかいバージョンです。Chromeはこれによって壊れることはないので、ステップbを行う必要はありません。ただし、`V8_DEPRECATE_SOON`だけでは関数を削除するには不十分です。

    それでも`V8_DEPRECATED`でアノテーションし、次のブランチを待ってから関数を削除する必要があります。

    `V8_DEPRECATED`は`v8_deprecation_warnings` GNフラグを使用してテストできます。
    `V8_DEPRECATE_SOON`は`v8_imminent_deprecation_warnings`を使用してテストできます。

- 関数のシグネチャを変更することは安全ではありません。上記で説明したように`V8_DEPRECATED`と`V8_DEPRECATE_SOON`マクロを使用してください。

私たちは各V8バージョンについて[重要なAPI変更を言及するドキュメント](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)を保持しています。

また、定期的に更新される[doxygen APIドキュメント](https://v8.dev/api)もあります。
