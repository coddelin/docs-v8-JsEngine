---
title: 'TurboFan'
description: '本文档收集了有关TurboFan（V8优化编译器）的资源。'
---
TurboFan是V8的优化编译器之一，利用了一个名为[“节点之海”](https://darksi.de/d.sea-of-nodes/)的概念。V8的一篇博客文章提供了一份[TurboFan的高级概述](/blog/turbofan-jit)。更多详细信息可以在以下资源中找到。

## 文章和博客帖子

- [TurboFan的故事](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan 和 ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [V8中的投机优化简介](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## 演讲

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [TurboFan编译器概述](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [TurboFan的JIT设计](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [动态语言的快速算术运算](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [V8中的反优化](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: V8的新代码生成架构](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([视频](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [关于惰性的实习](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [博客帖子](/blog/lazy-unlinking))

## 设计文档

以下是主要涉及TurboFan内部实现的设计文档。

- [函数上下文专业化](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Rest参数和arguments特殊对象的优化计划](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [TurboFan开发工具集成](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [TurboFan内联](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [TurboFan内联启发式方法](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [TurboFan冗余边界检查和溢出检查消除](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [无需代码修补的惰性反优化](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [寄存器分配器](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [TurboFan中的投影节点](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## 相关设计文档

以下是同样对TurboFan有重要影响的设计文档。

- [计算属性名的重新设计文档](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [ES2015及更高级别性能计划](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [迭代器内建方法设计文档](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [让ES2015类更快速](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [RegExp内建方法的重新设计文档](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Spread调用性能](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
