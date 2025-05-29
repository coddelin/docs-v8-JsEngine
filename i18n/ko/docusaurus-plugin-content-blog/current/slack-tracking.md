---
title: "V8에서의 슬랙 추적"
author: "Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), *슬랙*의 권위있는 대가"
description: "V8의 슬랙 추적 메커니즘에 대한 자세한 분석."
avatars:
 - "michael-stanton"
date: 2020-09-24 14:00:00
tags:
 - 내부 구조
---
슬랙 추적은 새로운 객체에 실제로 사용하는 것보다 **더 큰 초기 크기를 부여**하여 새로운 속성을 빠르게 추가할 수 있도록 합니다. 그런 다음 일정 시간이 지나면 **사용하지 않은 공간을 시스템으로 마법같이 반환**하는 방식입니다. 멋지지 않나요?

<!--truncate-->
특히 유용한 점은 JavaScript에는 정적 클래스가 없다는 것입니다. 시스템은 귀하가 몇 개의 속성을 가지고 있는지 '한눈에' 알 수 없습니다. 엔진은 이를 하나씩 경험하게 됩니다. 그래서 다음 코드를 읽을 때:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

엔진이 최적의 성능을 발휘하는 데 필요한 모든 정보를 갖춘 것으로 생각할 수 있습니다. 결국 객체에 두 개의 속성이 있음을 알려주셨으니까요. 그러나 V8은 그 다음에 어떤 일이 일어날지 정말 모르고 있습니다. 이 객체 `m1`는 다른 함수에 전달되어 10개의 속성이 더 추가될 수 있습니다. 슬랙 추적은 전체 구조를 추론하기 위한 정적 컴파일이 없는 환경에서 다음에 어느 것이든 대응할 필요에서 나왔습니다. 이는 V8의 여러 메커니즘 중 하나로서 실행에 대해 대체로 말할 수 있는 것들만을 기반으로 합니다. 예를 들어 다음이 있습니다:

- 대부분의 객체는 곧 사라지고, 몇몇은 오래 살아남습니다 — 쓰레기 수집 '세대 가설'
- 프로그램은 실제로 조직 구조를 갖추고 있습니다 — 우리는 객체에 [형상 또는 '숨겨진 클래스'](https://mathiasbynens.be/notes/shapes-ics) (V8에서는 이를 **맵**이라고 부릅니다)를 프로그래머가 사용하는 것을 보고 유용할 것이라고 믿고 이를 구축합니다. *참고로, [V8의 빠른 속성](/blog/fast-properties)은 맵과 속성 액세스에 대한 흥미로운 세부 내용을 담은 훌륭한 게시물입니다.*
- 프로그램은 초기화 상태를 가지고 있으며 모든 것이 새롭고 무엇이 중요한지를 판단하기 어렵습니다. 나중에는 중요한 클래스와 함수가 지속적인 사용을 통해 식별될 수 있습니다 — 우리의 피드백 체제와 컴파일러 파이프라인은 이러한 아이디어에서 발전합니다.

마지막으로, 가장 중요한 점은 런타임 환경이 매우 빠르지 않으면 단순히 철학적인 논쟁으로 끝난다는 것입니다.

이제 V8은 속성을 주 객체에 부착된 백스토어에 저장할 수 있습니다. 객체 내부에 직접 살아 있는 속성과 달리, 이 백스토어는 복사 및 포인터 교체를 통해 무한히 확장 가능합니다. 그러나 속성에 대한 가장 빠른 액세스는 그 간접성을 피하고 객체의 시작부터 고정 오프셋을 보는 데서 나옵니다. 아래에는 두 개의 객체 내부 속성을 가진 일반적인 JavaScript 객체가 V8 힙에서 어떻게 레이아웃되어 있는지를 보여줍니다. 첫 세 단어는 모든 객체에 표준으로 포함됩니다(맵에 대한 포인터, 속성 백스토어, 요소 백스토어에 대한 포인터). 객체는 힙에 다음 객체와 딱 붙어 있기 때문에 '확장'할 수 없습니다:

![](/_img/slack-tracking/property-layout.svg)

:::note
**참고:** 프로퍼티 백스토어의 세부 사항은 생략했는데, 현재 중요한 것은 더 큰 것으로 언제든지 대체될 수 있다는 점뿐입니다. 하지만 이 역시 V8 힙에 있는 객체로서 모든 객체와 마찬가지로 맵 포인터를 가지고 있습니다.
:::

그래서 내부 속성으로 제공되는 성능 때문에 V8은 각 객체에 추가 공간을 제공하며 이는 **슬랙 추적**을 통해 이루어집니다. 결국 여러분은 새로운 속성을 추가하는 것을 멈추고 비트코인을 채굴하는 등의 일에 집중하게 될 것입니다.

V8이 얼마나 '시간'을 줄까요? 영리하게도, 특정 객체를 생성한 횟수를 고려합니다. 실제로 맵에는 카운터가 있으며, 시스템에서 더 신비로운 마법 숫자인 **7**로 초기화됩니다.

또 다른 질문: V8은 객체 본체에 얼마나 많은 추가 공간을 제공해야 하는지 어떻게 알까요? 실제로 컴파일 과정에서 힌트를 얻으며, 시작 시 예상 속성 수를 제공합니다. 이 계산은 프로토타입 객체의 속성 수를 포함하며, 재귀적으로 프로토타입 체인을 따라갑니다. 마지막으로, 추가로 **8**을 더합니다(또 다른 마법 숫자!). 이 내용을 `JSFunction::CalculateExpectedNofProperties()`에서 확인할 수 있습니다:

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // 기본 생성자는 예상되는 속성 수에 맞게 컴파일되어야 합니다.
    // 사용할 속성 수를 제공해야 합니다.
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // 추정치가 합리적인지 확인합니다.
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // 컴파일 오류가 있는 경우 반복을 계속 진행하여 프로토타입 체인에서
      // 특정 수의 객체 내부 속성을 요구하는 내장 함수가 있을 가능성을 확인합니다.
      continue;
    }
  }
  // 객체 내부 공간 추적을 통해 나중에 불필요한 공간을 회수할 수 있기 때문에
  // 추정을 관대하게 조정할 수 있습니다. 시작 시 최소 8 슬롯을 초과 할당합니다.
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

