---
title: "JavaScriptの新たなスーパーパワー：明示的リソース管理"
author: "Rezvan Mahdavi Hezaveh"
avatars:
  - "rezvan-mahdavi-hezaveh"
date: 2025-05-09
tags:
  - ECMAScript
description: "明示的リソース管理提案により、開発者はリソースのライフサイクルを明示的に管理できるようになります。"
tweet: ""
---

明示的リソース管理(*Explicit Resource Management*)提案は、ファイルハンドル、ネットワーク接続などのリソースのライフサイクルを明示的に管理するための決定的なアプローチを導入します。この提案により、次の言語拡張が行われます：スコープ外になったリソースで自動的にdisposeメソッドを呼び出す`using`と`await using`宣言、クリーンアップ操作のための`[Symbol.dispose]()`および`[Symbol.asyncDispose]()`シンボル、破棄可能なリソースを集約するコンテナとしての新しいグローバルオブジェクト`DisposableStack`と`AsyncDisposableStack`、リソースの破棄中にエラーが発生し、ボディや別のリソースから発生した既存のエラーを潜在的にマスクするシナリオに対応するための新しいエラータイプ`SuppressedError`。これにより、リソースの破棄を細かく制御できるため、より堅牢でパフォーマンスに優れた、メンテナンスが容易なコードを記述することが可能になります。

<!--truncate-->
## `using` と `await using` の宣言

明示的リソース管理提案の中心となるのは、`using` と `await using` の宣言です。`using` 宣言は同期リソースに適しており、宣言されているスコープが終了するときに破棄可能なリソースの`[Symbol.dispose]()`メソッドを確実に呼び出すことができます。非同期リソースの場合、`await using`宣言は同様に動作しますが、`[Symbol.asyncDispose]()`メソッドを呼び出し、その結果を待機することで非同期クリーンアップ操作を可能にします。この区別により、開発者は同期リソースも非同期リソースも信頼性高く管理でき、リークを防ぎ、全体的なコード品質を向上させることができます。`using` と `await using` キーワードは、ブレース`{}`内（ブロック、forループ、関数ボディなど）で使用でき、トップレベルには使用できません。

たとえば、[`ReadableStreamDefaultReader`](https://developer.mozilla.org/ja/docs/Web/API/ReadableStreamDefaultReader)を使用する場合、`reader.releaseLock()`を呼び出してストリームをアンロックし、他の場所で使用できるようにすることが重要です。ただし、エラーハンドリングでは一般的な問題が生じます。読み取りプロセス中にエラーが発生し、エラーが伝播する前に`releaseLock()`を呼び出すのを忘れると、ストリームはロックされたままになります。以下は単純な例です：

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // まだプロミスがない場合のみフェッチ
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTPエラー！ステータス: ${response.status}`);
    }
    const processedData = await processData(response);

    // processedData を使用
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // データを処理してprocessedDataに保存
            ...
            // ここでエラーが発生！
        }
    }
    
    // この行の前にエラーが発生したため、ストリームはロックされたままです。
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

そのため、ストリームを使用する際、`try...finally`ブロックを使用し、`reader.releaseLock()`を`finally`セクションに配置することが開発者にとって重要です。このパターンにより、`reader.releaseLock()`が常に呼び出されることが保証されます。

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // データを処理してprocessedDataに保存
                ...
                // ここでエラーが発生！
            }
        }
    } finally {
        // リーダーによるストリームのロックは必ず解除されます。
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

このコードを書くもう一つの方法は、ディスポーザブルオブジェクト`readerResource`を作成することです。これにはリーダー（`response.body.getReader()`）と、`this.reader.releaseLock()`を呼び出す`[Symbol.dispose]()`メソッドが含まれます。`using`宣言により、コードブロックが終了した際に`readerResource[Symbol.dispose]()`が呼び出されるため、`releaseLock`を呼び出すことを覚えておく必要がなくなります。ストリームのようなWeb APIでの`[Symbol.dispose]`および`[Symbol.asyncDispose]`の統合は将来的に行われる可能性があるため、開発者は手動のラッパーオブジェクトを書く必要がなくなります。

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // リーダーをディスポーザブルリソースでラップする
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // データを処理し、結果をprocessedDataに保存する
            ...
            // ここでエラーがスローされます！
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]()は自動的に呼び出されます。

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` と `AsyncDisposableStack`

複数のディスポーザブルリソースを管理するのをさらに簡単にするため、この提案では`DisposableStack`と`AsyncDisposableStack`を導入します。これらのスタックベースの構造は、開発者が複数のリソースをグループ化し、連携して破棄できるようにします。リソースはスタックに追加され、スタックが破棄されると、同期的または非同期的に追加された順序と逆順でリソースが破棄されます。これにより、複数の関連リソースを含む複雑なシナリオでのクリーンアッププロセスが簡素化されます。両構造はリソースや破棄アクションを追加する`use()`、`adopt()`、`defer()`のようなメソッドと、クリーンアップをトリガーする`dispose()`や`asyncDispose()`メソッドを提供します。`DisposableStack`と`AsyncDisposableStack`は、それぞれ`[Symbol.dispose]()`と`[Symbol.asyncDispose]()`を持っているため、`using`および`await using`キーワードと共に使用できます。これにより、定義されたスコープ内で複数のリソースの破棄を管理するための堅牢な方法が提供されます。

それぞれのメソッドを見て、例を確認しましょう：

`use(value)`はリソースをスタックの最上部に追加します。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('リーダーロックが解除されました。');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// リーダーロックが解除されました。
```

`adopt(value, onDispose)`は非ディスポーザブルリソースと破棄のコールバックをスタックの最上部に追加します。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('リーダーロックが解除されました。');
      });
}
// リーダーロックが解除されました。
```

`defer(onDispose)`は破棄のコールバックをスタックの最上部に追加します。リソースに関連付けられていないクリーンアップアクションの追加に便利です。

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("完了しました。"));
}
// 完了しました。
```

`move()`は、このスタック内の現在すべてのリソースを新しい`DisposableStack`に移動します。これにより、リソースの所有権をコードの別の部分に移す必要がある場合に役立ちます。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('リーダーロックが解除されました。');
      });
    using newStack = stack.move();
}
// ここではjust the newStackのみが存在し、その中のリソースは破棄されます。
// リーダーロックが解除されました。
```

`dispose()`はDisposableStackで、`disposeAsync()`はAsyncDisposableStackでこのオブジェクト内のリソースを破棄します。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('リーダーロックが解除されました。');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// リーダーロックが解除されました。
```

## 利用可能性

明示的リソース管理はChromium 134とV8 v13.8で提供されています。

## 明示的リソース管理のサポート

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (ナイトリー) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="いいえ https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="いいえ"
                 babel="はい https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
