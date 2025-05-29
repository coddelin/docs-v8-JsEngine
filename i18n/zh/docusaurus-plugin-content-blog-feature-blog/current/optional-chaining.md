---
title: "可选的链式操作"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 可选链的破除者"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "可选的链式操作通过内置的空值检查实现了更易读且简洁的属性访问表达式。"
tweet: "1166360971914481669"
---
在 JavaScript 中长链式的属性访问可能容易出错，因为它们中的任何一个都可能会计算为 `null` 或 `undefined`（也称为“空值”）。在每一步检查属性的存在性容易演变为深度嵌套的 `if` 语句结构，或者带有长链属性访问的 `if` 条件语句。

<!--truncate-->
```js
// 错误易发生的版本，可能抛出异常。
const nameLength = db.user.name.length;

// 较少发生错误，但阅读困难。
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

上面代码也可以使用三元运算符表达，但这并不能帮助提升可读性：

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## 引入可选链式操作符

显然你不希望写这样的代码，因此有一个替代方案是理想的。一些其他语言提供了一种优雅的解决方案，通过使用称为“可选链式操作”的功能。根据[最近的规范提案](https://github.com/tc39/proposal-optional-chaining)，“一个可选链是一系列一个或多个属性访问和函数调用，其中第一个以 `?.` 作为开头的标记。”

使用新的可选链式操作符，我们可以将上面的示例重写如下：

```js
// 仍然检查错误，但更易阅读。
const nameLength = db?.user?.name?.length;
```

当 `db`、`user` 或 `name` 为 `undefined` 或 `null` 时会发生什么？使用可选链式操作符，JavaScript 将初始化 `nameLength` 为 `undefined` 而不是抛出错误。

请注意，这种行为比我们的 `if (db && db.user && db.user.name)` 检查更加健壮。例如，如果 `name` 总是保证为字符串，我们可以将 `name?.length` 更改为 `name.length`。然后，如果 `name` 是一个空字符串，我们仍然可以获得正确的长度 `0`。这是因为空字符串是一个假值：在 `if` 子句中它的行为类似于 `false`。可选链式操作符修复了这种常见的错误来源。

## 更多语法形式：调用和动态属性

还存在一个用于调用可选方法的操作符版本：

```js
// 扩展接口，添加一个可选方法，只有管理员用户具有。
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

语法可能会让人感到意外，因为 `?.()` 是实际的操作符，它适用于 _之前的_ 表达式。

操作符还有第三种用法，即可选的动态属性访问，通过 `?.[]` 实现。它要么返回括号中参数引用的值，要么返回 `undefined` 如果没有对象来获取该值。以下是一个示例，遵循之前的例子：

```js
// 通过动态生成的属性名扩展静态属性访问的能力。
const optionName = '可选设置';
const optionLength = db?.user?.preferences?.[optionName].length;
```

最后一种形式也可以用于可选地索引数组，例如：

```js
// 如果 `usersArray` 是 `null` 或 `undefined`，
// 那么 `userName` 将优雅地计算为 `undefined`。
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

可选链式操作符可以与[空值合并操作符 `??`](/features/nullish-coalescing) 结合使用，当需要一个非 `undefined` 的默认值时。这种组合实现了带指定默认值的安全深层属性访问，解决了以前需要用户端库如[lodash 的 `_.get`](https://lodash.dev/docs/4.17.15#get) 的常见用例：

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // 使用 lodash:
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(无中间名)');
  // → '(无中间名)'
}

{ // 使用可选链式操作和空值合并:
  const firstName = object?.names?.first ?? '(无名字)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(无中间名)';
  // → '(无中间名)'
}
```

## 可选链式操作符的特性

可选链式操作符具有几个有趣的特性：短路、叠加和可选删除。让我们通过示例逐一了解这些特性。

短路操作意味着如果可选链式操作符提早返回，其余表达式不再被评估：

```js
// 仅当 `db` 和 `user` 被定义时，`age` 才会递增。
db?.user?.grow(++age);
```

_堆叠_ 意味着在一系列属性访问中可以应用多个可选链操作符：

```js
// 一个可选链后可以接另一个可选链。
const firstNameLength = db.users?.[42]?.names.first.length;
```

不过，请谨慎在单一链中使用多个可选链操作符。如果一个值被保证不会是 null 或 undefined，那么不建议在其上使用 `?.` 来访问属性。在上面的例子中，`db` 被认为总是被定义的，但 `db.users` 和 `db.users[42]` 可能未定义。如果数据库中确实有这样的用户，那么假设 `names.first.length` 总是被定义。

_可选删除_ 意味着 `delete` 操作符可以与一个可选链组合使用：

```js
// 仅当 `db` 被定义时，`db.user` 才会被删除。
delete db?.user;
```

更多细节可以在[提案的 _语义_ 部分](https://github.com/tc39/proposal-optional-chaining#semantics)找到。

## 可选链的支持

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
