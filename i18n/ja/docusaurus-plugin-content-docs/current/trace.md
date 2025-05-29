---
title: &apos;V8のトレース&apos;
description: &apos;この文書はV8の組み込みトレース機能を活用する方法を説明します。&apos;
---
V8はトレース機能をサポートしています。これは[Chromeのトレースシステムを介してChromeに埋め込まれた場合に自動的に機能します](/docs/rcs)。ただし、スタンドアロンのV8やDefault Platformを使用する埋め込み環境でも有効にすることができます。トレースビューアーの詳細については[こちら](https://github.com/catapult-project/catapult/blob/master/tracing/README.md)をご覧ください。

## `d8`でのトレース

トレースを開始するには、`--enable-tracing`オプションを使用します。V8は`v8_trace.json`というファイルを生成し、それをChromeで開くことができます。Chromeで開くには、`chrome://tracing`にアクセスし、「Load」をクリックしてから`v8-trace.json`ファイルを読み込みます。

各トレースイベントは一連のカテゴリに関連付けられており、カテゴリに基づいてトレースイベントの記録を有効化または無効化できます。上述のフラグのみではデフォルトカテゴリ（低オーバーヘッドのカテゴリセット）のみが有効化されます。さらに多くのカテゴリを有効化し、さまざまなパラメータを詳細に制御するには、設定ファイルを指定する必要があります。

以下は`traceconfig.json`という設定ファイルの例です：

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

`d8`にトレースとtraceconfigファイルを指定して呼び出す例：

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

トレース設定フォーマットはChrome Tracingのものと互換性がありますが、`included_categories`リストに正規表現をサポートしていません。また、V8には`excluded_categories`リストが必要ありません。そのため、V8用のトレース設定ファイルはChrome Tracingで再利用できますが、トレース設定ファイルに正規表現が含まれている場合には、Chromeのトレース設定ファイルはV8トレースで再利用することはできません。その上、V8は`excluded_categories`リストを無視します。

## トレースでRuntime Call Statisticsを有効にする

Runtime Call Statistics（<abbr>RCS</abbr>）を取得するには、次の2つのカテゴリを有効にしてトレースを記録してください：`v8`および`disabled-by-default-v8.runtime_stats`。各トップレベルのV8トレースイベントには、そのイベントの期間中のランタイム統計が含まれています。`trace-viewer`でこれらのいずれかのイベントを選択すると、ランタイム統計テーブルが下部パネルに表示されます。複数のイベントを選択すると、マージされたビューが作成されます。

![](/_img/docs/trace/runtime-stats.png)

## トレースでGC Object Statisticsを有効にする

トレースでGC Object Statisticsを取得するには、`disabled-by-default-v8.gc_stats`カテゴリを有効にしてトレースを収集する必要があります。また、以下の`--js-flags`を使用する必要があります：

```
--track_gc_object_stats --noincremental-marking
```

トレースを`trace-viewer`で読み込んだ後、`V8.GC_Object_Stats`という名前のスライスを検索します。統計は下部パネルに表示されます。複数のスライスを選択すると、マージされたビューが作成されます。

![](/_img/docs/trace/gc-stats.png)
