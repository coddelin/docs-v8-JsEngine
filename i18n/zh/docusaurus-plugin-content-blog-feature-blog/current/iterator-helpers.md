---
title: '迭代器助手'
author: 'Rezvan Mahdavi Hezaveh'
avatars:
  - 'rezvan-mahdavi-hezaveh'
date: 2024-03-27
tags:
  - ECMAScript
description: '用于简化迭代器一般使用和消费的接口。'
tweet: ''
---

*迭代器助手* 是迭代器原型上的一组新方法，帮助简化迭代器的使用。由于这些辅助方法在迭代器原型上，任何在其原型链上包含 `Iterator.prototype` 的对象（例如数组迭代器）都可以使用这些方法。在以下小节中，我们将解释这些迭代器助手功能。所有提供的示例均在博客归档页面中运行，包含博客文章列表，展示如何通过迭代器助手查找和操作文章。您可以在 [V8 博客页面](https://v8.dev/blog) 上试用它们！

<!--truncate-->

## .map(mapperFn)

`map` 接受一个映射函数作为参数。这个助手将原始迭代器的值应用映射函数后返回一个新的值迭代器。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 获取所有文章标题并记录它们。
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` 接受一个过滤函数作为参数。这个助手将原始迭代器中通过过滤函数返回真值的项返回一个新的值迭代器。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 过滤包含`V8`的博客文章并记录它们。
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` 接受一个整数作为参数。这个助手返回一个新的值迭代器，包括原始迭代器中前 `limit` 个值。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 选择最近的 10 篇博客文章并记录它们。
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` 接受一个整数作为参数。这个助手返回一个新的值迭代器，从原始迭代器中跳过前 `limit` 个值后开始。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 跳过最近的 10 篇博客文章并记录其余的。
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` 接受一个映射函数作为参数。这个助手对原始迭代器的值应用映射函数，映射函数返回的迭代器会被展平并返回一个新的值迭代器。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 获取博客文章的标签列表并记录这些标签。每篇文章可能有多个标签。
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` 接受一个归约函数和一个可选的初始值。这个助手通过使用迭代器的每个值应用归约函数，并跟踪应用结果，最终返回一个值。初始值会作为起点提供给第一个值的处理。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 获取所有文章的标签列表。
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// 获取标签的文本内容。
const tags = tagLists.map((x) => x.textContent);

// 统计带有 security 标签的文章数量。
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` 从迭代器的值中返回一个数组。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 从最近的 10 篇博客文章创建一个数组。
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` 接受一个函数作为参数，并对迭代器的每个元素调用该函数。这个助手因副作用被调用，返回值为 `undefined`。

```javascript
// 从博客归档页面选择博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 获取至少发布了一篇博客的日期并记录它们。
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` 接受一个谓词函数作为参数。如果对迭代器中的任一元素应用该函数返回 `true`，此辅助函数将返回 `true`。调用 `some` 后，迭代器会被消耗。

```javascript
// 从博客存档页面中选择博客帖子列表。
const posts = document.querySelectorAll('li:not(header li)');

// 检查是否有任何博客帖子的文本内容（标题）包含“Iterators”关键词。
// 关键字。
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` 接受一个谓词函数作为参数。如果对迭代器中的每个元素应用该函数都返回 `true`，此辅助函数将返回 `true`。调用 `every` 后，迭代器会被消耗。

```javascript
// 从博客存档页面中选择博客帖子列表。
const posts = document.querySelectorAll('li:not(header li)');

// 检查所有博客帖子的文本内容（标题）是否都包含“V8”关键词。
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` 接受一个谓词函数作为参数。此辅助函数返回迭代器中第一个使函数返回真值的元素的值，如果没有这样的元素则返回 `undefined`。

```javascript
// 从博客存档页面中选择博客帖子列表。
const posts = document.querySelectorAll('li:not(header li)');

// 记录最近包含“V8”关键词的博客帖子的文本内容（标题）。
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` 是一个静态方法，接受一个对象作为参数。如果 `object` 已经是一个迭代器的实例，它会直接返回它。如果 `object` 有 `Symbol.iterator`，这意味着它是可迭代的，该对象的 `Symbol.iterator` 方法会被调用以获取迭代器，并返回迭代器。否则，会创建一个新的 `Iterator` 对象（它继承自 `Iterator.prototype` 并包含 `next()` 和 `return()` 方法），并返回该对象。

```javascript
// 从博客存档页面中选择博客帖子列表。
const posts = document.querySelectorAll('li:not(header li)');

// 首先从帖子中创建一个迭代器。然后，记录最近包含“V8”关键词的
// 博客帖子的文本内容（标题）。
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## 可用性

迭代器辅助方法在 V8 v12.2 中发布。

## 迭代器辅助方法支持

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
