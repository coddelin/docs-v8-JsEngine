---
title: 'Flake bisect'
description: 'Este documento explica cómo bisectar pruebas inestables.'
---
Las pruebas inestables se informan en un paso separado en los bots ([ejemplo de compilación](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)).

Cada log de prueba proporciona una línea de comando pre-rellena para activar un bisectado automático de inestables, como:

```
Activar bisectado de inestables en la línea de comandos:
bb add v8/try.triggered/v8_flako -p 'to_revision="deadbeef"' -p 'test_name="MyTest"' ...
```

Antes de activar bisectados de inestables por primera vez, los usuarios deben iniciar sesión con una cuenta de google.com:

```bash
bb auth-login
```

Luego ejecute el comando proporcionado, que retorna una URL de compilación que ejecuta el bisectado de inestables ([ejemplo](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)).

Si tiene suerte, el bisectado señala a un sospechoso. Si no, puede que quiera leer más…

## Descripción detallada

Para detalles técnicos, vea también el [rastreador de implementación](https://crbug.com/711249). El enfoque de bisectado de inestables tiene las mismas intenciones que [findit](https://sites.google.com/chromium.org/cat/findit), pero utiliza una implementación diferente.

### ¿Cómo funciona?

Un trabajo de bisectado tiene 3 fases: calibración, bisectado hacia atrás y bisectado hacia adentro. Durante la calibración, las pruebas se repiten duplicando el tiempo de espera total (o el número de repeticiones) hasta que se detecten suficientes inestables en una ejecución. Luego, el bisectado hacia atrás duplica el rango de git hasta encontrar una revisión sin inestables. Finalmente, bisectamos dentro del rango de la revisión buena y la más antigua mala. Nota, el bisectado no produce nuevos productos de compilación, se basa puramente en compilaciones previamente creadas en la infraestructura continua de V8.

### El bisectado falla cuando…

- No se puede alcanzar confianza durante la calibración. Esto es típico para inestables muy raros o comportamientos inestables que sólo son visibles cuando otras pruebas se ejecutan en paralelo (por ejemplo, pruebas que consumen mucha memoria).
- El culpable es demasiado antiguo. El bisectado se detiene después de un cierto número de pasos, o si las compilaciones más antiguas ya no están disponibles en el servidor de aislamiento.
- El trabajo global de bisectado agota el tiempo de espera. En este caso, podría ser posible reiniciarlo con una revisión mala conocida más antigua.

## Propiedades para personalizar el bisectado de inestables

- `extra_args`: Argumentos adicionales pasados al script `run-tests.py` de V8.
- repetitions: Número inicial de repeticiones de prueba (pasado a la opción `--random-seed-stress-count` de `run-tests.py`; no usado si se utiliza `total_timeout_sec`).
- `timeout_sec`: Parámetro de tiempo de espera pasado a `run-tests.py`.
- `to_revision`: Revisión conocida como mala. Aquí comenzará el bisectado.
- `total_timeout_sec`: Tiempo de espera total inicial para un paso completo de bisectado. Durante la calibración, este tiempo se duplica varias veces si es necesario. Establecer en 0 para deshabilitar y usar la propiedad `repetitions` en su lugar.
- `variant`: Nombre de la variante de prueba pasada a `run-tests.py`.

## Propiedades que no necesitarás cambiar

- `bisect_buildername`: Nombre maestro del constructor que produjo las compilaciones para el bisectado.
- `bisect_mastername`: Nombre del constructor que produjo las compilaciones para el bisectado.
- `build_config`: Configuración de compilación pasada al script `run-tests.py` de V8 (ahí el nombre del parámetro es `--mode`, ejemplo: `Release` o `Debug`).
- `isolated_name`: Nombre del archivo aislado (por ejemplo, `bot_default`, `mjsunit`).
- `swarming_dimensions`: Dimensiones de agrupamiento que clasifican el tipo de bot en el que las pruebas deben ejecutarse. Pasadas como una lista de cadenas, cada una en el formato `nombre:valor`.
- `test_name`: Nombre completamente calificado de la prueba pasada a `run-tests.py`. Ejemplo: `mjsunit/foobar`.

## Consejos y trucos

### Bisectar una prueba bloqueada (por ejemplo, bloqueo muerto)

Si una ejecución fallida agota el tiempo de espera, mientras una ejecución exitosa se ejecuta muy rápidamente, es útil ajustar el parámetro timeout_sec, para que el bisectado no se retrase esperando que las ejecuciones bloqueadas agoten el tiempo de espera. Por ejemplo, si la ejecución exitosa suele completarse en menos de 1 segundo, establezca el tiempo de espera en algo pequeño, por ejemplo, 5 segundos.

### Obtener más confianza sobre un sospechoso

En algunas ejecuciones, la confianza es muy baja. Por ejemplo, la calibración se satisface si se ven cuatro inestables en una ejecución. Durante el bisectado, se cuenta cada ejecución con uno o más inestables como mala. En tales casos, podría ser útil reiniciar el trabajo de bisectado configurando to_revision al culpable y utilizando un mayor número de repeticiones o tiempo total de espera que el trabajo original y confirmar que se llega nuevamente a la misma conclusión.

### Solucionar problemas de tiempo de espera

En caso de que la opción de tiempo de espera global provoque bloqueos en las compilaciones, es mejor estimar un número adecuado de repeticiones y establecer `total_timeout_sec` en `0`.

### Comportamiento de prueba según semilla aleatoria
