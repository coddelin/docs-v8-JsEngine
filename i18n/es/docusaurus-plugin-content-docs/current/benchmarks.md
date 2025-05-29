---
title: &apos;Ejecutar benchmarks localmente&apos;
description: &apos;Este documento explica cómo ejecutar conjuntos de benchmarks clásicos en d8.&apos;
---
Tenemos un flujo de trabajo sencillo para ejecutar los benchmarks “clásicos” de SunSpider, Kraken y Octane. Puedes ejecutar con diferentes binarios y combinaciones de banderas, y los resultados se promedian sobre múltiples ejecuciones.

## CPU

Construye el shell `d8` siguiendo las instrucciones en [Building with GN](/docs/build-gn).

Antes de ejecutar los benchmarks, asegúrate de configurar el gobernador de escalado de frecuencia de tu CPU en rendimiento.

```bash
sudo tools/cpu.sh fast
```

Los comandos que `cpu.sh` entiende son:

- `fast`, rendimiento (alias para `fast`)
- `slow`, ahorro de energía (alias para `slow`)
- `default`, bajo demanda (alias para `default`)
- `dualcore` (deshabilita todos excepto dos núcleos), dual (alias para `dualcore`)
- `allcores` (vuelve a habilitar todos los núcleos disponibles), all (alias para `allcores`).

## CSuite

`CSuite` es nuestro sencillo ejecutor de benchmarks:

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <ruta al binario d8>
    [-x "<banderas opcionales de línea de comandos para d8>"]
```

Primero ejecuta en modo `baseline` para crear las líneas base, luego en modo `compare` para obtener los resultados. `CSuite` por defecto realiza 10 ejecuciones para Octane, 100 para SunSpider y 80 para Kraken, pero puedes sobrescribir estos valores para obtener resultados más rápidos con la opción `-r`.

`CSuite` crea dos subdirectorios en el directorio donde lo ejecutes:

1. `./_benchmark_runner_data` — este es el resultado en caché de las N ejecuciones.
1. `./_results` — aquí escribe los resultados en el archivo master. Puedes guardar estos
  archivos con nombres diferentes, y aparecerán en el modo compare.

En modo compare, naturalmente usarás un binario diferente o al menos diferentes banderas.

## Ejemplo de uso

Supongamos que has construido dos versiones de `d8`, y quieres ver qué pasa con SunSpider. Primero, crea líneas base:

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Escribió ./_results/master.
Ejecuta sunspider nuevamente en modo compare para ver los resultados.
```

Como se sugiere, ejecuta nuevamente pero esta vez en modo `compare` con un binario diferente:

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               benchmark:    score |   master |      % |
===================================================+==========+========+
                       3d-cube-sunspider:     13.9 S     13.4 S   -3.6 |
                      3d-morph-sunspider:      8.6 S      8.4 S   -2.3 |
                   3d-raytrace-sunspider:     15.1 S     14.9 S   -1.3 |
           access-binary-trees-sunspider:      3.7 S      3.9 S    5.4 |
               access-fannkuch-sunspider:     11.9 S     11.8 S   -0.8 |
                  access-nbody-sunspider:      4.6 S      4.8 S    4.3 |
                 access-nsieve-sunspider:      8.4 S      8.1 S   -3.6 |
      bitops-3bit-bits-in-byte-sunspider:      2.0 |      2.0 |        |
           bitops-bits-in-byte-sunspider:      3.7 S      3.9 S    5.4 |
            bitops-bitwise-and-sunspider:      2.7 S      2.9 S    7.4 |
            bitops-nsieve-bits-sunspider:      5.3 S      5.6 S    5.7 |
         controlflow-recursive-sunspider:      3.8 S      3.6 S   -5.3 |
                    crypto-aes-sunspider:     10.9 S      9.8 S  -10.1 |
                    crypto-md5-sunspider:      7.0 |      7.4 S    5.7 |
                   crypto-sha1-sunspider:      9.2 S      9.0 S   -2.2 |
             date-format-tofte-sunspider:      9.8 S      9.9 S    1.0 |
             date-format-xparb-sunspider:     10.3 S     10.3 S        |
                   math-cordic-sunspider:      6.1 S      6.2 S    1.6 |
             math-partial-sums-sunspider:     20.2 S     20.1 S   -0.5 |
            math-spectral-norm-sunspider:      3.2 S      3.0 S   -6.2 |
                    regexp-dna-sunspider:      7.6 S      7.8 S    2.6 |
                 string-base64-sunspider:     14.2 S     14.0 |   -1.4 |
                  string-fasta-sunspider:     12.8 S     12.6 S   -1.6 |
               string-tagcloud-sunspider:     18.2 S     18.2 S        |
            string-unpack-code-sunspider:     20.0 |     20.1 S    0.5 |
         string-validate-input-sunspider:      9.4 S      9.4 S        |
                               SunSpider:    242.6 S    241.1 S   -0.6 |
