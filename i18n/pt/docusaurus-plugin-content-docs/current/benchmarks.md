---
title: "Executando benchmarks localmente"
description: "Este documento explica como executar suítes de benchmarks clássicos no d8."
---
Temos um fluxo de trabalho simples para executar os benchmarks “clássicos” do SunSpider, Kraken e Octane. Você pode executar com diferentes binários e combinações de flags, e os resultados são uma média de várias execuções.

## CPU

Compile o shell `d8` seguindo as instruções em [Building with GN](/docs/build-gn).

Antes de executar os benchmarks, certifique-se de definir o governador de escalonamento de frequência da CPU para desempenho.

```bash
sudo tools/cpu.sh fast
```

Os comandos que o `cpu.sh` entende são

- `fast`, desempenho (alias para `fast`)
- `slow`, economia de energia (alias para `slow`)
- `default`, sob demanda (alias para `default`)
- `dualcore` (desativa todos, exceto dois núcleos), dual (alias para `dualcore`)
- `allcores` (reativa todos os núcleos disponíveis), all (alias para `allcores`).

## CSuite

`CSuite` é nosso executor de benchmarks simples:

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <caminho para o binário d8>
    [-x "<flags opcionais da linha de comando do d8>"]
```

Primeiro execute em modo `baseline` para criar os padrões, depois em modo `compare` para obter os resultados. O `CSuite` faz, por padrão, 10 execuções para o Octane, 100 para o SunSpider e 80 para o Kraken, mas você pode sobrescrever esses valores para obter resultados mais rápidos com a opção `-r`.

O `CSuite` cria dois subdiretórios no diretório de onde você executa:

1. `./_benchmark_runner_data` — esta é a saída em cache das N execuções.
1. `./_results` — escreve os resultados no arquivo master aqui. Você pode salvar esses
  arquivos com nomes diferentes, e eles aparecerão no modo compare.

No modo compare, você naturalmente usará um binário diferente ou pelo menos flags diferentes.

## Exemplo de uso

Digamos que você compilou duas versões do `d8`, e quer ver o que acontece com o SunSpider. Primeiro, crie os padrões:

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Escreveu ./_results/master.
Execute o sunspider novamente no modo compare para ver os resultados.
```

Como sugerido, execute novamente, mas desta vez no modo `compare` com um binário diferente:

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               benchmark:    score |   master |      % |
===================================================+==========+========+
                       3d-cube-sunspider:     13.9 S     13.4 S   -3.6 |
                      3d-morph-sunspider:      8.6 S      8.4 S   -2.3 |
                   3d-raytrace-sunspider:     15.1 S     14.9 S   -1.3 |
           access-binary-trees-sunspider:      3.7 S      3.9 S    5.4 |
               access-fannkuch-sunspider:     11.9 S     11.8 S   -0.8 |
                  access-nbody-sunspider:      4.6 S      4.8 S    4.3 |
                 access-nsieve-sunspider:      8.4 S      8.1 S   -3.6 |
      bitops-3bit-bits-in-byte-sunspider:      2.0 |      2.0 |        |
           bitops-bits-in-byte-sunspider:      3.7 S      3.9 S    5.4 |
            bitops-bitwise-and-sunspider:      2.7 S      2.9 S    7.4 |
            bitops-nsieve-bits-sunspider:      5.3 S      5.6 S    5.7 |
         controlflow-recursive-sunspider:      3.8 S      3.6 S   -5.3 |
                    crypto-aes-sunspider:     10.9 S      9.8 S  -10.1 |
                    crypto-md5-sunspider:      7.0 |      7.4 S    5.7 |
                   crypto-sha1-sunspider:      9.2 S      9.0 S   -2.2 |
             date-format-tofte-sunspider:      9.8 S      9.9 S    1.0 |
             date-format-xparb-sunspider:     10.3 S     10.3 S        |
                   math-cordic-sunspider:      6.1 S      6.2 S    1.6 |
             math-partial-sums-sunspider:     20.2 S     20.1 S   -0.5 |
            math-spectral-norm-sunspider:      3.2 S      3.0 S   -6.2 |
                    regexp-dna-sunspider:      7.6 S      7.8 S    2.6 |
                 string-base64-sunspider:     14.2 S     14.0 |   -1.4 |
                  string-fasta-sunspider:     12.8 S     12.6 S   -1.6 |
               string-tagcloud-sunspider:     18.2 S     18.2 S        |
            string-unpack-code-sunspider:     20.0 |     20.1 S    0.5 |
         string-validate-input-sunspider:      9.4 S      9.4 S        |
                               SunSpider:    242.6 S    241.1 S   -0.6 |
---------------------------------------------------+----------+--------+
```

A saída da execução anterior é armazenada em cache em um subdiretório criado no diretório atual (`_benchmark_runner_data`). Os resultados agregados também são armazenados em cache, no diretório `_results`. Esses diretórios podem ser excluídos após a execução do passo de comparação.

Outra situação é quando você tem o mesmo binário, mas quer ver os resultados com diferentes flags. Sentindo-se bem animado, você gostaria de ver como o Octane se comporta sem um compilador otimizador. Primeiro o padrão:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

Normalmente, octane requer 10 execuções para obter resultados estáveis.
Escreveu /usr/local/google/home/mvstanton/src/v8/_results/master.
Execute octane novamente no modo de comparação para ver os resultados.
```

Observe o aviso de que uma única execução geralmente não é suficiente para garantir muitas otimizações de desempenho; no entanto, nossa 'alteração' deve ter um efeito reproduzível com apenas uma execução! Agora vamos comparar, passando o argumento `--noopt` para desativar o [TurboFan](/docs/turbofan):

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

Normalmente, octane requer 10 execuções para obter resultados estáveis.
                               benchmark:    score |   master |      % |
===================================================+==========+========+
                                Richards:    973.0 |  26770.0 |  -96.4 |
                               DeltaBlue:   1070.0 |  57245.0 |  -98.1 |
                                  Crypto:    923.0 |  32550.0 |  -97.2 |
                                RayTrace:   2896.0 |  75035.0 |  -96.1 |
                             EarleyBoyer:   4363.0 |  42779.0 |  -89.8 |
                                  RegExp:   2881.0 |   6611.0 |  -56.4 |
                                   Splay:   4241.0 |  19489.0 |  -78.2 |
                            SplayLatency:  14094.0 |  57192.0 |  -75.4 |
                            NavierStokes:   1308.0 |  39208.0 |  -96.7 |
                                   PdfJS:   6385.0 |  26645.0 |  -76.0 |
                                Mandreel:    709.0 |  33166.0 |  -97.9 |
                         MandreelLatency:   5407.0 |  97749.0 |  -94.5 |
                                 Gameboy:   5440.0 |  54336.0 |  -90.0 |
                                CodeLoad:  25631.0 |  25282.0 |    1.4 |
                                   Box2D:   3288.0 |  67572.0 |  -95.1 |
                                    zlib:  59154.0 |  58775.0 |    0.6 |
                              Typescript:  12700.0 |  23310.0 |  -45.5 |
                                  Octane:   4070.0 |  37234.0 |  -89.1 |
---------------------------------------------------+----------+--------+
```

Interessante ver que `CodeLoad` e `zlib` foram relativamente pouco afetados.

## Por trás dos bastidores

`CSuite` é baseado em dois scripts no mesmo diretório: `benchmark.py` e `compare-baseline.py`. Existem mais opções nesses scripts. Por exemplo, você pode registrar múltiplos baselines e realizar comparações de 3, 4 ou 5 maneiras. `CSuite` é otimizado para uso rápido e sacrifica um pouco de flexibilidade.