이전에 사용했던 `m1` 객체를 살펴보겠습니다:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

`JSFunction::CalculateExpectedNofProperties` 및 `Peak()` 함수의 계산 결과에 따라 우리는 2개의 객체 내부 속성을 가지게 되며, 슬랙 추적 덕분에 추가로 8개가 더 생깁니다. `%DebugPrint()`를 사용하여 `m1`을 출력할 수 있습니다. (_이 유용한 함수는 맵 구조를 노출합니다. `--allow-natives-syntax` 플래그를 사용하여 `d8`을 실행하면 사용할 수 있습니다_):

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

객체의 인스턴스 크기가 52임을 유념하십시오. V8에서 객체 레이아웃은 다음과 같습니다:

| word | 내용                                                 |
| ---- | ---------------------------------------------------- |
| 0    | 맵                                                   |
| 1    | 속성 배열에 대한 포인터                              |
| 2    | 요소 배열에 대한 포인터                              |
| 3    | 객체 내부 필드 1 (문자열 `"Matterhorn"`에 대한 포인터) |
| 4    | 객체 내부 필드 2 (정수 값 `4478`)                     |
| 5    | 사용되지 않은 객체 내부 필드 3                       |
| …    | …                                                    |
| 12   | 사용되지 않은 객체 내부 필드 10                      |

32비트 바이너리에서 포인터 크기는 4이므로, 모든 일반적인 JavaScript 객체가 가지는 초기 3개의 단어와 추가로 객체 안에 있는 10개의 단어가 있습니다. 위의 정보는 친절히도 8개의 “사용되지 않은 속성 필드”가 있음을 보여줍니다. 따라서 우리는 슬랙 추적을 경험하고 있습니다. 우리의 객체들은 과잉 상태로 소중한 바이트를 많이 소비하는 탐욕스러운 소비자들입니다!

어떻게 개선할 수 있을까요? 우리는 맵 내 구성 카운터 필드를 사용합니다. 우리는 카운터가 0에 도달하고 나서 더 이상 슬랙 추적을 진행하지 않기로 결정합니다. 하지만 더 많은 객체를 생성하면, 위의 카운터가 줄어들지 않는 것을 볼 수 있습니다. 왜 그럴까요?

그 이유는 위에 표시된 맵이 `Peak` 객체의 '진짜' 맵이 아니기 때문입니다. 이는 초기 맵에서 실행되는 생성자 코드 이전에 `Peak` 객체가 부여받은 맵에서 시작하는 체인의 맵 중 하나일 뿐입니다.

