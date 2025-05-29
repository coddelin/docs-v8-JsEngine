---
title: 'V8のMaps（隠しクラス）'
description: 'V8はどのようにしてオブジェクトの構造を認識し、それを最適化するのか？'
---

V8が隠しクラスを構築する方法を示しましょう。主要なデータ構造は以下の通りです:

- `Map`: 隠しクラスそのもの。オブジェクトの最初のポインタ値であり、これにより2つのオブジェクトが同じクラスを持っているかどうかを簡単に比較できます。
- `DescriptorArray`: このクラスが持つすべてのプロパティの完全なリストと、それに関する情報。一部の場合では、プロパティの値もこの配列内に存在します。
- `TransitionArray`: この`Map`から兄弟`Map`への「エッジ」の配列。各エッジはプロパティ名であり、「現在のクラスにこの名前でプロパティを追加した場合、どのクラスに移行するか」を示します。

多くの`Map`オブジェクトは、他の`Map`への1つの移行しか持たない（つまり、「一時的な」マップであり、他のものに移行する途中にのみ使用）ため、V8は必ずしも完全な`TransitionArray`を作成しません。代わりに、直接その「次」の`Map`にリンクします。指し示される`Map`の`DescriptorArray`内で移行に関連付けられた名前を理解するために、システムは少し探る必要があります。

これは非常に奥深いテーマです。ただし、この記事の概念を理解していれば、将来的な変更内容も少しずつ理解できるはずです。

## なぜ隠しクラスが必要なのか？

もちろん、V8は隠しクラスなしでも動作可能です。各オブジェクトをプロパティの袋として扱うでしょう。しかし、非常に有用な原則が置き去りにされることになります。それは、インテリジェントデザインの原則です。V8は、ユーザーが作成するオブジェクトの種類が限られていること、および各オブジェクトの種類が典型的な使用方法に従うことを推測します。「後に明らかになる」使用方法と言う理由は、JavaScriptがスクリプト言語であり、事前コンパイルされないからです。したがって、V8は次に何が来るかわかりません。インテリジェントデザインの活用（つまり、入力するコードに知性があると仮定すること）のため、V8は監視と待機を行い、構造の感覚が浸透するまで観察します。隠しクラスメカニズムはこれを行う主要手段です。もちろん、高度なリスニングメカニズムが前提となっており、それがインラインキャッシュ（ICs）であり、多くの記事がこれについて書かれています。

これが必要で有用な作業だと納得したなら、私に従ってください！

## 例

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

m1 = new Peak("マッターホルン", 4478, 1040);
m2 = new Peak("ヴェンデルシュタイン", 1838, "良い");
```

このコードで、`Peak`関数に接続されたルートマップ（初期マップとも呼ぶ）から興味深いマップツリーをすでに取得しています:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="隠しクラス例" loading="lazy"/>
</figure>

各青いボックスはマップであり、初期マップで始まります。これは、何らかの方法でプロパティを一つも追加せずに`Peak`関数を実行した場合に返されるオブジェクトのマップです。後続のマップは、マップ間のエッジに記載されている名前のプロパティを追加することで得られるマップです。各マップは、そのマップのオブジェクトに関連付けられたプロパティのリストを持っています。さらに、各プロパティの正確な場所を示します。最後に、これらのマップのいずれか、例えば`Map3`（`extra`引数に`Peak()`で数値を渡した場合に得られるオブジェクトの隠しクラス）から、初期マップまで逆リンクを辿ることができます。

これをもう一度、追加情報を加えた描画をしてみましょう。(i0)、(i1)の注記は、インオブジェクトフィールドの位置0, 1などを示します:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="隠しクラス例" loading="lazy"/>
</figure>

この時点で、`Peak`オブジェクトを少なくとも7つ作成する前にこれらのマップを詳細に調べると、**スラック追跡**に遭遇し、混乱するかもしれません。私はその件について[別の記事](https://v8.dev/blog/slack-tracking)を書いています。あと7つオブジェクトを作成すれば完了します。この時点で、あなたの`Peak`オブジェクトにはちょうど3つのインオブジェクトプロパティがあり、オブジェクト内に直接追加する可能性はありません。追加のプロパティはオブジェクトのプロパティバックストアにオフロードされます。それは単なるプロパティ値の配列であり、そのインデックスはマップ（正確には、そのマップに付属する`DescriptorArray`）から取得されます。新しい行で`m2`にプロパティを追加し、再びマップツリーを見てみましょう:

```javascript
m2.cost = "片腕、片足";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="隠しクラス例" loading="lazy"/>
</figure>

