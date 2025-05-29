---
title: "Aplicativos rápidos e paralelos com WebAssembly SIMD"
author: "Deepti Gandluri ([@dptig](https://twitter.com/dptig)), Thomas Lively ([@tlively52](https://twitter.com/tlively52)), Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: "Trazendo operações vetoriais para o WebAssembly"
tweet: "1222944308183085058"
---
SIMD significa _Single Instruction, Multiple Data_. Instruções SIMD são uma classe especial de instruções que exploram o paralelismo de dados em aplicativos ao realizar simultaneamente a mesma operação em vários elementos de dados. Aplicativos intensivos em computação, como codecs de áudio/vídeo e processadores de imagens, são todos exemplos de aplicativos que aproveitam as instruções SIMD para acelerar o desempenho. A maioria das arquiteturas modernas suporta algumas variantes de instruções SIMD.

<!--truncate-->
A proposta SIMD do WebAssembly define um subconjunto portátil e eficiente de operações SIMD disponíveis na maioria das arquiteturas modernas. Esta proposta derivou muitos elementos da [proposta SIMD.js](https://github.com/tc39/ecmascript_simd), que por sua vez foi originalmente derivada da especificação [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages). A proposta SIMD.js era uma API proposta no TC39 com novos tipos e funções para realizar cálculos SIMD, mas esta foi arquivada em favor de suportar operações SIMD de forma mais transparente no WebAssembly. A [proposta SIMD do WebAssembly](https://github.com/WebAssembly/simd) foi introduzida como uma forma de os navegadores aproveitarem o paralelismo de nível de dados usando o hardware subjacente.

## Proposta SIMD do WebAssembly

O objetivo de alto nível da proposta SIMD do WebAssembly é introduzir operações vetoriais na especificação do WebAssembly de uma maneira que garanta desempenho portátil.

O conjunto de instruções SIMD é extenso e varia entre arquiteturas. O conjunto de operações incluídas na proposta SIMD do WebAssembly consiste em operações que possuem um bom suporte em uma ampla variedade de plataformas e são comprovadamente eficientes. Para esse fim, a proposta atual está limitada a padronizar operações SIMD de largura fixa de 128 bits.

A proposta atual introduz um novo tipo de valor `v128` e várias novas operações que operam nesse tipo. Os critérios usados para determinar essas operações são:

- As operações devem ser bem suportadas em várias arquiteturas modernas.
- Os ganhos de desempenho devem ser positivos em várias arquiteturas relevantes dentro de um grupo de instruções.
- O conjunto escolhido de operações deve minimizar falhas de desempenho, caso existam.

A proposta está agora em [estado finalizado (fase 4)](https://github.com/WebAssembly/simd/issues/480), e tanto o V8 quanto a cadeia de ferramentas têm implementações funcionais.

## Habilitando suporte a SIMD

### Detecção de recurso

Antes de tudo, observe que o SIMD é um recurso novo e ainda não está disponível em todos os navegadores com suporte ao WebAssembly. Você pode verificar quais navegadores suportam novos recursos do WebAssembly no site [webassembly.org](https://webassembly.org/roadmap/).

Para garantir que todos os usuários possam carregar seu aplicativo, você precisará criar duas versões diferentes - uma com SIMD habilitado e outra sem ele - e carregar a versão correspondente, dependendo dos resultados da detecção de recurso. Para detectar SIMD em tempo de execução, você pode usar a biblioteca [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) e carregar o módulo correspondente assim:

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …agora use `module` como faria normalmente
})();
```

Para aprender sobre como criar código com suporte a SIMD, consulte a seção [abaixo](#building-with-simd-support).

### Suporte a SIMD em navegadores

O suporte a SIMD do WebAssembly está disponível por padrão a partir do Chrome 91. Certifique-se de usar a versão mais recente da cadeia de ferramentas conforme detalhado abaixo, bem como a versão mais recente do wasm-feature-detect para detectar motores que suportam a versão final da especificação. Se algo não parecer certo, por favor [registre um problema](https://crbug.com/v8).

O SIMD do WebAssembly também é suportado no Firefox 89 e versões posteriores.

## Criando com suporte a SIMD

### Construindo C / C++ para o alvo SIMD

O suporte a SIMD do WebAssembly depende do uso de uma versão recente do clang com o backend LLVM do WebAssembly habilitado. O Emscripten possui suporte para a proposta SIMD do WebAssembly também. Instale e ative a distribuição `latest` do emscripten usando [emsdk](https://emscripten.org/docs/getting_started/downloads.html) para usar os recursos SIMD.

```bash
./emsdk install latest
./emsdk activate latest
```

Existem algumas maneiras diferentes de habilitar a geração de código SIMD ao portar seu aplicativo para usar SIMD. Depois que a versão mais recente do emscripten upstream for instalada, compile usando emscripten e passe a flag `-msimd128` para habilitar o SIMD.

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

Aplicativos que já foram portados para usar WebAssembly podem se beneficiar do SIMD sem modificações no código-fonte, graças às otimizações de autovetorização do LLVM.

Essas otimizações podem transformar automaticamente loops que realizam operações aritméticas em cada iteração em loops equivalentes que realizam as mesmas operações aritméticas em vários elementos ao mesmo tempo usando instruções SIMD. Os autovetorizadores do LLVM são ativados por padrão nos níveis de otimização `-O2` e `-O3` quando a flag `-msimd128` é fornecida.

Por exemplo, considere a seguinte função que multiplica os elementos de duas matrizes de entrada e armazena os resultados em uma matriz de saída.

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

Sem passar a flag `-msimd128`, o compilador emite este loop em WebAssembly:

```wasm
(loop
  (i32.store
    … obter endereço em `out` …
    (i32.mul
      (i32.load … obter endereço em `in_a` …)
      (i32.load … obter endereço em `in_b` …)
  …
)
```

Mas quando a flag `-msimd128` é usada, o autovetorizador transforma isso em código que inclui o seguinte loop:

```wasm
(loop
  (v128.store align=4
    … obter endereço em `out` …
    (i32x4.mul
       (v128.load align=4 … obter endereço em `in_a` …)
       (v128.load align=4 … obter endereço em `in_b` …)
    …
  )
)
```

O corpo do loop tem a mesma estrutura, mas as instruções SIMD estão sendo usadas para carregar, multiplicar e armazenar quatro elementos de uma vez dentro do corpo do loop.

Para um controle mais refinado sobre as instruções SIMD geradas pelo compilador, inclua o arquivo de cabeçalho [`wasm_simd128.h`](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h), que define um conjunto de intrínsecos. Intrínsecos são funções especiais que, quando chamadas, serão transformadas pelo compilador nas instruções SIMD correspondentes em WebAssembly, a menos que ele possa fazer otimizações adicionais.

Como exemplo, aqui está a mesma função mencionada anteriormente, reescrita manualmente para usar os intrínsecos de SIMD.

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

Este código reescrito manualmente assume que as matrizes de entrada e saída estão alinhadas, não são sobrepostas e que tamanho é um múltiplo de quatro. O autovetorizador não pode fazer essas suposições e precisa gerar código extra para lidar com os casos em que essas condições não são verdadeiras, então o código SIMD escrito manualmente geralmente acaba sendo menor do que o código SIMD autovetorizado.

### Cross-compilando projetos C / C++ existentes

Muitos projetos existentes já suportam SIMD ao direcionar outras plataformas, em particular instruções [SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions) e [AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions) em plataformas x86 / x86-64 e instruções [NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon)) em plataformas ARM. Existem duas maneiras como essas instruções costumam ser implementadas.

A primeira é através de arquivos de montagem que lidam com operações SIMD e são vinculados ao C / C++ durante o processo de compilação. A sintaxe e as instruções de montagem são altamente dependentes da plataforma e não portáveis, então, para usar SIMD, esses projetos precisam adicionar WebAssembly como um alvo suportado adicional e reimplementar as funções correspondentes usando o formato de texto [WebAssembly](https://webassembly.github.io/spec/core/text/index.html) ou os intrínsecos descritos [acima](#building-c-%2F-c%2B%2B-to-target-simd).

Outra abordagem comum é usar os intrínsecos SSE / SSE2 / AVX / NEON diretamente no código C / C++ e, nesse caso, o Emscripten pode ajudar. O Emscripten [fornece cabeçalhos compatíveis e uma camada de emulação](https://emscripten.org/docs/porting/simd.html) para todos esses conjuntos de instruções, e uma camada de emulação que os compila diretamente em intrínsecos Wasm onde possível, ou em código linearizado de outra maneira.

Para cross-compilar esses projetos, primeiro habilite SIMD via configurações específicas do projeto, por exemplo, `./configure --enable-simd` para que passe `-msse`, `-msse2`, `-mavx` ou `-mfpu=neon` para o compilador e chame os intrínsecos correspondentes. Em seguida, passe adicionalmente `-msimd128` para habilitar o SIMD do WebAssembly também, usando `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …` ou modificando a configuração de compilação diretamente ao direcionar para Wasm.

### Compilando Rust para direcionar SIMD

Ao compilar código Rust para direcionar SIMD em WebAssembly, você precisará habilitar a mesma funcionalidade LLVM `simd128` conforme descrito acima no Emscripten.

Se você puder controlar as flags do `rustc` diretamente ou por meio da variável de ambiente `RUSTFLAGS`, passe `-C target-feature=+simd128`:

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

ou

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Como no Clang / Emscripten, os autovetorizadores do LLVM são habilitados por padrão para código otimizado quando o recurso `simd128` está ativado.

Por exemplo, o equivalente em Rust do exemplo `multiply_arrays` acima

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

produziria um código autovetorizado semelhante para a parte alinhada das entradas.

Para ter controle manual sobre as operações SIMD, você pode usar o toolchain nightly, habilitar o recurso Rust `wasm_simd` e invocar as intrínsecas diretamente do namespace [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd):

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

Alternativamente, use um crate auxiliar como [`packed_simd`](https://crates.io/crates/packed_simd_2) que abstrai sobre implementações SIMD em várias plataformas.

## Casos de uso convincentes

A proposta WebAssembly SIMD busca acelerar aplicações de alto desempenho computacional, como codecs de áudio/vídeo, aplicações de processamento de imagens, aplicações criptográficas, etc. Atualmente, o WebAssembly SIMD é suportado experimentalmente em projetos open source amplamente utilizados, como [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md), [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) e [XNNPACK](https://github.com/google/XNNPACK).

Alguns demos interessantes vêm do [projeto MediaPipe](https://github.com/google/mediapipe) da equipe de Pesquisa do Google.

De acordo com sua descrição, o MediaPipe é um framework para construir pipelines de ML aplicados multimodais (ex.: vídeo, áudio, qualquer série temporal de dados). E eles também têm uma [versão Web](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)!

Um dos demos mais visualmente impressionantes, onde é fácil observar a diferença de desempenho que o SIMD faz, é uma compilação apenas CPU (não GPU) de um sistema de rastreamento de mãos. [Sem SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html), você consegue apenas cerca de 14-15 FPS (quadros por segundo) em um laptop moderno, enquanto [com SIMD habilitado no Chrome Canary](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html), você tem uma experiência muito mais suave de 38-40 FPS.

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

Outro conjunto interessante de demos que utiliza SIMD para uma experiência suave vem do OpenCV - uma popular biblioteca de visão computacional que também pode ser compilada em WebAssembly. Eles estão disponíveis através deste [link](https://bit.ly/opencv-camera-demos), ou você pode conferir as versões pré-gravadas abaixo:

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>Leitura de cartão</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>Capa da invisibilidade</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>Substituição por emoji</figcaption>
</figure>

## Trabalho futuro

A proposta atual de SIMD de largura fixa está na [Fase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group), portanto, é considerada completa.

Algumas explorações de futuras extensões SIMD começaram nas propostas [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) e [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors), que, no momento da escrita, estão na Fase 1.
