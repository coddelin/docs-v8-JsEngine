---
title: "V8에서 `DataView` 성능 개선"
author: 'Théotime Grohens, <i lang="fr">Data-Vue의 과학자</i>, 그리고 Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), 전문 성능 전문가'
avatars:
  - "benedikt-meurer"
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - benchmarks
description: "V8 v6.9는 DataView와 동등한 TypedArray 코드 간의 성능 차이를 메우며, 성능이 중요한 실제 응용 프로그램에서도 DataView를 사용할 수 있게 합니다."
tweet: "1041981091727466496"
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)는 JavaScript에서 저수준 메모리 접근을 수행할 수 있는 두 가지 방법 중 하나입니다. 다른 하나는 [`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)입니다. 지금까지 V8에서 `DataView`s는 `TypedArray`s보다 덜 최적화되어 그래픽 집약적인 작업이나 이진 데이터 디코딩/인코딩 시 성능이 저하되었습니다. 이러한 이유는 주로 역사적인 선택에 기인한 것으로, 예를 들어 [asm.js](http://asmjs.org/)는 `TypedArrays`를 선택하고 `DataView`s를 제외했기 때문에 엔진들이 `TypedArray`s 성능에 집중하도록 장려됐습니다.

<!--truncate-->
성능 패널티로 인해 Google Maps 팀과 같은 JavaScript 개발자들은 `DataView`s를 피하고 대신 `TypedArray`s를 사용했습니다. 이는 코드 복잡성을 증가시키는 대가를 치른 것입니다. 이번 글에서는 우리가 [V8 v6.9](/blog/v8-release-69)에서 `DataView` 성능을 맞춤—심지어 동등한 `TypedArray` 코드를 능가하게까지 만든 방법을 설명하며, 결과적으로 `DataView`가 성능이 중요한 실제 응용 프로그램에서도 사용 가능하게 만드는 방법을 설명합니다.

## 배경

ES2015 도입 이후 JavaScript는 [`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)라는 원시 이진 버퍼에서 데이터를 읽고 쓰는 것을 지원해 왔습니다. `ArrayBuffer`s 자체로는 직접 액세스할 수 없으며, 프로그램은 `DataView` 또는 `TypedArray`일 수 있는 *배열 버퍼 뷰* 객체를 사용해야 합니다.

`TypedArray`s는 프로그램이 `Int16Array` 또는 `Float32Array`와 같은 일관된 타입의 값 배열로 버퍼에 액세스할 수 있도록 합니다.

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

다른 한편으로, `DataView`s는 보다 세밀한 데이터 접근을 제공합니다. 프로그래머가 각 숫자 타입에 대한 특수한 getter 및 setter를 제공하여 버퍼에서 읽고 쓰는 값의 타입을 선택할 수 있게 하고, 이를 데이터 구조 직렬화에 유용하게 만듭니다.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // 예상 출력: 42
console.log(view.getFloat64(1)); // 예상 출력: 1.76
```

게다가 `DataView`s는 데이터 저장의 엔디안(Endianness) 선택도 허용하여 네트워크, 파일 또는 GPU와 같은 외부 소스에서 데이터를 받을 때 유용할 수 있습니다.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // 리틀 엔디안 쓰기.
console.log(view.getInt32(0, false)); // 빅 엔디안 읽기.
// 예상 출력: 0x0DF0AD8B (233876875)
```

