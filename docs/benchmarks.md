---
title: "⟨在本地运行基准测试⟩"
description: "⟨本文档解释如何在d8中运行经典的基准测试套件。⟩"
---
我们提供了一个简单的工作流程，用于运行SunSpider、Kraken和Octane这些“经典”基准测试。您可以使用不同的二进制文件和标志组合运行测试，结果会取多次运行的平均值。

## CPU

按照[使用GN构建](/docs/build-gn)中的说明构建`d8` shell。

在运行基准测试之前，请确保将您的CPU频率调节器设置为性能模式。

```bash
sudo tools/cpu.sh fast
```

`cpu.sh`支持的命令有：

- `fast`，性能（`fast`的别名）
- `slow`，节能（`slow`的别名）
- `default`，动态调整（`default`的别名）
- `dualcore`（禁用除两个内核外的所有内核），双核（`dualcore`的别名）
- `allcores`（重新启用所有可用内核），全核（`allcores`的别名）。

## CSuite

`CSuite`是我们的简单基准测试运行工具：

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <d8 二进制文件路径>
    [-x "<可选的额外d8命令行标志>"]
```

首先以`baseline`模式运行以创建基准，然后以`compare`模式运行以获得结果。`CSuite`默认对Octane进行10次运行，对SunSpider进行100次运行，对Kraken进行80次运行，但您可以使用`-r`选项覆盖这些以加快结果生成。

`CSuite`会在您运行的目录中创建两个子目录：

1. `./_benchmark_runner_data` —这是N次运行的缓存输出。
1. `./_results` —它会将结果写入此处的主文件。您可以使用不同的名称保存这些
  文件，它们将在对比模式中显示。

在对比模式下，您通常会使用不同的二进制文件或至少使用不同的标志。

## 使用示例

假设您构建了两个版本的`d8`，并希望查看SunSpider的变化。首先，创建基准：

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
已写入 ./_results/master。
再次以对比模式运行SunSpider以查看结果。
```

如建议，再次运行，但这次使用对比模式并使用不同的二进制文件：

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               基准测试:    分数 |   master |      % |
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

上一次运行的输出存储在当前目录中创建的子目录（`_benchmark_runner_data`）中。汇总结果也存储在目录`_results`中。在完成对比步骤后，可以删除这些目录。

另一种情况是，您使用相同的二进制文件，但希望查看不同标志的结果。您可能想看看没有优化编译器时，Octane的表现如何。首先是基准：

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

通常情况下，octane 需要运行 10 次才能获得稳定的结果。
已写入 /usr/local/google/home/mvstanton/src/v8/_results/master。
再次运行 octane，使用对比模式查看结果。
```

请注意，警告表明一次运行通常不足以确保许多性能优化的准确性，然而，我们的“更改”应该在仅运行一次时就具有可重复的效果！现在我们来进行对比，传递 `--noopt` 标志来关闭 [TurboFan](/docs/turbofan)：

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

通常情况下，octane 需要运行 10 次才能获得稳定的结果。
                               基准测试:    分数 |   主分支 |      % |
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

有趣的是，`CodeLoad` 和 `zlib` 受到的影响相对较小。

## 引擎内部

`CSuite` 基于同一目录下的两个脚本：`benchmark.py` 和 `compare-baseline.py`。这些脚本中有更多选项。例如，你可以记录多个基线并进行 3、4 或 5 路比较。`CSuite` 优化了快速使用，但牺牲了一些灵活性。