초기 맵을 찾는 방법은 무엇일까요? 다행히도, `Peak()` 함수에는 초기 맵에 대한 포인터가 있습니다. 우리는 초기 맵의 구성 카운터를 사용하여 슬랙 추적을 제어합니다:

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 함수 원형: 0x37449c89 <Object map = 0x2a287335>
 - 초기 맵: 0x46f07295 <Map(HOLEY_ELEMENTS)>   // 여기에 초기 맵이 있습니다.
 - 공유 정보: 0x31c12495 <공유 함수 정보 Peak>
 - 이름: 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr를 사용하여 초기 맵을 출력할 수 있습니다.
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Map]
 - 타입: JS_OBJECT_TYPE
 - 인스턴스 크기: 52
 - 객체 내부 속성: 10
 - 요소 종류: HOLEY_ELEMENTS
 - 사용되지 않는 속성 필드: 10
 - 열거 길이: 유효하지 않음
 - 백 포인터: 0x28c02329 <undefined>
 - 프로토타입 유효성 셀: 0x47f0232d <Cell value= 1>
 - 인스턴스 디스크립터(자체) #0: 0x28c02135 <DescriptorArray[0]>
 - 전환 #1: 0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9: [String] in ReadOnlySpace: #name:
         (다음으로 전환 (상수 데이터 필드, 속성: [WEC]) @ Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - 프로토타입: 0x5cc09c7d <Object map = 0x46f07335>
 - 생성자: 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - 종속 코드: 0x28c0212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - 생성 카운터: 5
```

생성 카운터가 5로 감소한 것을 확인할 수 있습니까? 위에 표시된 두 속성 맵에서 초기 맵을 찾고 싶다면 `%DebugPrintPtr()`를 사용하여 백 포인터를 따라가면서 백 포인터 슬롯에 `undefined`가 있는 맵에 도달할 때까지 추적할 수 있습니다. 바로 위의 맵이 그 맵입니다.

이제 초기 맵에서 맵 트리가 성장하며, 그 지점에서 추가된 각 속성에 대해 분기가 생성됩니다. 이러한 분기를 _전환_이라고 부릅니다. 위의 초기 맵 출력에서 'name'이라는 레이블이 붙은 다음 맵으로의 전환을 볼 수 있습니까? 지금까지의 전체 맵 트리는 다음과 같은 모습입니다:

![(X, Y, Z)는 (인스턴스 크기, 객체 내부 속성 수, 사용되지 않는 속성 수)를 의미합니다.](/_img/slack-tracking/root-map-1.svg)

속성 이름을 기반으로 한 이러한 전환은 자바스크립트의 [“맹목적인 두더지”](https://www.google.com/search?q=blind+mole&tbm=isch)"가 내부에서 맵을 생성하는 방식입니다. 이 초기 맵은 함수 `Peak`에 저장되므로, 이를 생성자로 사용했을 때 해당 맵이 `this` 객체를 설정하는 데 사용될 수 있습니다.

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

여기서 멋진 점은 `m7`을 생성한 후 다시 `%DebugPrint(m1)`을 실행하면 새로운 멋진 결과가 생성된다는 것입니다:

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - 맵: 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - 프로토타입: 0x5cd086cd <Object map = 0x4b387335>
 - 요소: 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 속성: 0x586421a1 <FixedArray[0]> {
    0x586446f9: [String] in ReadOnlySpace: #name:
        0x51112439 <String[10]: #Matterhorn> (상수 데이터 필드 0)
    0x51112415: [String] in OldSpace: #height:
        4478 (상수 데이터 필드 1)
 }
0x4b387385: [Map]
 - 타입: JS_OBJECT_TYPE
 - 인스턴스 크기: 20
 - 객체 내부 속성: 2
 - 요소 종류: HOLEY_ELEMENTS
 - 사용되지 않는 속성 필드: 0
 - 열거 길이: 유효하지 않음
 - 안정된 맵
 - 백 포인터: 0x4b38735d <Map(HOLEY_ELEMENTS)>
 - 프로토타입 유효성 셀: 0x511128dd <Cell value= 0>
 - 인스턴스 디스크립터(자체) #2: 0x5cd087e5 <DescriptorArray[2]>
 - 프로토타입: 0x5cd086cd <Object map = 0x4b387335>
 - 생성자: 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - 종속 코드: 0x5864212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - 생성 카운터: 0
```

이제 우리의 인스턴스 크기가 20이 되었으며 이는 5개의 워드입니다:

| 워드 | 내용                             |
| ---- | ------------------------------- |
| 0    | 맵                              |
| 1    | 속성 배열에 대한 포인터          |
| 2    | 요소 배열에 대한 포인터          |
| 3    | 이름                            |
| 4    | 높이                            |

이 일이 어떻게 발생했는지 궁금할 것입니다. 결국 이 객체가 메모리에 배치되고, 10개의 속성을 가지고 있었는데, 아무도 소유하지 않는 상태로 남아 있는 8개의 워드를 어떻게 시스템이 용납할 수 있었을까요? 정확히 말하면 우리는 그것들을 무언가 흥미로운 것으로 채우지 않았습니다 — 아마 이것이 도움이 될 수 있을 것입니다.

왜 제가 이러한 워드를 그냥 두는 것에 대해 걱정하는지 궁금하다면, 쓰레기 수집기에 대해 알아야 할 배경이 있습니다. 객체는 순차적으로 배치되고, V8 쓰레기 수집기는 메모리 내의 정보를 반복적으로 추적합니다. 메모리의 첫 번째 워드에서 시작하여 맵에 대한 포인터를 찾을 것으로 기대합니다. 맵에서 인스턴스 크기를 읽으면 다음 유효한 객체로 이동하기 위해 얼마나 이전해야 하는지 알 수 있습니다. 일부 클래스에서는 추가적으로 길이를 계산해야 하지만 그것이 전부입니다.

![](/_img/slack-tracking/gc-heap-1.svg)

위의 다이어그램에서 빨간 상자는 **맵**, 흰 상자는 객체의 인스턴스 크기를 채우는 단어들입니다. 가비지 컬렉터는 맵에서 맵으로 이동하며 힙을 “탐색”할 수 있습니다.

그렇다면 맵이 갑자기 인스턴스 크기를 변경하면 어떻게 될까요? 이제 GC(가비지 컬렉터)가 힙을 탐색할 때 이전에 보지 못한 단어를 보게 됩니다. `Peak` 클래스의 경우, 13개 단어를 차지하던 것이 단지 5개로 줄어듭니다(“사용되지 않은 속성” 단어는 노란색으로 표시):

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

우리는 **인스턴스 크기 4의 '더미' 맵**으로 이러한 사용되지 않은 속성을 초기화하면 이 문제를 해결할 수 있습니다. 이렇게 하면 GC가 탐색 중 이 단어들을 가볍게 넘어가게 됩니다.

![](/_img/slack-tracking/gc-heap-4.svg)

`Factory::InitializeJSObjectBody()` 코드에서 이것이 표현됩니다:

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <생략된 줄>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <생략된 줄>
}
```

이것이 슬랙 트래킹(slack tracking)이 동작하는 방식입니다. 생성하는 각 클래스에 대해 한동안 더 많은 메모리를 차지하지만, 7번째 인스턴스화에서 “좋다”고 간주하고 남은 공간을 GC에 노출합니다. 이 한 단어 크기의 객체는 소유자가 없기 때문에 — 즉, 아무도 그것을 참조하지 않기 때문에 — 가비지 컬렉션이 발생하면 해제되고 살아있는 객체들은 공간을 절약하기 위해 압축될 수 있습니다.

아래 다이어그램은 초기 맵에 대해 슬랙 트래킹이 **완료**되었음을 반영합니다. 이제 인스턴스 크기가 20(5 단어: 맵, 속성 및 요소 배열, 그리고 2개의 추가 슬롯)입니다. 슬랙 트래킹은 초기 맵의 전체 체인을 존중합니다. 즉, 초기 맵의 자손 중 하나가 초기 추가 속성 10개를 모두 사용한다면, 초기 맵은 그 속성을 유지하며 이를 사용되지 않은 것으로 표시합니다:

![(X, Y, Z)는 (인스턴스 크기, 객체 내 속성 수, 사용되지 않은 속성 수)를 의미합니다.](/_img/slack-tracking/root-map-2.svg)

이제 슬랙 트래킹이 완료된 경우, 이 `Peak` 객체 중 하나에 또 다른 속성을 추가하면 어떻게 될까요?

```js
m1.country = '스위스';
```

V8은 속성을 지원하는 저장소로 들어가야 합니다. 결과적으로 다음과 같은 객체 레이아웃이 생성됩니다:

| 단어 | 값                                  |
| ---- | ------------------------------------ |
| 0    | 맵                                  |
| 1    | 속성 지원 저장소에 대한 포인터       |
| 2    | 요소에 대한 포인터(비어 있는 배열)   |
| 3    | 문자열 `"Matterhorn"`에 대한 포인터  |
| 4    | `4478`                               |

속성 지원 저장소는 다음과 같이 보입니다:

| 단어 | 값                              |
| ---- | -------------------------------- |
| 0    | 맵                              |
| 1    | 길이(3)                         |
| 2    | 문자열 `"스위스"`에 대한 포인터   |
| 3    | `undefined`                     |
| 4    | `undefined`                     |
| 5    | `undefined`                     |

이 추가 `undefined` 값들은 여러분이 더 많은 속성을 추가할 경우를 대비한 것입니다. 지금까지의 행동을 보면 아마 그렇게 할 것 같아서요!

## 선택적 속성

경우에 따라 속성을 추가할 수도 있습니다. 예를 들어 높이가 4000미터 이상이면 두 개의 추가 속성, `prominence` 및 `isClimbed`를 기록하고자 한다고 가정합시다:

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

다음과 같은 다양한 변종들을 추가합니다:

```js
const m1 = new Peak('Wendelstein', 1838);
const m2 = new Peak('Matterhorn', 4478, 1040, true);
const m3 = new Peak('Zugspitze', 2962);
const m4 = new Peak('Mont Blanc', 4810, 4695, true);
const m5 = new Peak('Watzmann', 2713);
const m6 = new Peak('Zinalrothorn', 4221, 490, true);
const m7 = new Peak('Eiger', 3970);
```

이 경우 객체 `m1`, `m3`, `m5`, `m7`은 하나의 맵을 가지고 있고, 객체 `m2`, `m4`, `m6`은 초기 맵에서 맵 체인의 자손으로 내려가는 맵을 가지고 있습니다. 추가 속성 때문에 슬랙 트래킹이 이 맵 패밀리에 대해 완료되면, 이전처럼 **2**개의 객체 내 속성이 아니라 **4**개가 포함됩니다. 슬랙 트래킹은 초기 맵 아래 트리의 모든 자손에서 최대 사용된 객체 내 속성을 기준으로 충분한 공간을 유지합니다.

아래는 위 코드를 실행한 후의 맵 패밀리를 보여줍니다. 물론 슬랙 트래킹은 완료되었습니다:

![(X, Y, Z)는 (인스턴스 크기, 객체 내 속성 수, 사용되지 않은 속성 수)를 의미합니다.](/_img/slack-tracking/root-map-3.svg)

## 최적화된 코드의 경우는?

슬랙 트래킹이 끝나기 전에 최적화된 코드를 컴파일해 보겠습니다. 우리는 최적화된 컴파일이 슬랙 트래킹이 끝나기 전에 발생하도록 네이티브 구문 명령어 몇 가지를 사용할 것입니다:

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo('Wendelstein', 1838);
const m2 = foo('Matterhorn', 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo('Zugspitze', 2962);
```

