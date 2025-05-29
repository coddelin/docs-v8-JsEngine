---
title: &apos;EmscriptenとLLVM WebAssemblyバックエンド&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - ツール
description: &apos;EmscriptenはLLVM WebAssemblyバックエンドに切り替え中で、大幅に高速なリンク時間や多くの利点が得られます。&apos;
tweet: &apos;1145704863377981445&apos;
---
WebAssemblyは通常、ソース言語からコンパイルされるため、開発者は*ツール*が必要です。そのため、V8チームは[LLVM](http://llvm.org/)、[Emscripten](https://emscripten.org/)、[Binaryen](https://github.com/WebAssembly/binaryen/)、[WABT](https://github.com/WebAssembly/wabt)のような関連するオープンソースプロジェクトに取り組んでいます。この投稿では、EmscriptenとLLVMに関する作業の一部を説明し、Emscriptenが[LLVM WebAssemblyバックエンド](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly)にデフォルトで切り替えることが間もなく可能になることを示しますので、ぜひテストして問題を報告してください!

<!--truncate-->
LLVM WebAssemblyバックエンドはしばらくの間Emscriptenでオプションとして利用可能でした。これは、Emscriptenへの統合と並行してバックエンドの開発が進められ、オープンソースのWebAssemblyツールコミュニティと連携して作業を行っていたためです。現在では、WebAssemblyバックエンドがほとんどのメトリクスで旧式の「[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)」バックエンドを上回る段階に達したため、デフォルトを切り替えたいと考えています。この発表はその前段階として行われ、できるだけ多くのテストを集めることが目的です。

このアップグレードは、次のようなエキサイティングな理由で重要です:

- **リンクが大幅に高速化**: LLVM WebAssemblyバックエンドは[`wasm-ld`](https://lld.llvm.org/WebAssembly.html)と組み合わせることで、WebAssemblyオブジェクトファイルを使用したインクリメンタルコンパイルを完全にサポートします。FastcompはLLVM IRをビットコードファイルに保存していたため、リンク時にすべてのIRをLLVMでコンパイルする必要がありました。これがリンク時間を遅くする主な原因でした。一方、WebAssemblyオブジェクトファイルを使用する場合、`.o`ファイルにはすでにコンパイル済みのWebAssembly（リンク可能な再配置形式）が含まれているため、リンクステップはFastcompよりもはるかに高速となります。以下で測定結果として最大7倍のスピードアップについて実例を示します。
- **高速かつ小型なコード**: LLVM WebAssemblyバックエンドおよびEmscriptenで利用されるBinaryenオプティマイザの改良に尽力しました。結果、LLVM WebAssemblyバックエンド経路は、トラッキングしているほとんどのベンチマークにおいて、速度とサイズの両方でFastcompを上回っています。
- **すべてのLLVM IRをサポート**: Fastcompは`clang`が生成するLLVM IRを扱える一方、そのアーキテクチャ上、他のソースからのIR、特にFastcompが処理できる型に「合法化」する作業が必要なケースで失敗しやすい問題がありました。LLVM WebAssemblyバックエンドは共通のLLVMバックエンドインフラストラクチャを使用しているため、すべてに対応できます。
- **新しいWebAssembly機能**: Fastcompは`asm.js`にコンパイルした後`asm2wasm`を実行する形式で、新しいWebAssembly機能（例: タイムテールコール、例外、SIMDなど）に対応するのが難しい状況でした。WebAssemblyバックエンドはそれらの作業に最良の場所であり、ここで示したすべての機能について実際に取り組んでいます。
- **上流からの更新が高速化**: 前述のポイントに関連して、上流のWebAssemblyバックエンドを使用することで、常に最新のLLVMの上流版を使用できるため、新しいC++言語機能や`clang`の新しいLLVM IR最適化機能など、新しい機能をすぐに取り入れることができます。

## テスト

WebAssemblyバックエンドをテストするには、[最新の`emsdk`](https://github.com/emscripten-core/emsdk)を使用して次の操作を行うだけです。

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

ここで「upstream」とは、LLVM WebAssemblyバックエンドが上流のLLVMに存在していることを指します（Fastcompとは異なります）。実際、上流に含まれているため、通常のLLVM+`clang`を自分でビルドした場合、`emsdk`を使用する必要はありません！（Emscriptenでそのビルドを使用するには、`.emscripten`ファイルにそのパスを追加するだけです。）

現在、`emsdk [install|activate] latest`を使用すると依然としてFastcompが使用されます。同様に「latest-fastcomp」も同じです。デフォルトのバックエンドを切り替える際には、「latest」を「latest-upstream」の同じ動作にし、その時点でFastcompを取得する唯一の方法が「latest-fastcomp」となります。Fastcompは引き続き有用である間はオプションとして残ります。詳細は最後の注記をご覧ください。

## 履歴

これがEmscriptenにおける**3つ目**のバックエンドとなり、**2回目**の移行となります。最初のバックエンドはJavaScriptで記述され、LLVM IRをテキスト形式で解析していました。これは2010年当時の実験には有用でしたが、LLVMのテキスト形式が変化することや、コンパイル速度が期待したほど速くないことなど明らかな欠点がありました。2013年には、LLVMのフォーク版である「fastcomp」と呼ばれる新しいバックエンドが作成されました。これは、以前のJSバックエンドが不完全ながら[asm.js](https://en.wikipedia.org/wiki/Asm.js)の生成を試みていたところを改善するために設計されました。その結果、コード品質やコンパイル速度が大幅に向上しました。

Emscriptenにおける変更は比較的軽微なものでした。Emscriptenはコンパイラーですが、オリジナルバックエンドやfastcompはプロジェクト全体のごく一部に過ぎません。システムライブラリ、ツールチェインの統合、言語バインディングなどに多くのコードが投入されています。そのため、コンパイラーのバックエンドを切り替えることは劇的な変更であるものの、プロジェクト全体における影響は限定的です。

## ベンチマーク

### コードサイズ

![コードサイズの測定（小さいほど優れています）](/_img/emscripten-llvm-wasm/size.svg)

（ここでのすべてのサイズはfastcompに正規化されています。）ご覧の通り、WebAssemblyバックエンドのサイズはほぼ常に小さくなっています！左側の小規模なマイクロベンチマーク（小文字の名前）では、システムライブラリの新しい改善がより重要になるため、違いがより顕著です。右側のマクロベンチマーク（大文字の名前）でも多くの場合コードサイズが縮小しており、それらは実際のコードベースです。マクロベンチマークの唯一の退化はLZMAで、新しいLLVMが不運なインライン化の決定をしてしまったケースです。

全体として、マクロベンチマークは平均で**3.7%**縮小しています。コンパイラーのアップグレードとしては悪くありません！テストスイートに含まれていない実際のコードベースでも同様の傾向が見られます。例えば、[BananaBread](https://github.com/kripken/BananaBread/)（[Cube 2ゲームエンジン](http://cubeengine.com/)のWebへの移植）は**6%以上**縮小し、[Doom 3の縮小率](http://www.continuation-labs.com/projects/d3wasm/)は**15%**以上です！

これらのサイズ改善（次に述べる速度改善も含む）は以下の要因によるものです:

- LLVMのバックエンドコード生成はスマートで、fastcompのような単純なバックエンドでは不可能なこと、例えば[GVN](https://en.wikipedia.org/wiki/Value_numbering)を実現できます。
- 最新のLLVMはIRの最適化が向上しています。
- WebAssemblyバックエンドの出力に対してBinaryenオプティマイザーの調整を入念に行いました。

### 速度

![速度測定（小さいほど優れています）](/_img/emscripten-llvm-wasm/speed.svg)

（測定はV8を使用しています。）マイクロベンチマークでは速度は多面的な結果になっています——これは驚くべきことではなく、ほとんどのマイクロベンチマークは単一の関数やループに支配されているため、Emscriptenが生成するコードの変更がVMによる最適化の選択に幸運または不運な結果をもたらします。全体として、改善するもの、退化するもの、変わらないものがほぼ同数です。より現実的なマクロベンチマークを見ると、再びLZMAが例外であることが分かります（以前述べた不運なインライン化の決定によるもの）が、それ以外のすべてのマクロベンチマークでは改善が見られます！

マクロベンチマークの平均変化は**3.2%**のスピードアップです。

### ビルド時間

![BananaBreadでのコンパイルとリンクの時間測定（小さいほど優れています）](/_img/emscripten-llvm-wasm/build.svg)

ビルド時間の変化はプロジェクトによって異なりますが、いくつかの例をBananaBreadから示します。BananaBreadは、112のファイルと95,287行のコードから成る完全ながらコンパクトなゲームエンジンです。左側にはコンパイルステップ、つまりソースファイルをオブジェクトファイルにコンパイルする時間が表示されています。プロジェクトのデフォルトの`-O3`で計測され（すべての時間はfastcompに対して正規化されています）。ご覧の通り、WebAssemblyバックエンドではコンパイルステップが若干長くなりますが、これはこの段階でより多くの作業を行っているためです——fastcompがソースをビットコードに最速でコンパイルするのに対し、WebAssemblyにビットコードをコンパイルする作業も含まれます。

右側を見ると、リンクステップ（こちらもfastcompに正規化されています）、つまり最終実行可能ファイルを生成する時間が示されています。ここではインクリメンタルビルドに適した`-O0`を使用しています（完全に最適化されたビルドではおそらく`-O3`も使用しますが、以下参照）。コンパイルステップでのわずかな増加は、リンクが**7倍以上速くなる**ことから価値のあるものです！これがインクリメンタルコンパイルの真の利点です：リンクステップのほとんどはオブジェクトファイルの高速な連結だけで済みます。そして、1つのソースファイルだけを変更して再ビルドする場合、ほとんどすべての作業が高速なリンクステップだけで完了するので、実際の開発中にはこの速度向上を常に実感できるでしょう。

前述の通り、ビルド時間の変更はプロジェクトによって異なります。BananaBreadより小さなプロジェクトではリンク時間の速度向上は小さいかもしれませんが、より大きなプロジェクトでは大きくなる可能性があります。もう一つの要因は最適化です：前述の通り、テストは`-O0`でリンクされましたが、リリースビルドではおそらく`-O3`を使用するでしょう。その場合、Emscriptenは最終的なWebAssemblyに対してBinaryenオプティマイザーを適用し、[meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)を実行し、コードサイズと速度に役立つその他の処理を行います。もちろん、これには追加の時間がかかりますが、リリースビルドには価値がある作業です — BananaBreadではWebAssemblyを2.65 MBから1.84 MBに縮小し、**30%以上**の改善を実現します — しかしながら、素早いインクリメンタルビルドの場合、`-O0`でそれをスキップできます。

## 既知の問題

LLVM WebAssemblyバックエンドはコードサイズと速度の両方で一般的に優れていますが、いくつかの例外が確認されています：

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp)は、[nontrapping float to int conversions](https://github.com/WebAssembly/nontrapping-float-to-int-conversions)がないことで退化しています。これらはWebAssemblyの新しい機能であり、WebAssembly MVPには含まれていません。根本的な問題は、MVPでは浮動小数点から整数への変換が有効な整数範囲外の場合にトラップすることです。これはいずれにしてもCでは未定義な動作であり、VMが簡単に実装できるという理由によります。しかし、LLVMが浮動小数点から整数への変換をコンパイルする方法と合致していないことが判明し、その結果として追加のガードが必要となり、コードサイズとオーバーヘッドが増加します。新しい非トラップ操作ではこれを回避できますが、すべてのブラウザーでまだ利用可能ではないかもしれません。`-mnontrapping-fptoint`を使用してソースファイルをコンパイルすることでそれを使用できます。
- LLVM WebAssemblyバックエンドはfastcompとは異なるバックエンドであるだけでなく、はるかに新しいLLVMを使用しています。新しいLLVMは異なるインライン化の決定を行う可能性があります。(プロファイルガイド付き最適化がない場合のすべてのインライン化の決定と同様に)これらはヒューリスティックに基づいており、助けになる場合もあれば害になる場合もあります。先に触れた具体例としては、LZMAベンチマークにおいて新しいLLVMが関数を5回インライン化し、その結果として性能が悪化する場合があります。ご自身のプロジェクトでこれが発生した場合、一部のソースファイルを選択的に`-Os`でビルドしてコードサイズを重視する、`__attribute__((noinline))`を使用するなどの対応ができます。

私たちが認識していない他の最適化すべき問題があるかもしれません — 何かを見つけた場合にはぜひ教えてください！

## その他の変更点

Emscriptenの機能のうち小数ではありますが、fastcompおよび/またはasm.jsに依存しているものがいくつかあり、それらはWebAssemblyバックエンドではそのまま動作できません。そこで代替案に取り組んでいます。

### JavaScript出力

非WebAssembly出力のオプションは何らかのケースで依然として重要です — 主要なブラウザーはすべてしばらく前からWebAssemblyをサポートしていますが、依然としてWebAssemblyをサポートしていない古い機種や古い携帯電話などが存在します。また、WebAssemblyに新機能が追加されるにつれて、この問題は関連性を持ち続けます。JSへのコンパイルは、ビルドがWebAssemblyほど小さいサイズや高速でない場合でも、全ての人に到達できる保証を提供する方法です。fastcompでは単純にasm.js出力を直接使用していましたが、WebAssemblyバックエンドでは明らかに別の方法が必要です。その目的でBinaryenの[`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js)を使用しています。名前が示すように、WebAssemblyをJSにコンパイルします。

これについては完全なブログ投稿を書く価値があるかもしれませんが、簡単に言えば、ここでの重要な設計決定はasm.jsをサポートする意味がもはやないということです。asm.jsは一般的なJSより速く実行できますが、実際にはasm.js AOT最適化をサポートするブラウザーはほぼすべてWebAssemblyもサポートしていることが判明しました。(実際には、Chromeはasm.jsを内部的にWebAssemblyに変換して最適化しています！)そのため、JSフォールバックオプションを話す場合、もはやasm.jsを使用する必要はありません。その結果として簡素化され、WebAssemblyでより多くの機能をサポートすることが可能になり、JSのサイズも大幅に小さくなります！したがって、`wasm2js`はasm.jsをターゲットとしません。

しかしながら、この設計の副作用として、fastcompからのasm.jsビルドをWebAssemblyバックエンドのJSビルドと比較すると、asm.jsがはるかに速くなる場合があります — もしasm.js AOT最適化を有する最新ブラウザーでテストする場合です。おそらくご自身のブラウザーではそうでしょうが、実際に非WebAssemblyオプションを必要とするブラウザーではそうではないでしょう！正確な比較を行うには、asm.js最適化がないか、それらが無効になっているブラウザーを使用する必要があります。もし`wasm2js`出力が依然として遅い場合は、ぜひご連絡ください！

`wasm2js`は動的リンクやpthreadなどあまり使用されない機能をいくつか欠いていますが、ほとんどのコードはすでに動作するはずで、慎重にファジングされています。JS出力をテストするには、単にWebAssemblyを無効化する`-s WASM=0`でビルドしてください。その後、`emcc`は自動的に`wasm2js`を実行し、最適化されたビルドであれば役立つ最適化も実行します。

### 他の注意点

- [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify)や[Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter)オプションはfastcompでのみ動作します。代替案が[進行中](https://github.com/WebAssembly/binaryen/pull/2172)で[あり](https://github.com/WebAssembly/binaryen/pull/2173)、最終的には以前のオプションより改善される予定です(https://github.com/emscripten-core/emscripten/pull/8808, https://github.com/emscripten-core/emscripten/issues/8561)。
- ビルド済みライブラリは再ビルドが必要です: `library.bc` を高速コンパイラ(fastcomp)でビルドした場合、新しいEmscriptenを使用してソースから再度ビルドする必要があります。これは常に、高速コンパイラがLLVMの新バージョンにアップグレードされ、ビットコード形式が変更された際に発生していましたが、今回の変更（ビットコードではなくWebAssemblyオブジェクトファイルへの移行）でも同様の影響があります。

## 結論

現在の主な目標は、この変更に関連するバグを修正することです。ぜひテストを行い、問題を報告してください！

状況が安定した後、デフォルトのコンパイラバックエンドを上流のWebAssemblyバックエンドに切り替えます。高速コンパイラ(fastcomp)は、以前に述べたようにオプションとして残ります。

最終的には高速コンパイラを完全に削除したいと考えています。それによりメンテナンスの負担が大幅に軽減され、WebAssemblyバックエンドでの新機能にさらに重点を置くことができ、Emscripten全体の改善が加速するほか、多くの良いことが期待できます。皆さんのコードベースでのテスト結果を共有していただき、削除のタイムラインを計画できるようにしてください。

### ありがとうございます

LLVM WebAssemblyバックエンド、`wasm-ld`、Binaryen、Emscripten、およびこの投稿で言及したその他のプロジェクトの開発に関わった皆さんに感謝します！その素晴らしい人々の一部は次の通りです: aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik。
