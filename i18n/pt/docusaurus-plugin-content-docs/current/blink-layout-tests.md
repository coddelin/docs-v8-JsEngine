---
title: "Testes web do Blink (também conhecidos como testes de layout)"
description: "A infraestrutura do V8 executa continuamente os testes web do Blink para prevenir problemas de integração com o Chromium. Este documento descreve o que fazer caso um desses testes falhe."
---
Executamos continuamente [os testes web do Blink (anteriormente conhecidos como “testes de layout”)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md) em nosso [console de integração](https://ci.chromium.org/p/v8/g/integration/console) para prevenir problemas de integração com o Chromium.

Em falhas de teste, os bots comparam os resultados da versão mais recente do V8 com a versão fixa do V8 no Chromium, sinalizando apenas problemas recém-introduzidos no V8 (com falsos positivos < 5%). A atribuição de culpa é trivial, já que o bot [Linux release](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) testa todas as revisões.

Commits com falhas recém-introduzidas são normalmente revertidos para não bloquear o processo de auto-roll no Chromium. Caso você perceba que está quebrando os testes de layout ou que seu commit foi revertido devido a tal problema, e caso as alterações sejam esperadas, siga este procedimento para adicionar baselines atualizados ao Chromium antes de (re-)aterrar seu CL:

1. Envie uma alteração no Chromium definindo `[ Failure Pass ]` para os testes alterados ([mais](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
1. Envie seu CL no V8 e aguarde 1-2 dias até ele ser integrado ao Chromium.
1. Siga [estas instruções](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests) para gerar manualmente os novos baselines. Observe que, se você estiver fazendo alterações apenas no Chromium, [este procedimento automático preferido](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline) deve funcionar para você.
1. Remova a entrada `[ Failure Pass ]` do arquivo de expectativas dos testes e envie-o junto com os novos baselines no Chromium.

Por favor, associe todos os CLs a um rodapé `Bug: …`.
