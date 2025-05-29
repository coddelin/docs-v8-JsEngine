---
title: &apos;Тесты веб-мака Blink (также известные как тесты макета)&apos;
description: &apos;Инфраструктура V8 постоянно запускает веб-тесты Blink для предотвращения проблем интеграции с Chromium. Этот документ описывает, что делать в случае сбоя такого теста.&apos;
---
Мы постоянно запускаем [веб-тесты Blink (ранее известные как «тесты макета»)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md) на нашей [интеграционной консоли](https://ci.chromium.org/p/v8/g/integration/console) для предотвращения проблем интеграции с Chromium.

При сбоях тестов боты сравнивают результаты V8 Tip-of-Tree с закрепленной в Chromium версией V8, чтобы выявить только недавно возникшие проблемы V8 (с долей ложных срабатываний < 5%). Назначение виновного просто, так как бот [Linux релиза](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) тестирует все ревизии.

Коммиты с недавно возникшими сбоями обычно откатываются, чтобы разблокировать автоматическое обновление в Chromium. Если вы замечаете, что ломаете тесты макета или ваш коммит откатывается из-за такого сбоя, и если изменения ожидаемые, выполните следующую процедуру, чтобы добавить обновленные базовые линии в Chromium перед повторным (ре-)объединением вашего CL:

1. Выполните изменение в Chromium, установив `[ Failure Pass ]` для измененных тестов ([подробнее](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
2. Выполните ваш CL в V8 и подождите 1–2 дня, пока он попадет в Chromium.
3. Следуйте [этим инструкциям](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests) для ручного создания новых базовых линий. Обратите внимание, что если вы изменяете только Chromium, [этот предпочтительный автоматический процесс](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline) должен сработать для вас.
4. Удалите запись `[ Failure Pass ]` из файла ожиданий теста и выполните ее вместе с новыми базовыми линиями в Chromium.

Пожалуйста, связывайте все CL с нижним колонтитулом `Bug: …`.
