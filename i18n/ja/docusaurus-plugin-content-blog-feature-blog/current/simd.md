---
title: '高速で並列処理が可能なWebAssembly SIMD'
author: 'ディープティ・ガンドルリ ([@dptig](https://twitter.com/dptig))、トーマス・ライブリー ([@tlively52](https://twitter.com/tlively52))、イングヴァル・ステパニャン ([@RReverser](https://twitter.com/RReverser))'
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: 'WebAssemblyにベクトル操作を追加する'
tweet: '1222944308183085058'
---
SIMDは、_Single Instruction, Multiple Data_（単一命令、複数データ）の略称です。SIMD命令は特別な種類の命令で、アプリケーション内のデータ並列性を活用し、複数のデータ要素に同時に同じ操作を行います。音声/映像コーデックや画像処理など、計算負荷の高いアプリケーションは、SIMD命令を利用してパフォーマンスを向上させています。ほとんどの現代的なアーキテクチャは、何らかの形でSIMD命令をサポートしています。

<!--truncate-->
WebAssembly SIMD提案は、ほとんどの現代的なアーキテクチャで利用可能なポータブルかつ性能の高いSIMD操作のサブセットを定義しています。この提案は、[SIMD.js提案](https://github.com/tc39/ecmascript_simd)に基づいており、SIMD.js提案も元々は[Dart SIM](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages)仕様から派生したものです。SIMD.js提案は、SIMD計算を行うための新しい型と関数を提供するAPIとしてTC39に提案されましたが、WebAssembly内でより透明性の高いSIMD操作をサポートする方法に切り替えられました。[WebAssembly SIMD提案](https://github.com/WebAssembly/simd)は、ブラウザが基盤となるハードウェアを利用してデータレベルの並列性を活用する方法として導入されました。

## WebAssembly SIMD提案

WebAssembly SIMD提案の高レベル目標は、ポータブルな性能を保証する形でWebAssembly仕様にベクトル操作を導入することです。

SIMD命令のセットは広範で、アーキテクチャごとに異なります。WebAssembly SIMD提案に含まれる操作のセットは、多くのプラットフォームで広くサポートされ、性能が実証されている操作で構成されています。この目的のために、現在の提案は固定幅128ビットのSIMD操作の標準化に限定されています。

現在の提案では、新しい`v128`値型と、この型で動作するいくつかの新しい操作を導入しています。これらの操作を決定する際の基準は以下の通りです:

- 操作が複数の現代的なアーキテクチャで広くサポートされているべき。
- 命令グループ内で複数の関連するアーキテクチャでの性能向上が肯定的であるべき。
- 選ばれた操作セットは、性能の急激な低下（クリフ）を最小限に抑えるべき。

提案は現在、[最終段階（フェーズ4）](https://github.com/WebAssembly/simd/issues/480)にあり、V8とツールチェーンには動作する実装があります。

## SIMDサポートの有効化

### 機能検出

まず、SIMDは新しい機能であり、全てのWebAssembly対応ブラウザで利用可能ではないことに注意してください。WebAssemblyの新しい機能をサポートするブラウザについては、[webassembly.org](https://webassembly.org/roadmap/)ウェブサイトで確認できます。

全てのユーザーがアプリケーションを読み込めるようにするには、SIMDを有効にしたバージョンと無効にしたバージョンの2つをビルドし、機能検出の結果に応じて対応するバージョンを読み込む必要があります。ランタイムでSIMDを検出するには、[`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect)ライブラリを使用し、次のようにして対応するモジュールを読み込みます:

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …通常通り`module`を使用します
})();
```

SIMDサポートを使用したコードのビルドについては、[以下](#building-with-simd-support)を確認してください。

### ブラウザでのSIMDサポート

WebAssembly SIMDサポートはChrome 91からデフォルトで利用可能です。以下に記載されているように最新のツールチェーンと最新のwasm-feature-detectを使用して、最終仕様のバージョンをサポートするエンジンを検出してください。問題がある場合は、[バグを報告](https://crbug.com/v8)してください。

WebAssembly SIMDは、Firefox 89以降でもサポートされています。

## SIMDサポートを使用したビルド

### SIMDをターゲットにしたC / C++ビルド

WebAssemblyのSIMDサポートは、WebAssembly LLVMバックエンドを有効にした最新のclangビルドを使用することに依存しています。EmscriptenもWebAssembly SIMD提案をサポートしています。[emsdk](https://emscripten.org/docs/getting_started/downloads.html)を使用して`latest`ディストリビューションをインストールおよび有効化することでSIMD機能を使用できます。

```bash
./emsdk install latest
./emsdk activate latest
```

アプリケーションをSIMDを使用するように移植する際、SIMDコード生成を有効化する方法はいくつかあります。最新のアップストリームのemscriptenバージョンをインストールしたら、emscriptenを使用してコンパイルし、`-msimd128`フラグを渡してSIMDを有効化します。

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

WebAssemblyに既に移植されているアプリケーションは、ソースコードを変更することなく、LLVMの自動ベクトル化最適化のおかげでSIMDの恩恵を受けることができます。

これらの最適化は、各反復で算術操作を行うループを、自動的にSIMD命令を使用して複数の入力に対して同じ算術操作を一度に行う同等のループに変換することができます。LLVMの自動ベクトル化は、`-msimd128`フラグが指定されているとき、デフォルトで最適化レベル`-O2`と`-O3`で有効になります。

例えば、以下のような2つの入力配列の要素を掛け合わせ、結果を出力配列に格納する関数を考えてみます。

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

`-msimd128`フラグを指定せずにコンパイルした場合、コンパイラは次のようなWebAssemblyループを生成します。

```wasm
(loop
  (i32.store
    … `out`のアドレスを取得 …
    (i32.mul
      (i32.load … `in_a`のアドレスを取得 …)
      (i32.load … `in_b`のアドレスを取得 …)
  …
)
```

しかし、`-msimd128`フラグを使用した場合、オートベクトライザーは次のループを含むコードに変換します。

```wasm
(loop
  (v128.store align=4
    … `out`のアドレスを取得 …
    (i32x4.mul
       (v128.load align=4 … `in_a`のアドレスを取得 …)
       (v128.load align=4 … `in_b`のアドレスを取得 …)
    …
  )
)
```

ループ本体の構造は同じですが、SIMD命令が使用され、ループ本体内で1度に4要素をロード、掛け算、格納します。

コンパイラによって生成されるSIMD命令をより細かく制御したい場合は、[`wasm_simd128.h`ヘッダファイル](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h)を含めます。このヘッダファイルは一連のインストリニックを定義しています。インストリニックは特殊な関数で、呼び出されると、コンパイラによって対応するWebAssembly SIMD命令に変換されます（より最適化が可能な場合を除く）。

例として、先ほどの関数を手動でSIMDインストリニックを使用するよう書き換えたコードを示します。

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

この手動で書き換えたコードでは、入力配列と出力配列が整列されエイリアス化されておらず、サイズが4の倍数であることを前提としています。オートベクトライザーはこれらの前提を行えないため、それらが真でない場合に対応するための追加コードを生成する必要があります。そのため、手書きのSIMDコードはオートベクトライズされたSIMDコードよりも小さくなることがよくあります。

### 既存のC / C++プロジェクトのクロスコンパイル

既存の多くのプロジェクトは、他のプラットフォームをターゲットにする際にSIMDを既にサポートしており、特にx86 / x86-64プラットフォームの[SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions)および[AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions)命令、ARMプラットフォームの[NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon))命令が含まれます。それらは通常、2つの方法のいずれかで実装されます。

ひとつは、SIMD操作を担当するアセンブリファイルを使用し、ビルドプロセス中にC / C++とリンクする方法です。アセンブリの構文と命令は非常にプラットフォーム依存で移植性に乏しいため、SIMDを利用するために、そのようなプロジェクトはWebAssemblyを追加のサポート対象として追加し、対応する関数を[WebAssemblyテキスト形式](https://webassembly.github.io/spec/core/text/index.html)または[前述](#building-c-%2F-c%2B%2B-to-target-simd)のインストリニックを使用して再実装する必要があります。

もうひとつの一般的なアプローチは、SSE / SSE2 / AVX / NEONインストリニックをC / C++コードから直接使用する方法であり、ここでEmscriptenが助けになります。Emscriptenはこれらすべての命令セットのために[互換性のあるヘッダとエミュレーションレイヤ](https://emscripten.org/docs/porting/simd.html)を提供し、可能な場合はそれらを直接Wasmインストリニックにコンパイルし、それ以外の場合はスカラ化されたコードにコンパイルします。

そのようなプロジェクトをクロスコンパイルするには、まず特定のプロジェクト設定フラグを使用してSIMDを有効にします。例えば、`./configure --enable-simd`を実行すると、コンパイラに`-msse`、`-msse2`、`-mavx`または`-mfpu=neon`を渡し、対応するインストリニックを呼び出します。その後、`-msimd128`も追加で渡し、WebAssembly SIMDも有効にします。この時、`CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …`を使用するか、またはWasmをターゲットとする場合ビルド設定を直接変更します。

### RustのSIMDターゲットへのビルド

RustコードをWebAssembly SIMDをターゲットにコンパイルする際には、上記のEmscriptenと同様に`simd128` LLVM機能を有効にする必要があります。

直接または環境変数`RUSTFLAGS`を介して`rustc`フラグを制御できる場合、`-C target-feature=+simd128`を渡してください。

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

または

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Clang / Emscriptenと同様に、LLVMの自動ベクトル化機能は`simd128`機能が有効化されると最適化されたコードに対してデフォルトで有効になります。

例えば、上記の`multiply_arrays`のRustの同等のコードは

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

入力の整列された部分に対して類似した自動ベクトル化コードを生成します。

SIMD操作を手動で制御するためには、ナイトリーツールチェーンを使用し、Rustの機能`wasm_simd`を有効化し、[`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd)名前空間から直接命令を呼び出すことができます。

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

また、さまざまなプラットフォームでのSIMD実装を抽象化する[`packed_simd`](https://crates.io/crates/packed_simd_2)のようなヘルパーcrateを使用することもできます。

## 魅力的な使用例

WebAssembly SIMD提案は、オーディオ/ビデオコーデック、画像処理アプリケーション、暗号化アプリケーションなどの高い計算能力を必要とするアプリケーションを高速化しようとしています。現在、WebAssembly SIMDは、[Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md)、[OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html)、[XNNPACK](https://github.com/google/XNNPACK)などの広く使用されているオープンソースプロジェクトで実験的にサポートされています。

[MediaPipeプロジェクト](https://github.com/google/mediapipe)によるGoogle Researchチームからの興味深いデモもあります。

彼らの説明によると、MediaPipeはマルチモーダル（例えば、ビデオ、オーディオ、任意の時系列データ）適用された機械学習パイプラインを構築するためのフレームワークです。また、[Web版](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)も提供されています！

SIMDの性能による違いを視覚的に簡単に観察できる最も視覚的に魅力的なデモの1つに、手追跡システムのCPU専用（GPUなし）ビルドがあります。[SIMDなし](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html)だと、最新のラップトップでわずか14～15FPS（1秒あたりのフレーム数）しか得られませんが、[Chrome CanaryでSIMDを有効化した場合](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html)、38～40FPSのよりスムーズな体験が得られます。

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

滑らかな体験を提供するためにSIMDを活用している他の興味深いデモは、WebAssemblyにコンパイル可能な人気のコンピュータビジョンライブラリOpenCVから提供されています。これらは[リンク](https://bit.ly/opencv-camera-demos)で利用可能ですが、以下に事前録画版もあります：

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>カード読み取り</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>透明マント</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>絵文字置換</figcaption>
</figure>

## 今後の課題

現在の固定幅SIMD提案は[フェーズ4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group)にあり、完了と見なされています。

将来のSIMD拡張に関するいくつかの探索が[Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd)および[Flexible Vectors](https://github.com/WebAssembly/flexible-vectors)提案において開始されていますが、執筆時点ではフェーズ1にあります。
