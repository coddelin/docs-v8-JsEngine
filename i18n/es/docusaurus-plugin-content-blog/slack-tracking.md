---
title: "Seguimiento de holgura en V8"
author: "Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), maestro reconocido de *holgura*"
description: "Una mirada detallada al mecanismo de seguimiento de holgura de V8."
avatars: 
 - "michael-stanton"
date: "2020-09-24 14:00:00"
tags: 
 - internals
---
El seguimiento de holgura es una forma de dar a los nuevos objetos un tamaño inicial que es **mayor de lo que realmente podrían usar**, para que puedan agregar nuevas propiedades rápidamente. Y luego, después de algún tiempo, **devolver mágicamente ese espacio no utilizado al sistema**. ¿Genial, no?

<!--truncate-->
Es especialmente útil porque JavaScript no tiene clases estáticas. El sistema nunca puede ver "de un vistazo" cuántas propiedades tienes. El motor las experimenta una por una. Entonces, cuando lees:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

Podrías pensar que el motor tiene todo lo que necesita para funcionar bien — después de todo, le has dicho que el objeto tiene dos propiedades. Sin embargo, V8 realmente no tiene idea de lo que vendrá después. Este objeto `m1` podría pasarse a otra función que le agregue 10 propiedades más. El seguimiento de holgura surge de esta necesidad de ser receptivo a lo que venga en un entorno sin compilación estática para inferir la estructura general. Es como muchos otros mecanismos en V8, cuya base son solo cosas que generalmente puedes decir sobre la ejecución, como:

- La mayoría de los objetos mueren pronto, pocos viven mucho tiempo — la hipótesis de "generacionalidad" de la recolección de basura.
- Los programas tienen una estructura organizativa — construimos [formas o "clases ocultas"](https://mathiasbynens.be/notes/shapes-ics) (las llamamos **mapas** en V8) dentro de los objetos que vemos que el programador usa porque creemos que serán útiles. *Por cierto, [Propiedades Rápidas en V8](/blog/fast-properties) es una gran publicación con detalles interesantes sobre mapas y acceso a propiedades.*
- Los programas tienen un estado de inicialización, cuando todo es nuevo y es difícil decir qué es importante. Más tarde, las clases y funciones importantes pueden identificarse a través de su uso constante — nuestro régimen de retroalimentación y la canalización del compilador se desarrollan a partir de esta idea.

Finalmente, y lo más importante, el entorno de ejecución debe ser muy rápido, de lo contrario solo estamos filosofando.

Ahora, V8 simplemente podría almacenar propiedades en un almacén adjunto al objeto principal. A diferencia de las propiedades que viven directamente en el objeto, este almacén puede crecer indefinidamente mediante copia y reemplazo del puntero. Sin embargo, el acceso más rápido a una propiedad se logra evitando esa indirección y buscando en un desplazamiento fijo desde el inicio del objeto. A continuación, muestro el diseño de un simple objeto JavaScript en el heap de V8 con dos propiedades en el objeto. Las primeras tres palabras son estándar en cada objeto (un puntero al mapa, al almacén de propiedades y al almacén de elementos). Puedes ver que el objeto no puede "crecer" porque está justo contra el siguiente objeto en el heap:

![](/_img/slack-tracking/property-layout.svg)

:::note
**Nota:** Dejé fuera los detalles del almacén de propiedades porque lo único importante para el momento es que puede reemplazarse en cualquier momento con uno más grande. Sin embargo, también es un objeto en el heap de V8 y tiene un puntero de mapa como todos los objetos que residen allí.
:::

De todos modos, debido al rendimiento proporcionado por las propiedades en el objeto, V8 está dispuesto a darte espacio adicional en cada objeto, y **el seguimiento de holgura** es la forma en que se hace. Eventualmente, te estabilizarás, dejarás de agregar nuevas propiedades y te pondrás a trabajar en la minería de bitcoin o lo que sea.

¿Cuánto "tiempo" te da V8? Inteligentemente, considera la cantidad de veces que has construido un objeto en particular. De hecho, hay un contador en el mapa, y se inicializa con uno de los números mágicos más místicos del sistema: **siete**.

Otra pregunta: ¿cómo sabe V8 cuánto espacio adicional proporcionar en el cuerpo del objeto? De hecho, recibe una pista del proceso de compilación, que ofrece un número estimado de propiedades con las que comenzar. Este cálculo incluye el número de propiedades del objeto prototipo, ascendiendo en la cadena de prototipos recursivamente. Finalmente, para asegurarse agrega **ocho** más (¡otro número mágico!). Puedes ver esto en `JSFunction::CalculateExpectedNofProperties()`:

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // El constructor superior debe compilarse para que el número de propiedades esperadas esté disponible.
    // propiedades estén disponibles.
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // Verifica que la estimación sea razonable.
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // En caso de que haya un error de compilación, continúa iterando
      // en caso de que haya una función integrada en la cadena de prototipos
      // que requiera un cierto número de propiedades en el objeto.
      continue;
    }
  }
  // El seguimiento del margen de propiedades en el objeto reclamará espacio inactivo
  // más tarde, por lo que podemos permitirnos ajustar la estimación generosamente,
  // lo que significa que sobreasignamos al menos 8 ranuras al principio.
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

