---
title: "イテレーター ヘルパー"
author: "レズヴァン・マハダヴィ・ヘザヴェ"
avatars:
  - "rezvan-mahdavi-hezaveh"
date: 2024-03-27
tags:
  - ECMAScript
description: "イテレーターの一般的な使用と消費を助けるインターフェイス。"
tweet: ""
---

*イテレーター ヘルパー*は、イテレーターの一般的な使用を助けるためのIteratorプロトタイプ上の新しいメソッド群です。これらのヘルパーメソッドはIteratorプロトタイプ上にあるため、プロトタイプチェーン上に`Iterator.prototype`を持つ任意のオブジェクト（例えば配列イテレーター）はこれらのメソッドを利用できます。以下のサブセクションでは、イテレーター ヘルパーについて説明します。提供されているすべての例はブログ投稿のリストを含むアーカイブページで機能し、投稿の検索や操作にイテレーター ヘルパーがどのように役立つかを示しています。[V8ブログページ](https://v8.dev/blog)で試してみてください！

<!--truncate-->

## .map(mapperFn)

`map`はマッパー関数を引数として受け取ります。このヘルパーは、元のイテレーターの値にマッパー関数を適用した値のイテレーターを返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// 投稿のリストを取得し、そのテキストコンテンツ（タイトル）のリストを返してログに出力。
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter`はフィルター関数を引数として受け取ります。このヘルパーはフィルター関数が真値を返した元のイテレーターの値のイテレーターを返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// テキストコンテンツ（タイトル）に`V8`を含むブログ投稿をフィルタリングしてログに出力。
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take`は整数を引数として受け取ります。このヘルパーは元のイテレーターから`limit`個までの値のイテレーターを返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// 最近のブログ投稿10件を選択してログに出力。
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop`は整数を引数として受け取ります。このヘルパーは元のイテレーターから`limit`個の値の後に続く値のイテレーターを返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// 最近のブログ投稿10件を元に削除し残りをログに出力。
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap`はマッパー関数を引数として受け取ります。このヘルパーは、元のイテレーターの値にマッパー関数を適用して生成されたイテレーター値を返します。つまり、マッパー関数で返されるイテレーターは、このヘルパーで返されるイテレーターにフラット化されます。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// ブログ投稿のタグリストを取得してログに出力。各投稿には複数のタグが含まれる可能性があります。
// タグ。
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce`はリデューサー関数と省略可能な初期値を引数として受け取ります。このヘルパーは、イテレーターのすべての値にリデューサー関数を適用し、リデューサーの最後の結果を追跡しながら1つの値を返します。初期値は、イテレーターの最初の値を処理する際の出発点として使用されます。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// すべての投稿のタグリストを取得。
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// リスト内の各タグのテキストコンテキストを取得。
const tags = tagLists.map((x) => x.textContent);

// セキュリティタグが含まれる投稿をカウント。
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray`はイテレーターの値から配列を返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// 最近のブログ投稿10件のリストから配列を作成。
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach`は関数を引数として受け取り、イテレーターの各要素に適用されます。このヘルパーは副作用を引き起こす為に呼び出され、`undefined`を返します。

```javascript
// ブログアーカイブページからブログ投稿一覧を選択。
const posts = document.querySelectorAll('li:not(header li)');

// 少なくとも1つのブログ投稿が公開された日付を取得してログに記録します。
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some`は述語関数を引数として受け取ります。このヘルパーは、関数を適用した際にイテレーターの任意の要素が真を返す場合に`true`を返します。`some`が呼び出された後、イテレーターは消費されます。

```javascript
// ブログアーカイブページからブログ投稿のリストを選択します。
const posts = document.querySelectorAll('li:not(header li)');

// ブログ投稿のテキスト内容（タイトル）に`Iterators`というキーワードが含まれているかどうか確認します。
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every`は述語関数を引数として受け取ります。このヘルパーは、関数を適用した際にイテレーターのすべての要素が真を返す場合に`true`を返します。`every`が呼び出された後、イテレーターは消費されます。

```javascript
// ブログアーカイブページからブログ投稿のリストを選択します。
const posts = document.querySelectorAll('li:not(header li)');

// すべてのブログ投稿のテキスト内容（タイトル）に`V8`というキーワードが含まれているかどうか確認します。
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find`は述語関数を引数として受け取ります。このヘルパーは、関数が真を返すイテレーターの最初の値を返します。イテレーター内に該当する値がない場合は`undefined`を返します。

```javascript
// ブログアーカイブページからブログ投稿のリストを選択します。
const posts = document.querySelectorAll('li:not(header li)');

// 最新のブログ投稿のテキスト内容（タイトル）に`V8`というキーワードが含まれているかどうかログに記録します。
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from`は静的メソッドで、オブジェクトを引数として受け取ります。`object`が既にIteratorインスタンスである場合、このヘルパーは直接それを返します。`object`が`Symbol.iterator`を持っている場合（つまり、イテラブルである場合）、その`Symbol.iterator`メソッドが呼び出され、イテレーターを取得してヘルパーはそれを返します。それ以外の場合、新しい`Iterator`オブジェクト（`Iterator.prototype`から継承し、`next()`と`return()`メソッドを持つ）が作成され、それをラップして返します。

```javascript
// ブログアーカイブページからブログ投稿のリストを選択します。
const posts = document.querySelectorAll('li:not(header li)');

// まず投稿からイテレーターを作成します。その後、`V8`というキーワードを含む最新のブログ投稿のテキスト内容（タイトル）をログに記録します。
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## 利用可能性

IteratorヘルパーはV8 v12.2で提供されています。

## Iteratorヘルパーのサポート

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
