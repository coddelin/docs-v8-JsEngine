---
title: "Indicium: herramienta de trazado para el runtime de V8"
author: "Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))"
avatars: 
  - "zeynep-cankara"
date: "2020-10-01 11:56:00"
tags: 
  - herramientas
  - analizador-de-sistemas
description: "Indicium: herramienta de análisis de sistemas de V8 para analizar eventos de Map/IC."
tweet: "1311689392608731140"
---
# Indicium: analizador de sistemas de V8

Los últimos tres meses han sido una experiencia de aprendizaje increíble para mí, ya que me he unido al equipo de V8 (Google Londres) como becaria y he estado trabajando en una nueva herramienta llamada [*Indicium*](https://v8.dev/tools/head/system-analyzer).

Este analizador de sistemas es una interfaz web unificada para rastrear, depurar y analizar patrones de cómo se crean y modifican los Inline Caches (IC) y Mapas en aplicaciones del mundo real.

V8 ya tiene una infraestructura de trazado para [ICs](https://mathiasbynens.be/notes/shapes-ics) y [Mapas](https://v8.dev/blog/fast-properties), la cual puede procesar y analizar eventos de IC usando el [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) y eventos de Mapas usando [Map Processor](https://v8.dev/tools/v8.7/map-processor.html). Sin embargo, las herramientas anteriores no permitían analizar mapas e ICs de manera holística, lo cual ahora es posible con el analizador de sistemas.

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## Caso de Estudio

Revisemos un ejemplo para demostrar cómo podemos usar Indicium para analizar eventos de log de Mapas e IC en V8.

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// calentamiento
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Aquí, tenemos una clase `Point` que almacena dos coordenadas y un booleano adicional basado en los valores de las coordenadas. La clase `Point` tiene un método `dotProduct` que devuelve el producto punto entre el objeto pasado y el receptor.

Para hacer más fácil explicar el programa, dividámoslo en dos fragmentos (ignorando la fase de calentamiento):

### *fragmento 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *fragmento 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Una vez que ejecutamos el programa, notamos una regresión de rendimiento. A pesar de que estamos midiendo el rendimiento de dos fragmentos similares, accediendo a las propiedades `x` y `y` de instancias de objetos `Point` al llamar a la función `dotProduct` en un bucle for.

El fragmento 1 se ejecuta aproximadamente 3 veces más rápido que el fragmento 2. La única diferencia es que usamos valores negativos para las propiedades `x` y `y` en el objeto `Point` en el fragmento 2.

![Análisis de rendimiento de los fragmentos.](/_img/system-analyzer/initial-program-performance.png)

Para analizar esta diferencia de rendimiento, podemos usar diversas opciones de registro que vienen con V8. Aquí es donde el analizador de sistemas realmente destaca. Puede mostrar eventos de registro y vincularlos con eventos de mapas, permitiéndonos explorar la magia oculta dentro de V8.

Antes de profundizar más en el caso de estudio, familiaricémonos con los paneles de la herramienta analizador de sistemas. La herramienta tiene cuatro paneles principales:

- un panel de cronología para analizar eventos de Map/IC en el tiempo,
- un panel de Mapas para visualizar los árboles de transición de los mapas,
- un panel de IC para obtener estadísticas de los eventos de IC,
- un panel de fuente para mostrar posiciones de archivo de Map/IC en un script.

![Resumen del Analizador de Sistemas](/_img/system-analyzer/system-analyzer-overview.png)

![Agrupar eventos IC por nombre de función para obtener información detallada sobre los eventos IC asociados con `dotProduct`.](/_img/system-analyzer/case1_1.png)

Estamos analizando cómo la función `dotProduct` podría estar causando esta diferencia de rendimiento. Así que agrupamos eventos IC por nombre de función para obtener más información detallada sobre los eventos IC asociados con la función `dotProduct`.

Lo primero que notamos es que tenemos dos transiciones de estado de IC diferentes registradas por los eventos IC en esta función. Una va de no inicializado a monomorfo y la otra de monomorfo a polimorfo. El estado polimorfo del IC indica que ahora estamos rastreando más de un mapa asociado con objetos `Point` y este estado polimorfo es peor porque debemos realizar comprobaciones adicionales.

Queremos saber por qué estamos creando múltiples formas de Map para el mismo tipo de objetos. Para hacerlo, activamos el botón de información sobre el estado de IC para obtener más información sobre las direcciones del Map que pasan de no inicializadas a monomórficas.

![El árbol de transición del Map asociado con el estado monomórfico de IC.](/_img/system-analyzer/case1_2.png)

![El árbol de transición del Map asociado con el estado polimórfico de IC.](/_img/system-analyzer/case1_3.png)

Para el estado monomórfico de IC podemos visualizar el árbol de transición y ver que solo estamos agregando dinámicamente dos propiedades `x` y `y`, pero cuando se trata del estado polimórfico de IC, tenemos un nuevo Map que contiene tres propiedades `isNegative`, `x` y `y`.

![El panel de Map comunica la información de posición del archivo para resaltar las posiciones de archivo en el panel Source.](/_img/system-analyzer/case1_4.png)

Hacemos clic en la sección de posición de archivo del panel Map para ver dónde se agrega esta propiedad `isNegative` en el código fuente y podemos usar esta información para abordar la regresión de rendimiento.

Entonces ahora la pregunta es *¿cómo podemos abordar la regresión de rendimiento utilizando la información que generamos con la herramienta*?

La solución mínima sería inicializar siempre la propiedad `isNegative`. En general, es un buen consejo que todas las propiedades de instancia se inicialicen en el constructor.

Ahora, la clase `Point` actualizada se ve así:

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

Si ejecutamos el script nuevamente con la clase `Point` modificada, vemos que la ejecución de los dos fragmentos definidos al comienzo del estudio de caso se desempeña de manera muy similar.

En un rastro actualizado, vemos que se evita el estado polimórfico de IC, ya que no estamos creando múltiples mapas para el mismo tipo de objetos.

![El árbol de transición del Map del objeto Point modificado.](/_img/system-analyzer/case2_1.png)

## El Analizador del Sistema

Ahora echemos un vistazo en profundidad a los diferentes paneles que están presentes en el analizador del sistema.

### Panel de Timeline

El panel de Timeline permite la selección en el tiempo, lo que habilita la visualización de estados de IC/map a través de puntos discretos en el tiempo o un rango seleccionado en el tiempo. Admite funciones de filtro, como acercar/alejar los eventos del registro para rangos de tiempo seleccionados.

![Descripción general del panel Timeline](/_img/system-analyzer/timeline-panel.png)

![Descripción general del panel Timeline (Cont.)](/_img/system-analyzer/timeline-panel2.png)

### Panel de Map

El panel de Map tiene dos subpaneles:

1. Detalles del Map
2. Transiciones del Map

El panel de Map visualiza los árboles de transición de los mapas seleccionados. Los metadatos del mapa seleccionado se muestran a través del subpanel de detalles del Map. Se puede buscar un árbol de transición específico asociado con una dirección de mapa utilizando la interfaz proporcionada. Desde el subpanel de estadísticas, que está sobre el subpanel de transiciones del Map, podemos ver las estadísticas sobre las propiedades que causan transiciones de mapas y tipos de eventos de mapas.

![Descripción general del panel de Map](/_img/system-analyzer/map-panel.png)

![Descripción general del panel de estadísticas](/_img/system-analyzer/stats-panel.png)

### Panel de IC

El panel de IC muestra estadísticas sobre eventos de IC que caen dentro de un rango de tiempo específico, los cuales se filtran a través del panel de Timeline. Además, el panel de IC permite agrupar eventos de IC según varias opciones (tipo, categoría, mapa, posición de archivo). De las opciones de agrupación, las opciones de agrupación por mapa y posición de archivo interactúan con los paneles de mapa y código fuente, respectivamente, para mostrar los árboles de transición de mapas y resaltar las posiciones de archivo asociadas con los eventos de IC.

![Descripción general del panel de IC](/_img/system-analyzer/ic-panel.png)

![Descripción general del panel de IC (Cont.)](/_img/system-analyzer/ic-panel2.png)

![Descripción general del panel de IC (Cont.)](/_img/system-analyzer/ic-panel3.png)

![Descripción general del panel de IC (Cont.)](/_img/system-analyzer/ic-panel4.png)

### Panel de Source

El panel de Source muestra los scripts cargados con marcadores clicables para emitir eventos personalizados que seleccionan tanto eventos de registro de Map como de IC a través de los paneles personalizados. La selección de un script cargado se puede hacer desde la barra de descomposición. Seleccionar una posición de archivo desde el panel de Map y el panel de IC resalta la posición de archivo seleccionada en el panel de código fuente.

![Descripción general del panel de Source](/_img/system-analyzer/source-panel.png)

### Agradecimientos

Me gustaría agradecer a todos en los equipos de V8 y Web en Android, especialmente a mi anfitrión Sathya y mi coanfitrión Camillo por apoyarme durante toda mi pasantía y darme la oportunidad de trabajar en un proyecto tan genial.

¡Tuve un verano increíble siendo pasante en Google!
