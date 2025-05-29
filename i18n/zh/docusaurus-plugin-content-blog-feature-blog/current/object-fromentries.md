---
title: "Object.fromEntries"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), JavaScript 爱好者"
avatars: 
  - "mathias-bynens"
date: 2019-06-18
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries 是内置 JavaScript 库的一个有用补充，和 Object.entries 相得益彰。"
tweet: "1140993821897121796"
---
`Object.fromEntries` 是内置 JavaScript 库的一个很有用的补充。在解释它的作用之前，先了解一下已有的 `Object.entries` API 会有所帮助。

## `Object.entries`

`Object.entries` API 已经存在了一段时间。

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

对于对象中的每个键值对，`Object.entries` 会返回一个数组，第一个元素是键，第二个元素是值。

`Object.entries` 在与 `for`-`of` 结合使用时尤为有用，因为它可以非常优雅地迭代对象中的所有键值对：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`The value of ${key} is ${value}.`);
}
// 输出：
// The value of x is 42.
// The value of y is 50.
```

遗憾的是，想从 entries 的结果回到等价对象并不容易……直到现在！

## `Object.fromEntries`

新的 `Object.fromEntries` API 执行了 `Object.entries` 的逆操作。这使得根据条目重新构建对象变得更加简单：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

一个常见的用例是转换对象。现在可以通过迭代其条目，然后使用你已经熟悉的数组方法来做到这一点：

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

在这个示例中，我们用 `filter` 筛选出键长度为 `1` 的键值对，也就是 `x` 和 `y`，而排除了 `abc`。然后用 `map` 对剩余的条目进行操作，并为每个条目返回一个更新后的键值对。在本例中，我们通过将值乘以 `2` 来使每个值翻倍。最终得到的是一个只包含属性 `x` 和 `y` 的新对象，以及它们的新值。

<!--truncate-->
## 对象与 Map

JavaScript 还支持 `Map`，它通常比普通对象更适合作为数据结构。因此，在完全由自己控制的代码中，开发者可能会使用 Map 而不是对象。然而，作为开发者，你并不总是能选择使用哪种表示形式。有时，你操作的数据来自外部 API 或某些库函数，这些数据以对象而非 Map 的形式出现。

`Object.entries` 让对象转换为 Map 变得简单：

```js
const object = { language: 'JavaScript', coolness: 9001 };

// 将对象转换为 Map：
const map = new Map(Object.entries(object));
```

相反的操作同样有用：即使代码正在使用 Map，也可能需要序列化数据，例如将其转换为 JSON 以发送 API 请求。或者你可能需要将数据传递给另一个期望传入对象而不是 Map 的库。在这些情况下，你需要根据 Map 数据创建一个对象。`Object.fromEntries` 让这件事变得简单：

```js
// 将 Map 转换回对象：
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

通过语言中的 `Object.entries` 和 `Object.fromEntries`，你现在可以轻松地在 Map 和对象之间进行转换。

### 警告：注意数据丢失

在上述示例中，当将 Map 转换为普通对象时，隐含假设每个键的字符串化结果唯一。如果这一假设不成立，则会发生数据丢失：

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// 注意：值 'a' 已丢失，因为两个键的字符串化结果
// 都是 '[object Object]'。
```

在使用 `Object.fromEntries` 或其他技术将 Map 转换为对象之前，请确保 Map 的键生成的 `toString` 结果是唯一的。

## `Object.fromEntries` 的支持情况

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
