---
title: 'Revisando el código fuente de V8'
description: 'Este documento explica cómo revisar el código fuente de V8 localmente.'
---
Este documento explica cómo revisar el código fuente de V8 localmente. Si solo deseas navegar por el código en línea, utiliza estos enlaces:

- [navegar](https://chromium.googlesource.com/v8/v8/)
- [navegar bleeding edge](https://chromium.googlesource.com/v8/v8/+/master)
- [cambios](https://chromium.googlesource.com/v8/v8/+log/master)

## Usando Git

El repositorio Git de V8 está ubicado en https://chromium.googlesource.com/v8/v8.git, con un espejo oficial en GitHub: https://github.com/v8/v8.

¡No solo clones ninguno de estos URLs! Si deseas compilar V8 desde tu copia local, sigue las instrucciones a continuación para configurarlo correctamente.

## Instrucciones

1. En Linux o macOS, primero instala Git y luego [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

    En Windows, sigue las instrucciones de Chromium ([para empleados de Google](https://goto.google.com/building-chrome-win), [para no empleados de Google](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)) para instalar Git, Visual Studio, herramientas de depuración para Windows, y `depot_tools`.

2. Actualiza `depot_tools` ejecutando lo siguiente en tu terminal/shell. En Windows, esto debe hacerse en el Command Prompt (`cmd.exe`), en lugar de PowerShell u otros.

    ```
    gclient
    ```

3. Para **acceso de envío**, necesitas configurar un archivo `.netrc` con tu contraseña de Git:

    1. Ve a https://chromium.googlesource.com/new-password e inicia sesión con tu cuenta de commit (generalmente una cuenta `@chromium.org`). Nota: crear una nueva contraseña no revoca automáticamente ninguna contraseña creada anteriormente. Por favor, asegúrate de usar el mismo correo electrónico que el configurado en `git config user.email`.
    2. Observa la gran caja gris que contiene comandos de shell. Copia esas líneas en tu shell.

4. Ahora, obtén el código fuente de V8, incluyendo todas las ramas y dependencias:

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

Después de eso, intencionalmente estarás en un estado de head detach.

Opcionalmente, puedes especificar cómo se deben rastrear las nuevas ramas:

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

Alternativamente, puedes crear nuevas ramas locales de esta manera (recomendado):

```bash
git new-branch fix-bug-1234
```

## Manteniéndose actualizado

Actualiza tu rama actual con `git pull`. Nota que, si no estás en una rama, `git pull` no funcionará y necesitarás usar `git fetch` en su lugar.

```bash
git pull
```

A veces las dependencias de V8 se actualizan. Puedes sincronizarlas ejecutando:

```bash
gclient sync
```

## Enviando código para revisión

```bash
git cl upload
```

## Cometiendo cambios

Puedes usar la casilla CQ en la revisión de código para cometer (preferido). Consulta también las [instrucciones de Chromium](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md) para las banderas de CQ y resolución de problemas.

Si necesitas más trybots que los predeterminados, agrega lo siguiente a tu mensaje de commit en Gerrit (por ejemplo, para agregar un bot nosnap):

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

Para aterrizar manualmente, actualiza tu rama:

```bash
git pull --rebase origin
```

Luego comete usando:

```bash
git cl land
```

## Trabajos de prueba

Esta sección es útil solo para miembros del proyecto V8.

### Creando un trabajo de prueba desde la revisión de código

1. Envía un CL a Gerrit.

    ```bash
    git cl upload
    ```

2. Prueba el CL enviando un trabajo de prueba a los bots de prueba así:

    ```bash
    git cl try
    ```

3. Espera que los bots de prueba compilen y recibirás un correo electrónico con el resultado. También puedes verificar el estado de prueba en tu parche en Gerrit.

4. Si la aplicación del parche falla, necesitas rebasear tu parche o especificar la revisión de V8 para sincronizar:

```bash
git cl try --revision=1234
```

### Creando un trabajo de prueba desde una rama local

1. Comete algunos cambios en una rama de git en el repositorio local.

2. Prueba el cambio enviando un trabajo de prueba a los bots de prueba así:

    ```bash
    git cl try
    ```

3. Espera que los bots de prueba compilen y recibirás un correo electrónico con el resultado. Nota: Actualmente hay problemas con algunos de los réplicas. Se recomienda enviar trabajos de prueba desde la revisión de código.

### Argumentos útiles

El argumento de revisión indica al bot de prueba qué revisión de la base de código se utiliza para aplicar tus cambios locales. Sin la revisión, se utiliza [la revisión LKGR de V8](https://v8-status.appspot.com/lkgr) como base.

```bash
git cl try --revision=1234
```

Para evitar que tu trabajo de prueba se ejecute en todos los bots, usa la bandera `--bot` con una lista de nombres de constructor separados por comas. Ejemplo:

```bash
git cl try --bot=v8_mac_rel
```

### Visualizando el servidor de prueba

```bash
git cl try-results
```

## Ramas del código fuente

Hay varias ramas diferentes de V8; si no estás seguro de qué versión obtener, lo más probable es que quieras la versión estable más actualizada. Consulta nuestro [Proceso de Lanzamiento](/docs/release-process) para obtener más información sobre las diferentes ramas utilizadas.

Es posible que desees seguir la versión de V8 que Chrome está lanzando en sus canales estables (o beta), consulta https://omahaproxy.appspot.com/.
