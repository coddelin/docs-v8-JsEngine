---
title: &apos;Mapas (Clases Ocultas) en V8&apos;
description: &apos;¿Cómo rastrea y optimiza V8 la estructura percibida de tus objetos?&apos;
---

Mostremos cómo V8 construye sus clases ocultas. Las estructuras de datos principales son:

- `Map`: la clase oculta en sí misma. Es el primer valor de puntero en un objeto y, por lo tanto, permite realizar comparaciones fáciles para ver si dos objetos tienen la misma clase.
- `DescriptorArray`: La lista completa de propiedades que esta clase tiene junto con información sobre ellas. En algunos casos, el valor de la propiedad incluso está en este array.
- `TransitionArray`: Un array de "transiciones" desde este `Map` a otros Maps relacionados. Cada transición es un nombre de propiedad y debería considerarse como "si agregara una propiedad con este nombre a la clase actual, ¿a qué clase haría la transición?"

Debido a que muchos objetos `Map` solo tienen una transición hacia otro (es decir, son mapas "transitorios", solo utilizados en el camino hacia otro), V8 no siempre crea un `TransitionArray` completo para ellos. En su lugar, simplemente enlazará directamente a este "siguiente" `Map`. El sistema tiene que buscar un poco en el `DescriptorArray` del `Map` al que se está apuntando para determinar el nombre asociado con la transición.

Este es un tema extremadamente interesante y rico. También está sujeto a cambios; sin embargo, si comprendes los conceptos de este artículo, cualquier cambio futuro debería ser comprensible de manera incremental.

## ¿Por qué tener clases ocultas?

V8 podría funcionar sin clases ocultas, por supuesto. Trataría cada objeto como un conjunto de propiedades. Sin embargo, se habría dejado de lado un principio muy útil: el principio del diseño inteligente. V8 supone que solo crearás **ciertos** tipos diferentes de objetos. Y cada tipo de objeto se utilizará de maneras que eventualmente pueden considerarse estereotípicas. Digo "eventualmente pueden considerarse" porque el lenguaje JavaScript es un lenguaje de scripting, no uno precompilado. Entonces V8 nunca sabe qué vendrá después. Para aprovechar el diseño inteligente (es decir, la suposición de que hay una mente detrás del código entrante), V8 tiene que observar y esperar, dejando que el sentido de la estructura se haga evidente poco a poco. El mecanismo de clases ocultas es el principal medio para lograr esto. Por supuesto, presupone un mecanismo sofisticado de escucha, y estos son los Inline Caches (ICs), sobre los cuales se ha escrito mucho.

Entonces, si estás convencido de que este es un trabajo bueno y necesario, ¡sígueme!

## Un ejemplo

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "good");
```

Con este código ya tenemos un árbol de mapas interesante desde el mapa raíz (también conocido como el mapa inicial), que está adjunto a la función `Peak`:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="Ejemplo de clase oculta" loading="lazy"/>
</figure>

Cada cuadro azul es un mapa, comenzando con el mapa inicial. Este es el mapa del objeto que se devuelve si, de alguna manera, logramos ejecutar la función `Peak` sin agregar una sola propiedad. Los mapas posteriores son aquellos que resultan al agregar las propiedades dadas por los nombres en los bordes entre los mapas. Cada mapa tiene una lista de las propiedades asociadas con un objeto de ese mapa. Además, describe la ubicación exacta de cada propiedad. Finalmente, desde uno de estos mapas, digamos, `Map3`, que es la clase oculta del objeto que obtendrás si pasas un número como argumento `extra` en `Peak()`, puedes seguir un enlace hacia atrás hasta llegar al mapa inicial.

Dibujémoslo de nuevo con esta información adicional. La anotación (i0), (i1), significa ubicación de campo en objeto 0, 1, etc:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="Ejemplo de clase oculta" loading="lazy"/>
</figure>

Ahora, si pasas tiempo examinando estos mapas antes de haber creado al menos 7 objetos `Peak`, te encontrarás con **seguimiento flexible** que puede ser confuso. Tengo [otro artículo](https://v8.dev/blog/slack-tracking) sobre eso. Simplemente crea 7 objetos más y estará terminado. En este punto, tus objetos `Peak` tendrán exactamente 3 propiedades dentro del objeto, sin posibilidad de agregar más directamente en el objeto. Cualquier propiedad adicional se descargará en la tienda de respaldo de propiedades del objeto. Es solo un array de valores de propiedad, cuyo índice proviene del mapa (Bueno, técnicamente, del `DescriptorArray` adjunto al mapa). Agreguemos una propiedad a `m2` en una nueva línea y volvamos a observar el árbol de mapas:

```javascript
m2.cost = "one arm, one leg";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="Ejemplo de clase oculta" loading="lazy"/>
</figure>

