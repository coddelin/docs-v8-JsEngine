---
title: 'Cache de código'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), Engenheiro de Software'
avatars:
  - 'yang-guo'
date: 2015-07-27 13:33:37
tags:
  - internos
description: 'O V8 agora suporta (byte)cache de código, ou seja, armazenar em cache o resultado do parsing + compilação do JavaScript.'
---
O V8 utiliza [compilação em tempo de execução](https://en.wikipedia.org/wiki/Just-in-time_compilation) (JIT) para executar código JavaScript. Isso significa que, imediatamente antes de executar um script, ele precisa ser analisado e compilado — o que pode causar uma sobrecarga considerável. Como [anunciamos recentemente](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html), o cache de código é uma técnica que reduz essa sobrecarga. Quando um script é compilado pela primeira vez, os dados de cache são gerados e armazenados. Na próxima vez que o V8 precisar compilar o mesmo script, mesmo em uma instância diferente do V8, ele pode usar os dados do cache para recriar o resultado da compilação, em vez de compilar do zero. Como resultado, o script é executado muito mais rapidamente.

<!--truncate-->
O cache de código está disponível desde a versão 4.2 do V8 e não é limitado apenas ao Chrome. Ele é exposto através da API do V8, para que qualquer incorporador do V8 possa se beneficiar. O [caso de teste](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090) usado para testar este recurso serve como um exemplo de como utilizar esta API.

Quando um script é compilado pelo V8, os dados de cache podem ser gerados para acelerar compilações futuras passando `v8::ScriptCompiler::kProduceCodeCache` como uma opção. Se a compilação for bem-sucedida, os dados de cache são anexados ao objeto de origem e podem ser recuperados via `v8::ScriptCompiler::Source::GetCachedData`. Eles podem ser persistidos para uso posterior, por exemplo, gravando-os em disco.

Durante compilações subsequentes, os dados de cache produzidos anteriormente podem ser anexados ao objeto de origem e passar `v8::ScriptCompiler::kConsumeCodeCache` como uma opção. Desta vez, o código será produzido muito mais rapidamente, pois o V8 ignora a compilação do código e o desserializa a partir dos dados de cache fornecidos.

Produzir dados de cache tem um certo custo computacional e de memória. Por essa razão, o Chrome só gera dados de cache se o mesmo script for visto pelo menos duas vezes em um intervalo de alguns dias. Dessa forma, o Chrome consegue transformar arquivos de script em código executável duas vezes mais rápido, em média, economizando um tempo valioso para os usuários a cada carregamento subsequente de página.