Observemos nuestro objeto `m1` de antes:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

Según el cálculo en `JSFunction::CalculateExpectedNofProperties` y nuestra función `Peak()`, deberíamos tener 2 propiedades en el objeto, y gracias al seguimiento del margen, otras 8 adicionales. Podemos imprimir `m1` con `%DebugPrint()` (_esta práctica función expone la estructura del mapa. Puedes usarla ejecutando `d8` con la bandera `--allow-natives-syntax`_):

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

Observa que el tamaño de la instancia del objeto es 52. La disposición de objetos en V8 es así:

| palabra | qué                                                  |
| ------ | ---------------------------------------------------- |
| 0      | el mapa                                              |
| 1      | puntero al array de propiedades                      |
| 2      | puntero al array de elementos                        |
| 3      | campo en el objeto 1 (puntero a la cadena `"Matterhorn"`) |
| 4      | campo en el objeto 2 (valor entero `4478`)           |
| 5      | campo no utilizado en el objeto 3                   |
| …      | …                                                   |
| 12     | campo no utilizado en el objeto 10                  |

El tamaño del puntero es 4 en este binario de 32 bits, por lo que tenemos esas 3 palabras iniciales que tiene cada objeto JavaScript ordinario, y luego 10 palabras adicionales en el objeto. Nos dice arriba, convenientemente, que hay 8 “campos de propiedad no utilizados”. Así que estamos experimentando seguimiento del margen. ¡Nuestros objetos están inflados, siendo consumidores voraces de preciosos bytes!

¿Cómo nos adelgazamos? Usamos el campo de contador de construcción en el mapa. Llegamos a cero y decidimos que hemos terminado con el seguimiento del margen. Sin embargo, si construyes más objetos, no verás que el contador anterior disminuye. ¿Por qué?

Bueno, es porque el mapa mostrado arriba no es “el” mapa de un objeto `Peak`. Es solo un mapa hoja en una cadena de mapas que descienden desde el **mapa inicial** que se le da al objeto `Peak` antes de ejecutar el código del constructor.