ここに何かを忍び込ませました。すべてのプロパティは「const」と注釈されています。これは、V8の観点から、コンストラクター以来誰もそれらを変更していないことを意味するため、初期化後は定数と見なされます。TurboFan（最適化コンパイラー）はこれを好みます。関数が `m2` を定数グローバルとして参照する場合、`m2.cost` の検索はフィールドが定数としてマークされているためコンパイル時に行うことができます。この点についてはこの記事の後半で再び触れます。

プロパティ「cost」は `const p0` としてマークされていることに注意してください。これは、オブジェクト自体ではなく、**プロパティのバックストア**のインデックス0に格納された定数プロパティであることを意味します。これはオブジェクトに十分なスペースがないためです。この情報は `%DebugPrint(m2)` に表示されます:

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

4つのプロパティがあり、すべてconstとしてマークされていることがわかります。最初の3つはオブジェクト内にあり、最後の1つは `properties[0]` にあり、これはプロパティのバックストアの最初のスロットを意味します。それを見てみましょう:

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

追加のプロパティは、突然さらに追加する場合に備えてそこにあります。

## 実際の構造

ここで私たちは異なることを行うことができますが、この記事をここまで読んだあなたはV8をかなり気に入っているはずなので、冒頭で触れた「Map」、「DescriptorArray」、「TransitionArray」といった本当のデータ構造を描いてみたいと思います。隠れクラス概念が裏で構築されていることに関するアイデアを少し得た今、適切な名前と構造を通じてコードにもっと近づけるように考えを結びつけるべきです。まず、**DescriptorArrays** を描いてみます。これらは特定のMapのためのプロパティのリストを保持します。これらの配列は共有できます。その鍵となるのは、Map自体がDescriptorArrayで見てよいプロパティの数を知っていることです。プロパティは追加された時間順に並んでいるため、これらの配列は複数のMapで共有できます。以下をご覧ください:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="隠れクラスの例" loading="lazy"/>
</figure>

**Map1**、**Map2**、**Map3** がすべて **DescriptorArray1** を指していることに注意してください。各Mapの「descriptors」フィールドの横の数字は、DescriptorArray内でそのMapに属するフィールドがいくつあるかを示しています。たとえば、**Map1** は「name」プロパティのみを知っているため、**DescriptorArray1** にリストされている最初のプロパティのみを見ます。一方、**Map2** は「name」と「height」の2つのプロパティを持っているため、**DescriptorArray1** の最初と2番目の項目を見ます（nameとheight）。この種の共有は多くのスペースを節約します。

当然ながら、分割がある場合は共有できません。「experience」プロパティが追加されると、Map2からMap4への移行があり、「prominence」プロパティが追加されるとMap3への移行があることになります。**Map4** と **Map5** が **DescriptorArray2** を **DescriptorArray1** が3つのMap間で共有されたのと同じ方法で共有しているのが見て取れます。

私たちの「現実的な」図から欠けている唯一のものは、まだ比喩的である`TransitionArray`です。それを変更しましょう。私は**バックポインター**のラインを削除する自由を取りました。それにより全体的にすっきりします。ただし、ツリー内の任意のMapから上へもツリーを歩くことができることを覚えておいてください。

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="隠れクラスの例" loading="lazy"/>
</figure>

この図は研究に値します。**質問：新しいプロパティ「rating」が「name」の後に追加され、「height」や他のプロパティへ進まなかった場合、何が起こるでしょうか？**

**回答**: Map1は本当の**TransitionArray**を得て、分岐点を追跡できるようになります。プロパティ*height*が追加される場合は、**Map2**に移行すべきです。ただし、プロパティ*rating*が追加される場合は、新しいMap、**Map6**に移行すべきです。このMapは*name*と*rating*に言及する新しいDescriptorArrayを必要とします。オブジェクトにはこの時点で余分な空きスロットがあり（3つのうち1つしか使用されていない）、プロパティ*rating*はそのスロットの1つに割り当てられます。