최적화된 코드를 컴파일하고 실행하기에 충분할 것입니다. TurboFan(최적화 컴파일러)에서는 [**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27)을 사용하여 객체의 할당을 인라인하는 작업을 수행합니다. 즉, 우리가 생성하는 네이티브 코드는 GC에게 객체의 인스턴스 크기를 요청하고 그 필드를 신중히 초기화하도록 지시하는 명령을 내보냅니다. 그러나 만약 슬랙 트래킹이 나중에 중단되었다면 이 코드는 유효하지 않을 것입니다. 무엇을 해야 할까요?

아주 간단합니다! 이 맵 패밀리에 대해 슬랙 트래킹을 조기에 끝내기만 하면 됩니다. 이는 통상적으로 — 수천 개의 객체가 생성될 때까지 최적화된 함수를 컴파일하지 않을 것이기 때문에 합리적입니다. 따라서 슬랙 트래킹은 *완료*된 상태여야 합니다. 그렇지 않다면, 어쩔 수 없습니다! 어쨌든 지금까지 7개 미만의 객체만 생성되었다면 그 객체는 그다지 중요하지 않을 것입니다. (통상적으로, 기억하세요, 우리는 프로그램이 오랜 시간 실행된 후에만 최적화를 수행합니다.)

### 백그라운드 스레드에서 컴파일하기

