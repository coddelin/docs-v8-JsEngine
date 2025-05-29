---
title: "V8의 Maps (Hidden Classes)"
description: "V8은 객체의 구조를 어떻게 추적하고 최적화합니까?"
---

V8이 숨겨진 클래스를 어떻게 구성하는지 보여드리겠습니다. 주요 데이터 구조는 다음과 같습니다:

- `Map`: 숨겨진 클래스 자체입니다. 객체의 첫 번째 포인터 값이며, 두 객체가 동일한 클래스인지 비교하기 쉽게 만듭니다.
- `DescriptorArray`: 클래스가 가지고 있는 모든 속성 목록 및 속성에 대한 정보입니다. 일부 경우에는 속성 값이 이 배열에 포함되기도 합니다.
- `TransitionArray`: 이 `Map`에서 형제 맵으로의 "엣지" 배열입니다. 각 엣지는 속성 이름이며, 현재 클래스에 이 이름의 속성을 추가한다면 어떤 클래스로 전환될지에 대한 정보를 나타냅니다.

많은 `Map` 객체가 다른 객체로의 전환만 한 번 수행하는 경우(즉, '전환맵'인 경우), V8은 항상 전체 `TransitionArray`를 생성하지는 않습니다. 대신 "다음" `Map`으로 직접 연결됩니다. 시스템은 포인팅되는 `Map`의 `DescriptorArray`를 탐색하여 전환과 함께 연결된 이름을 파악해야 합니다.

이 주제는 매우 풍부합니다. 이 개념을 이해하면 이후 변경사항도 점진적으로 이해할 수 있을 것입니다.

## 숨겨진 클래스가 필요한 이유는?

물론 V8은 숨겨진 클래스 없이도 작동할 수 있습니다. 각 객체를 속성들의 집합으로 처리할 것입니다. 그러나 매우 유용한 원칙인 지능형 설계를 적용하지 않을 것입니다. V8은 여러분이 생성하는 **다른** 종류의 객체가 제한적일 것이라고 추정합니다. 각 종류의 객체는 결국 고정된 방식으로 사용되는 것을 V8이 감지할 수 있습니다. 여기서 "고정된 방식"이라 표현한 이유는 JavaScript가 사전 컴파일된 언어가 아니라 스크립팅 언어이기 때문입니다. 따라서 V8은 다음에 무엇이 나올지 모릅니다. 지능형 설계(즉, 코드 뒤에 설계된 의도가 있다는 가정)를 활용하기 위해 V8은 기다리며 구조적인 감각을 익혀야 합니다. 숨겨진 클래스 메카니즘은 이를 수행하는 주요 방법입니다. 물론 이는 정교한 관찰 메커니즘을 전제하며, 이에 관한 설명은 많은 문서에서 다뤄진 Inline Cache(IC)입니다.

만약 이 작업이 필요하고 유용하다고 생각하시면, 따라오세요!

## 예제

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "good");
```

이 코드로 이미 함수 `Peak`에 연결된 초기 맵(이름은 루트 맵)에서 흥미로운 맵 트리를 얻었습니다:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

각 파란 상자는 초기 맵부터 시작하는 하나의 맵입니다. 초기 맵은 만약 우리가 `Peak` 함수를 실행하면서 단일 속성도 추가하지 않았다면 반환되는 객체의 맵입니다. 이어지는 맵은 맵들 사이의 엣지 이름을 가지고 추가 속성을 추가하여 생성된 결과입니다. 각 맵은 해당 맵의 객체와 연관된 속성의 목록을 가지며, 각 속성의 정확한 위치를 기술합니다. 마지막으로 이러한 맵 중 하나에서 (예를 들어, `Peak()`의 `extra` 인자에서 숫자를 전달했을 때 생기는 객체의 숨겨진 클래스인 `Map3`) 초기 맵까지 백 링크를 따라 올라갈 수 있습니다.

이 추가 정보를 포함하여 다시 그려보겠습니다. 주석 (i0), (i1)은 객체 내부 필드 위치 0, 1 등을 의미합니다:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

이제 최소 7개의 `Peak` 객체를 생성하기 전에 이러한 맵을 살펴보시면 **slack tracking**을 만날 수 있습니다. 이것은 혼란스러울 수 있으며, 이에 관해 [다른 기사](https://v8.dev/blog/slack-tracking)를 작성했습니다. 객체를 7개 더 생성하면 완료됩니다. 이 시점에서 `Peak` 객체는 정확히 3개의 객체 내부 속성을 가지며, 객체 내부에 더 이상의 속성을 직접 추가할 수 없습니다. 추가되는 속성은 객체의 속성 백업 저장소로 전환됩니다. 이는 속성 값의 배열로, 인덱스는 맵(엄밀히 말하면 맵에 연결된 `DescriptorArray`)에서 얻습니다. 이제 새 줄에서 `m2`에 속성을 추가하고 다시 맵 트리를 살펴보겠습니다:

```javascript
m2.cost = "one arm, one leg";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

