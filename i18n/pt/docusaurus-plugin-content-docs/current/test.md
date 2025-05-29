---
title: 'Testando'
description: 'Este documento explica o framework de testes que faz parte do repositório V8.'
---
V8 inclui um framework de testes que permite testar o motor. O framework permite executar tanto nossos próprios conjuntos de testes incluídos no código fonte quanto outros, como [o conjunto de testes Test262](https://github.com/tc39/test262).

## Executando os testes do V8

[Usando `gm`](/docs/build-gn#gm), você pode simplesmente adicionar `.check` a qualquer alvo de compilação para executar testes para ele, por exemplo:

```bash
gm x64.release.check
gm x64.optdebug.check  # recomendado: razoavelmente rápido, com DCHECKs.
gm ia32.check
gm release.check
gm check  # compila e testa todas as plataformas padrão
```

`gm` compila automaticamente qualquer alvo necessário antes de executar os testes. Você também pode limitar os testes a serem executados:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

Se você já compilou o V8, pode executar os testes manualmente:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

Novamente, você pode especificar quais testes executar:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

Execute o script com `--help` para descobrir outras opções.

## Executando mais testes

O conjunto padrão de testes a ser executado não inclui todos os testes disponíveis. Você pode especificar conjuntos adicionais de testes na linha de comando do `gm` ou `run-tests.py`:

- `benchmarks` (apenas para correção; não produz resultados de benchmark!)
- `mozilla`
- `test262`
- `webkit`

## Executando microbenchmarks

Em `test/js-perf-test` temos microbenchmarks para acompanhar o desempenho de recursos. Há um executor especial para isso: `tools/run_perf.py`. Execute-os assim:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

Se você não quiser executar todos os `JSTests`, pode fornecer um argumento `filter`:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## Atualizando as expectativas de teste do inspetor

Após atualizar seu teste, pode ser necessário regenerar o arquivo de expectativas para ele. Você pode fazer isso executando:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

Isso também pode ser útil se você quiser descobrir como a saída do seu teste mudou. Primeiro, gere novamente o arquivo esperado usando o comando acima, depois verifique a diferença com:

```bash
git diff
```

## Atualizando expectativas de bytecode (reescrevendo base)

Às vezes, as expectativas de bytecode podem mudar, resultando em falhas no `cctest`. Para atualizar os arquivos de referência, compile `test/cctest/generate-bytecode-expectations` executando:

```bash
gm x64.release generate-bytecode-expectations
```

…e, em seguida, atualize o conjunto padrão de entradas passando a flag `--rebaseline` para o binário gerado:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

Os arquivos de referência atualizados agora estão disponíveis em `test/cctest/interpreter/bytecode_expectations/`.

## Adicionando um novo teste de expectativas de bytecode

1. Adicione um novo caso de teste em `cctest/interpreter/test-bytecode-generator.cc` e especifique um arquivo de referência com o mesmo nome do teste.

1. Compile `generate-bytecode-expectations`:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. Execute

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    onde `testcase.js` contém o caso de teste em JavaScript que foi adicionado ao `test-bytecode-generator.cc` e `testname` é o nome do teste definido em `test-bytecode-generator.cc`.
