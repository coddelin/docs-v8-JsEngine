---
title: "Triagem de problemas"
description: "Este documento explica como lidar com problemas no rastreador de bugs do V8."
---
Este documento explica como lidar com problemas no [rastreador de bugs do V8](/bugs).

## Como obter a triagem de um problema

- *Rastreador do V8*: Defina o estado como `Não triado`
- *Rastreador do Chromium*: Defina o estado como `Não triado` e adicione o componente `Blink>JavaScript`

## Como atribuir problemas do V8 no rastreador do Chromium

Por favor, mova os problemas para a fila de sheriffs especializados do V8 em uma das
seguintes categorias:

- Memória: `component:blink>javascript status=Não triado label:Performance-Memory`
    - Aparecerá nesta [consulta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles)
- Estabilidade: `status=disponível,não triado component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - Aparecerá nesta [consulta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)
    - Não precisa de CC, será triado automaticamente por um sheriff
- Performance: `status=não triado component:Blink>JavaScript label:Performance`
    - Aparecerá nesta [consulta](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2)
    - Não precisa de CC, será triado automaticamente por um sheriff
- Clusterfuzz: Defina o bug para o seguinte estado:
    - `label:ClusterFuzz component:Blink>JavaScript status:Não triado`
    - Aparecerá nesta [consulta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids).
    - Não precisa de CC, será triado automaticamente por um sheriff
- Segurança: Todos os problemas de segurança são triados por sheriffs de segurança do Chromium. Por favor, veja [relatando bugs de segurança](/docs/security-bugs) para mais informações.

Se você precisar da atenção de um sheriff, consulte as informações de rotação.

Use o componente `Blink>JavaScript` em todos os problemas.

**Por favor, note que isso se aplica apenas a problemas rastreados no rastreador de problemas do Chromium.**
