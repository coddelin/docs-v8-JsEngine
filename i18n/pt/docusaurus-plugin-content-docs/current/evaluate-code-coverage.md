---
title: "Avaliando cobertura de código"
description: "Este documento explica o que fazer se você está trabalhando em uma mudança no V8 e deseja avaliar sua cobertura de código."
---
Você está trabalhando em uma mudança. Você quer avaliar a cobertura de código para seu novo código.

O V8 fornece duas ferramentas para fazer isso: local, na sua máquina; e suporte à infraestrutura de construção.

## Local

Relativo à raíz do repositório do V8, use `./tools/gcov.sh` (testado no Linux). Isso utiliza as ferramentas de cobertura de código do GNU e alguns scripts para produzir um relatório em HTML, onde você pode explorar informações de cobertura por diretório, arquivo e, em seguida, linha de código.

O script compila o V8 em um diretório `out` separado, usando configurações `gcov`. Usamos um diretório separado para evitar alterar suas configurações de compilação normais. Esse diretório separado é chamado `cov` — ele é criado imediatamente na raíz do repositório. O `gcov.sh` então executa a suíte de testes e produz o relatório. O caminho para o relatório é fornecido quando o script é concluído.

Se sua alteração tiver componentes específicos de arquitetura, você pode coletar cumulativamente a cobertura de execuções específicas para essas arquiteturas.

```bash
./tools/gcov.sh x64 arm
```

Isso recompila no mesmo local para cada arquitetura, substituindo os binários da execução anterior, mas preservando e acumulando os resultados de cobertura.

Por padrão, o script coleta de execuções `Release`. Se você quiser `Debug`, pode especificar:

```bash
BUILD_TYPE=Debug ./tools/gcov.sh x64 arm arm64
```

Executar o script sem opções também fornecerá um resumo das opções disponíveis.

## Bot de cobertura de código

Para cada alteração que foi integrada, executamos uma análise de cobertura para arquitetura x64 — veja o [bot de cobertura](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20gcov%20coverage). Não executamos bots para cobertura de outras arquiteturas.

Para obter o relatório de uma execução específica, você deve listar as etapas da compilação, encontrar a etapa “gsutil coverage report” (perto do final) e abrir o “report” abaixo dela.
