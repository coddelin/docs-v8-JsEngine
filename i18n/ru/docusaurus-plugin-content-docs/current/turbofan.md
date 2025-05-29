---
title: "TurboFan"
description: "Этот документ собирает ресурсы о TurboFan, оптимизирующем компиляторе V8."
---
TurboFan — один из оптимизирующих компиляторов V8, использующий концепцию, называемую [«Море узлов»](https://darksi.de/d.sea-of-nodes/). Один из постов блога V8 предлагает [обзор на высоком уровне TurboFan](/blog/turbofan-jit). Более подробную информацию можно найти в следующих ресурсах.

## Статьи и посты в блогах

- [История TurboFan](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan и ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [Введение в спекулятивную оптимизацию в V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## Доклады

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [Обзор компилятора TurboFan](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [JIT-дизайн TurboFan](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [Быстрая арифметика для динамических языков](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [Деоптимизация в V8](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: новая архитектура генерации кода для V8](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([видео](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [Стажировка по ленивости](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [пост в блоге](/blog/lazy-unlinking))

## Проектные документы

Это проектные документы, в основном связанные с внутренним устройством TurboFan.

- [Специализация контекста функции](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [План оптимизации параметров rest и экзотических объектов аргументов](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [Интеграция инструментов разработки TurboFan](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [Встраивание TurboFan](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [Эвристика встраивания TurboFan](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [Устранение избыточных проверок границ и переполнения в TurboFan](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [Ленивая деоптимизация без модификации кода](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [Распределитель регистров](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [Проекционные узлы в TurboFan](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## Связанные проектные документы

Это проектные документы, которые также существенно влияют на TurboFan.

- [Документ (пере)дизайна имен вычисляемых свойств](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [План производительности ES2015 и дальше](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Документ проектирования встроенных итераторов](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [Сделать классы ES2015 быстрыми](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [Документ (пере)дизайна встроенных методов RegExp](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Производительность вызовов spread](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
