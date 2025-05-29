---
title: &apos;반복자 도우미&apos;
author: &apos;Rezvan Mahdavi Hezaveh&apos;
avatars:
  - &apos;rezvan-mahdavi-hezaveh&apos;
date: 2024-03-27
tags:
  - ECMAScript
description: &apos;반복자를 일반적으로 사용하고 소비하는 데 도움을 주는 인터페이스.&apos;
tweet: &apos;&apos;
---

*반복자 도우미*는 반복자를 일반적으로 사용하는 데 도움을 주는 Iterator 프로토타입에 대한 새로운 메서드 모음입니다. 이 도우미 메서드들은 반복자 프로토타입에 있기 때문에, 프로토타입 체인에 `Iterator.prototype`을 가진 모든 객체(예: 배열 반복자)는 이 메서드들을 사용할 수 있습니다. 다음 단락에서는 반복자 도우미를 설명합니다. 제공된 모든 예시는 블로그 포스팅 목록이 포함된 블로그 아카이브 페이지에서 작동하며, 반복자 도우미가 포스트를 찾고 조작하는 데 어떻게 유용한지 보여줍니다. [V8 블로그 페이지](https://v8.dev/blog)에서 시도해 볼 수 있습니다!

<!--truncate-->

## .map(mapperFn)

`map`은 매퍼 함수를 인수로 받습니다. 이 도우미는 원래 반복자 값에 매퍼 함수를 적용하여 얻은 값의 반복자를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 게시물 목록을 가져와 텍스트 콘텐츠(제목) 목록을 반환하고 로그에 출력합니다.
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter`는 필터 함수를 인수로 받습니다. 이 도우미는 필터 함수가 참 값을 반환한 원래 반복자 값의 반복자를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 텍스트 콘텐츠(제목)에 `V8`이 포함된 블로그 게시물을 필터링하고 이를 로그에 출력합니다.
for (const post of posts.values().filter((x) => x.textContent.includes(&apos;V8&apos;))) {
  console.log(post);
} 
```

## .take(limit)

`take`은 정수를 인수로 받습니다. 이 도우미는 원래 반복자로부터 최대 `limit` 수만큼의 값을 가진 반복자를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 최근 10개의 블로그 게시물을 선택하고 이를 로그에 출력합니다.
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop`은 정수를 인수로 받습니다. 이 도우미는 `limit` 값 이후의 값부터 시작하는 원래 반복자의 값을 가진 반복자를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 최근 10개의 블로그 게시물을 건너뛰고 나머지 게시물을 로그에 출력합니다.
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap`은 매퍼 함수를 인수로 받습니다. 이 도우미는 원래 반복자 값에 매퍼 함수를 적용하여 생성된 반복자의 값을 반환합니다. 매퍼 함수에서 반환된 반복자는 이 도우미에 의해 반환되는 반복자에 평탄화됩니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 블로그 게시물의 태그 목록을 가져오고 이를 로그에 출력합니다. 각 게시물은
// 하나 이상의 태그를 가질 수 있습니다.
for (const tag of posts.values().flatMap((x) => x.querySelectorAll(&apos;.tag&apos;).values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce`는 리듀서 함수와 선택적 초기값을 인수로 받습니다. 이 도우미는 리듀서 함수를 반복자의 모든 값에 적용하면서 마지막 결과를 추적하여 하나의 값을 반환합니다. 초기값은 리듀서 함수가 반복자의 첫 번째 값을 처리할 때 시작점으로 사용됩니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 모든 게시물의 태그 목록을 가져옵니다.
const tagLists = posts.values().flatMap((x) => x.querySelectorAll(&apos;.tag&apos;).values());

// 목록에 있는 각 태그의 텍스트 콘텐츠를 가져옵니다.
const tags = tagLists.map((x) => x.textContent);

// security 태그를 가진 게시물의 개수를 셉니다.
const count = tags.reduce((sum , value) => sum + (value === &apos;security&apos; ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray`는 반복자 값에서 배열을 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 최근 10개의 블로그 게시물 목록에서 배열을 생성합니다.
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach`는 함수를 인수로 받아 반복자의 각 요소에 적용됩니다. 이 도우미는 부수 효과를 위해 호출되며 `undefined`를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 블로그 게시물이 적어도 하나의 게시 날짜를 가져오고 이를 로그에 기록합니다.
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector(&apos;time&apos;)));
console.log(dates);
```

## .some(fn)

`some`은 조건 함수(predicate)를 인자로 받습니다. 이 헬퍼는 함수가 적용된 경우 반복자(iterator)의 요소 중 하나라도 true를 반환하면 `true`를 반환합니다. `some`이 호출된 후 반복자는 소비됩니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 블로그 게시물의 텍스트 내용(제목) 중 하나에 `Iterators` 키워드가 포함되어 있는지 확인합니다.
posts.values().some((x) => x.textContent.includes(&apos;Iterators&apos;));
```

## .every(fn)

`every`는 조건 함수(predicate)를 인자로 받습니다. 이 헬퍼는 함수가 적용된 경우 반복자(iterator)의 각 요소가 모두 true를 반환하면 `true`를 반환합니다. `every`가 호출된 후 반복자는 소비됩니다.


```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 모든 블로그 게시물의 텍스트 내용(제목)에 `V8` 키워드가 포함되어 있는지 확인합니다.
posts.values().every((x) => x.textContent.includes(&apos;V8&apos;));
```

## .find(fn)

`find`는 조건 함수(predicate)를 인자로 받습니다. 이 헬퍼는 함수가 진리값(truthy)을 반환하는 첫 번째 반복자(iterator)의 값을 반환하거나, 반복자에 그런 값이 없으면 `undefined`를 반환합니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// `V8` 키워드가 포함된 가장 최근 블로그 게시물의 텍스트 내용(제목)을 로그에 기록합니다.
console.log(posts.values().find((x) => x.textContent.includes(&apos;V8&apos;)).textContent);
```

## Iterator.from(object)

`from`은 정적 메서드이며 객체(object)를 인자로 받습니다. `object`가 이미 Iterator 인스턴스인 경우 헬퍼는 이를 바로 반환합니다. `object`가 `Symbol.iterator`를 가지고 있어 반복 가능한(iterable) 객체라면, 해당 객체의 `Symbol.iterator` 메서드가 호출되어 반복자를 가져오고 이를 반환합니다. 그렇지 않다면 `Iterator.prototype`을 상속하고 `next()`와 `return()` 메서드를 가진 새로운 `Iterator` 객체가 생성되어 반환됩니다.

```javascript
// 블로그 아카이브 페이지에서 블로그 게시물 목록을 선택합니다.
const posts = document.querySelectorAll(&apos;li:not(header li)&apos;);

// 먼저 posts로부터 반복자를 생성한 다음, `V8` 키워드가 포함된 가장 최근 블로그 게시물의 텍스트 내용(제목)을 로그에 기록합니다.
console.log(Iterator.from(posts).find((x) => x.textContent.includes(&apos;V8&apos;)).textContent);
```

## 사용 가능성

Iterator 헬퍼는 V8 v12.2에서 제공됩니다.

## Iterator 헬퍼 지원

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
