---
title: "V8のサンプルベースプロファイラを使用する"
description: "このドキュメントでは、V8のサンプルベースプロファイラの使用方法について説明します。"
---
V8には組み込みのサンプルベースプロファイリング機能があります。プロファイリングはデフォルトではオフになっていますが、コマンドラインオプション`--prof`を使用して有効化できます。サンプラーはJavaScriptおよびC/C++コードのスタックを記録します。

## ビルド

[GNを使用したビルド](/docs/build-gn)の指示に従って`d8`シェルをビルドします。

## コマンドライン

`--prof`オプションを使用してプロファイリングを開始します。プロファイリング中、V8はプロファイリングデータを含む`v8.log`ファイルを生成します。

Windows:

```bash
build\Release\d8 --prof script.js
```

その他のプラットフォーム（`x64`ビルドをプロファイリングしたい場合は`ia32`を`x64`に置き換えてください）:

```bash
out/ia32.release/d8 --prof script.js
```

## 生成された出力の処理

ログファイルの処理は、`d8`シェルによるJSスクリプトの実行によって行われます。この処理を行うために、V8のチェックアウトルートまたは環境変数`D8_PATH`で指定されたパスに`d8`バイナリ（またはシンボリックリンク、Windowsでは`d8.exe`）を配置する必要があります。注意：このバイナリはログの処理に使用されますが、実際のプロファイリングには使用されないため、バージョンなどは重要ではありません。

**分析に使用される`d8`は`is_component_build`でビルドされていないことを確認してください！**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## `--prof`のためのWeb UI

`--preprocess`を使用してログを前処理します（C++シンボルを解決するためなど）。

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

[`tools/profview/index.html`](https://v8.dev/tools/head/profview)をブラウザで開き、そこで`v8.json`ファイルを選択します。

## 出力例

```
benchmarks\v8.logからの統計的プロファイリング結果 (4192 ticks, 0 unaccounted, 0 excluded)。

 [共有ライブラリ]:
   ticks  total  nonlib   name
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   ticks  total  nonlib   name
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   ticks  total  nonlib   name
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   ticks  total  nonlib   name
    458   10.9%

 [ボトムアップ（重い）プロファイル]:
  注意: パーセンテージは特定の呼び出し元が親呼び出しの総割合を占める割合を示します。
  親呼び出しの総数の2.0%未満しか占めない呼び出し元は表示されません。

   ticks parent  name
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## Webアプリケーションのプロファイリング

今日の高度に最適化された仮想マシンは、Webアプリを非常に高速で実行できます。しかし、それだけに頼って優れたパフォーマンスを達成しようとするべきではありません。慎重に最適化されたアルゴリズムやよりコストの低い関数は、すべてのブラウザで何倍もの速度向上を達成できることがあります。[Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)の[CPUプロファイラ](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference)はコードのボトルネックを分析するのに役立ちます。しかし時には、より深く、より細かく分析する必要があります。このときにV8の内部プロファイラが便利です。

Microsoftが[IE10と一緒にリリースした](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) [Mandelbrotエクスプローラデモ](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/)を例にして、このプロファイラを使用してみましょう。このデモのリリース後、V8は不要に計算を遅くしていたバグを修正し（デモのブログ投稿でChromeのパフォーマンスが低かったため）、さらにエンジンを最適化し、標準システムライブラリが提供するものよりも高速な`exp()`近似を実装しました。これらの変更の後、**デモは以前より8倍速く動作するようになりました**（Chromeで測定）。

しかし、すべてのブラウザでコードを高速に実行したい場合はどうすればよいでしょうか？まず、**CPUが何に忙しいのかを理解する**必要があります。次のコマンドラインオプションを使用してChrome（WindowsおよびLinux [Canary](https://tools.google.com/dlpage/chromesxs))を実行してください。このコマンドは指定されたURL（この場合、Webワーカーを使用しないローカルバージョンのマンデルブロットデモ）のプロフィールのティック情報を`v8.log`ファイルに出力します。

```bash
./chrome --js-flags='--prof' --no-sandbox 'http://localhost:8080/'
```

テストケースを準備する際には、ロード直後に作業を開始するようにし、計算が終了したらChromeを閉じます（Alt+F4を押します）。これにより、ログファイルには気にする必要のあるティックのみが記録されます。また、この手法ではWebワーカーは正確にプロファイルされないことに注意してください。

次に、V8に付属している`tick-processor`スクリプト（または新しい便利なWebバージョン）で`v8.log`ファイルを処理します。

```bash
v8/tools/linux-tick-processor v8.log
```

以下は処理された出力の興味深いスニペットで、注意を引くべきポイントです:

```
Statistical profiling result from null, (14306 ticks, 0 unaccounted, 0 excluded).
 [Shared libraries]:
   ticks  total  nonlib   name
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

上部のセクションを見ると、V8は自身のコードよりもOS特有のシステムライブラリ内で時間を多く費やしていることがわかります。「bottom up」出力セクションを調べて原因を探りましょう。このセクションでは、インデントされた行を「〜によって呼び出された」と読めます（`*`で始まる行はその関数がTurboFanによって最適化されていることを意味します）。

```
[Bottom up (heavy) profile]:
  注: パーセンテージは、親呼び出しの総数に対する特定の呼び出し元の割合を示します。
  親呼び出しの2.0%未満の占有率の呼び出し元は表示されません。

   ticks parent  name
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

総時間の**44%以上がシステムライブラリ内で`exp()`関数を実行することに費やされています**！システムライブラリを呼び出すためのオーバーヘッドを追加すると、全体の約3分の2が`Math.exp()`の評価に費やされていることになります。

JavaScriptコードを見ると、`exp()`が滑らかなグレースケールパレットを生成するためだけに使用されていることがわかります。滑らかなグレースケールパレットを生成する方法は無数にありますが、仮に指数グラデーションが非常に気に入っているとしましょう。ここでアルゴリズムの最適化が役立ちます。

`exp()`が`-4 < x < 0`の範囲の引数で呼び出されていることがわかるので、その範囲では安全にTaylor近似で置き換えることができます。これにより、乗算といくつかの除算のみで同じ滑らかなグラデーションを提供します。

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) for -4 < x < 0
```

このようにアルゴリズムを調整することで、最新のCanaryブラウザと比較してさらに30%のパフォーマンス向上が得られ、Chrome Canaryのシステムライブラリベースの`Math.exp()`と比較すると5倍の性能向上が得られます。

![](/_img/docs/profile/mandelbrot.png)

この例は、V8の内部プロファイラがコードのボトルネックを深く理解するのに役立つこと、そしてより賢いアルゴリズムがさらに性能を向上させることができることを示しています。

今日の複雑で要求の厳しいWebアプリケーションを再現するベンチマークについてさらに知りたい場合は、[How V8 measures real-world performance](/blog/real-world-performance)を参照してください。
