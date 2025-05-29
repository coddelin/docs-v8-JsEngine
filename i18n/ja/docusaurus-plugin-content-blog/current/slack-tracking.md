---
title: "V8におけるスラック追跡"
author: "Michael Stanton ([@alpencoder](https://twitter.com/alpencoder))、スラックの達人として知られる人物"
description: "V8スラック追跡メカニズムの詳細な解説。"
avatars:
 - "michael-stanton"
date: 2020-09-24 14:00:00
tags:
 - internals
---
スラック追跡は、新しいオブジェクトに実際に使用するサイズよりも**大きな初期サイズ**を与える方法であり、これにより迅速に新しいプロパティを追加できます。そして一定期間後、使われていないスペースをシステムに**魔法のように返却**します。すごいでしょ？

<!--truncate-->
これは特に便利です。なぜならJavaScriptには静的クラスがないからです。システムは「パッと見」だけではプロパティ数を把握することができません。エンジンは段階的にそれを経験します。次のコードを読むとき、

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

エンジンがパフォーマンスを発揮するための全てを知っているように思えるかもしれません。結局、オブジェクトには2つのプロパティがあると教えていますよね。しかし、V8はその後何が起こるかわかりません。このオブジェクト`m1`は、さらに10個のプロパティを追加する別の関数に渡される可能性があります。スラック追跡は、静的コンパイルによる全体的な構造推論がない環境で、何が次に来るかに対応する必要性から生まれました。それは、実行に一般的に言えることだけを基盤としている他のV8メカニズムと似ています。たとえば：

- ほとんどのオブジェクトはすぐに死に、少数が長く生きる — ガベージコレクションの「世代仮説」。
- プログラムには確かに組織構造がある — 我々は[形状または「隠しクラス」](https://mathiasbynens.be/notes/shapes-ics)（V8ではこれを**マップ**と呼んでいます）を構築します。これはプログラマーが使用するオブジェクトについて見たものを基に作られます。*ちなみに、[V8のFast Properties](/blog/fast-properties)は、マップやプロパティアクセスに関する興味深い詳細を語る素晴らしい記事です。*
- プログラムには初期化状態があり、そこではすべてが新しく、何が重要かを見極めるのが難しいです。その後、重要なクラスや関数はその継続的な使用から特定される — フィードバック制御とコンパイラパイプラインはこのアイデアから生まれます。

最後に最も重要なのは、ランタイム環境が非常に高速でなければならないことです。さもなくば、それはただの哲学です。

さて、V8は単にプロパティをメインオブジェクトに付随するバックストアに格納することもできます。このバックストアは、直接オブジェクトに存在するプロパティとは異なり、コピーとポインタ差し替えを通じて無限に拡張できます。しかし、プロパティへの最速のアクセスは、その間接参照を避け、オブジェクトの先頭から固定されたオフセットを参照することによって達成されます。以下に、2つのインオブジェクトプロパティを持つ通常のJavaScriptオブジェクトのV8ヒープ内レイアウトを示します。最初の3ワードは、すべてのオブジェクトで標準的なものであり（マップへのポインタ、プロパティバックストアへのポインタ、要素バックストアへのポインタ）、次のオブジェクトと密接しているため、このオブジェクトは「成長」できません：

![](/_img/slack-tracking/property-layout.svg)

:::note
**注:** プロパティバックストアの詳細は、省略しましたが、ここで重要なのは、それがいつでもより大きなものに置き換えることができるということだけです。ただし、これもまたV8ヒープ上のオブジェクトであり、そこに存在するすべてのオブジェクトのようにマップポインタを持っています。
:::

とにかく、インオブジェクトプロパティによるパフォーマンス上の利点があるため、V8は各オブジェクトに追加のスペースを提供し、**スラック追跡**はその方法です。最終的にあなたは落ち着き、新しいプロパティを追加するのをやめて、ビットコインの採掘やその他の作業に取り掛かるでしょう。

V8はどれくらいの「時間」を与えるのでしょうか？抜け目なく、特定のオブジェクトを構築した回数を考慮します。実際、マップにはカウンターがあり、システムのより神秘的なマジックナンバーの1つである**7**に初期化されています。

もう1つの質問は、V8はオブジェクトボディにどれだけ余分なスペースを提供するべきかをどのようにして知っているのかということです。それは実際には、コンパイルプロセスからのヒントを得ています。コンパイルプロセスは、開始時のプロパティ数を推定値で提供します。この計算にはプロトタイプオブジェクトからプロパティの数が含まれ、プロトタイプチェーンに沿って再帰的に計算が行われます。そして、最後におまけとして**8**を追加します（これもマジックナンバーです！）。この計算は`JSFunction::CalculateExpectedNofProperties()`で確認できます：

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

    // スーパークラスのコンストラクタは、利用可能なプロパティ数に応じてコンパイルされる必要があります。
    // プロパティ数に見合ったコンパイルが必要です。
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // 見積もりが妥当であるか確認します。
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // コンパイルエラーの場合、プロトタイプチェーン内のビルトイン関数を探すために処理を続行します。
      // 必要なプロパティ数が設定されている可能性があるためです。
      continue;
    }
  }
  // In-objectスラックトラッキングは、後で冗長なin-objectスペースを回収するため、
  // 最初は少なくとも8スロット余裕を持って調整します。
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