¿Cómo encontrar el mapa inicial? Afortunadamente, la función `Peak()` tiene un puntero a él. Es el contador de construcción en el mapa inicial que usamos para controlar el seguimiento del margen:

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - prototipo de función: 0x37449c89 <Object map = 0x2a287335>
 - mapa inicial: 0x46f07295 <Map(HOLEY_ELEMENTS)>   // Aquí está el mapa inicial.
 - información compartida: 0x31c12495 <SharedFunctionInfo Peak>
 - nombre: 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr te permite imprimir el mapa inicial.
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Map]
 - tipo: JS_OBJECT_TYPE
 - tamaño de instancia: 52
 - propiedades en el objeto: 10
 - tipo de elementos: HOLEY_ELEMENTS
 - campos de propiedad no utilizados: 10
 - longitud de enumeración: inválido
 - puntero de retorno: 0x28c02329 <undefined>
 - celda de validez de prototipo: 0x47f0232d <Cell value= 1>
 - descriptores de instancia (propios) #0: 0x28c02135 <DescriptorArray[0]>
 - transiciones #1: 0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9: [String] en ReadOnlySpace: #name:
         (transición a (campo de datos constante, attrs: [WEC]) @ Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - prototipo: 0x5cc09c7d <Object map = 0x46f07335>
 - constructor: 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - código dependiente: 0x28c0212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - contador de construcción: 5
```

¿Ves cómo el contador de construcción se decrementa a 5? Si deseas encontrar el mapa inicial desde el mapa de dos propiedades que mostramos arriba, puedes seguir su puntero de retorno con la ayuda de `%DebugPrintPtr()` hasta que llegues a un mapa con `undefined` en el campo de puntero de retorno. Ese será este mapa de arriba.

Ahora, un árbol de mapas crece desde el mapa inicial, con una rama para cada propiedad agregada desde ese punto. Llamamos a estas ramas _transiciones_. En la impresión anterior del mapa inicial, ¿ves la transición al siguiente mapa con la etiqueta “name”? Todo el árbol de mapas hasta ahora se ve así:

![(X, Y, Z) significa (tamaño de instancia, número de propiedades en el objeto, número de propiedades no utilizadas).](/_img/slack-tracking/root-map-1.svg)

Estas transiciones basadas en nombres de propiedades son cómo el [“topo ciego”](https://www.google.com/search?q=blind+mole&tbm=isch)" de JavaScript construye sus mapas detrás de ti. Este mapa inicial también está almacenado en la función `Peak`, así que cuando se utiliza como un constructor, ese mapa se puede usar para configurar el objeto `this`.

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

Lo interesante aquí es que después de crear `m7`, ejecutar `%DebugPrint(m1)` nuevamente produce un resultado maravilloso:

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - mapa: 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototipo: 0x5cd086cd <Object map = 0x4b387335>
 - elementos: 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - propiedades: 0x586421a1 <FixedArray[0]> {
    0x586446f9: [String] en ReadOnlySpace: #name:
        0x51112439 <String[10]: #Matterhorn> (campo de datos constante 0)
    0x51112415: [String] en OldSpace: #height:
        4478 (campo de datos constante 1)
 }
0x4b387385: [Map]
 - tipo: JS_OBJECT_TYPE
 - tamaño de instancia: 20
 - propiedades en el objeto: 2
 - tipo de elementos: HOLEY_ELEMENTS
 - campos de propiedad no utilizados: 0
 - longitud de enumeración: inválido
 - mapa estable
 - puntero de retorno: 0x4b38735d <Map(HOLEY_ELEMENTS)>
 - celda de validez de prototipo: 0x511128dd <Cell value= 0>
 - descriptores de instancia (propios) #2: 0x5cd087e5 <DescriptorArray[2]>
 - prototipo: 0x5cd086cd <Object map = 0x4b387335>
 - constructor: 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - código dependiente: 0x5864212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - contador de construcción: 0
```

Nuestro tamaño de instancia ahora es 20, que equivale a 5 palabras:

| palabra | qué                             |
| ---- | -------------------------------- |
| 0    | el mapa                         |
| 1    | puntero al array de propiedades |
| 2    | puntero al array de elementos   |
| 3    | nombre                          |
| 4    | altura                          |

Te preguntarás cómo sucedió esto. Después de todo, si este objeto está dispuesto en memoria, y solía tener 10 propiedades, ¿cómo puede el sistema tolerar estas 8 palabras sobrantes sin dueño? Es cierto que nunca las llenamos con algo interesante — tal vez eso puede ayudarnos.

Si te preguntas por qué me preocupa dejar estas palabras sobrantes, hay algunos antecedentes que necesitas saber sobre el recolector de basura. Los objetos se disponen uno tras otro, y el recolector de basura de V8 realiza un seguimiento de las cosas en esa memoria caminando sobre ella una y otra vez. Comenzando en la primera palabra en la memoria, espera encontrar un puntero a un mapa. Lee el tamaño de la instancia del mapa y luego sabe cuán lejos avanzar al siguiente objeto válido. Para algunas clases tiene que calcular además una longitud, pero eso es todo.

![](/_img/slack-tracking/gc-heap-1.svg)

En el diagrama anterior, los recuadros rojos son los **mapas**, y los recuadros blancos las palabras que completan el tamaño de instancia del objeto. El recolector de basura puede “recorrer” el montón saltando de mapa en mapa.

Entonces, ¿qué sucede si el mapa cambia repentinamente su tamaño de instancia? Ahora, cuando el GC (recolector de basura) recorre el montón, encontrará una palabra que no había visto antes. En el caso de nuestra clase `Peak`, cambiamos de ocupar 13 palabras a solo 5 (coloreé las palabras de “propiedades no utilizadas” en amarillo):

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

Podemos manejar esto si inicializamos inteligentemente esas propiedades no utilizadas con un **mapa “relleno” de tamaño de instancia 4**. De esta manera, el GC las recorrerá ligeramente una vez que estén expuestas a la travesía.

![](/_img/slack-tracking/gc-heap-4.svg)

Esto se expresa en el código en `Factory::InitializeJSObjectBody()`:

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <líneas eliminadas>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <líneas eliminadas>
}
```

Y así, esto es el seguimiento de holgura en acción. Por cada clase que crees, puedes esperar que ocupe más memoria por un tiempo, pero en la séptima instanciación “lo damos por bueno” y exponemos el espacio sobrante para que lo vea el recolector de basura. Estos objetos de una palabra no tienen propietarios, es decir, nadie apunta a ellos, por lo que cuando ocurre una recolección, se liberan y los objetos vivos pueden compactarse para ahorrar espacio.

El siguiente diagrama refleja que el seguimiento de holgura está **terminado** para este mapa inicial. Ten en cuenta que el tamaño de instancia ahora es 20 (5 palabras: el mapa, las matrices de propiedades y elementos, y 2 espacios más). El seguimiento de holgura respeta toda la cadena desde el mapa inicial. Es decir, si un descendiente del mapa inicial termina utilizando las 10 propiedades extra iniciales, entonces el mapa inicial las conserva, marcándolas como no utilizadas:

![(X, Y, Z) significa (tamaño de instancia, número de propiedades internas, número de propiedades no utilizadas).](/_img/slack-tracking/root-map-2.svg)

Ahora que el seguimiento de holgura ha terminado, ¿qué sucede si añadimos otra propiedad a uno de estos objetos `Peak`?

```js
m1.country = 'Suiza';
```

V8 tiene que entrar en el almacén de respaldo de propiedades. Terminamos con la siguiente disposición del objeto:

| palabra | valor                                 |
| ---- | ------------------------------------- |
| 0    | mapa                                   |
| 1    | puntero a un almacén de respaldo de propiedades |
| 2    | puntero a elementos (matriz vacía)     |
| 3    | puntero a cadena `"Matterhorn"`        |
| 4    | `4478`                                |

El almacén de respaldo de propiedades luego se ve así:

| palabra | valor                             |
| ---- | --------------------------------- |
| 0    | mapa                               |
| 1    | longitud (3)                        |
| 2    | puntero a cadena `"Suiza"`           |
| 3    | `undefined`                       |
| 4    | `undefined`                       |
| 5    | `undefined`                       |

Tenemos esos valores adicionales `undefined` allí en caso de que decidas añadir más propiedades. ¡De alguna manera pensamos que podrías hacerlo, basándonos en tu comportamiento hasta ahora!

## Propiedades opcionales

Puede suceder que añadas propiedades solo en algunos casos. Supongamos que si la altura es de 4000 metros o más, deseas realizar un seguimiento de dos propiedades adicionales, `prominence` y `isClimbed`:

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

Añades algunas de estas diferentes variantes:

```js
const m1 = new Peak('Wendelstein', 1838);
const m2 = new Peak('Matterhorn', 4478, 1040, true);
const m3 = new Peak('Zugspitze', 2962);
const m4 = new Peak('Mont Blanc', 4810, 4695, true);
const m5 = new Peak('Watzmann', 2713);
const m6 = new Peak('Zinalrothorn', 4221, 490, true);
const m7 = new Peak('Eiger', 3970);
```

En este caso, los objetos `m1`, `m3`, `m5` y `m7` tienen un mapa, y los objetos `m2`, `m4` y `m6` tienen un mapa más abajo en la cadena de descendientes desde el mapa inicial debido a las propiedades adicionales. Cuando el seguimiento de holgura ha terminado para esta familia de mapas, hay **4** propiedades internas en lugar de **2** como antes, porque el seguimiento de holgura asegura mantener suficiente espacio para el máximo número de propiedades internas utilizadas por cualquier descendiente en el árbol de mapas debajo del mapa inicial.

A continuación se muestra la familia de mapas después de ejecutar el código anterior, y por supuesto, el seguimiento de holgura está completo:

![(X, Y, Z) significa (tamaño de instancia, número de propiedades internas, número de propiedades no utilizadas).](/_img/slack-tracking/root-map-3.svg)

## ¿Qué pasa con el código optimizado?

Compilémos un código optimizado antes de que se complete el seguimiento de margen. Usaremos un par de comandos de sintaxis nativa para forzar una compilación optimizada antes de terminar el seguimiento de margen:

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo('Wendelstein', 1838);
const m2 = foo('Matterhorn', 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo('Zugspitze', 2962);
```