우리는 주 스레드에서 최적화된 코드를 컴파일할 수 있고, 이 경우 초기 맵을 변경하기 위해 몇 가지 호출로 슬랙 트래킹을 조기에 종료할 수 있습니다. 이는 세계가 멈춘 상황이기 때문입니다. 그러나 가능한 많은 컴파일을 백그라운드 스레드에서 수행합니다. 이러한 스레드에서는 초기 맵을 변경하는 것이 위험할 수 있습니다. 왜냐하면 *JavaScript가 실행 중인 주 스레드에서 변경 중일 가능성이 있기 때문*입니다. 그래서 우리의 기술은 다음과 같이 진행됩니다:

1. **예측**: 지금 슬랙 트래킹을 중단한다면 인스턴스 크기가 어떨 것인지 예측합니다. 이 크기를 기억하세요.
1. 컴파일이 거의 완료되면 안전하게 슬랙 트래킹 완료를 강제할 수 있는 주 스레드로 돌아옵니다.
1. 확인: 인스턴스 크기가 우리가 예상했던 것인가요? 만약 그렇다면, **문제가 없습니다!** 만약 그렇지 않다면 코드 객체를 버리고 나중에 다시 시도합니다.

코드에서 이를보고 싶다면 클래스 [`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc)와 `js-create-lowering.cc`에서 인라인 할당 생성에 사용된 방식을 참조하세요. 주 스레드에서 `PrepareInstall()` 메소드가 호출되어 슬랙 트래킹 완료를 강제합니다. 그런 다음 `Install()` 방법은 우리가 예측한 인스턴스 크기가 유지되었는지 확인합니다.

다음은 인라인 할당이 포함된 최적화된 코드입니다. 먼저 GC와의 통신이 표시되고, 인스턴스 크기만큼 포인터를 앞으로 이동하여 그것을 사용할 수 있는지 확인합니다(이를 Bump-pointer 할당이라고 합니다). 그런 다음 새로운 객체의 필드를 채우기 시작합니다:

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; GC, 28 (0x1c) 바이트를 요청합니다.
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; 좋아요 GC, 가져갑니다. KThxbye.
61  add ecx,0x1                 ;; 좋습니다. ecx는 내 새 객체입니다.
64  mov edi,0x46647295          ;; 객체: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; 초기 맵 저장
6c  mov edi,0x56f821a1          ;; 객체: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; 속성 저장소 저장(비어있음)
74  mov [ecx+0x7],edi           ;; 요소 저장소 저장(비어있음)
77  mov edi,0x56f82329          ;; 객체: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; 인-객체 속성 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; 인-객체 속성 2 <-- undefined
82  mov [ecx+0x13],edi          ;; 인-객체 속성 3 <-- undefined
85  mov [ecx+0x17],edi          ;; 인-객체 속성 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; 인수 {a1} 가져오기
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; 객체: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; 맵 앞으로 푸시
9e  mov [ecx+0xb],edi           ;; 이름 = {a1}
a1  mov eax,[ebp+0x10]          ;; 인수 {a2} 가져오기
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; 객체: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; 맵 앞으로 푸시
b4  mov [ecx+0xf],eax           ;; 높이 = {a2}
b7  cmp eax,0x1f40              ;; 높이 >= 4000인가요?
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 시작 --
                  -- B9 시작 --
c2  mov edx,[ebp+0x14]          ;; 인수 {a3} 가져오기
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; 객체: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; 맵을 앞으로 밀기
d6  mov [ecx+0x13],edx          ;; prominence = {a3}
d9  mov esi,[ebp+0x18]          ;; 인수 {a4} 가져오기
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; 객체: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; 리프 맵 앞으로 밀기
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- B10 시작 (프레임 해체) --
f2  mov eax,ecx                 ;; 대단한 Peak 객체를 반환할 준비!
…
```

참고로, 이 모든 것을 보려면 디버그 빌드가 있어야 하고 몇 가지 플래그를 전달해야 합니다. 내가 코드를 파일에 넣고 호출했습니다:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

재미있는 탐험이 되었길 바랍니다. 이 게시글을 (인내심 있게!) 리뷰해준 Igor Sheludko와 Maya Armyanova에게 특별히 감사 인사를 드리고 싶습니다.