以前の`m1`オブジェクトを見てみましょう：

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

`JSFunction::CalculateExpectedNofProperties`の計算と`Peak()`関数を考えると、我々はin-objectプロパティを2つ持つ必要があり、スラックトラッキングのおかげでさらに8つ追加されます。`m1`を`%DebugPrint()`で出力できます（この便利な関数はマップ構造を表示します。 `d8`を `--allow-natives-syntax` フラグを付けて実行すると使用可能です）：

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

オブジェクトのインスタンスサイズが52であることに注意してください。 V8のオブジェクトレイアウトは次のようになっています：

| ワード | 内容                                                  |
| ---- | ------------------------------------------------ |
| 0    | マップ                                              |
| 1    | プロパティ配列へのポインタ                        |
| 2    | 要素配列へのポインタ                              |
| 3    | in-objectフィールド1（文字列`"Matterhorn"`へのポインタ） |
| 4    | in-objectフィールド2（整数値`4478`）               |
| 5    | 未使用のin-objectフィールド3                      |
| …    | …                                                |
| 12   | 未使用のin-objectフィールド10                     |

この32ビットバイナリではポインタサイズは4なので、すべての標準的なJavaScriptオブジェクトが持つ最初の3つのワードに加え、さらに10の追加ワードがオブジェクトに含まれます。上記にあるように幸いにも「未使用プロパティフィールド」が8つあります。このようにスラックトラッキングが行われ、オブジェクトは貴重なバイトを貪欲に消費しています。

では、どうやってこれを減らすのでしょうか？ マップ上のconstruction counterフィールドを使用します。カウンターがゼロに達すると、スラックトラッキングが終了します。ただし、さらに多くのオブジェクトを構築しても、上記のカウンターが減少しないことが分かります。なぜでしょうか？

それは、上記に表示されているマップが`Peak`オブジェクトの「基底」マップではないからです。このマップは、コンストラクタコードの実行前に`Peak`オブジェクトに割り当てられる**初期マップ**から派生したマップチェーン内のリーフマップに過ぎません。