Eso debería ser suficiente para compilar y ejecutar código optimizado. Hacemos algo en TurboFan (el compilador optimizador) llamado [**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27), donde en línea asignamos la creación de objetos. Esto significa que el código nativo que producimos emite instrucciones para pedir al GC el tamaño de instancia del objeto a asignar y luego inicializa cuidadosamente esos campos. Sin embargo, este código sería inválido si el seguimiento de margen se detuviera en algún punto posterior. ¿Qué podemos hacer con eso?

¡Muy fácil! Simplemente terminamos el seguimiento de margen temprano para esta familia de mapas. Esto tiene sentido porque normalmente no se compilaría una función optimizada hasta que se hayan creado miles de objetos. Así que el seguimiento de margen *debería* estar terminado. Si no es así, ¡qué remedio! El objeto no debe ser tan importante de todos modos si se han creado menos de 7 hasta este punto. (Recuerda, normalmente solo optimizamos después de que el programa ha estado ejecutándose por un tiempo prolongado).

### Compilando en un hilo en segundo plano

Podemos compilar código optimizado en el hilo principal, en cuyo caso podemos detener prematuramente el seguimiento de margen con algunas llamadas para cambiar el mapa inicial porque el mundo ha sido detenido. Sin embargo, realizamos tanta compilación como sea posible en un hilo en segundo plano. Desde este hilo sería peligroso tocar el mapa inicial porque *podría estar cambiando en el hilo principal donde se ejecuta JavaScript.* Así que nuestra técnica es la siguiente:

