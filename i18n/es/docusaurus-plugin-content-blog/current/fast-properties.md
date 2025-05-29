---
title: "Propiedades rápidas en V8"
author: "Camillo Bruni ([@camillobruni](https://twitter.com/camillobruni)), también autor de [“Fast `for`-`in`”](/blog/fast-for-in)"
avatars:
  - "camillo-bruni"
date: 2017-08-30 13:33:37
tags:
  - internals
description: "Este análisis técnico profundo explica cómo V8 maneja las propiedades de JavaScript detrás de escena."
---
En esta publicación de blog queremos explicar cómo V8 maneja las propiedades de JavaScript internamente. Desde el punto de vista de JavaScript, solo se necesitan unas pocas distinciones para las propiedades. Los objetos JavaScript se comportan principalmente como diccionarios, con claves de cadena y objetos arbitrarios como valores. Sin embargo, la especificación trata las propiedades con índices enteros y otras propiedades de manera diferente [durante la iteración](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys). Fuera de eso, las diferentes propiedades se comportan mayormente de la misma manera, independientemente de si tienen índices enteros o no.

<!--truncate-->
Sin embargo, bajo el capó, V8 depende de varias representaciones diferentes de las propiedades por razones de rendimiento y memoria. En esta publicación de blog vamos a explicar cómo V8 puede proporcionar acceso rápido a las propiedades mientras maneja las propiedades que se agregan dinámicamente. Comprender cómo funcionan las propiedades es esencial para explicar cómo las optimizaciones como [cachés en línea](http://mrale.ph/blog/2012/06/03/explaining-js-vms-in-js-inline-caches.html) funcionan en V8.

Esta publicación explica la diferencia en el manejo de propiedades con índices enteros y propiedades con nombre. Después de eso, mostramos cómo V8 mantiene las HiddenClasses al agregar propiedades con nombre para proporcionar una forma rápida de identificar la forma de un objeto. Luego continuaremos brindando información sobre cómo se optimizan las propiedades con nombre para accesos rápidos o modificaciones rápidas según el uso. En la sección final, proporcionamos detalles sobre cómo V8 maneja las propiedades con índices enteros o los índices de las matrices.

## Propiedades con nombre vs. elementos

Comencemos analizando un objeto muy simple como `{a: "foo", b: "bar"}`. Este objeto tiene dos propiedades con nombre, `"a"` y `"b"`. No tiene ningún índice entero para los nombres de las propiedades. Las propiedades con índices de matriz, más comúnmente conocidas como elementos, son más prominentes en las matrices. Por ejemplo, la matriz `["foo", "bar"]` tiene dos propiedades con índices de matriz: 0, con el valor "foo", y 1, con el valor "bar". Esta es la primera gran distinción en cómo V8 maneja las propiedades en general.

El siguiente diagrama muestra cómo se ve un objeto básico de JavaScript en memoria.

![](/_img/fast-properties/jsobject.png)

Los elementos y las propiedades se almacenan en dos estructuras de datos separadas, lo que hace que agregar y acceder a propiedades o elementos sea más eficiente para diferentes patrones de uso.

Los elementos se utilizan principalmente para los diversos [métodos de `Array.prototype`](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) como `pop` o `slice`. Dado que estas funciones acceden a propiedades en rangos consecutivos, V8 también los representa como matrices simples internamente, la mayor parte del tiempo. Más adelante en esta publicación explicaremos cómo a veces cambiamos a una representación dispersa basada en diccionarios para ahorrar memoria.

Las propiedades con nombre se almacenan de manera similar en una matriz separada. Sin embargo, a diferencia de los elementos, no podemos simplemente usar la clave para deducir su posición dentro de la matriz de propiedades; necesitamos algunos metadatos adicionales. En V8, cada objeto de JavaScript tiene una HiddenClass asociada. La HiddenClass almacena información sobre la forma de un objeto y, entre otras cosas, un mapeo de nombres de propiedades a índices en las propiedades. Para complicar las cosas, a veces usamos un diccionario para las propiedades en lugar de una matriz simple. Explicaremos esto con más detalle en una sección dedicada.

**Conclusiones de esta sección:**

- Las propiedades con índices de matriz se almacenan en un almacén de elementos separado.
- Las propiedades con nombre se almacenan en el almacén de propiedades.
- Los elementos y las propiedades pueden ser matrices o diccionarios.
- Cada objeto de JavaScript tiene una HiddenClass asociada que guarda información sobre la forma del objeto.

## HiddenClasses y DescriptorArrays

Después de explicar la distinción general de los elementos y propiedades nombradas, debemos observar cómo funcionan las HiddenClasses en V8. Esta HiddenClass almacena información meta sobre un objeto, incluyendo el número de propiedades en el objeto y una referencia al prototipo del objeto. Las HiddenClasses son conceptualmente similares a las clases en los lenguajes típicos de programación orientados a objetos. Sin embargo, en un lenguaje basado en prototipos, como JavaScript, generalmente no es posible conocer las clases de antemano. Por lo tanto, en este caso, V8 crea las HiddenClasses sobre la marcha y las actualiza dinámicamente a medida que los objetos cambian. Las HiddenClasses funcionan como un identificador para la estructura de un objeto y, como tal, son un ingrediente muy importante para el compilador optimizador de V8 y las cachés en línea. Por ejemplo, el compilador optimizador puede directamente en línea acceder a propiedades si puede garantizar una estructura de objeto compatible a través de la HiddenClass.

Echemos un vistazo a las partes importantes de una HiddenClass.

![](/_img/fast-properties/hidden-class.png)

En V8, el primer campo de un objeto JavaScript apunta a una HiddenClass. (De hecho, este es el caso para cualquier objeto que esté en el heap de V8 y gestionado por el recolector de basura). En términos de propiedades, la información más importante es el tercer campo de bits, que almacena el número de propiedades, y un puntero al array descriptor. El array descriptor contiene información sobre las propiedades nombradas como el nombre en sí y la posición donde se almacena el valor. Nota que no se realiza un seguimiento de las propiedades indexadas por números enteros aquí, por lo tanto, no hay una entrada en el array descriptor.

La suposición básica sobre HiddenClasses es que los objetos con la misma estructura — por ejemplo, las mismas propiedades nombradas en el mismo orden — comparten la misma HiddenClass. Para lograr esto, usamos una HiddenClass diferente cuando se agrega una propiedad a un objeto. En el siguiente ejemplo, partimos de un objeto vacío y agregamos tres propiedades nombradas.

![](/_img/fast-properties/adding-properties.png)

Cada vez que se agrega una nueva propiedad, la HiddenClass del objeto cambia. En segundo plano, V8 crea un árbol de transición que vincula las HiddenClasses entre sí. V8 sabe qué HiddenClass tomar cuando agregas, por ejemplo, la propiedad "a" a un objeto vacío. Este árbol de transición asegura que termines con la misma HiddenClass final si agregas las mismas propiedades en el mismo orden. El siguiente ejemplo muestra que seguiríamos el mismo árbol de transición incluso si agregamos propiedades indexadas simples entre ellas.

![](/_img/fast-properties/transitions.png)

Sin embargo, si creamos un nuevo objeto al que se le agrega una propiedad diferente, en este caso la propiedad `"d"`, V8 crea una rama separada para las nuevas HiddenClasses.

![](/_img/fast-properties/transition-trees.png)

**Conclusiones de esta sección:**

- Los objetos con la misma estructura (mismas propiedades en el mismo orden) tienen la misma HiddenClass.
- De forma predeterminada, cada nueva propiedad nombrada agregada provoca la creación de una nueva HiddenClass.
- Agregar propiedades indexadas por arrays no crea nuevas HiddenClasses.

## Los tres tipos diferentes de propiedades nombradas

Después de proporcionar una visión general de cómo V8 utiliza las HiddenClasses para rastrear la forma de los objetos, profundicemos en cómo se almacenan realmente estas propiedades. Como se explicó en la introducción anterior, hay dos tipos fundamentales de propiedades: nombradas e indexadas. La siguiente sección cubre las propiedades nombradas.

Un objeto simple como `{a: 1, b: 2}` puede tener varias representaciones internas en V8. Mientras que los objetos de JavaScript se comportan más o menos como simples diccionarios desde afuera, V8 intenta evitar los diccionarios porque obstaculizan ciertas optimizaciones como las [cachés en línea](https://en.wikipedia.org/wiki/Inline_caching), que explicaremos en una publicación separada.

**Propiedades dentro del objeto vs. propiedades normales:** V8 admite las llamadas propiedades dentro del objeto, que se almacenan directamente en el propio objeto. Estas son las propiedades más rápidas disponibles en V8 ya que son accesibles sin ninguna indireccionamiento. El número de propiedades dentro del objeto está predeterminado por el tamaño inicial del objeto. Si se añaden más propiedades que el espacio disponible en el objeto, se almacenan en el almacenamiento de propiedades. Este almacenamiento agrega un nivel de indireccionamiento pero puede crecer de forma independiente.

![](/_img/fast-properties/in-object-properties.png)

**Propiedades rápidas vs. lentas:** La siguiente distinción importante es entre propiedades rápidas y lentas. Por lo general, definimos las propiedades almacenadas en el almacenamiento lineal de propiedades como "rápidas". Las propiedades rápidas simplemente se acceden por índice en el almacenamiento de propiedades. Para pasar del nombre de la propiedad a la posición real en el almacenamiento de propiedades, debemos consultar el array descriptor en la HiddenClass, como se describió anteriormente.

![](/_img/fast-properties/fast-vs-slow-properties.png)

Sin embargo, si muchas propiedades se agregan y eliminan de un objeto, puede generarse una gran sobrecarga de tiempo y memoria al mantener el array descriptor y las HiddenClasses. Por lo tanto, V8 también admite las llamadas propiedades lentas. Un objeto con propiedades lentas tiene un diccionario autónomo como almacenamiento de propiedades. Toda la información meta sobre las propiedades ya no se almacena en el array descriptor en la HiddenClass, sino directamente en el diccionario de propiedades. Por lo tanto, las propiedades pueden agregarse y eliminarse sin actualizar la HiddenClass. Dado que las cachés en línea no funcionan con propiedades de diccionario, estas últimas suelen ser más lentas que las propiedades rápidas.

**Conclusiones de esta sección:**

- Hay tres tipos diferentes de propiedades nombradas: dentro del objeto, rápidas y lentas/diccionario.
    1. Las propiedades dentro del objeto se almacenan directamente en el propio objeto y brindan el acceso más rápido.
    1. Las propiedades rápidas residen en el almacén de propiedades, toda la información meta se almacena en el array descriptor en el HiddenClass.
    1. Las propiedades lentas residen en un diccionario de propiedades autónomo, la información meta ya no se comparte a través del HiddenClass.
- Las propiedades lentas permiten una eliminación y adición eficiente de propiedades, pero son más lentas de acceder que los otros dos tipos.

## Elementos o propiedades indexadas por array

Hasta ahora hemos analizado las propiedades nombradas e ignorado las propiedades indexadas enteras que se usan comúnmente con arrays. Manejar propiedades indexadas enteras no es menos complejo que las propiedades nombradas. Aunque todas las propiedades indexadas siempre se mantienen separadas en el almacén de elementos, ¡hay [20](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?q=elements-kind.h&sq=package:chromium&dr&l=14) tipos diferentes de elementos!

**Elementos Completos o con Huecos:** La primera gran distinción que hace V8 es si el almacén que respalda los elementos está lleno o tiene huecos. Obtienes huecos en un almacén de respaldo si eliminas un elemento indexado, o por ejemplo, no lo defines. Un ejemplo simple es `[1,,3]` donde la segunda entrada es un hueco. El siguiente ejemplo ilustra este problema:

```js
const o = ['a', 'b', 'c'];
console.log(o[1]);          // Imprime 'b'.

delete o[1];                // Introduce un hueco en el almacén de elementos.
console.log(o[1]);          // Imprime 'undefined'; la propiedad 1 no existe.
o.__proto__ = {1: 'B'};     // Define la propiedad 1 en el prototipo.

console.log(o[0]);          // Imprime 'a'.
console.log(o[1]);          // Imprime 'B'.
console.log(o[2]);          // Imprime 'c'.
console.log(o[3]);          // Imprime undefined.
```

![](/_img/fast-properties/hole.png)

En resumen, si una propiedad no está presente en el receptor tenemos que seguir buscando en la cadena de prototipos. Dado que los elementos son autónomos, por ejemplo, no almacenamos información sobre propiedades indexadas presentes en el HiddenClass, necesitamos un valor especial, llamado el\_hueco (the\_hole), para marcar propiedades que no están presentes. Esto es crucial para el rendimiento de las funciones de Array. Si sabemos que no hay huecos, es decir, el almacén de elementos está lleno, podemos realizar operaciones locales sin búsquedas costosas en la cadena de prototipos.

**Elementos Rápidos o de Diccionario:** La segunda gran distinción hecha en los elementos es si son rápidos o están en modo diccionario. Los elementos rápidos son arrays internos simples de la VM donde el índice de propiedad se asigna al índice en el almacén de elementos. Sin embargo, esta simple representación es bastante ineficiente para arrays muy grandes y dispersos/con huecos, donde solo unas pocas entradas están ocupadas. En este caso utilizamos una representación basada en diccionario para ahorrar memoria a costa de un acceso ligeramente más lento:

```js
const sparseArray = [];
sparseArray[9999] = 'foo'; // Crea un array con elementos de diccionario.
```

En este ejemplo, asignar un array completo con 10k entradas sería bastante ineficiente. Lo que sucede en su lugar es que V8 crea un diccionario donde almacenamos tripletes clave-valor-descriptor. La clave en este caso sería `'9999'` y el valor `'foo'` y se utiliza el descriptor por defecto. Dado que no tenemos una forma de almacenar detalles del descriptor en el HiddenClass, V8 recurre a elementos lentos cada vez que defines propiedades indexadas con un descriptor personalizado:

```js
const array = [];
Object.defineProperty(array, 0, {value: 'fixed', configurable: false});
console.log(array[0]);      // Imprime 'fixed'.
array[0] = 'other value';   // No se puede sobrescribir el índice 0.
console.log(array[0]);      // Aún imprime 'fixed'.
```

En este ejemplo añadimos una propiedad no configurable al array. Esta información se almacena en la parte de descriptor de un triplete de diccionario de elementos lentos. Es importante señalar que las funciones de Array funcionan considerablemente más lento en objetos con elementos lentos.

**Elementos Smi y de Doble Precisión:** Para elementos rápidos hay otra distinción importante hecha en V8. Por ejemplo, si solo almacenas enteros en un Array, un caso de uso común, el GC no tiene que mirar el array, ya que los enteros se codifican directamente como lo que se denominan pequeños enteros (Smis) en el lugar. Otro caso especial son los Arrays que solo contienen números de doble precisión. A diferencia de los Smis, los números de punto flotante generalmente se representan como objetos completos que ocupan varias palabras. Sin embargo, V8 almacena dobles sin procesar para arrays puramente de dobles para evitar gastos de memoria y rendimiento. El siguiente ejemplo enumera 4 ejemplos de elementos Smi y de doble precisión:

```js
const a1 = [1,   2, 3];  // Smi Completos
const a2 = [1,    , 3];  // Smi con Huecos, a2[1] lee desde el prototipo
const b1 = [1.1, 2, 3];  // Doble Completos
const b2 = [1.1,  , 3];  // Doble con Huecos, b2[1] lee desde el prototipo
```

**Elementos Especiales:** Con la información proporcionada hasta ahora hemos cubierto 7 de los 20 tipos diferentes de elementos. Por simplicidad hemos excluido 9 tipos de elementos para TypedArrays, otros dos para envoltorios de String y, por último pero no menos importante, dos más de tipos de elementos especiales para objetos de argumentos.

**El ElementsAccessor:** Como puedes imaginar, no estamos exactamente entusiasmados con escribir funciones de Array 20 veces en C++, una vez por cada [tipo de elementos](/blog/elements-kinds). Ahí es donde entra en juego un poco de magia en C++. En lugar de implementar funciones de Array una y otra vez, construimos el `ElementsAccessor`, donde principalmente solo tenemos que implementar funciones simples que acceden a elementos desde la memoria subyacente. El `ElementsAccessor` se basa en [CRTP](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern) para crear versiones especializadas de cada función de Array. Entonces, si llamas algo como `slice` en un array, V8 internamente llama a una función incorporada escrita en C++ y se despacha a través del `ElementsAccessor` hacia la versión especializada de la función:

![](/_img/fast-properties/elements-accessor.png)

**Conclusión de esta sección:**

- Existen propiedades indexadas y elementos en modo rápido y modo diccionario.
- Las propiedades rápidas pueden estar empaquetadas o pueden contener huecos que indican que una propiedad indexada ha sido eliminada.
- Los elementos están especializados en su contenido para acelerar las funciones de Array y reducir la sobrecarga de GC.

Entender cómo funcionan las propiedades es clave para muchas optimizaciones en V8. Para los desarrolladores de JavaScript, muchas de estas decisiones internas no son directamente visibles, pero explican por qué ciertos patrones de código son más rápidos que otros. Cambiar el tipo de propiedad o elemento típicamente hace que V8 cree una HiddenClass diferente, lo que puede llevar a contaminación de tipos que [impide que V8 genere código óptimo](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html). Mantente atento para futuras publicaciones sobre cómo funcionan las internals de la VM de V8.
