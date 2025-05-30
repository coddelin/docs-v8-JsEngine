---
title: "Проверка наличия приватных свойств, например, `#foo in obj`"
author: "Марья Хёльтта ([@marjakh](https://twitter.com/marjakh))"
avatars: 
  - "marja-holtta"
date: 2021-04-14
tags: 
  - ECMAScript
description: "Проверка приватных свойств позволяет тестировать наличие приватного поля в объекте."
tweet: "1382327454975590401"
---

Оператор [`in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) можно использовать для проверки, существует ли указанное свойство в объекте (или в любом объекте его цепочки прототипов):

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

Функциональность проверки наличия приватных свойств расширяет оператор `in`, чтобы поддерживать [приватные поля классов](https://v8.dev/features/class-fields#private-class-fields):

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; это не тот же #foo
```

Так как приватные имена доступны только внутри класса, который их определяет, тестирование должно также выполняться внутри класса, например, в методе, как `static test` выше.

Экземпляры подклассов наследуют приватные поля от родительского класса в качестве собственных свойств:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

Но объекты, созданные с помощью `Object.create` (или объекты, которым позднее установлены прототипы с помощью сеттера `__proto__` или `Object.setPrototypeOf`), не получают приватные поля в качестве собственных свойств. Поскольку поиск приватных полей работает только на собственных свойствах, оператор `in` не находит эти унаследованные поля:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, приватное поле унаследовано, но не является собственным
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, приватное поле унаследовано, но не является собственным
A.test(o2.__proto__); // true
```

Доступ к несуществующему приватному полю вызывает ошибку - в отличие от обычных свойств, где доступ к несуществующему свойству возвращает `undefined` и не вызывает ошибку. До появления проверки наличия приватных полей разработчики были вынуждены использовать `try`-`catch` для реализации резервного поведения в случаях, когда объект не имел нужного приватного поля:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // Резервный вариант для случая, когда obj не имеет #foo
    }
  }
  #foo = 0;
}
```

Теперь наличие приватного поля можно проверить с помощью проверки приватного свойства:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // Резервный вариант для случая, когда obj не имеет #foo
    }
  }
  #foo = 0;
}
```

Однако будьте осторожны - наличие одного приватного поля не гарантирует, что объект имеет все приватные поля, объявленные в классе! Следующий пример демонстрирует частично построенный объект, который имеет только одно из двух приватных полей, объявленных в его классе:

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw 'error';
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## Поддержка проверки приватных свойств

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="нет"
                 safari="нет"
                 nodejs="нет"
                 babel="нет"></feature-support>