여기에 무엇인가를 몰래 추가했습니다. 모든 속성이 "const"로 주석 처리되어 있다는 점을 주목하세요. 이는 V8의 관점에서 생성자 이후 아무도 그것을 변경하지 않았다는 것을 의미합니다. 따라서 초기화된 이후에는 상수로 간주될 수 있습니다. TurboFan(최적화 컴파일러)은 이것을 좋아합니다. `m2`를 함수에 의해 상수 글로벌로 참조한다고 가정해보세요. 그러면 `m2.cost`를 컴파일 시간에 조회할 수 있습니다. 왜냐하면 필드가 상수로 표시되었기 때문입니다. 이후에 이에 대해 다시 설명하겠습니다.

속성 "cost"가 `const p0`로 표시된 것을 주목하세요. 이는 **속성 백업 저장소**에서 인덱스 0에 저장된 상수 속성이며 객체 자체에 직접 저장된 것은 아닙니다. 이유는 객체에 더 이상 공간이 없기 때문입니다. 이 정보는 `%DebugPrint(m2)`에서 볼 수 있습니다:

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

우리는 4개의 속성을 가지고 있으며 모두 상수로 표시된 것을 볼 수 있습니다. 첫 번째 3개는 객체 안에 있고, 마지막 하나는 `properties[0]`에 있는데 이는 속성 백업 저장소의 첫 번째 슬롯을 의미합니다. 그것을 확인해봅시다:

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

추가 속성은 갑자기 더 추가하고 싶어질 경우를 대비해 준비되어 있습니다.

## 실제 구조

이 시점에서 우리가 할 수 있는 일은 다양하지만, 이미 이렇게까지 읽었다는 것은 V8을 정말 좋아한다는 뜻이므로, 저는 `Map`, `DescriptorArray`, 및 `TransitionArray`의 시작 부분에서 언급된 실제 데이터 구조를 그려보도록 하겠습니다. 이제 숨겨진 클래스 개념이 뒤에서 어떻게 형성되고 있는지 약간 개념을 잡았으니, 올바른 이름과 구조를 통해 사고를 코드에 더 밀접하게 묶을 수 있습니다. 먼저 V8의 표현으로 마지막 그림을 재현해보겠습니다. 먼저 주어진 Map에 대한 속성 목록을 보유하는 **DescriptorArrays**를 그리겠습니다. 이러한 배열은 공유할 수 있습니다. 그 이유는 Map 자체가 DescriptorArray에서 볼 수 있는 속성이 몇 개인지 알고 있기 때문입니다. 속성이 추가된 순서대로 시간이 지나면 이러한 배열을 여러 Map에서 공유할 수 있습니다. 보세요:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

**Map1**, **Map2**, 및 **Map3**이 모두 **DescriptorArray1**을 가리키고 있다는 점을 주목하세요. 각 Map에서 "descriptors" 필드 옆에 있는 숫자는 DescriptorArray에서 그 Map에 속하는 필드의 개수를 나타냅니다. 그래서 "name" 속성만 알고 있는 **Map1**은 **DescriptorArray1**에 나열된 첫 번째 속성만 봅니다. 반면 **Map2**는 "name"과 "height"라는 두 가지 속성을 가지고 있으므로 **DescriptorArray1**의 첫 번째와 두 번째 항목(name과 height)을 봅니다. 이러한 공유 방식은 많은 공간을 절약합니다.

물론 분기가 발생하는 경우에는 공유할 수 없습니다. Map2에서 "experience" 속성이 추가되었을 때 Map4로 전환되고, "prominence" 속성이 추가되었을 때 Map3으로 전환됩니다. Map4와 Map5가 DescriptorArray2를 마치 DescriptorArray1이 세 개의 Map 사이에서 공유된 것처럼 공유하는 것을 볼 수 있습니다.

우리의 "현실 그대로의" 다이어그램에서 누락된 유일한 것은 아직 은유적 상태인 `TransitionArray`입니다. 이를 변경해보겠습니다. 저는 **백 포인터** 선을 제거하는 자율성을 활용했는데, 이는 다소 깔끔하게 만들어줍니다. 트리의 어떤 Map에서든 트리를 위로 걸어 올라갈 수 있다는 점만 기억하세요.

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

다이어그램은 연구할 가치가 있습니다. **질문: "name" 후에 새로운 속성 "rating"이 추가되었다면 "height" 및 기타 속성으로 넘어가는 대신 어떻게 될까요?**

**답변**: Map1은 분기를 추적하기 위한 실제 **TransitionArray**를 갖게 됩니다. 속성 *height*가 추가되었을 경우, 우리는 **Map2**로 전환해야 합니다. 하지만 속성 *rating*이 추가되었을 경우에는 새로운 Map인 **Map6**으로 이동해야 합니다. 이 Map은 *name*과 *rating*을 언급하는 새로운 DescriptorArray가 필요합니다. 객체는 저장소에서 여전히 여유 슬롯을 갖고 있는 시점이므로(세 개 중 하나만 사용됨), 속성 *rating*은 이러한 슬롯 중 하나를 받게 될 것입니다.

