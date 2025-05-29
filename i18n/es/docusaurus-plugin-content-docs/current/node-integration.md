---
title: 'Qué hacer si tu CL rompió la construcción de integración de Node.js'
description: 'Este documento explica qué hacer si tu CL rompió la construcción de integración de Node.js.'
---
[Node.js](https://github.com/nodejs/node) utiliza V8 estable o beta. Para una integración adicional, el equipo de V8 compila Node con la [rama principal](https://chromium.googlesource.com/v8/v8/+/refs/heads/main) de V8, es decir, con una versión de V8 actual. Proporcionamos un bot de integración para [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64), mientras que [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) y [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) están en proceso.

Si el bot [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) falla en la cola de commits de V8, puede haber un problema legítimo con tu CL (soluciona el problema) o [Node](https://github.com/v8/node/) debe ser modificado. Si las pruebas de Node fallaron, busca “Not OK” en los archivos de registro. **Este documento describe cómo reproducir el problema localmente y cómo realizar cambios en el [fork de Node de V8](https://github.com/v8/node/) si tu CL de V8 provoca que la construcción falle.**

## Fuente

Sigue las [instrucciones](https://chromium.googlesource.com/v8/node-ci) en el repositorio node-ci para verificar la fuente.

## Probar cambios en V8

V8 está configurado como una dependencia DEPS de node-ci. Es posible que desees aplicar cambios a V8 para pruebas o para reproducir fallos. Para hacerlo, agrega tu checkout principal de V8 como remoto:

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<tu-branch>
cd ..
```

Recuerda ejecutar los hooks de gclient antes de compilar.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Realizar cambios en Node.js

Node.js también está configurado como una dependencia `DEPS` de node-ci. Es posible que desees aplicar cambios a Node.js para corregir fallos que los cambios en V8 puedan causar. V8 se prueba contra un [fork de Node.js](https://github.com/v8/node). Necesitarás una cuenta de GitHub para realizar cambios en ese fork.

### Obtener las fuentes de Node

Haz un fork del [repositorio Node.js de V8 en GitHub](https://github.com/v8/node/) (haz clic en el botón de fork) a menos que ya lo hayas hecho anteriormente.

Agrega tu fork y el fork de V8 como remotos al checkout existente:

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <tu-nombre-de-usuario> git@github.com:<tu-nombre-de-usuario>/node.git
git fetch v8
git checkout v8/node-ci-<fecha-de-sincronización>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **Nota** `<fecha-de-sincronización>` es la fecha en la que sincronizamos con el Node.js upstream. Elige la fecha más reciente.

Realiza tus cambios en el checkout de Node.js y haz commit de ellos. Luego, sube los cambios a GitHub:

```bash
git push <tu-nombre-de-usuario> $BRANCH_NAME
```

Y crea una pull request contra la rama `node-ci-<fecha-de-sincronización>`.


Una vez que la pull request haya sido fusionada al fork de Node.js de V8, necesitas actualizar el archivo `DEPS` de node-ci y crear un CL.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<hash-del-commit-fusionado>
git add DEPS
git commit -m 'Actualizar Node'
git cl upload
```
