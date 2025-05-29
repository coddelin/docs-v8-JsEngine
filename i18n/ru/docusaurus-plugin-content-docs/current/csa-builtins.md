---
title: &apos;Встроенные функции CodeStubAssembler&apos;
description: &apos;Этот документ предназначен для введения в написание встроенных функций CodeStubAssembler и ориентирован на разработчиков V8.&apos;
---
Этот документ предназначен для введения в написание встроенных функций CodeStubAssembler и ориентирован на разработчиков V8.

:::note
**Примечание:** [Torque](/docs/torque) заменяет CodeStubAssembler как рекомендуемый способ реализации новых встроенных функций. См. [Встроенные функции Torque](/docs/torque-builtins) для версии этого руководства на Torque.
:::

## Встроенные функции

Во V8 встроенные функции можно рассматривать как блоки кода, которые могут выполняться виртуальной машиной во время выполнения. Частым случаем использования является реализация функций встроенных объектов (таких как RegExp или Promise), но встроенные функции также могут использоваться для обеспечения другой внутренней функциональности (например, как часть системы IC).

Встроенные функции V8 могут быть реализованы с использованием различных методов (каждый из которых имеет свои компромиссы):

- **Платформозависимый ассемблерный язык**: может быть очень эффективным, но требует ручной портировки на все платформы и сложен в обслуживании.
- **C++**: очень схож с функциями времени выполнения и имеет доступ к мощной функциональности времени выполнения V8, но обычно не подходит для областей, чувствительных к производительности.
- **JavaScript**: лаконичный и читаемый код, доступ к быстрым внутренним функциям, но частое использование медленных вызовов времени выполнения, непредсказуемая производительность из-за загрязнения типов и тонкие проблемы, связанные с (сложной и неочевидной) семантикой JS.
- **CodeStubAssembler**: предоставляет эффективную низкоуровневую функциональность, близкую к ассемблерному языку, при этом оставаясь платформонезависимым и сохраняя читаемость.

Оставшаяся часть документа сосредоточена на последнем методе и предлагает краткое руководство по разработке простой встроенной функции CodeStubAssembler (CSA), доступной в JavaScript.

## CodeStubAssembler

CodeStubAssembler V8 — это кастомный, независимый от платформы ассемблер, который предоставляет низкоуровневые примитивы как тонкую абстракцию над ассемблером, но также предлагает обширную библиотеку функциональности высокого уровня.

