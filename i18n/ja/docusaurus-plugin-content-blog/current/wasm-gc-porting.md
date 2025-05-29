---
title: &apos;ガベージコレクテッドプログラミング言語を効率的にWebAssemblyに導入する新しい方法&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2023-11-01
tags:
  - WebAssembly
tweet: &apos;1720161507324076395&apos;
---

[WebAssembly Garbage Collection (WasmGC)](https://developer.chrome.com/blog/wasmgc)に関する最近の記事では、[ガベージコレクション(GC)提案](https://github.com/WebAssembly/gc)が、人気のあるGC言語をWasmでより良くサポートする方法について高いレベルで説明されています。このことでいかに重要であるかがわかります。この記事では、Java、Kotlin、Dart、Python、C#のようなGC言語をWasmに移植するための技術的な詳細に踏み込んでいきます。実際には2つの主なアプローチがあります:

<!--truncate-->
- 「**従来型**」移植アプローチでは、言語の既存の実装をWasMVP、つまり2017年に導入されたWebAssemblyの最小限の実行可能プロダクトにコンパイルします。
- **WasmGC**移植アプローチでは、言語を最近のGC提案で定義されたWasm内のGC構造にコンパイルします。

これら2つのアプローチが何であるかと、それぞれの技術的なトレードオフ、特にサイズと速度に関して説明します。その際、WasmGCにはいくつかの大きな利点がある一方で、ツールチェーンや仮想マシン (VM) 両方で新しい作業が必要であることも確認します。この記事の後半では、V8チームがこれらの分野で何をしてきたか、ベンチマークの数値を含めて説明します。Wasm、GC、またはその両方に興味がある場合は、ぜひこの記事を興味深く読んでいただき、最後にあるデモや始め方のリンクもチェックしてください！

## 「従来型」移植アプローチ

言語は通常、新しいアーキテクチャにどのように移植されるのでしょうか？例えば、Pythonを[ARMアーキテクチャ](https://en.wikipedia.org/wiki/ARM_architecture_family)で動かしたい、またはDartを[MIPSアーキテクチャ](https://en.wikipedia.org/wiki/MIPS_architecture)で動かしたいとします。この場合の一般的なアイデアは、そのアーキテクチャ用にVMを再コンパイルすることです。そのほかに、VMがアーキテクチャ固有のコードを持っている場合、例えばジャストインタイム (JIT) コンパイルや事前コンパイル (AOT) を持っている場合には、新しいアーキテクチャ用のJIT/AOTバックエンドを実装します。このアプローチは非常に理にかなっています。なぜなら、コードの主要部分は新しいアーキテクチャごとに再コンパイルするだけで済むことが多いためです。


![移植されたVMの構造](/_img/wasm-gc-porting/ported-vm.svg "左: パーサー、ガベージコレクタ、オプティマイザ、ライブラリサポートなどを含むメインランタイムコード。右: x64、ARMなどのための個別バックエンドコード。")

この図では、パーサー、ライブラリサポート、ガベージコレクタ、オプティマイザなどは、すべてメインランタイムで全アーキテクチャ間で共有されています。新しいアーキテクチャへの移植には、それ専用の新しいバックエンドが必要です。これは比較的小量のコードとなります。

Wasmは低レベルなコンパイラターゲットであるため、従来型の移植アプローチが使用できるのは驚くことではありません。Wasmが最初に登場したときから、[Pyodide for Python](https://pyodide.org/en/stable/)や[C#のBlazor](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor)など、多くのケースでこれが実際によく機能するのを見てきました（なお、Blazorは[AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation)と[JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md)コンパイルの両方をサポートしているため、上記のすべての例に対応しています）。これらすべてのケースでは、言語のランタイムが他のプログラムと同様にWasmMVPにコンパイルされるため、その結果としてWasmMVPの線形メモリ、テーブル、関数などが使用されます。

前述のように、これは言語が新しいアーキテクチャに移植される方法として一般的であり、ほとんどの既存のVMコードや言語の実装、最適化を再利用できるという通常の理由で非常に理にかなった方法です。しかし、このアプローチにはいくつかのWasm固有の欠点があり、その点でWasmGCが役立つことになります。

## WasmGC移植アプローチ

簡潔に言えば、WebAssemblyのGC提案（「WasmGC」）では、構造体や配列型を定義し、それらのインスタンスを作成したり、フィールドを読み書きしたり、型間でキャストしたりといった操作を行うことができます（詳細は[提案の概要](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)を参照）。これらのオブジェクトはWasm VM自身のGC実装によって管理されます。これが従来の移植アプローチとの主な違いです。

これを次のように考えると役立つかもしれません: 「従来の移植アプローチが言語を**アーキテクチャ**に移植する方法であるならば、WasmGCアプローチは言語を**VM**に移植する方法に非常によく似ています」。例えば、JavaをJavaScriptに移植したい場合、[J2CL](https://j2cl.io)のようなコンパイラを使用して、JavaオブジェクトをJavaScriptオブジェクトとして表現することができます。そして、それらのJavaScriptオブジェクトは他のオブジェクトと同様にJavaScript VMによって管理されます。既存のVMに言語を移植する手法は非常に有用であり、[JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1)、[JVM](https://en.wikipedia.org/wiki/List_of_JVM_languages)、および[CLR](https://en.wikipedia.org/wiki/List_of_CLI_languages)にコンパイルされるすべての言語からその有用性が確認できます。

このアーキテクチャ/VMの比喩は完全に正確ではありません。特に、WasmGCは前述の他のVMよりも低レベルになることを意図しているためです。それでも、WasmGCはVM管理の構造体、配列、およびそれらの形状や関係を記述する型システムを定義しており、WasmGCへの移植はそれらのプリミティブを用いて言語の構造を表現するプロセスです。これは、WasmMVPへの従来型の移植よりも高レベルであり（これはすべてを線形メモリ内の型なしバイトに低下させます）、したがって、言語をVMに移植するプロセスに非常に似ています。また、そのような移植の利点も共有しており、特にターゲットVMとの良好な統合やその最適化の再利用が挙げられます。

## 2つのアプローチの比較

GC言語の移植における2つのアプローチについての理解が深まったところで、これらを比較してみましょう。

### メモリ管理コードの配布

実際には、多くのWasmコードは既にガベージコレクターを備えたVM内で実行されており、これはWebや[Node.js](https://nodejs.org/)、[workerd](https://github.com/cloudflare/workerd)、[Deno](https://deno.com/)、[Bun](https://bun.sh/)などのランタイムでのケースです。このような場所では、GCの実装を含めることはWasmバイナリのサイズを不必要に増加させる結果となります。実際、これはWasmMVPのGC言語だけでなく、C、C++、Rustのような線形メモリを使用する言語についても問題です。なぜなら、それらの言語で興味深い割り当てを行うコードは、線形メモリを管理するために`malloc/free`をバンドルする必要があり、数キロバイトのコードが必要になるからです。例えば、`dlmalloc`は6KBを必要とし、サイズを犠牲にして速度を重視した[`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ)でさえ1KB以上を消費します。一方で、WasmGCではVMが自動的にメモリ管理を行うため、Wasmにはメモリ管理コードが全く必要ありません。つまり、GCも`malloc/free`も不要です。[WasmGCに関する以前の記事](https://developer.chrome.com/blog/wasmgc)では、`fannkuch`ベンチマークのサイズが測定され、WasmGCはCやRustよりも大幅に小さいことが示されています—**2.3KB**対**6.1〜9.6KB**—まさにこの理由によります。

### 循環収集

ブラウザでは、WasmはしばしばJavaScript（そしてJavaScript経由でWeb API）と相互作用しますが、WasmMVP（そして[参照型](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)提案でさえ）の場合、WasmとJSの間に双方向リンクを設置し、循環を細かく収集する方法はありません。JSオブジェクトへのリンクはWasmテーブルにしか置くことができず、Wasmへの戻りリンクは1つの巨大なオブジェクトとしてWasm全体を参照することしかできません。以下のように:


![JSと全Wasmモジュール間の循環](/_img/wasm-gc-porting/cycle2.svg "個々のJSオブジェクトはWasm内の個々のオブジェクトではなく、1つの巨大なWasmインスタンスを参照します。")

これは、コンパイルされたVM内の一部とJavaScript内の一部にまたがる特定のオブジェクト循環を効率的に収集するには十分ではありません。一方WasmGCの場合、VMが認識するWasmオブジェクトを定義し、それによってWasmからJavaScriptへの参照およびその逆の適切なリンクを作成することができます:

![JSとWasmGCオブジェクト間の循環](/_img/wasm-gc-porting/cycle3.svg "JSおよびWasmオブジェクト間のリンク付き循環。")

### スタック上のGC参照

GC言語では、参照がスタックに存在していることを認識する必要があります。つまり、ローカル変数からの参照がオブジェクトを生かし続ける唯一のものかもしれないということです。GC言語の伝統的な移植方法では、それが問題になります。なぜなら、Wasmのサンドボックスによって、プログラムが自分自身のスタックを調査することが禁止されているからです。伝統的な移植方法には解決策があり、シャドウスタック（[自動的に実行可能](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)）や、JavaScriptイベントループのターン間のように、スタック上に何も存在しないときにのみガベージコレクションを実行する方法があります。伝統的な移植方法を支援する可能性のある将来的な追加機能としては、Wasmにおける[スタックスキャンのサポート](https://github.com/WebAssembly/design/issues/1459)があります。現在のところ、スタックの参照をオーバーヘッドなしで扱えるのはWasmGCだけであり、それは完全に自動的に行われます。なぜなら、Wasm VMがGCを担当しているからです。

### GCの効率性

関連する問題の1つは、ガベージコレクション（GC）を実行する際の効率性です。どちらの移植アプローチにも潜在的なメリットがあります。従来型の移植方式では、特定の言語に特化した最適化が組み込まれた既存のVMの最適化を再利用することができます。例えば、内部ポインタや短命なオブジェクトの最適化に注力する場合などです。対照的に、Web上で実行されるWasmGC移植方式は、JavaScriptのGCを高速化するために蓄積されたすべての技術を再利用する利点があります。これには、[世代別GC](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC))、[インクリメンタルコレクション](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent)などの技術が含まれます。さらに、WasmGCはGCをVMに任せるため、効率的なライトバリアなどが簡素化されます。

WasmGCのもう1つの利点は、GCがメモリの圧力を認識し、それに応じてヒープサイズや収集頻度を調整できることです。これはJavaScript VMがWeb上ですでに行っていることと同様です。

### メモリ断片化

時間が経過するにつれて、特に長時間実行されるプログラム内では、WasmMVP線形メモリでの`malloc/free`操作が*断片化*を引き起こす可能性があります。例えば、合計2MBのメモリがあり、その真ん中に数バイトの小さな割り当てが存在する状況を想像してください。C、C++、Rustのような言語では、ランタイムで任意の割り当てを移動することは不可能であるため、その割り当ての左にほぼ1MB、右にほぼ1MBの空きメモリがあります。しかし、それらは2つの異なる断片であるため、1.5MBを割り当てようとすると失敗します。未割り当てメモリはその量分存在しているにもかかわらず：


![](/_img/wasm-gc-porting/fragment1.svg "メモリの真ん中にある小さな意地悪な割り当てが自由な空間を2つに分割した線形メモリ")

このような断片化は、Wasmモジュールがメモリをより頻繁に拡張することを余儀なくされる可能性があり、これにより[オーバーヘッドが増加し、メモリ不足エラーが発生する](https://github.com/WebAssembly/design/issues/1397)可能性があります。[改善策](https://github.com/WebAssembly/design/issues/1439)が設計されていますが、これは困難な問題です。これは、GC言語の従来型移植を含むすべてのWasmMVPプログラムに共通する問題です（GCオブジェクト自体は移動可能かもしれませんが、ランタイムの一部はその限りではありません）。一方で、WasmGCではメモリは完全にVMによって管理されるため、GCヒープを圧縮して断片化を避けるように移動させることができ、この問題を回避します。

### 開発者ツールとの統合

WasmMVPへの従来型移植方式では、オブジェクトが線形メモリに配置されるため、開発者ツールが有用な情報を提供するのが難しくなります。これらのツールには、バイトしか表示されず、高レベルの型情報がありません。一方WasmGCでは、VMがGCオブジェクトを管理するため、より良い統合が可能です。例えばChromeでは、ヒーププロファイラを使用してWasmGCプログラムのメモリ使用量を測定できます。


![Chromeヒーププロファイラで実行されるWasmGCコード](/_img/wasm-gc-porting/devtools.png)

上の図は、Chrome DevToolsのメモリタブを示しており、WasmGCコードを実行したページのヒープスナップショットが表示されています。このコードは[[linked list]](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff)で、1,001個の小さなオブジェクトを作成しています。オブジェクトの型名`$Node`やリスト内の次のオブジェクトを参照するフィールド`$next`を見ることができます。オブジェクトの数、浅いサイズ、保持されたサイズなどの通常のヒープスナップショット情報がすべて含まれており、WasmGCオブジェクトが実際にどれだけのメモリを使用しているかを簡単に確認できます。他のChrome DevTools機能、例えばデバッガもWasmGCオブジェクトで正常に動作します。

### 言語セマンティクス

従来型移植方式でVMを再コンパイルすると、期待される正確な言語を得ることができます。これは、その言語を実装する既存のコードを実行するためです。これは大きな利点です！比較すると、WasmGC移植方式では効率性を求めてセマンティクスの妥協を考慮する可能性があります。その理由は、WasmGCでは新しいGC型（構造体や配列）を定義し、それにコンパイルするためです。その結果、C、C++、Rustなどの既存のコードベースをその形式に単純にコンパイルすることはできません。これらは線形メモリにのみコンパイルされるためです。したがって、WasmGCは既存のVMコードベースの大部分を手助けすることはできません。その代わりに、WasmGC移植では通常、新しいコードを書き、その言語の構成をWasmGCプリミティブに変換します。そしてその変換方法には複数のオプションがあり、それぞれ異なるトレードオフがあります。

妥協が必要かどうかは、特定の言語の構造をWasmGCでどのように実装できるかによって決まります。例えば、WasmGC構造体フィールドには固定されたインデックスと型があります。そのため、フィールドをより動的にアクセスしたい言語は[課題に直面する可能性があります](https://github.com/WebAssembly/gc/issues/397)。それを回避するさまざまな方法があり、その解決策の中には、よりシンプルで高速なオプションがあるものの、元の言語セマンティクスを完全にはサポートできないものがあります。（WasmGCには他にも現在の制限があり、例えば[内部ポインタ](https://go.dev/blog/ismmkeynote)がありません。こうした制限は時間とともに[改善されることが期待されています](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md)。）

これまで述べたように、WasmGCへのコンパイルは既存のVMへのコンパイルに似ており、そのような移植で妥協が意味をなす多くの例があります。例えば、[dart2js（DartをJavaScriptにコンパイルしたもの）の数値はDart VM内の振る舞いと異なる](https://dart.dev/guides/language/numbers)一方で、[IronPython（Pythonを.NETにコンパイルしたもの）の文字列はC#の文字列のように振る舞う](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html)といったケースがあります。その結果、言語のすべてのプログラムがそのような移植で動作するわけではありませんが、これらの選択には良い理由があります。例えば、dart2jsの数値をJavaScriptの数値として実装するとVMが効率よく最適化でき、IronPythonで.NETの文字列を使用すると他の.NETコードにオーバーヘッドなく文字列を渡すことができます。

WasmGC移植には妥協が必要な場合もありますが、特にJavaScriptと比較して、WasmGCはコンパイラのターゲットとしていくつかの利点を持っています。例えば、dart2jsには上述の数値の制約がありますが、[dart2wasm](https://flutter.dev/wasm)（DartをWasmGCにコンパイルしたもの）は妥協することなく完全に期待通りに動作します（これは、WasmがDartが必要とする数値型の効率的な表現を提供しているために可能です）。

では、なぜこれが従来の移植にとって問題ではないのでしょうか？それは、従来の方法では既存のVMをリニアメモリにリコンパイルするだけだからです。この方法では、オブジェクトが型のないバイト列で保存され、WasmGCよりも低レベルです。型のないバイトしかない場合、低レベル（場合によっては安全でない）なトリックのすべてを実行する柔軟性が大きく、それによって既存のVMが持つすべてのトリックをそのまま再利用できます。

### ツールチェーンへの取り組み

前のセクションで述べたように、WasmGC移植では単に既存のVMをリコンパイルするだけでは不十分です。特定のコード（例えば、パーサーロジックやAOT最適化など、実行時にGCと統合しないもの）は再利用できるかもしれませんが、一般的にWasmGC移植では新しいコードを大幅に追加する必要があります。

それに比べると、WasmMVPへの従来の移植はよりシンプルで迅速に行えることがあります。例えば、Cで書かれたLua VMをWasmにコンパイルするのにわずか数分しかかかりません。一方、LuaのWasmGC移植では、Luaの構造をWasmGCの構造体や配列として変換するコードを記述し、WasmGCの型システムの特定の制約内でそれを実際にどのように行うかを決定する必要があるため、より多くの努力が必要になります。

したがって、ツールチェーンへの負担の増加はWasmGC移植の大きなデメリットです。しかし、前述した利点を考慮すると、WasmGCは依然として非常に魅力的だと考えています！理想的な状況は、WasmGCの型システムがすべての言語を効率的にサポートでき、すべての言語がWasmGC移植を実装する努力をされた場合です。その最初の部分は、[WasmGC型システムへの将来の追加](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md)によって助けられ、2つ目については、ツールチェーン側での作業をできる限り共有することでWasmGC移植に必要な作業を削減することができます。幸いにも、WasmGCはツールチェーンの作業を非常に実用的に共有できることを示しており、それについては次のセクションで扱います。

## WasmGCの最適化

WasmGC移植には、ホストGCの最適化を再利用したり、メモリ使用量を減らしたりするなど、速度向上の可能性があることを既に述べました。このセクションでは、WasmMVPに比べてWasmGCの他の興味深い最適化の利点を示します。これらは、WasmGC移植の設計方法や最終的な結果の速度に大きな影響を与える可能性があります。

ここでの重要なポイントは、*WasmGCがWasmMVPより高レベルである*ということです。この直感をつかむために、WasmMVPへの従来の移植が新しいアーキテクチャへの移植に似ており、WasmGC移植が新しいVMへの移植に似ていると述べたことを振り返ってみましょう。VMはもちろんアーキテクチャよりも高レベルの抽象化であり、高レベルの表現はしばしば最適化しやすいものです。この点を疑似コードの具体例でより明確に見ることができます：

```csharp
func foo() {
  let x = allocate<T>(); // GCオブジェクトを割り当てる。
  x.val = 10;            // フィールドに10を設定する。
  let y = allocate<T>(); // 別のオブジェクトを割り当てる。
  y.val = x.val;         // これは10になる。
  return y.val;          // これも10になる。
}
```

コメントが示しているように、`x.val`には`10`が含まれ、`y.val`も同様に`10`になります。そのため、最終的な戻り値も`10`となり、さらに最適化によって割り当てが取り除かれ、このようになります：

```csharp
func foo() {
  return 10;
}
```

素晴らしいです！しかし残念ながら、これはWasmMVPではできません。なぜなら、各割り当てが`malloc`への呼び出しに変換され、これはWasm内のリニアメモリに副作用を持つ大きく複雑な関数だからです。その副作用の結果、オプティマイザーは2回目の割り当て（`y`のためのもの）がリニアメモリ内の`x.val`を変更するかもしれないと仮定しなければなりません。メモリ管理は複雑であり、低レベルでWasm内に実装すると、最適化の選択肢が制限されてしまいます。

これに対して、WasmGCではより高レベルで動作します：各割り当ては`struct.new`命令を実行し、これは実際に推論可能なVM操作であり、オプティマイザーは参照を追跡して`x.val`が値`10`でちょうど1回書き込まれることを結論付けることができます。その結果、この関数を期待通り単純に`10`を返すものに最適化できます！

割り当てに加えて、WasmGCが追加するものには、明示的な関数ポインタ（`ref.func`）やそれを使った呼び出し（`call_ref`）、構造体や配列フィールドの型（型のないリニアメモリとは対照的なもの）などがあります。その結果、WasmGCはWasmMVPよりも高レベルな中間表現（IR）であり、はるかに最適化可能です。

WasmMVPが限定された最適化可能性を持つとしても、なぜこれほど速いのでしょうか？Wasmは、完全なネイティブ速度に非常に近い速度で動作します。これは、WasmMVPが通常、LLVMのような強力な最適化コンパイラを出力するためです。LLVM IRは、WasmGCのように、WasmMVPとは異なり、割り当てなどを特別に表現します。そのため、LLVMは私たちが議論している内容を最適化することができます。WasmMVPの設計では、ほとんどの最適化がWasmの*前に*ツールチェーンレベルで行われ、Wasm VMは最終段階の最適化（例えば、レジスタ割り当て）しか行いません。

WasmGCはWasmMVPと同様のツールチェーンモデルを採用し、特にLLVMを使用することが可能ですか？残念ながら、そうではありません。LLVMはWasmGCをサポートしていないからです。（[ある程度は検討されています](https://github.com/Igalia/ref-cpp)が、完全なサポートがどのように機能するかを理解することは難しいです。）さらに、多くのGC言語はLLVMを使用していません。この分野にはさまざまなコンパイラツールチェーンが存在しています。そのため、WasmGCには別のものが必要です。

幸いなことに、前述したように、WasmGCは非常に最適化可能であり、それが新しい選択肢を広げてくれます。以下にその見方の一例を示します。

![WasmMVPとWasmGCのツールチェーンワークフロー](/_img/wasm-gc-porting/workflows1.svg)

WasmMVPとWasmGCの両方のワークフローは、左側の同じ2つのボックスから始まります。ソースコードは言語固有の方法で処理・最適化されます（各言語が自身を最もよく理解しているため）。その後、違いが現れます。WasmMVPの場合、一般的な最適化を最初に行い、次にWasmに降ろす必要がありますが、WasmGCの場合、最初にWasmに降ろして後で最適化するオプションがあります。これは、降ろした後に最適化する利点が非常に大きいため重要です。降ろした後であれば、WasmGCにコンパイルするすべての言語間で一般的な最適化のツールチェーンコードを共有できます。次の図はその様子を示しています。


![Binaryen最適化によって複数のWasmGCツールチェーンが最適化される様子](/_img/wasm-gc-porting/workflows2.svg "左側の複数の言語が中央のWasmGCにコンパイルされ、それがすべてBinaryen最適化（wasm-opt）に流れ込む。")

WasmGCにコンパイルした後に一般的な最適化を行えるため、Wasm-to-Wasm最適化ツールはすべてのWasmGCコンパイラツールチェーンを支援できます。この理由から、V8チームは[Binaryen](https://github.com/WebAssembly/binaryen/)におけるWasmGCに投資し、すべてのツールチェーンが`wasm-opt`コマンドラインツールとして使用できるようにしています。次の節ではこれを中心に焦点を当てます。

### ツールチェーンの最適化

[Binaryen](https://github.com/WebAssembly/binaryen/)は、WebAssemblyツールチェーンの最適化プロジェクトであり、すでにWasmMVPコンテンツ向けの[幅広い最適化](https://www.youtube.com/watch?v=_lLqZR4ufSI)を提供しています。インライン化、定数伝播、不要なコードの削除など、そのほぼすべてがWasmGCにも適用できます。しかし、前述のように、WasmGCはWasmMVPよりも多くの最適化を可能にし、それに応じて多くの新しい最適化を書きました。

- [エスケープ分析](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp)を使用してヒープ割り当てをローカルに移動。
- [デバーチャライゼーション](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp)を使用して間接呼び出しを直接呼び出しに変換（それによりインライン化可能になる場合あり）。
- [より強力なグローバル不要コード削除](https://github.com/WebAssembly/binaryen/pull/4621)。
- [全プログラム型認識内容フロー分析（GUFA）](https://github.com/WebAssembly/binaryen/pull/4598)。
- [キャストの最適化](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp)。冗長なキャストを削除したり、それを早い位置に移動したり。
- [型の剪定](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp)。
- [型の統合](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp)。
- 型の精緻化（[ローカル](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp)、[グローバル](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp)、[フィールド](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp)、[シグネチャ](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)向け）。

これは私たちが行っている作業の簡単なリストにすぎません。Binaryenの新しいGC最適化とその使用方法については、[Binaryenのドキュメント](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook)をご覧ください。

Binaryenでのこれらすべての最適化の効果を測定するために、Javaの性能を`wasm-opt`を使用した場合と使用しない場合で比較しましょう。[J2Wasm](https://github.com/google/j2cl/tree/master/samples/wasm)コンパイラから出力された、JavaをWasmGCにコンパイルする際の結果です。

![wasm-opt使用あり/なしのJava性能](/_img/wasm-gc-porting/benchmark1.svg "Box2D、DeltaBlue、RayTrace、Richardsのベンチマーク。すべてにおいてwasm-optによる改善が見られる。")

ここで、「wasm-optなし」とはBinaryenの最適化を実行しないことを意味しますが、VMおよびJ2Wasmコンパイラでは最適化を行います。図に示されているように、各ベンチマークで`wasm-opt`は大幅な速度向上を提供し、平均して**1.9倍**速くしています。

要約すると、`wasm-opt`はWasmGCにコンパイルする任意のツールチェインで使用可能であり、それぞれのツールチェインで汎用的な最適化を再実装する必要がなくなります。また、Binaryenの最適化が進むにつれて、`wasm-opt`を使用するすべてのツールチェインがその恩恵を受けます。これはLLVMの改善が、LLVMを使用してWasmMVPにコンパイルするすべての言語に利益をもたらすことと同じです。

ツールチェインの最適化は全体の一部に過ぎません。次に見るように、Wasm VM内の最適化も絶対に重要です。

### V8の最適化

先述の通り、WasmGCはWasmMVPよりも最適化可能であり、ツールチェインだけでなくVMも恩恵を受けることができます。そして、それが重要である理由は、GC言語がWasmMVPにコンパイルされる言語とは異なるからです。例えば、インライン化という重要な最適化の1つを考えてみましょう。C、C++、Rustのような言語ではコンパイル時にインライン化を行いますが、JavaやDartのようなGC言語では通常、VM内でランタイムにインライン化と最適化が行われます。この性能モデルは、言語設計やGC言語でのコードの書き方にも影響を与えています。

例えば、Javaのような言語ではすべての呼び出しは最初は間接的です（子クラスは親タイプの参照を使用して子を呼び出す際に親関数をオーバーライドできます）。ツールチェインが間接的な呼び出しを直接的なものに変えることができればメリットがありますが、実際のJavaプログラムのコードパターンでは、間接的な呼び出しが多いか、静的に推論できないものがしばしば存在します。このようなケースに対応するために、V8では**推測的インライン化**を実装しました。つまり、ランタイムで発生する間接的な呼び出しを記録し、呼び出しサイトの振る舞いが比較的単純である（呼び出しターゲットが少ない）場合、適切なガードチェックを加えてインライン化を行います。これにより、完全にツールチェインに任せるよりもJavaが通常最適化される方法に近づきます。

実際のデータはこのアプローチを支持しています。Google Sheets Calc Engineの性能を測定しました。このエンジンはスプレッドシートの式を計算するために使用されるJavaコードベースで、これまでは[J2CL](https://j2cl.io)を使用してJavaScriptにコンパイルされていました。V8チームはSheetsおよびJ2CLと協力してこのコードをWasmGCに移行中です。これはSheetsに期待される性能向上のためであり、WasmGC仕様プロセスに対する有益な実世界のフィードバックを提供するためでもあります。そこでの性能を見てみると、以下のチャートが示すように、V8でWasmGCのために実装した最も重要な個別の最適化は推測的インライン化であることがわかりました:


![さまざまなV8の最適化を伴うJavaの性能](/_img/wasm-gc-porting/benchmark2.svg "WasmGCの遅延。最適化なし、他の最適化、推測的インライン化、および推測的インライン化+他の最適化の比較。推測的インライン化を追加すると非常に大きな向上が見られる。")

ここでの「他の最適化」は、推測的インライン化以外の最適化で計測目的で無効化可能なものを指します。これにはロードの排除、型に基づく最適化、分岐の排除、定数畳み込み、エスケープ解析、共通部分式の排除が含まれています。「最適化なし」はこれらすべてと推測的インライン化を無効化した状態を意味します（ただし、V8で簡単に無効化できない他の最適化も存在します。そのため、ここでの数値はあくまで概算です）。推測的インライン化による非常に大きな改善（約**30%**の速度向上(!)）は、すべての他の最適化を合わせたものと比較しても際立っており、少なくともコンパイル済みJavaではインライン化がいかに重要かを示しています。

推測的インライン化のほかにも、WasmGCは既存のV8のWasmサポートに基づいているため、同じ最適化パイプライン、レジスタ割り当て、層分けなどの恩恵を受けます。それに加え、WasmGC固有の側面は追加の最適化の恩恵を受ける可能性があります。例えば、WasmGCが提供する新しい命令の効率的な実装（型キャストの最適化など）があります。もうひとつ重要な作業として、最適化内でWasmGCの型情報を使用することも行っています。例えば、`ref.test`はランタイムで参照が特定の型であるかどうかをチェックし、そのチェックが成功した場合、同じ型へのキャストである`ref.cast`も成功することが明らかです。これにより、Javaにおける次のようなパターンの最適化に役立ちます:

```java
if (ref instanceof Type) {
  foo((Type) ref); // このダウンキャストは排除可能です。
}
```

これらの最適化は、推測的インライン化後に特に有用です。なぜなら、ツールチェインがWasmを生成するときに見ていた以上の情報を見ることができるためです。

全体的に見ると、WasmMVPではツールチェインとVM最適化の間に比較的明確な分離がありました。ツールチェインで可能な限りのことを行い、VMには必要最低限の最適化だけを残しておくというもので、これはVMを簡素化する観点で合理的でした。WasmGCではそのバランスがやや変化する可能性があります。GC言語にはランタイムでさらに多くの最適化を行う必要があり、またWasmGC自体も最適化可能性が高いため、ツールチェインとVMの最適化の間の重なりが増える可能性があります。ここでエコシステムの発展がどのように進むかは興味深いことです。

## デモと状況

今日からWasmGCを利用することができます！ [W3Cでフェーズ4](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group) に到達した後、WasmGCは完全で最終的な標準となり、Chrome 119でそのサポートが提供されました。このブラウザ（またはWasmGCのサポートを含む他のブラウザ、例えばFirefox 120も今月中にWasmGCサポートを提供して発売される予定）で、この[Flutterデモ](https://flutterweb-wasm.web.app/)を実行できます。このデモではDartがWasmGCにコンパイルされ、ウィジェット、レイアウト、アニメーションを含むアプリケーションのロジックを駆動します。

![Chrome 119 で動作する Flutter デモ](/_img/wasm-gc-porting/flutter-wasm-demo.png "Material 3 が Flutter WasmGC によってレンダリングされています。")

## 始める方法

WasmGCの使用に興味がある場合、以下のリンクが役立つかもしれません：

- 現在、いくつかのツールチェーンがWasmGCをサポートしています。以下を含みます：[Dart](https://flutter.dev/wasm)、[Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md)、[Kotlin](https://kotl.in/wasmgc)、[OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml)、および[Scheme (Hoot)](https://gitlab.com/spritely/guile-hoot)。
- 開発ツールセクションで示した小さなプログラムの出力の[ソースコード](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff)は、手書きで「Hello World」のWasmGCプログラムを書く例です。（特に、`$Node`型が定義され、`struct.new`を使って作成される様子が見られます。）
- BinaryenのWikiには、コンパイラが最適化されたWasmGCコードを生成する方法に関する[ドキュメント](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips)があります。さまざまなWasmGC対象ツールチェーンへのリンクも学びに役立ちます。例えば、[Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415)、[Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135)、および[Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67)が使用するBinaryenのパスやフラグを見ることができます。

## 概要

WasmGCは、WebAssemblyでGC言語を実装するための新しく有望な方法です。VMがWasmに再コンパイルされる従来の移植方法が依然としていくつかのケースで最も合理的な方法であるかもしれませんが、WasmGCによる移植が、その利点のために一般的な技術になることを期待しています。WasmGCによる移植は従来の移植方法よりも小さく、C、C++、Rustで書かれたWasmMVPプログラムよりもさらに小さくなる可能性があります。また、循環生成、メモリ使用、開発者ツール、その他の点でWebとの統合が改善されます。さらに、WasmGCはより最適化可能な表現であり、顕著な速度向上と他言語間のツールチェーン開発の共有の機会を提供します。

