---
title: 'Funções integradas'
description: 'Este documento explica o que são as “built-ins” no V8.'
---
As funções integradas no V8 vêm em diferentes variantes em relação à implementação, dependendo de sua funcionalidade, requisitos de desempenho e, às vezes, desenvolvimento histórico simples.

Algumas são implementadas diretamente em JavaScript e são compiladas em código executável em tempo de execução, assim como qualquer código JavaScript do usuário. Algumas delas recorrem a chamadas _funções de runtime_ para parte de sua funcionalidade. As funções de runtime são escritas em C++ e chamadas do JavaScript através de um prefixo `%`. Normalmente, essas funções de runtime são limitadas ao código JavaScript interno do V8. Para fins de depuração, elas também podem ser chamadas do código JavaScript normal, caso o V8 seja executado com a flag `--allow-natives-syntax`. Algumas funções de runtime são diretamente incorporadas pelo compilador no código gerado. Para obter uma lista, consulte `src/runtime/runtime.h`.

Outras funções são implementadas como _built-ins_, que podem ser realizadas de diversas maneiras diferentes. Algumas são implementadas diretamente em assembly dependente da plataforma. Algumas são implementadas no _CodeStubAssembler_, uma abstração independente da plataforma. Outras ainda são implementadas diretamente em C++. As built-ins às vezes também são usadas para implementar pedaços de código de ligação, não necessariamente funções inteiras. Para obter uma lista, consulte `src/builtins/builtins.h`.
