---
title: "ベンチマークをローカルで実行する"
description: "このドキュメントはd8でクラシックベンチマークスイートを実行する方法を説明します。"
---
SunSpider、Kraken、Octaneの「クラシック」ベンチマークを実行するためのシンプルなワークフローがあります。異なるバイナリやフラグの組み合わせで実行でき、結果は複数回の実行に基づいて平均化されます。

## CPU

[GNを使ったビルド](/docs/build-gn)の指示に従って`d8`シェルをビルドしてください。

ベンチマークを実行する前に、CPUの周波数スケーリングガバナーをパフォーマンスモードに設定してください。

```bash
sudo tools/cpu.sh fast
```

`cpu.sh`が理解するコマンドは次の通りです:

- `fast`, performance (`fast`のエイリアス)
- `slow`, powersave (`slow`のエイリアス)
- `default`, ondemand (`default`のエイリアス)
- `dualcore` (2つのコア以外を無効化), dual (`dualcore`のエイリアス)
- `allcores` (利用可能なすべてのコアを再有効化), all (`allcores`のエイリアス)

## CSuite

`CSuite`はシンプルなベンチマークランナーです:

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <d8バイナリへのパス>
    [-x "<オプションの追加d8コマンドラインフラグ>"]
```

最初に`baseline`モードで実行して基準値を作成し、その後`compare`モードで結果を取得します。`CSuite`はデフォルトでOctaneには10回、SunSpiderには100回、Krakenには80回の実行を行いますが、`-r`オプションでこれらを上書きしてより速く結果を得ることができます。

`CSuite`は現在のディレクトリに次の2つのサブディレクトリを作成します:

1. `./_benchmark_runner_data` — これはN回の実行からのキャッシュされた出力です。
1. `./_results` — 結果をここにマスターファイルとして書き込みます。これらの
  ファイルを異なる名前で保存できます。それらは比較モードに表示されます。

比較モードでは、異なるバイナリあるいは少なくとも異なるフラグを使用するのが通常です。

## 使用例

例えば、`d8`の2つのバージョンをビルドして、SunSpiderで何が起こるかを確認したいとします。まず、基準値を作成します:

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Wrote ./_results/master.
compareモードでSunSpiderを再実行して結果を確認します。
```

提案された通り、今回は異なるバイナリを使って`compare`モードで再度実行してください:

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

前回の実行結果は、現在のディレクトリに作成されたサブディレクトリ（`_benchmark_runner_data`）にキャッシュされます。集計結果もキャッシュされ、`_results`ディレクトリに保存されます。比較手順を実行した後、これらのディレクトリは削除しても構いません。

もう1つのシナリオとして、同じバイナリを使用して、異なるフラグの結果を確認したい場合があります。少し面白半分で、最適化コンパイラーなしでOctaneがどのように動作するかを見たい場合、まず基準値を設定します:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

通常、octaneは安定した結果を得るために10回の実行を必要とします。
/usr/local/google/home/mvstanton/src/v8/_results/master に書き込みました。
結果を確認するには、比較モードでoctaneを再実行してください。
```

通常、1回の実行だけでは多くのパフォーマンス最適化について確信を持てないことに注意してください。しかし、私たちの「変更」は1回の実行だけで再現可能な効果を持つはずです！ 次に比較します。`--noopt`フラグを渡して[TurboFan](/docs/turbofan)をオフにします：

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

通常、octaneは安定した結果を得るために10回の実行を必要とします。
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

`CodeLoad`と`zlib`が比較的損害を受けていないことを見るのは興味深いです。

## 内部仕組み

`CSuite`は同じディレクトリ内の2つのスクリプト、`benchmark.py`と`compare-baseline.py`に基づいています。それらのスクリプトにはさらに多くのオプションがあります。例えば、複数のベースラインを記録し、3方向、4方向、または5方向の比較を行うことができます。`CSuite`は迅速な使用に最適化されており、いくつかの柔軟性を犠牲にしています。