효율적인 `DataView` 구현은 오랫동안 요청된 기능이었습니다(5년 넘은 [버그 보고서](https://bugs.chromium.org/p/chromium/issues/detail?id=225811) 참조). 이제 `DataView` 성능이 동등하게 이루어졌음을 기쁜 마음으로 발표합니다!

## 레거시 런타임 구현

최근까지 `DataView` 메서드는 V8의 내장 C++ 런타임 함수로 구현되었습니다. 이는 매우 비싼 방식으로, 각 호출은 JavaScript에서 C++로(그리고 다시) 전환하는 데 비용이 많이 들기 때문입니다.

이 구현으로 인해 발생한 실제 성능 비용을 조사하기 위해, 우리는 기본 `DataView` getter 구현과 `DataView` 동작을 모방한 JavaScript 래퍼를 비교하는 성능 벤치마크를 설정했습니다. 이 래퍼는 기본 버퍼에서 바이트 단위로 데이터를 읽는 데 `Uint8Array`를 사용하고, 그런 다음 이러한 바이트에서 반환값을 계산합니다. 여기 예를 들어 리틀 엔디안 32비트 부호 없는 정수 값을 읽는 함수입니다:

```js
function LittleEndian(buffer) { // 리틀 엔디안 DataView 읽기 시뮬레이션.
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`는 이미 V8에서 매우 최적화되어 있으므로, 우리가 목표로 삼은 성능 기준을 나타냅니다.

![초기 `DataView` 성능](/_img/dataview/dataview-original.svg)

우리의 벤치마크는 네이티브 `DataView` getter 성능이 빅엔디언 및 리틀엔디언 읽기 모두에서 **4배** 느렸다는 것을 보여줍니다.

## 기본 성능 향상하기

`DataView` 객체의 성능을 개선하기 위한 첫 번째 단계는 구현을 C++ 런타임에서 [`CodeStubAssembler` (CSA)](/blog/csa)로 이동하는 것이었습니다. CSA는 TurboFan의 기계 수준 중간 표현(IR)에서 직접 코드를 작성할 수 있도록 하는 휴대용 어셈블리 언어입니다. 우리는 이를 사용하여 V8의 JavaScript 표준 라이브러리의 최적화된 부분을 구현합니다. CSA에서 코드를 다시 작성하면 C++ 호출을 완전히 우회할 수 있으며 TurboFan의 백엔드를 활용하여 효율적인 기계 코드를 생성합니다.

그러나 CSA 코드를 직접 작성하는 것은 번거롭습니다. CSA에서 제어 흐름은 어셈블리와 매우 비슷하게 명시적인 레이블 및 `goto`를 사용하여 표현되므로 코드를 일목요연하게 이해하고 읽기가 어렵습니다.

개발자가 V8의 최적화된 JavaScript 표준 라이브러리에 기여하기 더 쉽게 하고 가독성과 유지보수를 개선하기 위해 우리는 새로운 언어인 V8 *Torque*를 설계하기 시작했습니다. Torque는 CSA로 컴파일되며, CSA 코드를 작성하고 유지보수하는 데 어려움을 초래하는 저수준 세부 사항을 추상화하여 동일한 성능 프로파일을 유지하는 것이 목표입니다.

`DataView` 코드를 다시 작성하는 것은 Torque를 새 코드에 사용하기 시작할 수 있는 최적의 기회였으며, Torque 개발자에게 언어에 대한 많은 피드백을 제공하는 데 도움이 되었습니다. 이것이 Torque로 작성된 `DataView`의 `getUint32()` 메서드입니다:

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

`DataView` 메서드를 Torque로 이동하면 성능이 **3배** 향상되었지만 아직 `Uint8Array` 기반 래퍼 성능에 도달하지는 못했습니다.

![Torque `DataView` 성능](/_img/dataview/dataview-torque.svg)

## TurboFan에 최적화하기

JavaScript 코드가 뜨거워질 때, 우리는 TurboFan 최적화 컴파일러를 사용하여 인터프리티드 바이트코드보다 더 효율적으로 실행되는 매우 최적화된 기계 코드를 생성합니다.

TurboFan은 들어오는 JavaScript 코드를 내부 그래프 표현(정확히는 [노드 바다](https://darksi.de/d.sea-of-nodes/)라고 함)으로 변환하여 동작합니다. 처음에는 JavaScript 작업과 의미를 일치시키는 고수준 노드로 시작하고, 점차 더 낮고 낮은 수준의 노드로 정제하여 최종적으로 기계 코드를 생성합니다.

특히, `DataView` 메서드 호출과 같은 함수 호출은 내부적으로 `JSCall` 노드로 표현되며, 이는 생성된 기계 코드에서 실제 함수 호출로 귀결됩니다.

그러나 TurboFan은 `JSCall` 노드가 실제로 알려진 함수, 예를 들어 기본 제공 함수 중 하나를 호출하는지 확인하고 이 노드를 IR에 인라인할 수 있도록 합니다. 이는 복잡한 `JSCall`이 컴파일 타임에 함수의 하위 그래프로 대체됨을 의미합니다. 이를 통해 TurboFan은 보다 넓은 컨텍스트의 일부로서 후속 패스에서 함수 내부를 최적화할 수 있으며, 가장 중요한 것은 비용이 많이 드는 함수 호출을 제거할 수 있다는 점입니다.

![초기 TurboFan `DataView` 성능](/_img/dataview/dataview-turbofan-initial.svg)

TurboFan 인라인 구현은 결국 `Uint8Array` 래퍼의 성능을 맞추고, 심지어는 초과할 수 있게 하였으며, 이전 C++ 구현보다 **8배** 빠르게 만들었습니다.

## TurboFan 추가 최적화

TurboFan을 사용하여 `DataView` 메서드를 인라인한 후 생성된 기계 코드를 확인하면 아직 약간의 개선 여지가 있었습니다. 처음 구현된 메서드는 표준을 매우 충실히 따르려고 했으며, 사양에서 지시하는 경우(예: 기본 `ArrayBuffer` 범위를 벗어난 읽기 또는 쓰기를 시도할 때) 오류를 던졌습니다.

TurboFan에서 작성한 코드는 일반적으로 반복적으로 사용되는 주요 사례에서 최대한 빠르게 최적화되도록 설계되었습니다. 모든 가능한 특별한 경우를 지원할 필요는 없습니다. 이러한 오류를 섬세하게 처리하는 과정을 제거하고, 예외를 던질 때 기준 Torque 구현으로 되돌아가도록 디옵티마이즈(deoptimize)하는 방식으로, 생성된 코드 크기를 약 35% 줄일 수 있었으며, 눈에 띄는 속도 향상과 함께 TurboFan 코드도 상당히 간단해졌습니다.

TurboFan에서 가능한 한 특수화된 방식으로 작성한다는 아이디어를 바탕으로, TurboFan 최적화 코드 내부에서 너무 큰 인덱스나 오프셋(Smi 범위 외)을 지원하지 않도록 제거했습니다. 이를 통해 32비트 값에 맞지 않는 오프셋에 필요한 float64 산술 처리를 제거하고, 힙에 큰 정수를 저장하지 않도록 할 수 있었습니다.

초기 TurboFan 구현과 비교했을 때, `DataView` 벤치마크 점수는 두 배 이상 향상되었습니다. 이제 `DataView`는 `Uint8Array` 래퍼보다 최대 3배 빠르고, 초기 `DataView` 구현보다 약 **16배 빠릅니다**!

![최종 TurboFan `DataView` 성능](/_img/dataview/dataview-turbofan-final.svg)

## 영향

자체 벤치마크뿐만 아니라 실제 예제를 통해 새 구현의 성능 영향을 평가했습니다.

`DataView`는 JavaScript에서 바이너리 형식으로 인코딩된 데이터를 디코딩할 때 자주 사용됩니다. 그러한 바이너리 형식 중 하나는 [FBX](https://en.wikipedia.org/wiki/FBX)로, 3D 애니메이션 교환에 사용됩니다. 인기 있는 [three.js](https://threejs.org/) JavaScript 3D 라이브러리의 FBX 로더를 계측하여 실행 시간이 10% (약 80ms) 줄어드는 것을 확인했습니다.

`DataView`와 `TypedArray`의 전체 성능을 비교했습니다. 네이티브 엔디안(little-endian이 Intel 프로세서에서 기본값으로 사용되는 경우)에 맞게 정렬된 데이터를 액세스할 때 새 `DataView` 구현이 `TypedArray`와 거의 동일한 성능을 제공한다는 것을 확인했습니다. 이는 성능 차이를 상당히 좁히고 V8에서 `DataView`를 실용적인 선택으로 만듭니다.

![`DataView` vs. `TypedArray` 최고 성능](/_img/dataview/dataview-vs-typedarray.svg)

이제 여러분이 `TypedArray` 셈(shim)에 의존하는 대신 `DataView`를 사용할 수 있게 되기를 바랍니다. `DataView` 사용에 대한 의견을 보내주세요! [버그 트래커](https://crbug.com/v8/new), v8-users@googlegroups.com 메일, 또는 [Twitter에서 @v8js](https://twitter.com/v8js)를 통해 저희에게 연락하실 수 있습니다.
