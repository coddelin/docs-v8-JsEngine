---
title: 'Integração do `perf` no Linux com o V8'
description: 'Este documento explica como analisar o desempenho do código compilado JIT do V8 com a ferramenta `perf` no Linux.'
---
O V8 tem suporte integrado para a ferramenta `perf` no Linux. Ele é habilitado pelas opções de linha de comando `--perf-prof`.
O V8 escreve dados de desempenho durante a execução em um arquivo que pode ser usado para analisar o desempenho do código compilado JIT do V8 (incluindo os nomes das funções JS) com a ferramenta `perf` no Linux.

## Requisitos

- Versão 5 ou superior do `linux-perf` (versões anteriores não possuem suporte para JIT). (Veja as instruções no [final](#build-perf))
- Compile o V8/Chrome com `enable_profiling=true` para melhor simbolização do código C++.

## Construindo o V8

Para usar a integração do V8 com o perf do Linux, você precisa compilá-lo com o sinalizador gn `enable_profiling = true`:

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## Perfilando `d8` com [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

Depois de compilar o `d8`, você pode começar a usar o perf do Linux:

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

Um exemplo mais completo:

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# Use sinalizadores personalizados do V8 e um diretório de saída separado para menos confusão:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# Interface sofisticada (`-flame` é exclusivo para Googlers, use `-web` como alternativa pública):
pprof -flame perf_results/XXX_perf.data.jitted;
# Ferramenta baseada em terminal:
perf report -i perf_results/XXX_perf.data.jitted;
```

Consulte `linux-perf-d8.py --help` para mais detalhes. Observe que você pode usar todos os sinalizadores do `d8` após o argumento binário do d8.


## Perfilando Chrome ou content_shell com [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. Você pode usar o script [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) para perfilar o Chrome. Certifique-se de adicionar os [sinalizadores gn necessários do Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) para obter símbolos C++ adequados.

1. Uma vez que sua compilação esteja pronta, você pode perfilar um site com símbolos completos para o código C++ e JS.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. Navegue até seu site e então feche o navegador (ou aguarde o término do `--timeout`)
1. Após sair do navegador, o `linux-perf.py` fará o pós-processamento dos arquivos e exibirá uma lista com um arquivo de resultado para cada processo de renderização:

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## Explorando os resultados do linux-perf

Finalmente, você pode usar a ferramenta `perf` do Linux para explorar o perfil de um processo de renderização do d8 ou do Chrome:

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

Você também pode usar o [pprof](https://github.com/google/pprof) para gerar visualizações mais detalhadas:

```bash
# Nota: `-flame` é exclusivo para Google, use `-web` como alternativa pública:
pprof -flame perf_results/XXX_perf.data.jitted;
```

## Uso de linux-perf em nível baixo

### Usando linux-perf diretamente com `d8`

Dependendo do seu caso de uso, você pode optar por usar o linux-perf diretamente com `d8`.
Isso requer um processo de duas etapas. Primeiro, o `perf record` cria um arquivo `perf.data` que deve ser pós-processado com `perf inject` para injetar os símbolos JS.

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### Sinalizadores do V8 para linux-perf

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) é usado na linha de comando do V8 para registrar amostras de desempenho no código JIT.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) é necessário para desativar a proteção de escrita na memória de código. Isso é necessário porque o `perf` descarta informações sobre páginas de código ao detectar o evento correspondente à remoção do bit de escrita da página de código. Aqui está um exemplo que registra amostras de um arquivo JavaScript de teste:

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) é usado para criar diferentes pontos de entrada (versões copiadas do InterpreterEntryTrampoline) para funções interpretadas, de modo que elas possam ser distinguidas pelo `perf` com base apenas no endereço. Como o InterpreterEntryTrampoline precisa ser copiado, isso resulta em uma leve regressão de desempenho e memória.


### Usando linux-perf com chrome diretamente

1. Você pode usar as mesmas flags do V8 para fazer o perfil do próprio Chrome. Siga as instruções acima para as flags corretas do V8 e adicione as [flags necessárias do gn do Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) à sua compilação do Chrome.

1. Depois que sua compilação estiver pronta, você pode fazer o perfil de um site com símbolos completos para código C++ e JS.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Após iniciar o Chrome, encontre o ID do processo do renderizador usando o Gerenciador de Tarefas e use-o para iniciar o perfil:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. Navegue até o seu site e depois continue com a próxima seção sobre como avaliar a saída do perf.

1. Após a execução terminar, combine as informações estáticas obtidas pela ferramenta `perf` com as amostras de desempenho geradas pelo V8 para código JIT:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. Finalmente, você pode usar a ferramenta Linux `perf` [para explorar](#Explore-linux-perf-results)

## Compilar `perf`

Se você tiver um kernel Linux desatualizado, pode compilar o linux-perf com suporte a JIT localmente.

- Instale um kernel Linux novo e reinicie sua máquina:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- Instale as dependências:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- Baixe as fontes do kernel que incluem a fonte mais recente da ferramenta `perf`:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

Nos passos seguintes, invoque o `perf` como `some/director/tip/tools/perf/perf`.
