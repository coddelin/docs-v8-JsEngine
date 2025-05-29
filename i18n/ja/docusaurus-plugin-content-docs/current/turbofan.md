---
title: &apos;TurboFan&apos;
description: &apos;この文書はTurboFan、V8の最適化コンパイラに関するリソースをまとめています。&apos;
---
TurboFanはV8の最適化コンパイラの一つで、[「Sea of Nodes」](https://darksi.de/d.sea-of-nodes/)という概念を利用しています。V8のブログ記事に[TurboFanの概要](/blog/turbofan-jit)が紹介されています。以下のリソースで更に詳細を確認できます。

## 記事とブログ投稿

- [TurboFanの物語](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFanとES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [V8における推測的最適化の紹介](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## 講演

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [TurboFanコンパイラの概要](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [TurboFanのJIT設計](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [動的言語の高速な算術計算](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [V8におけるデオプティマイゼーション](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: V8の新しいコード生成アーキテクチャ](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([動画](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [怠惰についてのインターンシップ](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [ブログ投稿](/blog/lazy-unlinking))

## 設計文書

これらは主にTurboFanの内部に関する設計文書です。

- [関数コンテキストの特化](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Restパラメータと引数オブジェクトの最適化計画](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [TurboFan開発者ツールの統合](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [TurboFanのインライン化](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [TurboFanのインライン化ヒューリスティックス](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [TurboFanの冗長な境界とオーバーフロー検査の排除](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [コードパッチングなしでの怠惰なデオプティマイゼーション](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [レジスタアロケータ](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [TurboFanにおける投影ノード](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## 関連する設計文書

これらはTurboFanに大きな影響を与える関連設計文書です。

- [計算されたプロパティ名の（再）設計文書](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [ES2015以降のパフォーマンス計画](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [イテレーター組み込み機能の設計文書](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [ES2015クラスを高速化する](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [RegExp組み込み機能の（再）設計文書](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Spread呼び出しのパフォーマンス](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