He metido algo aquí. Observa que todas las propiedades están anotadas con "const," lo que significa que desde el punto de vista de V8, nadie las ha cambiado desde el constructor, por lo que se pueden considerar constantes una vez que se han inicializado. A TurboFan (el compilador optimizador) le encanta esto. Supongamos que `m2` es referenciado como una constante global por una función. Entonces, la búsqueda de `m2.cost` se puede realizar en tiempo de compilación, ya que el campo está marcado como constante. Volveré a esto más adelante en el artículo.

Observa que la propiedad "cost" está marcada como `const p0`, lo que significa que es una propiedad constante almacenada en el índice cero en el **almacén de respaldo de propiedades** en lugar de directamente en el objeto. Esto se debe a que no hay más espacio en el objeto. Esta información es visible en `%DebugPrint(m2)`:

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

Puedes ver que tenemos 4 propiedades, todas marcadas como const. Las primeras 3 en el objeto, y la última en `properties[0]` que significa el primer espacio del almacén de respaldo de propiedades. Podemos echar un vistazo a eso:

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

Las propiedades adicionales están ahí por si decides agregar más de repente.

## La verdadera estructura

Hay diferentes cosas que podríamos hacer en este punto, pero dado que realmente te gusta V8, habiendo leído hasta aquí, me gustaría intentar dibujar las verdaderas estructuras de datos que usamos, las mencionadas al principio como `Map`, `DescriptorArray` y `TransitionArray`. Ahora que tienes una idea del concepto de clases ocultas que se construyen tras bambalinas, bien podrías relacionar tu pensamiento más estrechamente con el código mediante los nombres y estructuras correctos. Permíteme intentar reproducir esa última figura en la representación de V8. Primero voy a dibujar los **DescriptorArrays**, que contienen la lista de propiedades para un Map dado. Estas matrices pueden ser compartidas -- la clave de eso es que el mismo Map sabe cuántas propiedades puede mirar en el DescriptorArray. Como las propiedades están en el orden en que se agregaron en el tiempo, estas matrices pueden ser compartidas por varios mapas. Mira:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="Ejemplo de clases ocultas" loading="lazy"/>
</figure>

Observa que **Map1**, **Map2** y **Map3** apuntan todos a **DescriptorArray1**. El número junto al campo "descriptors" en cada Map indica cuántos campos en DescriptorArray pertenecen al Map. Entonces, **Map1**, que solo conoce la propiedad "name" (nombre), solo mira la primera propiedad listada en **DescriptorArray1**. Mientras que **Map2** tiene dos propiedades, "name" y "height." Así que mira los primeros y segundos elementos en **DescriptorArray1** (name y height). Este tipo de compartir ahorra mucho espacio.

Naturalmente, no podemos compartir donde hay una división. Hay una transición de Map2 a Map4 si se agrega la propiedad "experience", y hacia Map3 si se agrega la propiedad "prominence". Puedes ver Map4 y Map5 compartiendo DescriptorArray2 de la misma manera que DescriptorArray1 fue compartido entre tres Maps.

Lo único que falta en nuestro diagrama "realista" es el `TransitionArray`, que aún es metafórico en este punto. Vamos a cambiar eso. Me tomé la libertad de eliminar las líneas de **puntero hacia atrás**, lo cual limpia las cosas un poco. Solo recuerda que desde cualquier Map en el árbol, también puedes subir por el árbol.

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="Ejemplo de clases ocultas" loading="lazy"/>
</figure>

El diagrama recompensa el estudio. **Pregunta: ¿qué pasaría si se agregara una nueva propiedad "rating" después de "name" en lugar de continuar con "height" y otras propiedades?**

