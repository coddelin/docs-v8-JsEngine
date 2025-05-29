---
title: 'TurboFan'
description: '이 문서는 TurboFan, V8의 최적화 컴파일러에 대한 자료를 모아놓은 문서입니다.'
---
TurboFan은 V8의 최적화 컴파일러 중 하나로 [“Sea of Nodes”](https://darksi.de/d.sea-of-nodes/)라는 개념을 활용합니다. V8 블로그의 한 게시물에서 [TurboFan에 대한 고급 개요](/blog/turbofan-jit)를 제공합니다. 자세한 내용은 아래 리소스에서 확인할 수 있습니다.

## 기사 및 블로그 게시물

- [TurboFan의 이야기](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan 및 ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [V8에서의 추측적 최적화 소개](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## 강연

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [TurboFan 컴파일러 개요](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [TurboFan의 JIT 디자인](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [동적 언어를 위한 빠른 산술](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [V8에서의 디옵티마이제이션](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: V8을 위한 새로운 코드 생성 아키텍처](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([비디오](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [게으름에 대한 인턴십](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [블로그 게시물](/blog/lazy-unlinking))

## 디자인 문서

이 문서는 주로 TurboFan 내부에 관한 내용을 다룹니다.

- [함수 컨텍스트 특수화](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Rest 매개변수 및 arguments 이국 객체 최적화 계획](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [TurboFan 개발자 도구 통합](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [TurboFan 인라이닝](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [TurboFan 인라이닝 휴리스틱](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [TurboFan 중복 범위 및 오버플로 점검 제거](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [코드 패치 없이 게으른 디옵티마이제이션](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [레지스터 할당기](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [TurboFan에서의 Projection 노드](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## 관련 디자인 문서

이 문서는 TurboFan에 중요한 영향을 미치는 디자인 문서입니다.

- [계산된 속성 이름 (재)설계 문서](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [ES2015 이후 성능 계획](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Iterator 기본 메서드 디자인 문서](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [ES2015 클래스를 빠르게 만들기](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [정규 표현식 기본 메서드 (재)설계 문서](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [스프레드 호출 성능](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