*私は `%DebugPrintPtr()` を使って答えを確認し、以下の図を描きました:*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="隠れクラスの例" loading="lazy"/>
</figure>

私に止めてくれと頼む必要はありません、このような図の上限がこれだということが分かりました！でも、部品がどのように動くかを感じ取ることができると思います。もし、この代替属性*rating*を追加した後に、*height*、*experience*、*cost*を続けて追加したと想像してみてください。まあ、**Map7**、**Map8**、**Map9**を作成する必要があるでしょう。この属性を既存のマップチェーンの途中に追加したために、多くの構造が複製されることになります。この図を描く気力はありませんが、もしその図を送っていただければ、このドキュメントに追加しますよ :)。

私が使った便利な[DreamPuf](https://dreampuf.github.io/GraphvizOnline)プロジェクトで、簡単に図を制作しました。以前の図への[リンク](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D)があります。

## TurboFanとconst属性

ここまでのところ、これらのフィールドはすべて`DescriptorArray`で`const`とマークされています。これを少しいじってみましょう。次のコードをデバッグビルドで実行してください：

```javascript
// 実行方法:
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// Slack trackingを完了する
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "腕一本と脚一本";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

最適化された`foo()`関数の出力が表示されます。コードは非常に短いです。そして関数の最後に以下が表示されます：

```
...
40  mov eax,0x2a812499          ;; オブジェクト: 0x2a812499 <String[16]: #腕一本と脚一本>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; "腕一本と脚一本"を返す!
```

TurboFanは一種のおちゃめで、`m2.cost`の値を直接埋め込みました。どう思いますか！

もちろん、最後の`foo()`の呼び出し後に次の行を挿入することができます：

```javascript
m2.cost = "計り知れない価値";
```

何が起こると思いますか？確実なのは、`foo()`をそのままにしておけないということです。間違った結果を返すことになります。プログラムを再実行し、`--trace-deopt`フラグを追加して、最適化されたコードがシステムから削除されたことを通知してもらいましょう。最適化された`foo()`の出力後に以下の行が表示されます：

```
[マークされた従属コード 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) を非最適化に、
    理由: field-const]
[すべてのコンテキストのマークされたコードを非最適化]
```

驚きです。

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="非常に気に入っています" loading="lazy"/>
</figure>

再最適化を強制すると、完璧とまではいかないコードが生成されますが、それでも説明してきたMap構造の恩恵を大いに受けることができます。図から思い出してください、プロパティ*cost*はオブジェクトのバックアップストア内の最初のプロパティです。そう、const属性を失ったかもしれませんが、そのアドレスはまだ保持されています。基本的には、**Map5**というマップを持つオブジェクトで、グローバル変数`m2`がまだそのマップを持っていることを確かめた上で、次のような操作を行う必要があります:

1. プロパティのバックアップストアをロードし、
2. 最初の配列要素を読み出します。

それを確認してみましょう。このコードを最後の行の下に追加してください:

```javascript
// foo()の再最適化を強制する。
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

では、生成されたコードを見てみましょう:

```
...
40  mov ecx,0x42cc8901          ;; オブジェクト: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; プロパティのバックアップストアをロード
48  mov eax,[ecx+0x7]           ;; 最初の要素を取得
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; eaxレジスターで返します！
```

本当にそうです。まさに私たちが起こるべきと言った通りですね。もしかすると、私たちは何かを理解し始めたのかもしれません。

TurboFanは、変数`m2`が異なるクラスに変更された場合、非常に賢く再最適化を解除します。以下のような何か面白いコードを試して、最新の最適化されたコードが再度解除されるのを確認できます:

```javascript
m2 = 42;  // ふふ。
```

## ここからどこへ進むべきか

多くの選択肢があります。Mapマイグレーション、辞書モード（別名「スローモード」）など。この分野には探るべきことがたくさんあり、私自身が楽しんだように、あなたも楽しんでくださることを願っています -- 読んでいただきありがとうございました！