**Respuesta**: Map1 obtendría un verdadero **TransitionArray** para realizar un seguimiento de la bifurcación. Si se agrega la propiedad *height*, deberíamos hacer la transición a **Map2**. Sin embargo, si se agrega la propiedad *rating*, deberíamos ir a un nuevo mapa, **Map6**. Este mapa necesitaría un nuevo DescriptorArray que mencione *name* y *rating*. El objeto tiene espacios libres adicionales en este punto del objeto (solo uno de tres está usado), por lo que la propiedad *rating* recibirá uno de esos espacios.

*Verifiqué mi respuesta con la ayuda de `%DebugPrintPtr()` y dibujé lo siguiente:*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="Ejemplo de clases ocultas" loading="lazy"/>
</figure>

No hace falta rogarme para que pare, ¡veo que este es el límite superior de tales diagramas! Pero creo que puedes hacerte una idea de cómo se mueven las partes. Solo imagina si, después de agregar esta propiedad falsa *rating*, continuáramos con *height*, *experience* y *cost*. Bueno, tendríamos que crear mapas **Map7**, **Map8** y **Map9**. Debido a que insistimos en agregar esta propiedad en medio de una cadena establecida de mapas, duplicaremos una gran cantidad de estructura. No tengo corazón para hacer ese dibujo, pero si me lo envías, lo añadiré a este documento :).

Usé el práctico proyecto [DreamPuf](https://dreampuf.github.io/GraphvizOnline) para hacer los diagramas fácilmente. Aquí hay un [enlace](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D) al diagrama previo.

## TurboFan y propiedades const

Hasta ahora, todos estos campos están marcados en el `DescriptorArray` como `const`. Juguemos con esto. Ejecuta el siguiente código en una compilación de depuración:

```javascript
// ejecutar como:
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// Asegúrate de que el seguimiento de espacio adicional termine.
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "un brazo, una pierna";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Obtendrás una impresión de la función optimizada `foo()`. El código es muy corto. Verás al final de la función:

```
...
40  mov eax,0x2a812499          ;; objeto: 0x2a812499 <String[16]: #un brazo, una pierna>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; ¡retorna "un brazo, una pierna"!
```

TurboFan, siendo un diablillo, directamente insertó el valor de `m2.cost`. ¡Qué tal eso!

Por supuesto, después de esa última llamada a `foo()` podrías insertar esta línea:

```javascript
m2.cost = "invaluable";
```

¿Qué crees que pasará? Una cosa es segura, no podemos dejar que `foo()` continúe así. Devolvería la respuesta equivocada. Vuelve a ejecutar el programa, pero añade la bandera `--trace-deopt` para que te indiquen cuándo se elimina el código optimizado del sistema. Después de la impresión del `foo()` optimizado, verás estas líneas:

```
[marcando código dependiente 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) para desoptimización,
    razón: field-const]
[desoptimizar código marcado en todos los contextos]
```

Wow.

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="Me gusta mucho" loading="lazy"/>
</figure>

Si fuerzas la reoptimización, obtendrás un código que no es tan bueno, pero aún se beneficia en gran medida de la estructura Map que hemos estado describiendo. Recuerda de nuestros diagramas que la propiedad *cost* es la primera propiedad en
el almacén de respaldo de propiedades de un objeto. Bueno, puede que haya perdido su designación de const, pero aún tenemos su dirección. Básicamente, en un objeto con el mapa **Map5**, que ciertamente verificaremos que la variable global `m2` todavía tiene, solo tenemos que--

1. cargar el almacén de respaldo de propiedades, y
2. leer el primer elemento del array.

Veamos eso. Agrega este código debajo de la última línea:

```javascript
// Forzar la reoptimización de foo().
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Ahora mira el código producido:

```
...
40  mov ecx,0x42cc8901          ;; objeto: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; Cargar el almacén de respaldo de propiedades
48  mov eax,[ecx+0x7]           ;; Obtener el primer elemento.
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; ¡devolverlo en el registro eax!
```

Vaya. Eso es exactamente lo que dijimos que debería suceder. Quizás estamos empezando a Entender.

TurboFan también es lo suficientemente inteligente como para desoptimizar si la variable `m2` alguna vez cambia a una clase diferente. Puedes ver el último código optimizado desoptimizarse nuevamente con algo divertido como:

```javascript
m2 = 42;  // je.
```

## A dónde ir desde aquí

Muchas opciones. Migración de mapas. Modo diccionario (también conocido como "modo lento"). Mucho por explorar en esta área y espero que lo disfrutes tanto como yo -- ¡gracias por leer!