*저는 `%DebugPrintPtr()`의 도움을 받아 답변을 확인한 후 다음과 같은 그림을 그렸습니다:*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="숨겨진 클래스 예제" loading="lazy"/>
</figure>

저에게 멈추라고 애원할 필요 없습니다. 이런 다이어그램의 상한선을 본 것 같네요! 하지만 부품들이 어떻게 움직이는지 감을 잡을 수 있을 거라고 생각합니다. 이 가짜 속성 *rating*을 추가한 후에 *height*, *experience*, *cost*를 계속 추가했다고 상상해보세요. 그렇다면 **Map7**, **Map8**, **Map9**을 만들어야 합니다. 이미 확립된 맵 체인의 중간에 이 속성을 추가하기로 고집했기 때문에 많은 구조를 복제하게 될 것입니다. 저는 이 그림을 그릴 용기가 안 나네요 -- 하지만 만약 당신이 그것을 보내주신다면 이 문서에 추가하겠습니다 :).

저는 쉽게 다이어그램을 만들기 위해 [DreamPuf](https://dreampuf.github.io/GraphvizOnline) 프로젝트를 사용했습니다. 이전 다이어그램에 대한 [링크](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D)입니다.

## TurboFan과 const 속성

지금까지 모든 필드는 `DescriptorArray`에서 `const`로 표시되었습니다. 이것을 가지고 놀아봅시다. 디버그 빌드에서 다음 코드를 실행하십시오:

```javascript
// 다음과 같이 실행하십시오:
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// 여유 공간 추적이 완료되었는지 확인하십시오.
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "한 팔 한 다리";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

최적화된 함수 `foo()`의 출력물이 표시됩니다. 코드가 매우 간략합니다. 함수 끝부분에서 다음을 볼 수 있습니다:

```
...
40  mov eax,0x2a812499          ;; 객체: 0x2a812499 <String[16]: #한 팔 한 다리>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; "한 팔 한 다리"를 반환!
```

TurboFan은 적당히 직접적으로 `m2.cost` 값을 삽입해 버렸습니다. 어떻게 생각하세요!

물론, 마지막으로 `foo()`를 호출한 후 다음 줄을 삽입할 수 있습니다:

```javascript
m2.cost = "값을 매길 수 없음";
```

무슨 일이 일어날지 생각해보세요. 한 가지 확실한 것은 `foo()`를 그대로 둘 수 없다는 것입니다. 잘못된 답을 반환하게 됩니다. 프로그램을 다시 실행하십시오. 그러나 `--trace-deopt` 플래그를 추가하여 최적화 코드가 시스템에서 제거될 때 알려주도록 하십시오. 최적화된 `foo()` 출력 후 다음 줄을 볼 수 있습니다:

```
[marking dependent code 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) for deoptimization,
    reason: field-const]
[deoptimize marked code in all contexts]
```

와우.

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="나는 이게 정말 좋아" loading="lazy"/>
</figure>

재최적화를 강제로 수행하면 코드의 품질이 약간 떨어질 수 있지만, 우리가 설명한 Map 구조의 이점을 크게 누리게 될 것입니다. 우리의 다이어그램에서 보았듯이, 속성 *cost*는 객체의 속성 백업 저장소에서 첫 번째 속성입니다. 비록 그것이 const 지정에서 벗어났지만 여전히 주소는 유지됩니다. 기본적으로, **Map5**라는 맵을 포함한 객체에서, 글로벌 변수 `m2`가 여전히 가지고 있다는 것을 확인할 것이며, 다음만 수행하면 됩니다--

1. 속성 백업 저장소를 로드하고,
2. 첫 번째 배열 요소를 읽어냅니다.

확인해봅시다. 아래 코드에 추가해보세요:

```javascript
// foo()의 재최적화를 강제로 수행합니다.
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

이제 생성된 코드를 확인해봅시다:

```
...
40  mov ecx,0x42cc8901          ;; 객체: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; 속성 백업 저장소 로드
48  mov eax,[ecx+0x7]           ;; 첫 번째 요소 가져오기.
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; eax 레지스터로 반환!
```

아니, 정말. 우리가 예측한 그대로 일어납니다. 아마도 우리는 이해하기 시작한 것 같습니다.

TurboFan은 변수 `m2`가 다른 클래스에 변경되면 최적화 해제를 할 만큼 똑똑합니다. 다음과 같은 재밌는 코드로 최신 최적화 코드가 다시 해제되는 것을 볼 수 있습니다:

```javascript
m2 = 42;  // 헤헷.
```

## 이제 어디로 가야 할까요

다양한 옵션이 있습니다. 맵 마이그레이션, 사전 모드(일명 "느린 모드"). 이 영역에서 탐구할 것이 많으며 제가 이 글을 즐긴 만큼 여러분도 즐기시길 바랍니다 -- 읽어주셔서 감사합니다!