```cpp
// Низкоуровневый:
// Загружает данные размера указателя из addr в value.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// И высокоуровневый:
// Выполняет JS-операцию ToString(object).
// Семантика ToString указана в https://tc39.es/ecma262/#sec-tostring.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

Встроенные функции CSA проходят часть компиляционного конвейера TurboFan (включая планирование блоков и назначение регистров, но без оптимизации), после чего генерируется исполняемый код.

## Написание встроенной функции CodeStubAssembler

В этом разделе мы напишем простую встроенную функцию CSA, которая принимает один аргумент и проверяет, представляет ли он число `42`. Функция становится доступной в JavaScript путем установки на объекте `Math` (потому что мы можем).

Этот пример демонстрирует:

- Создание встроенной функции CSA с связью JavaScript, которую можно вызывать как функцию JS.
- Использование CSA для реализации простой логики: обработка Smi и heap-number, условные выражения и вызовы встроенных функций TFS.
- Использование переменных CSA.
- Установка встроенной функции CSA на объект `Math`.

Если вы хотите следовать локально, следующий код основан на редакции [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0).

## Объявление `MathIs42`

Встроенные функции объявляются в макросе `BUILTIN_LIST_BASE` в файле [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1). Чтобы создать новую встроенную функцию CSA с связью JS и одним параметром с именем `X`:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Обратите внимание, что `BUILTIN_LIST_BASE` принимает несколько разных макросов, которые обозначают разные виды встроенных функций (см. документацию inline для подробностей). В частности, встроенные функции CSA делятся на:

- **TFJ**: Связь JavaScript.
- **TFS**: Связь Stub.
- **TFC**: Встроенная функция Stub, требующая настраиваемого описания интерфейса (например, если аргументы не промаркированы или должны быть переданы в определенные регистры).
- **TFH**: Специализированная встроенная функция связи Stub, используемая для обработчиков IC.

## Определение `MathIs42`

Определения встроенных функций находятся в файлах `src/builtins/builtins-*-gen.cc`, которые организованы по темам. Поскольку мы будем писать встроенную функцию для `Math`, мы поместим наше определение в файл [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1).

```cpp
// TF_BUILTIN — это удобный макрос, который создает новый подкласс указанного
// ассемблера за кулисами.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // Загрузите текущий контекст функции (неявный аргумент для каждого шаблона)
  // и аргумент X. Обратите внимание, что мы можем ссылаться на параметры по именам,
  // определенным в декларации встроенной функции.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // На данном этапе x может быть чем угодно - Smi, HeapNumber,
  // undefined или любым другим произвольным объектом JS. Вызовем встроенную функцию ToNumber
  // для преобразования x в число, которое мы можем использовать.
  // CallBuiltin можно использовать для удобного вызова любой встроенной функции CSA.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // Создайте переменную CSA для хранения результата. Тип переменной
  // - kTagged, так как в ней будут храниться только метки указателей.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // Нам нужно определить несколько меток, которые будут использоваться как цели перехода.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber всегда возвращает число. Нам нужно различать Smis
  // и HeapNumbers - здесь мы проверяем, является ли number Smi, и условно
  // переходим к соответствующим меткам.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // Привязка метки начинает генерацию кода для нее.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant возвращает значения JS true/false в зависимости от
    // того, является ли переданное условие true/false. Результат привязывается к нашей
    // переменной var_result, после чего мы безусловно переходим к метке out.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber может возвращать только Smi или HeapNumber. Чтобы убедиться в этом,
    // добавим утверждение, которое проверяет, что number действительно является HeapNumber.
    CSA_ASSERT(this, IsHeapNumber(number));
    // HeapNumbers содержат значение с плавающей точкой. Нам нужно явно извлечь
    // это значение, выполнить сравнение с плавающей точкой и снова привязать
    // var_result на основе исхода.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## Подключение `Math.Is42`

Встроенные объекты, такие как `Math`, в основном настраиваются в [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (с некоторой настройкой в `.js` файлах). Подключить нашу новую встроенную функцию просто:

```cpp
// Существующий код для настройки Math, включён здесь для ясности.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

Теперь, когда `Is42` подключена, её можно вызвать из JS:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42(&apos;42.0&apos;);
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Определение и вызов встроенной функции с привязкой шаблона

Встроенные функции CSA также можно создать с привязкой шаблона (вместо привязки JS, как мы использовали ранее в `MathIs42`). Такие функции полезны для выноса часто используемого кода в отдельный объект кода, который может быть использован несколькими вызователями, при этом код создается только один раз. Давайте вынесем код, который обрабатывает HeapNumbers в отдельную встроенную функцию `MathIsHeapNumber42` и вызовем её из `MathIs42`.

Определение и использование шаблонов TFS просто; декларации снова размещаются в [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1):

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Обратите внимание, что в настоящее время порядок в `BUILTIN_LIST_BASE` имеет значение. Поскольку `MathIs42` вызывает `MathIsHeapNumber42`, первая должна быть перечислена после второй (это требование должно быть устранено в будущем).

Определение также прямолинейно. В [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1):

```cpp
// Определение встроенной функции TFS работает точно так же, как встроенные функции TFJ.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

Наконец, давайте вызовем нашу новую встроенную функцию из `MathIs42`:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // Вместо обработки heap numbers напрямую, мы теперь вызываем наш новый TFS stub.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

Почему важно обращать внимание на встроенные функции TFS? Почему бы не оставить код встроенным (или извлечь его в вспомогательный метод для лучшей читаемости)?

Важной причиной является пространство для кода: встроенные функции генерируются во время компиляции и включаются в снапшот V8, тем самым неизбежно занимая (значительное) пространство в каждом созданном изоляте. Извлечение больших частей часто используемого кода в построенные на TFS функции может быстро привести к экономии пространства в диапазоне от 10 до 100 КБ.

## Тестирование встроенных функций со связкой stub

Несмотря на то, что наша новая встроенная функция использует нестандартную (по крайней мере не C++) конвенцию вызова, все же возможно написать тестовые случаи для нее. Следующий код можно добавить в [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) для тестирования встроенной функции на всех платформах:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