初期マップを見つけるにはどうすればよいでしょうか？ 幸運にも、関数`Peak()`にはその初期マップへのポインタがあります。その初期マップ内のconstruction counterを使ってスラックトラッキングを制御します。

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 関数プロトタイプ: 0x37449c89 <Object map = 0x2a287335>
 - 初期マップ: 0x46f07295 <Map(HOLEY_ELEMENTS)>   // ここに初期マップがあります。
 - 共有情報: 0x31c12495 <SharedFunctionInfo Peak>
 - 名前: 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtrを使用して初期マップを出力できます。
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Map]
 - タイプ: JS_OBJECT_TYPE
 - インスタンスサイズ: 52
 - オブジェクト内プロパティ: 10
 - 要素種別: HOLEY_ELEMENTS
 - 未使用プロパティフィールド: 10
 - 列挙長さ: 無効
 - バックポインタ: 0x28c02329 <undefined>
 - プロトタイプ有効性セル: 0x47f0232d <Cell value= 1>
 - インスタンス記述子 (own) #0: 0x28c02135 <DescriptorArray[0]>
 - 遷移 #1: 0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9: [String] in ReadOnlySpace: #name:
         (遷移先 (const データフィールド, 属性: [WEC]) @ Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - プロトタイプ: 0x5cc09c7d <Object map = 0x46f07335>
 - コンストラクタ: 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - 依存コード: 0x28c0212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - 構築カウンタ: 5
```

構築カウンタが5に減少しているのがわかりますか？上で示した2プロパティマップから初期マップを見つけたい場合は、`%DebugPrintPtr()`を使用してバックポインタをたどり、バックポインタスロットに`undefined`が入っているマップに到達するまで繰り返してください。それが上記のこのマップです。

さて、初期マップからプロパティを追加するたびに分岐する形でマップツリーが成長します。これらの分岐を_transition_と呼びます。上記の初期マップの出力を見て、「name」というラベルがついた遷移を確認してください。この時点までのマップツリー全体は次のようになります。

![(X, Y, Z)はそれぞれ(インスタンスサイズ, オブジェクト内プロパティ数, 未使用プロパティ数)を表します。](/_img/slack-tracking/root-map-1.svg)

プロパティ名に基づいたこれらの遷移は、JavaScriptの[“blind mole”](https://www.google.com/search?q=blind+mole&tbm=isch)が背後でマップを構築する方法です。この初期マップは`Peak`関数にも格納されているため、コンストラクタとして使用された場合、そのマップを使用して`this`オブジェクトを設定できます。

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

`m7`を作成した後、再度`%DebugPrint(m1)`を実行すると、驚くべき新しい結果が得られます。

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - map: 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x5cd086cd <Object map = 0x4b387335>
 - elements: 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x586421a1 <FixedArray[0]> {
    0x586446f9: [String] in ReadOnlySpace: #name:
        0x51112439 <String[10]: #Matterhorn> (const データフィールド 0)
    0x51112415: [String] in OldSpace: #height:
        4478 (const データフィールド 1)
 }
0x4b387385: [Map]
 - タイプ: JS_OBJECT_TYPE
 - インスタンスサイズ: 20
 - オブジェクト内プロパティ: 2
 - 要素種別: HOLEY_ELEMENTS
 - 未使用プロパティフィールド: 0
 - 列挙長さ: 無効
 - 安定したマップ
 - バックポインタ: 0x4b38735d <Map(HOLEY_ELEMENTS)>
 - プロトタイプ有効性セル: 0x511128dd <Cell value= 0>
 - インスタンス記述子 (own) #2: 0x5cd087e5 <DescriptorArray[2]>
 - プロトタイプ: 0x5cd086cd <Object map = 0x4b387335>
 - コンストラクタ: 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - 依存コード: 0x5864212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - 構築カウンタ: 0
```

現在のインスタンスサイズは20で、5ワードに相当します。

| ワード | 含まれている内容                |
| ---- | ----------------------------- |
| 0    | マップへのポインタ             |
| 1    | プロパティ配列へのポインタ      |
| 2    | 要素配列へのポインタ           |
| 3    | name                          |
| 4    | height                        |

これはどうしてこうなったのか不思議かもしれません。このオブジェクトがメモリに配置され、かつて10のプロパティを持っていた場合、なぜシステムがこれらの未使用8ワードの存在を許容できるのか？実際、それらに何か面白いものを詰めることは一度もなかったのは確かです ― それが手助けになるかもしれません。

これらのワードが放置されることを懸念している理由が気になる場合、ガベージコレクタに関する背景を知る必要があります。オブジェクトは一つずつ配置され、V8のガベージコレクタはそのメモリ内の内容を追跡するため、メモリ全体を何度も歩き回ります。メモリの最初のワードから開始し、マップへのポインタを見つけることを期待します。そこからインスタンスサイズを読み取り、次の有効なオブジェクトへのステップを計算します。一部のクラスではさらに長さを計算する必要がありますが、それだけです。

![](/_img/slack-tracking/gc-heap-1.svg)

上記の図では、赤いボックスが**マップ**、白いボックスがオブジェクトのインスタンスサイズを埋めるワードです。ガベージコレクタはマップからマップへと移動し、ヒープを「歩く」ことができます。

では、マップが突然インスタンスサイズを変更したらどうなるでしょうか？この場合、GC（ガベージコレクタ）がヒープを歩くと、以前は見られなかったワードを見ることになります。例えば、`Peak`クラスでは、占有するワード数が13から5に変わります（未使用のプロパティワードを黄色で色付けしました）：

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

これを処理するには、未使用のプロパティを**インスタンスサイズ4の「フィラーマップ」**で巧妙に初期化すれば良いのです。この方法で、GCがそれらに到達した際に軽く「歩く」ことができます。

![](/_img/slack-tracking/gc-heap-4.svg)

この処理は`Factory::InitializeJSObjectBody()`のコードで表現されています：

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <削除された行>

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

  // <削除された行>
}
```

これが実際のスラック追跡です。クラスを作成するたびに、しばらくの間は多くのメモリを消費しますが、7回目のインスタンス化で「良し」とし、GCに未使用のスペースを公開します。この一語だけのオブジェクトには所有者がいません（誰もそれを指していない）、そのためコレクションが発生した場合、それらは解放され、生きているオブジェクトがコンパクト化されてスペースを節約します。

以下の図は、この初期マップに対するスラック追跡が**終了**したことを示しています。インスタンスサイズは現在20（5ワード：マップ、プロパティとエレメント配列、およびさらに2スロット）です。スラック追跡は初期マップからのチェーン全体を尊重します。つまり、初期マップの子孫がこれらの初期追加プロパティすべてを使用する場合、初期マップはそれらを保持し、それを未使用としてマークします：

![(X, Y, Z)は(インスタンスサイズ、インオブジェクトプロパティ数、未使用プロパティ数)を意味します。](/_img/slack-tracking/root-map-2.svg)

スラック追跡が終了した後、これらの`Peak`オブジェクトの1つに新しいプロパティを追加したらどうなるでしょうか？

```js
m1.country = 'Switzerland';
```

V8はプロパティバックストアに移動する必要があります。結果として次のオブジェクトレイアウトが得られます：

| ワード | 値                                  |
| ---- | ------------------------------------- |
| 0    | マップ                                |
| 1    | プロパティのバックストアへのポインタ    |
| 2    | エレメントへのポインタ（空配列）         |
| 3    | 文字列`"Matterhorn"`へのポインタ         |
| 4    | `4478`                                |

プロパティバックストアは次のようになります：

| ワード | 値                                 |
| ---- | --------------------------------- |
| 0    | マップ                              |
| 1    | 長さ（3）                           |
| 2    | 文字列`"Switzerland"`へのポインタ   |
| 3    | `undefined`                        |
| 4    | `undefined`                        |
| 5    | `undefined`                        |

もし追加のプロパティを追加する場合に備えて、これらの余分な`undefined`値があります。これまでのあなたの行動を見ると、追加するかもしれないと考えています！

## 任意のプロパティ

ある場合にのみプロパティを追加することがあるかもしれません。たとえば、高さが4000メートル以上の場合、`prominence`と`isClimbed`という2つの追加プロパティを追跡したいと考えます：

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

いくつかのバリエーションを追加します：

```js
const m1 = new Peak('Wendelstein', 1838);
const m2 = new Peak('Matterhorn', 4478, 1040, true);
const m3 = new Peak('Zugspitze', 2962);
const m4 = new Peak('Mont Blanc', 4810, 4695, true);
const m5 = new Peak('Watzmann', 2713);
const m6 = new Peak('Zinalrothorn', 4221, 490, true);
const m7 = new Peak('Eiger', 3970);
```

この場合、オブジェクト`m1`、`m3`、`m5`、および`m7`は1つのマップを持ち、オブジェクト`m2`、`m4`、および`m6`は追加プロパティのため、初期マップの子孫のチェーンのさらに下にあるマップを持ちます。このマップファミリに対してスラック追跡が終了した場合、以前のように**2**つではなく、**4**つのインオブジェクトプロパティが存在します。これはスラック追跡が、初期マップ以下のツリーマップ内の子孫によって使用される最大数のインオブジェクトプロパティに十分な余地を保持するようにしているためです。

以下は上記のコードを実行した後のマップファミリを示しており、もちろんスラック追跡は完了しています：

![(X, Y, Z)は(インスタンスサイズ、インオブジェクトプロパティ数、未使用プロパティ数)を意味します。](/_img/slack-tracking/root-map-3.svg)

## 最適化されたコードに関しては？

スラックトラッキングが終了する前に、最適化されたコードをコンパイルしましょう。いくつかのネイティブ構文コマンドを使用して、スラックトラッキングが終了する前に最適化されたコンパイルを実行します。

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

これで、最適化されたコードをコンパイルして実行するために十分です。TurboFan（最適化コンパイラ）で「[Create Lowering](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27)」と呼ばれる処理を行い、オブジェクトの割り当てをインライン化します。つまり、生成するネイティブコードがオブジェクトのインスタンスサイズを取得するためにGCに指示を発し、その後慎重にこれらのフィールドを初期化します。しかし、もしスラックトラッキングが後で停止した場合、このコードは無効になります。それをどのように解決すればよいでしょうか？

簡単です！このマップファミリーのスラックトラッキングを早めに終了させるだけです。これは理にかなっています。なぜなら、通常は何千ものオブジェクトが作成されるまでは最適化された関数をコンパイルしないからです。つまり、スラックトラッキングは*すでに終了しているべき*なのです。もしそうでない場合？まぁ、それはしょうがないです。その時点で7個未満しか作成されていないオブジェクトは、それほど重要ではないはずです。（通常、プログラムが長時間実行された後にのみ最適化を行います。）

### バックグラウンドスレッドでのコンパイル

メインスレッドで最適化されたコードをコンパイルすることができます。この場合、スラックトラッキングを早めに終了し、初期マップを変更する呼び出しを行うことが可能です。なぜなら、実行環境が停止しているからです。しかし、できるだけバックグラウンドスレッドでコンパイルを行います。このスレッドでは、*JavaScriptが実行されているメインスレッドで初期マップが変更される可能性があるため*、初期マップに触れるのは危険です。したがって、私たちの手法は以下のようになります。

1. **推測**する：今スラックトラッキングを終了させた場合のインスタンスサイズを予測します。このサイズを覚えておきます。
1. コンパイルがほぼ完了したら、メインスレッドに戻り、まだスラックトラッキングが終了していなかった場合、安全にその終了を強制します。
1. チェック：インスタンスサイズが予測した通りか？もしそうなら、**成功です！** そうでない場合、コードオブジェクトを破棄して後で再試行します。

この処理をコードで確認したい場合は、[`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc) クラスと、それが `js-create-lowering.cc` 内でインライン割り当てを作成するためにどのように使用されているかを見てみてください。`PrepareInstall()` メソッドはメインスレッドで呼び出され、スラックトラッキングの完了を強制します。その後、`Install()` メソッドがインスタンスサイズの予測が正しいかを検証します。