---------------------------------------------------+----------+--------+
```

El resultado de la ejecución anterior está en caché en un subdirectorio creado en el directorio actual (`_benchmark_runner_data`). Los resultados agregados también están en caché, en el directorio `_results`. Estos directorios se pueden eliminar después de que hayas ejecutado el paso de comparación.

Otra situación es cuando tienes el mismo binario, pero quieres ver los resultados con diferentes banderas. Sintiendo un poco irónico, te gustaría ver cómo Octane se desempeña sin un compilador optimizador. Primero la línea base:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

Normalmente, octane requiere 10 ejecuciones para obtener resultados estables.
Escribió /usr/local/google/home/mvstanton/src/v8/_results/master.
Ejecute octane nuevamente en modo de comparación para ver los resultados.
```

Note la advertencia de que una ejecución generalmente no es suficiente para estar seguro de muchas optimizaciones de rendimiento; sin embargo, ¡nuestro “cambio” debería tener un efecto reproducible con solo una ejecución! Ahora comparemos, pasando la bandera `--noopt` para desactivar [TurboFan](/docs/turbofan):

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

Normalmente, octane requiere 10 ejecuciones para obtener resultados estables.
                               benchmark:    puntuación |   master |      % |
===================================================+============+========+
                                Richards:    973.0 |  26770.0 |  -96.4 |
                               DeltaBlue:   1070.0 |  57245.0 |  -98.1 |
                                  Crypto:    923.0 |  32550.0 |  -97.2 |
                                RayTrace:   2896.0 |  75035.0 |  -96.1 |
                             EarleyBoyer:   4363.0 |  42779.0 |  -89.8 |
                                  RegExp:   2881.0 |   6611.0 |  -56.4 |
                                   Splay:   4241.0 |  19489.0 |  -78.2 |
                            SplayLatency:  14094.0 |  57192.0 |  -75.4 |
                            NavierStokes:   1308.0 |  39208.0 |  -96.7 |
                                   PdfJS:   6385.0 |  26645.0 |  -76.0 |
                                Mandreel:    709.0 |  33166.0 |  -97.9 |
                         MandreelLatency:   5407.0 |  97749.0 |  -94.5 |
                                 Gameboy:   5440.0 |  54336.0 |  -90.0 |
                                CodeLoad:  25631.0 |  25282.0 |    1.4 |
                                   Box2D:   3288.0 |  67572.0 |  -95.1 |
                                    zlib:  59154.0 |  58775.0 |    0.6 |
                              Typescript:  12700.0 |  23310.0 |  -45.5 |
                                  Octane:   4070.0 |  37234.0 |  -89.1 |
---------------------------------------------------+----------+--------+
```

Es interesante ver que `CodeLoad` y `zlib` estuvieron relativamente intactos.

## Bajo el capó

`CSuite` se basa en dos scripts en el mismo directorio, `benchmark.py` y `compare-baseline.py`. Hay más opciones en esos scripts. Por ejemplo, puede registrar múltiples puntos de referencia y hacer comparaciones de 3, 4 o 5 vías. `CSuite` está optimizado para un uso rápido y sacrifica algo de flexibilidad.
