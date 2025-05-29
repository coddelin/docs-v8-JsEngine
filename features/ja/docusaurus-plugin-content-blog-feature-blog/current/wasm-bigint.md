---
title: &apos;JavaScriptのBigIntとWebAssemblyの統合&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: &apos;BigIntを使用することで、JavaScriptとWebAssembly間で64ビット整数を簡単に受け渡しできるようになります。この記事では、その意味と、それがなぜ便利であるかについて説明します。これは、開発者の作業を簡素化し、コードの実行速度を向上させ、さらにビルド時間を短縮することを含みます。&apos;
tweet: &apos;1331966281571037186&apos;
---
[JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration)機能は、JavaScriptとWebAssembly間で64ビット整数を簡単に受け渡しできるようにします。この記事では、その意味と、それがなぜ便利であるかについて説明します。これには、開発者の作業を簡素化し、コードの実行速度を向上させ、さらにビルド時間を短縮することを含みます。

<!--truncate-->
## 64ビット整数

JavaScriptの数値型は浮動小数点型（64ビット）ですが、これにより任意の32ビット整数を完全な精度で表現できますが、すべての64ビット整数を表現することはできません。一方、WebAssemblyには64ビット整数（`i64`型）を完全にサポートしています。両者を接続するときに問題が生じます。例えば、Wasm関数がi64を返す場合、JavaScriptからその関数を呼び出すと、次のようなエラーがスローされます：

```
TypeError: Wasm function signature contains illegal type
```

エラーの通り、`i64`はJavaScriptでは有効な型ではありません。

従来の解決策としては、Wasmの「合法化（legalization）」が一般的でした。合法化とは、WasmのインポートとエクスポートをJavaScriptで有効な型に変換することを意味します。実際には、以下の2つの処理を行います：

1. 64ビット整数のパラメータを32ビット整数2つに置き換え、それぞれ低位ビットと高位ビットを表現します。
2. 64ビット整数の戻り値を低位ビットを表す32ビット整数に置き換え、別途高位ビットを32ビット整数で保持します。

例えば、次のようなWasmモジュールを考えます：

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

これが合法化されると次のようになります：

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; コードが使用する実際の値
    ;; $x_lowと$x_highを組み合わせて$xを作成するコード
    ..))
```

合法化は実行環境に到達する前、ツール側で行われます。例えば、[Binaryen](https://github.com/WebAssembly/binaryen)ツールチェーンライブラリには[LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp)というパスがあり、自動的に変換を行います。[Emscripten](https://emscripten.org/)を使用する場合、必要に応じてそれが実行されます。

## 合法化の欠点

合法化は多くの場合十分に機能しますが、64ビット値を組み合わせたり分割したりする余計な処理が必要になるため、欠点もあります。これがホットパスで発生する場合には、速度低下が顕著に見られることがあります（後ほど数値を確認します）。

また、合法化はユーザーにとって煩わしいと感じることがあります。というのも、JavaScriptとWasm間のインターフェースが変わるためです。以下に例を示します：

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS received: 0x" + value.toString(16));
  }
});
```

これは小さなCプログラムで、[JavaScriptライブラリ](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript)関数を呼び出します（Cのextern関数を定義して、それをJavaScriptで実装することで、WasmとJavaScript間のコールをシンプルで低レベルな方法で行います）。このプログラムは、JavaScriptに`i64`を送信し、それを出力しようとするだけです。

これを次のコマンドでビルドできます：

```
emcc example.c --js-library example.js -o out.js
```

実行すると、期待した結果は得られません：

```
node out.js
JS received: 0x12345678
```

送信した値は`0xABCD12345678`でしたが、受信したのは`0x12345678`だけです 😔。ここで起こったのは、合法化により`i64`が2つの`i32`に分割され、低位32ビットだけが受信され、高位32ビットは無視されたということです。これを正しく処理するには、次のようにする必要があります：

```javascript
  // i64は2つの32ビットパラメータ（低位と高位）に分割されます。
  send_i64_to_js: function(low, high) {
    console.log("JS received: 0x" + high.toString(16) + low.toString(16));
  }
```

これを実行すると、今度は次の結果が得られます：

```
JS received: 0xabcd12345678
```

このように、合法化で対処することは可能ですが、やや手間がかかります。

## 解決策: JavaScript BigInts

JavaScriptには現在[BigInt](/features/bigint)値があり、任意のサイズの整数を表現することが可能です。そのため、64ビット整数を適切に表現することができます。Wasmの`i64`を表現するためにそれを利用したいのは当然のことです。まさにその目的を果たすのが、JS-BigInt-Integration機能です！

EmscriptenはWasm BigInt統合をサポートしており、それを使用してオリジナルの例を（合法化のハックなしで）コンパイルすることができます。ただし、`-s WASM_BIGINT`を追加するだけです：

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

その後、次のように実行できます（現在、BigInt統合を有効にするためにNode.jsにフラグを渡す必要があります）：

```
node --experimental-wasm-bigint a.out.js
JS受信: 0xabcd12345678
```

完璧です。まさに求めていた結果です！

これが単にシンプルなだけでなく、さらに高速です。先に述べたように、実際には`i64`変換が頻繁に発生するケースは稀ですが、発生する場合には遅延が目立つことがあります。この例をベンチマークに変え、多数回の`send_i64_to_js`呼び出しを実行すると、BigInt版は18%高速です。

BigInt統合のもう1つの利点は、ツールチェーンが合法化を回避できることです。Emscriptenが合法化を必要としない場合、LLVMが生成するWasmに対して作業を行う必要がなくなり、ビルド時間が短縮されます。この高速化は、`-s WASM_BIGINT`でビルドし、変更を必要とする他のフラグを指定しない場合に得られます。たとえば、`-O0 -s WASM_BIGINT`は動作します（ただし、最適化ビルドでは[Binaryen最適化ツール](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times)を実行することが重要で、これはサイズ削減に役立ちます）。

## 結論

WebAssembly BigInt統合は[複数のブラウザ](https://webassembly.org/roadmap/)で実装されており、Chrome 85（2020年8月25日リリース）を含みます。今日から試してみることができます！