以下は、インライン割り当てを含む最適化されたコードです。まず、GCとの通信があり、インスタンスサイズでポインタを前進させてそれを取得できるかどうかを確認しています（これをバンプポインタ割り当てと言います）。その後、新しいオブジェクトのフィールドを埋め始めます。

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; おいGC、28 (0x1c) バイトください。
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; 大丈夫、GC。もらいました。よろしく。
61  add ecx,0x1                 ;; よっしゃ。ecx が私の新しいオブジェクトです。
64  mov edi,0x46647295          ;; オブジェクト: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; 初期マップを格納。
6c  mov edi,0x56f821a1          ;; オブジェクト: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; プロパティ格納領域 (空)
74  mov [ecx+0x7],edi           ;; エレメント格納領域 (空)
77  mov edi,0x56f82329          ;; オブジェクト: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; オブジェクト内プロパティ 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; オブジェクト内プロパティ 2 <-- undefined
82  mov [ecx+0x13],edi          ;; オブジェクト内プロパティ 3 <-- undefined
85  mov [ecx+0x17],edi          ;; オブジェクト内プロパティ 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; 引数 {a1} を取得
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; オブジェクト: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; マップを進める
9e  mov [ecx+0xb],edi           ;; name = {a1}
a1  mov eax,[ebp+0x10]          ;; 引数 {a2} を取得
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; オブジェクト: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; マップを進める
b4  mov [ecx+0xf],eax           ;; height = {a2}
b7  cmp eax,0x1f40              ;; height >= 4000 ?
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 start --
                  -- B9 start --
c2  mov edx,[ebp+0x14]          ;; 引数 {a3} を取得
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; オブジェクト: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; マップを前進させる
d6  mov [ecx+0x13],edx          ;; prominence = {a3}
d9  mov esi,[ebp+0x18]          ;; 引数 {a4} を取得
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; オブジェクト: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; リーフマップまでマップを前進させる
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- B10 開始 (フレーム解体) --
f2  mov eax,ecx                 ;; この素晴らしいPeakオブジェクトを返す準備完了！
…
```

ちなみに、これを見るにはデバッグビルドを持っていて、いくつかのフラグを渡す必要があります。コードをファイルに入れて以下のように呼び出しました:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

楽しい探求だったことを願っています。イゴール・シェルドコ氏とマヤ・アーミヤノヴァ氏に、この投稿を（辛抱強く！）レビューしていただき、特別な感謝を申し上げます。
