---
title: 'Flake Bisect'
description: 'Este documento explica como dividir testes intermitentes (flaky tests).'
---
Testes intermitentes são relatados em uma etapa separada nos bots ([exemplo de compilação](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)).

Cada log de teste fornece uma linha de comando pré-preenchida para acionar uma divisão automatizada de flake, como:

```
Acionar divisão de flake na linha de comando:
bb add v8/try.triggered/v8_flako -p 'to_revision="deadbeef"' -p 'test_name="MyTest"' ...
```

Antes de acionar divisões de flake pela primeira vez, os usuários devem fazer login com uma conta do google.com:

```bash
bb auth-login
```

Em seguida, execute o comando fornecido, que retornará uma URL de compilação executando a divisão de flake ([exemplo](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)).

Se tiver sorte, a divisão apontará para um suspeito. Caso contrário, pode ser útil continuar lendo...

## Descrição detalhada

Para detalhes técnicos, veja também o [bug de rastreamento](https://crbug.com/711249). A abordagem de divisão de flake tem as mesmas intenções que [findit](https://sites.google.com/chromium.org/cat/findit), mas usa uma implementação diferente.

### Como funciona?

Um trabalho de divisão tem 3 fases: calibração, divisão regressiva e divisão interna. Durante a calibração, os testes são repetidos dobrando o tempo total de espera (ou o número de repetições) até que flocos suficientes sejam detectados em uma execução. Então, na divisão regressiva, o intervalo de git é dobrado até que seja encontrada uma revisão sem flocos. Por fim, fazemos uma divisão no intervalo entre a revisão boa e a mais antiga ruim. Note que a divisão não produz novos produtos de compilação, ela é baseada apenas nas compilações criadas previamente na infraestrutura contínua do V8.

### A divisão falha quando...

- Não é possível alcançar confiança durante a calibração. Isso é típico para flocos de uma em um milhão ou comportamento intermitente visível apenas quando outros testes executam em paralelo (por exemplo, testes que consomem muita memória).
- O culpado é muito antigo. A divisão desiste após um certo número de etapas ou se compilações mais antigas não estiverem mais disponíveis no servidor de isolamento.
- O trabalho geral de divisão expira. Nesse caso, pode ser possível reiniciá-lo com uma revisão ruim conhecida anterior.

## Propriedades para personalizar a divisão de flake

- `extra_args`: Argumentos extras passados para o script `run-tests.py` do V8.
- `repetitions`: Número inicial de repetições de teste (passado para a opção `--random-seed-stress-count` de `run-tests.py`; não usado se `total_timeout_sec` for utilizado).
- `timeout_sec`: Parâmetro de tempo limite passado para `run-tests.py`.
- `to_revision`: Revisão conhecida como ruim. É onde a divisão começará.
- `total_timeout_sec`: Tempo limite total inicial para uma etapa inteira de divisão. Durante a calibração, esse tempo é dobrado várias vezes, se necessário. Configurar como 0 para desativar e usar a propriedade `repetitions` em vez disso.
- `variant`: Nome da variante de teste passada para `run-tests.py`.

## Propriedades que você não precisará alterar

- `bisect_buildername`: Nome mestre do builder que produziu as compilações para divisão.
- `bisect_mastername`: Nome do builder que produziu as compilações para divisão.
- `build_config`: Configuração de compilação passada para o script `run-tests.py` do V8 (lá, o nome do parâmetro é `--mode`, exemplo: `Release` ou `Debug`).
- `isolated_name`: Nome do arquivo isolado (por exemplo: `bot_default`, `mjsunit`).
- `swarming_dimensions`: Dimensões de swarming classificando o tipo de bot onde os testes devem ser executados. Passado como lista de strings, cada uma no formato `name:value`.
- `test_name`: Nome totalmente qualificado do teste passado para `run-tests.py`. Exemplo: `mjsunit/foobar`.

## Dicas e Truques

### Dividindo um teste que está travando (por exemplo, deadlock)

Se uma execução falha expirar enquanto uma execução bem-sucedida ocorre muito rapidamente, é útil ajustar o parâmetro timeout_sec para que a divisão não seja atrasada esperando que as execuções travadas expirem. Exemplo: se a execução bem-sucedida geralmente é alcançada em menos de 1 segundo, configure o tempo limite para algo pequeno, como 5 segundos.

### Obtendo mais confiança em um suspeito

Em algumas execuções, a confiança é muito baixa. Por exemplo, a calibração é satisfatória se quatro flocos forem vistos em uma execução. Durante a divisão, cada execução com um ou mais flocos é contada como ruim. Nesses casos, pode ser útil reiniciar o trabalho de divisão configurando to_revision para o culpado e usando um maior número de repetições ou tempo limite total do que o trabalho original e confirmar que a mesma conclusão foi alcançada novamente.

### Contornando problemas de tempo limite

Caso a opção de tempo limite total cause travamentos nas compilações, é melhor estimar um número adequado de repetições e configurar `total_timeout_sec` como `0`.

### Comportamento do teste dependendo da semente aleatória
