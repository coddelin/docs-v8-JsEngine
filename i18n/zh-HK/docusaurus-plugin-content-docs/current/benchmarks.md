---
title: '本地執行基準測試'
description: '本文件解釋了如何在 d8 中執行經典基準測試套件。'
---
我們有一個簡單的工作流程，可以用於執行 SunSpider、Kraken 和 Octane 的“經典”基準測試。您可以使用不同的二進制文件和標誌組合執行測試，結果是多次執行的平均值。

## CPU

按照 [使用 GN 構建](/docs/build-gn) 中的指導，構建 `d8` shell。

在執行基準測試之前，請確保將您的 CPU 頻率調節器設置為性能模式。

```bash
sudo tools/cpu.sh fast
```

`cpu.sh` 可理解的命令包括：

- `fast`, 性能模式（`fast` 的別名）
- `slow`, 節能模式（`slow` 的別名）
- `default`, 自動模式（`default` 的別名）
- `dualcore` (禁用所有但保留兩個核心)，雙核模式（`dualcore` 的別名）
- `allcores` (重新啟用所有可用核心)，全核模式（`allcores` 的別名）。

## CSuite

`CSuite` 是我們的簡單基準測試運行工具：

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <d8 二進制文件的路徑>
    [-x "<可選的額外 d8 命令行標誌>"]
```

首先以 `baseline` 模式運行以建立基準線，然後以 `compare` 模式運行以獲取結果。`CSuite` 默認對 Octane 執行 10 次測試，對 SunSpider 執行 100 次測試，對 Kraken 執行 80 次測試，但您可以使用 `-r` 參數進行覆蓋以獲得更快的結果。

`CSuite` 在您運行的目錄下創建了兩個子目錄：

1. `./_benchmark_runner_data` — 此處存儲 N 次運行的緩存輸出。
1. `./_results` — 此處將結果寫入主文件。您可以使用不同的名稱保存這些
  文件，它們將顯示在比較模式中。

在比較模式中，您當然需要使用不同的二進制文件或至少不同的標誌。

## 示例用法

假設您已構建了兩個版本的 `d8`，並想看看 SunSpider 的表現。首先，創建基準線：

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
已寫入 ./_results/master。
以比較模式再次運行 sunspider 以查看結果。
```

按照建議，再次運行，但此次使用不同的二進制文件並以 `compare` 模式運行：

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               基準測試:    分數 |   master |      % |
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

前一次運行的輸出緩存在當前目錄中創建的子目錄（`_benchmark_runner_data`）中。聚合結果也被緩存，在目錄 `_results` 中。這些目錄可以在完成比較步驟後刪除。

另一種情況是使用相同的二進制文件，但希望查看不同標誌的結果。出於趣味，您可能希望查看 Octane 在沒有優化編譯器的情況下的表現。首先建立基準線：

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

通常，octane 需要執行 10 次才能獲得穩定的結果。
已寫入 /usr/local/google/home/mvstanton/src/v8/_results/master。
再次使用比較模式運行 octane 以查看結果。
```

請注意警告，通常一次運行不足以確定許多性能優化，但是，我們的“變更”應該在僅運行一次時產生可重現的效果！現在讓我們來比較，傳遞 `--noopt` 標誌來關閉 [TurboFan](/docs/turbofan)：

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

通常，octane 需要執行 10 次才能獲得穩定的結果。
                               基準測試:    分數 |    主版本 |      % |
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

很有趣的是，`CodeLoad` 和 `zlib` 受到的損害相對較小。

## 背後的技術

`CSuite` 基於同一目錄中的兩個腳本，`benchmark.py` 和 `compare-baseline.py`。這些腳本具有更多選項。例如，您可以記錄多個基準並進行 3、4 或 5 向比較。`CSuite` 針對快速使用進行了優化，因此犧牲了一些靈活性。