1. **Adivina** que el tamaño de la instancia será el que sería si detuvieras el seguimiento de margen ahora mismo. Recuerda este tamaño.
1. Cuando la compilación esté casi terminada, regresamos al hilo principal donde podemos completar de manera segura el seguimiento de margen si no estaba hecho.
1. Verifica: ¿es el tamaño de la instancia el que predijimos? Si es así, **¡todo está bien!** Si no, descarta el objeto de código y prueba nuevamente más tarde.

Si deseas ver esto en código, echa un vistazo a la clase [`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc) y cómo se usa en `js-create-lowering.cc` para crear asignaciones en línea. Verás que el método `PrepareInstall()` es llamado en el hilo principal, obligando a completar el seguimiento de margen. Luego, el método `Install()` verifica si nuestra predicción del tamaño de la instancia fue correcta.

Aquí está el código optimizado con la asignación en línea. Primero, se ve la comunicación con el GC, verificando si podemos simplemente avanzar un puntero por el tamaño de la instancia y tomarlo (esto se llama asignación con puntero de incremento). Luego, comenzamos a completar los campos del nuevo objeto:

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; hola GC, ¿podemos tener 28 (0x1c) bytes, por favor?
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; está bien GC, lo tomamos. Gracias y adiós.
61  add ecx,0x1                 ;; sí, claro. ecx es mi nuevo objeto.
64  mov edi,0x46647295          ;; objeto: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; Almacenar el MAPA INICIAL.
6c  mov edi,0x56f821a1          ;; objeto: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; Almacenar el respaldo PROPERTIES (vacío)
74  mov [ecx+0x7],edi           ;; Almacenar el respaldo ELEMENTS (vacío)
77  mov edi,0x56f82329          ;; objeto: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; propiedad dentro del objeto 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; propiedad dentro del objeto 2 <-- undefined
82  mov [ecx+0x13],edi          ;; propiedad dentro del objeto 3 <-- undefined
85  mov [ecx+0x17],edi          ;; propiedad dentro del objeto 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; recuperar argumento {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; objeto: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; empujar el mapa hacia adelante
9e  mov [ecx+0xb],edi           ;; nombre = {a1}
a1  mov eax,[ebp+0x10]          ;; recuperar argumento {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; objeto: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; empujar el mapa hacia adelante
b4  mov [ecx+0xf],eax           ;; altura = {a2}
b7  cmp eax,0x1f40              ;; ¿la altura es >= 4000?
bc  jng 0x36ec4a32  <+0xf2>
                  -- Inicio B8 --
                  -- Inicio B9 --
c2  mov edx,[ebp+0x14]          ;; recuperar argumento {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; objeto: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; mover el mapa hacia adelante
d6  mov [ecx+0x13],edx          ;; prominencia = {a3}
d9  mov esi,[ebp+0x18]          ;; recuperar argumento {a4}
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; objeto: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; mover el mapa hacia adelante al mapa hoja
ef  mov [ecx+0x17],esi          ;; esEscalado = {a4}
                  -- inicio de B10 (deconstruir marco) --
f2  mov eax,ecx                 ;; prepararse para devolver este gran objeto Peak!
…
```

Por cierto, para ver todo esto debes tener una compilación de depuración y pasar algunas banderas. Coloqué el código en un archivo y lo llamé:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

Espero que haya sido una exploración divertida. Me gustaría dar un agradecimiento muy especial a Igor Sheludko y Maya Armyanova por revisar (¡pacientemente!) esta publicación.
