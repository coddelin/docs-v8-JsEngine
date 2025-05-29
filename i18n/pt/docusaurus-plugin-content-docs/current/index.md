---
title: "Documentação"
description: "Documentação para o projeto V8."
slug: /
---
V8 é o mecanismo de JavaScript e WebAssembly de alto desempenho e código aberto do Google, escrito em C++. Ele é usado no Chrome e no Node.js, entre outros.

Esta documentação é direcionada a desenvolvedores C++ que desejam usar o V8 em suas aplicações, assim como para qualquer pessoa interessada no design e no desempenho do V8. Este documento apresenta o V8, enquanto a documentação restante mostra como usar o V8 no seu código e descreve alguns dos detalhes do seu design, além de fornecer um conjunto de benchmarks JavaScript para medir o desempenho do V8.

## Sobre o V8

O V8 implementa <a href="https://tc39.es/ecma262/">ECMAScript</a> e <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>, e funciona em sistemas Windows, macOS e Linux que utilizam processadores x64, IA-32 ou ARM. Sistemas adicionais (IBM i, AIX) e processadores (MIPS, ppcle64, s390x) são mantidos externamente, veja [ports](/ports). O V8 pode ser embutido em qualquer aplicação C++.

O V8 compila e executa código fonte JavaScript, lida com alocação de memória para objetos e realiza coleta de lixo para objetos que não são mais necessários. O coletor de lixo generacional, preciso e de parada total do V8 é uma das chaves para o desempenho do V8.

JavaScript é comumente usado para scripts do lado do cliente em navegadores, sendo utilizado, por exemplo, para manipular objetos do Modelo de Objeto de Documento (DOM). O DOM, no entanto, não é normalmente fornecido pelo mecanismo JavaScript, mas sim por um navegador. O mesmo acontece com o V8 — o Google Chrome fornece o DOM. No entanto, o V8 fornece todos os tipos de dados, operadores, objetos e funções especificados no padrão ECMA.

O V8 permite que qualquer aplicação C++ exponga seus próprios objetos e funções ao código JavaScript. Cabe a você decidir os objetos e funções que deseja expor ao JavaScript.

## Visão geral da documentação

- [Construindo o V8 a partir do código fonte](/build)
    - [Obtendo o código fonte do V8](/source-code)
    - [Construindo com GN](/build-gn)
    - [Cross-compilação e depuração para ARM/Android](/cross-compile-arm)
    - [Cross-compilação para iOS](/cross-compile-ios)
    - [Configuração de GUI e IDE](/ide-setup)
    - [Compilando no Arm64](/compile-arm64)
- [Contribuindo](/contribute)
    - [Código respeitoso](/respectful-code)
    - [API pública do V8 e sua estabilidade](/api)
    - [Tornando-se um colaborador do V8](/become-committer)
    - [Responsabilidade do colaborador](/committer-responsibility)
    - [Testes web do Blink (também conhecidos como testes de layout)](/blink-layout-tests)
    - [Avaliação de cobertura de código](/evaluate-code-coverage)
    - [Processo de lançamento](/release-process)
    - [Diretrizes de revisão de design](/design-review-guidelines)
    - [Implementando e lançando recursos de linguagem JavaScript/WebAssembly](/feature-launch-process)
    - [Checklist para o preparo e lançamento de recursos WebAssembly](/wasm-shipping-checklist)
    - [Flake bisect](/flake-bisect)
    - [Manuseio de portas](/ports)
    - [Suporte oficial](/official-support)
    - [Mesclando e corrigindo](/merge-patch)
    - [Build de integração do Node.js](/node-integration)
    - [Relatando bugs de segurança](/security-bugs)
    - [Executando benchmarks localmente](/benchmarks)
    - [Testando](/test)
    - [Triagem de problemas](/triage-issues)
- Depuração
    - [Depurando ARM com o simulador](/debug-arm)
    - [Cross-compilação e depuração para ARM/Android](/cross-compile-arm)
    - [Depurando funções internas com GDB](/gdb)
    - [Depurando através do Protocolo de Inspeção V8](/inspector)
    - [Integração da Interface de Compilação JIT com GDB](/gdb-jit)
    - [Investigando vazamentos de memória](/memory-leaks)
    - [API de rastreamento de pilha](/stack-trace-api)
    - [Usando D8](/d8)
    - [Ferramentas do V8](https://v8.dev/tools)
- Embutindo o V8
    - [Guia para embutir o V8](/embed)
    - [Números de versão](/version-numbers)
    - [Funções embutidas](/builtin-functions)
    - [Suporte a i18n](/i18n)
    - [Mitigações para código não confiável](/untrusted-code-mitigations)
- Por dentro dos bastidores
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Manual do usuário de Torque](/torque)
    - [Escrevendo funções embutidas com Torque](/torque-builtins)
    - [Escrevendo funções embutidas com CSA](/csa-builtins)
    - [Adicionando um novo opcode WebAssembly](/webassembly-opcode)
    - [Mapas, também conhecidos como "Classes Ocultas"](/hidden-classes)
    - [Slack Tracking - o que é?](/blog/slack-tracking)
    - [Pipeline de compilação WebAssembly](/wasm-compilation-pipeline)
- Escrevendo JavaScript otimizável
    - [Usando o profiler baseado em amostras do V8](/profile)
    - [Profiling Chromium com o V8](/profile-chromium)
    - [Usando `perf` do Linux com o V8](/linux-perf)
    - [Rastreando o V8](/trace)
    - [Usando Estatísticas de Chamadas em Tempo de Execução](/rcs)
