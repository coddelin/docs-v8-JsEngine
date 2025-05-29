---
title: "V8の10周年を祝う"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), V8の歴史家"
avatars:
  - "mathias-bynens"
date: 2018-09-11 19:00:00
tags:
  - ベンチマーク
description: "V8プロジェクトの過去10年間の主なマイルストーン、そしてプロジェクトがまだ秘密だった頃の概要を紹介します。"
tweet: "1039559389324238850"
---
今月は、Google Chromeだけでなく、V8プロジェクトも出荷開始から10周年を迎えます。この投稿では、V8プロジェクトの過去10年間の主なマイルストーン、およびプロジェクトがまだ秘密であったころの出来事を概観します。

<!--truncate-->
<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/G0vnrPTuxZA" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>時間経過によるV8コードベースの可視化。これは<a href="http://gource.io/"><code>gource</code></a>を使用して作成されました。</figcaption>
</figure>

## V8出荷前：初期の時代

Googleは**2006年**の秋に、Chromeウェブブラウザーのための新しいJavaScriptエンジンを開発するため、[Lars Bak](https://en.wikipedia.org/wiki/Lars_Bak_%28computer_programmer%29)を雇いました。当時、Chromeはまだ秘密の内部プロジェクトでした。Larsは最近、シリコンバレーからデンマークのオーフスに戻ってきたところでした。その地域にはGoogleのオフィスがなく、Larsはデンマークにとどまりたいと考えたため、Larsといくつかのプロジェクトの初期段階からのエンジニアらは彼の農場にある離れで作業を始めました。この新しいJavaScriptランタイムは「V8」と名付けられ、クラシックなマッスルカーに見られる強力なエンジンを洒落て参照した名称でした。後にV8チームが大きくなり、開発者たちは控えめな作業環境からオーフスの近代的なオフィスビルに移転しましたが、チームは地球上で最速のJavaScriptランタイムを構築するという単一の目標と集中力を持ち続けました。

## V8の立ち上げと進化

V8は、[Chromeが公開された](https://blog.chromium.org/2008/09/welcome-to-chromium_02.html)同じ日にオープンソース化されました：**2008年**の9月2日です。[初回のコミット](https://chromium.googlesource.com/v8/v8/+/43d26ecc3563a46f62a0224030667c8f8f3f6ceb)は2008年6月30日に遡ります。その日以前は、V8の開発はプライベートなCVSリポジトリで行われていました。当初、V8はia32とARMの命令セットのみをサポートし、[SCons](https://scons.org/)をビルドシステムとして使用していました。

**2009年**には、新しい正規表現エンジン[Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)が導入され、実際の正規表現のパフォーマンスが改善されました。x64ポートの導入により、サポートされる命令セットの数は2つから3つに増加しました。また、Node.jsプロジェクトの[最初のリリース](https://github.com/nodejs/node-v0.x-archive/releases/tag/v0.0.1)が行われ、V8が組み込まれました。ノンブラウザプロジェクトがV8を埋め込む可能性は、[元々Chromeのコミックページに明記されていました](https://www.google.com/googlebooks/chrome/big_16.html)。Node.jsでは、それが実現しました！Node.jsは最も人気のあるJavaScriptエコシステムの1つに成長しました。

**2010年**には、V8がまったく新しい最適化されたJITコンパイラーを導入したことで、ランタイムのパフォーマンスが大幅に向上しました。[Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)は、以前の（名前のない）V8コンパイラーよりも2倍高速で、30％コードサイズが小さい機械コードを生成しました。同年、V8は4つ目の命令セットである32ビットMIPSを追加しました。

**2011年**には、ガベージコレクションが大幅に改善されました。[新しいインクリメンタルガベージコレクター](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)により、ピークパフォーマンスと低メモリ使用量を維持しながら、停止時間が劇的に減少しました。V8はIsolatesの概念を導入し、エンベッダーがプロセス内でV8ランタイムの複数のインスタンスを立ち上げることを可能にしました。これにより、Chromeで軽量化されたWeb Workersの道が開かれました。V8が[SCons](https://scons.org/)から[GYP](https://gyp.gsrc.io/)への最初のビルドシステム移行を行いました。ES5 strictモードのサポートを実装しました。一方で、開発はオーフスからドイツのミュンヘンに移り、オーフスの元チームから多くの共有知識が生まれました。

**2012年**は、V8プロジェクトにとってのマイルストーンの年でした。チームは、[SunSpider](https://webkit.org/perf/sunspider/sunspider.html)や[Kraken](https://krakenbenchmark.mozilla.org/)ベンチマークスイートを用いたV8のパフォーマンス最適化のためのスピードスプリントを行いました。その後、[Octane](https://chromium.github.io/octane/)（[V8 Bench](http://www.netchain.com/Tools/v8/)をコアとする）という新しいベンチマークスイートを開発しました。これにより、ピークパフォーマンスの競争が活性化し、主要なJSエンジン全体でランタイムやJIT技術に大幅な改善がもたらされました。この努力の一環として、V8のランタイムプロファイラで「ホット」な関数を検出する技術を、ランダムサンプリングから決定論的でカウントベースの技術に切り替えました。これにより、ページの読み込みやベンチマークのランが一部だけランダムに遅くなる可能性が大幅に減少しました。

**2013年**には、[asm.js](http://asmjs.org/)と呼ばれるJavaScriptの低レベルサブセットが登場しました。asm.jsは静的型の算術、関数呼び出し、およびヒープアクセスのみに制限されているため、検証済みのasm.jsコードは予測可能なパフォーマンスで実行できました。既存のベンチマークの更新やasm.jsのユースケースを対象とした新しいベンチマークとともに、[Octane 2.0](https://blog.chromium.org/2013/11/announcing-octane-20.html)というOctaneの新バージョンをリリースしました。Octaneは、[アロケーションフォールディング](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/42478.pdf)や[型遷移とプレテンアリングのためのアロケーションサイトベースの最適化](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf)のような新しいコンパイラ最適化の発展を促しました。「Handlepocalypse」と内部で呼ばれる取り組みの一環として、V8ハンドルAPIが完全に書き直され、安全で簡単に正しく使用できるようになりました。同じ2013年には、JavaScriptの`TypedArray`のChrome実装が[BlinkからV8に移動](https://codereview.chromium.org/13064003)しました。

**2014年**には、[並列コンパイル](https://blog.chromium.org/2014/02/compiling-in-background-for-smoother.html)を使用して一部のJITコンパイル作業をメインスレッドから移動させることで、カクつきを減少させ、パフォーマンスを大幅に向上させました。同年後半、新しい最適化コンパイラ「TurboFan」の初期バージョンを[導入](https://github.com/v8/v8/commit/a1383e2250dc5b56b777f2057f1600537f02023e)しました。一方で、パートナーの協力により、PPC、MIPS64、ARM64の3つの新しい命令セットアーキテクチャへのV8のポートが行われました。Chromiumの後を追い、V8は新しいビルドシステム[GN](https://gn.googlesource.com/gn/#gn)へ移行しました。V8のテストインフラストラクチャも大幅に改善され、_Tryserver_ を使用して、パッチごとに様々なビルドボットでテストを行えるようになりました。ソース管理では、V8はSVNからGitへ移行しました。

**2015年**は、V8にとってさまざまな面で多忙な年でした。[コードキャッシングとスクリプトストリーミング](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)を実装し、ウェブページの読み込み時間を大幅に短縮しました。ランタイムシステムにおけるアロケーションメメントの利用に関する研究結果は、[ISMM 2015](https://ai.google/research/pubs/pub43823)で発表されました。同年後半、新しいインタープリタ「Ignition」の開発が開始されました（[参考](https://github.com/v8/v8/commit/7877c4e0c77b5c2b97678406eab7e9ad6eba4a4d)）。「強い保証と予測可能なパフォーマンス」を達成するために、[ストロングモード](https://docs.google.com/document/d/1Qk0qC4s_XNCLemj42FqfsRLp49nDQMZ1y7fwf5YjaI4/view)を使用してJavaScriptをサブセット化するアイデアを試験しました。ストロングモードはフラグの背後に実装されましたが、そのメリットがコストに見合わないことが判明しました。[コミットキュー](https://dev.chromium.org/developers/testing/commit-queue)の追加により、生産性と安定性が大幅に向上しました。V8のガベージコレクターも、例えばBlinkのような埋め込み先と協力して、アイドルタイムにガベージコレクション作業をスケジュールするようになりました。[アイドルタイムガベージコレクション](/blog/free-garbage-collection)により、目に見えるガベージコレクションのカクつきやメモリ消費が大幅に削減されました。12月には、[最初のWebAssemblyプロトタイプ](https://github.com/titzer/v8-native-prototype)がV8に導入されました。

2016年には、ES2015（以前は「ES6」として知られていた）機能セット（プロミス、クラス構文、レキシカルスコープ、分割代入など）や一部のES2016機能を最後の部品として提供しました。また、新しいIgnitionとTurboFanパイプラインを展開し始め、それを使用して[ES2015およびES2016の機能をコンパイルおよび最適化](/blog/v8-release-56)し、[低性能Androidデバイス](/blog/ignition-interpreter)向けにIgnitionをデフォルトで提供しました。アイドル時間ガベージコレクションに関する成功事例は、[PLDI 2016](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45361.pdf)で発表されました。[Orinocoプロジェクト](/blog/orinoco)を開始し、V8の主スレッドガベージコレクション時間を減らすための新しいほぼ並列で同時実行可能なガベージコレクターを開発しました。また、主力を根本的に転換し、合成的なマイクロベンチマークではなく[実際のパフォーマンス](/blog/real-world-performance)を真剣に測定し最適化することに集中しました。デバッグの面では、V8インスペクターがChromiumからV8へ[移行](/blog/v8-release-55)され、これによりChromiumだけでなくV8を埋め込む任意のソフトウェアがChrome DevToolsを使用してV8内で動作するJavaScriptをデバッグ可能となりました。WebAssemblyプロトタイプは、他のブラウザベンダーとの連携による[WebAssemblyの実験的サポート](/blog/webassembly-experimental)の実現によりプロトタイプから実験的サポートへと昇格しました。V8は[ACM SIGPLANプログラミング言語ソフトウェア賞](http://www.sigplan.org/Awards/Software/)を受賞しました。また、S390の移植が追加されました。

2017年には、ついにエンジンの数年にわたるオーバーホールを完了し、新しい[IgnitionとTurboFan](/blog/launching-ignition-and-turbofan)パイプラインをデフォルトとして有効化しました。これにより、後にCrankshaft（[130,380行のコード削除](https://chromium-review.googlesource.com/c/v8/v8/+/547717)）や[Full-codegen](https://chromium-review.googlesource.com/c/v8/v8/+/584773)のコードベースからの削除が可能になりました。Orinoco v1.0をローンチし、[並列マーク](/blog/concurrent-marking)、並列スイープ、並列収集、並列コンパクションを含む機能を提供しました。また、Node.jsをChromiumに次ぐV8の正式な埋め込み先として認識しました。それ以降、Node.jsのテストスイートを壊すとパッチが適用できないという仕様が追加されました。私たちのインフラストラクチャーは正確性のためのファジングをサポートし、どの構成で実行してもコードが一貫した結果を生成することを保証しました。

業界全体の協調的なローンチにより、V8は[WebAssemblyをデフォルトとして提供](/blog/v8-release-57)しました。さらに、[JavaScriptモジュール](/features/modules)のサポートを実装し、完全なES2017およびES2018機能セット（非同期関数、共有メモリ、非同期イテレーション、Rest/Spreadプロパティ、正規表現機能を含む）を提供しました。[JavaScriptコードのネイティブカバレッジサポート](/blog/javascript-code-coverage)を提供し、[Web Tooling Benchmark](/blog/web-tooling-benchmark)を発表して、V8の最適化が現実世界の開発者ツールと生成されるJavaScriptコードのパフォーマンスにどのように影響するかを測定する助けをしました。[ラッパートレーシング](/blog/tracing-js-dom)により、JavaScriptオブジェクトからC++ DOMオブジェクトまでのメモリリークを解決し、JavaScriptとBlinkヒープを超えたオブジェクトの推移的閉包を効率的に操作可能としました。その後、このインフラストラクチャを使用してヒープスナップショット開発者ツールの能力を拡張しました。

2018年には、業界全体でのセキュリティイベントが発生し、[SpectreとMeltdownの脆弱性](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)が公表されたことで、私たちが知っているCPU情報セキュリティの認識が覆りました。V8のエンジニアは、管理対象言語の脅威を理解し対策を開発するために大規模な攻撃的研究を行いました。V8は、信頼されていないコードを実行する埋め込み先向けにSpectreや同様のサイドチャネル攻撃に対する[対策](/docs/untrusted-code-mitigations)を提供しました。

最近では、WebAssemblyアプリケーションの起動時間を大幅に短縮しつつ予測可能なパフォーマンスを実現する、[Liftoff](/blog/liftoff)というWebAssembly専用のベースラインコンパイラを提供しました。また、任意精度整数を可能にする新しいJavaScriptプリミティブである[`BigInt`](/blog/bigint)を提供しました。[Embedded Builtins](/blog/embedded-builtins)を実装し、それを[遅延デシリアライズ可能](/blog/lazy-deserialization)とすることで、複数のIsolateにおいてV8のフットプリントを大幅に削減しました。[スクリプトのバイトコードをバックグラウンドスレッドでコンパイル](/blog/background-compilation)する機能を可能にしました。また、[Unified V8-Blink Heapプロジェクト](https://docs.google.com/presentation/d/12ZkJ0BZ35fKXtpM342PmKM5ZSxPt03_wsRgbsJYl3Pc)を開始し、V8とBlinkのガベージコレクションをクロスコンポーネントに同期的に動作させる取り組みを始めました。そして、まだ年は終わっていません...

## パフォーマンスの盛衰

ChromeのV8 Benchスコアは、V8の変更によるパフォーマンスの影響を示しています。（最初のChromeベータ版でまだ実行可能な数少ないベンチマークの一つであるため、V8 Benchを使用しています。）

![2008年から2018年までのChromeの[V8 Bench](http://www.netchain.com/Tools/v8/)スコア](/_img/10-years/v8-bench.svg)

このベンチマークで私たちのスコアは過去10年間で**4倍**になりました！

ただし、過去数年間にわたり2つのパフォーマンスの低下が見られることに気づくかもしれません。どちらもV8の歴史において重要なイベントに対応しています。2015年のパフォーマンス低下は、V8がES2015機能のベースラインバージョンを提供した際に発生しました。これらの機能はV8のコードベースを横断するため、初期リリースでは性能ではなく正確性に集中しました。これにより、開発者に新機能を迅速に届けるためにわずかな速度低下を受け入れました。2018年初頭にはSpectreの脆弱性が公開され、V8がユーザーを潜在的な悪用から保護するための対策を提供した結果、性能がさらに低下しました。しかし幸いなことに、Chromeが[Site Isolation](https://developers.google.com/web/updates/2018/07/site-isolation)を提供しているため、対策を再び無効化できるようになり、性能は元の水準に戻りました。

このチャートから得られるもう1つのポイントは、2013年頃に伸びが鈍化し始めたことです。これがV8が諦めてパフォーマンスへの投資をやめたことを意味するのでしょうか？全く逆です！グラフが平坦化しているのは、V8チームが合成マイクロベンチマーク（V8 BenchやOctaneなど）から[実世界のパフォーマンス](/blog/real-world-performance)の最適化へと方針を転換したことを示しています。V8 Benchは、モダンなJavaScriptの機能を一切使用せず、実際の実世界のプロダクションコードを近似することもない古いベンチマークです。これに対して、より最近のSpeedometerベンチマークスイートを見てみましょう：

![2013年から2018年のChromeの[Speedometer 1](https://browserbench.org/Speedometer/)スコア](/_img/10-years/speedometer-1.svg)

V8 Benchが2013年から2018年の間に僅かな改善しか見られなかったのに対し、同じ期間におけるSpeedometer 1のスコアは（さらに）**4倍**向上しました。（Speedometer 2は2013年にはまだサポートされていなかったモダンなJavaScript機能を使用しているため、Speedometer 1を使用しました。）

現在では、モダンなJavaScriptアプリをより正確に反映する[さらに優れた](/blog/speedometer-2) [ベンチマーク](/blog/web-tooling-benchmark)が存在するだけでなく、それに加えて[既存のWebアプリを積極的に測定し最適化しています](https://www.youtube.com/watch?v=xCx4uC7mn6Y)。

## まとめ

V8はもともとGoogle Chromeのために構築されましたが、常に独立したコードベースと埋め込みAPIを持つスタンドアロンのプロジェクトでした。この10年間、プロジェクトのオープンな性質のおかげで、Webプラットフォームだけでなく、Node.jsのような他の文脈でも重要な技術となることができました。その過程で、プロジェクトは進化を遂げ、多くの変化と劇的な成長にもかかわらず関連性を保ち続けました。

当初、V8は2つの命令セットしかサポートしていませんでした。この10年間で、サポートされるプラットフォームのリストはia32、x64、ARM、ARM64、32ビットおよび64ビットMIPS、64ビットPPC、S390の8つに増えました。V8のビルドシステムはSConsからGYP、GNへと移行しました。プロジェクトはデンマークからドイツに移り、現在ではロンドン、マウンテンビュー、サンフランシスコを含む世界中のエンジニアを抱えており、Google以外の多くの場所からの貢献者もいます。私たちは、JavaScriptコンパイルパイプライン全体を無名コンポーネントからFull-codegen（ベースラインコンパイラ）とCrankshaft（フィードバック駆動の最適化コンパイラ）に、さらにIgnition（インタープリタ）とTurboFan（より優れたフィードバック駆動の最適化コンパイラ）へと変革しました。V8は「単なる」JavaScriptエンジンから、WebAssemblyもサポートするものに進化しました。JavaScriptそのものもECMAScript 3からES2018へと進化し、最新のV8はES2018以降の機能も実装しています。

Webの物語の軌跡は長く、持続的なものです。ChromeとV8の10周年を祝うことは、これは大きな節目であると同時に、Webプラットフォームの物語が25年以上続いてきたことを振り返る良い機会です。Webの物語が今後も少なくともそれだけの長さで続いていくことを、私たちは全く疑っていません。私たちは、V8、JavaScript、そしてWebAssemblyがその物語の中で引き続き興味深いキャラクターであることを確実にすることを約束します。次の10年が何をもたらすのかを楽しみにしています。引き続きご注目ください！
