---
title: "Comenzando con la integración de V8"
description: "Este documento introduce algunos conceptos clave de V8 y proporciona un ejemplo de “hello world” para comenzar con el código de V8."
---
Este documento introduce algunos conceptos clave de V8 y proporciona un ejemplo de “hello world” para comenzar con el código de V8.

## Audiencia

Este documento está destinado a programadores de C++ que desean integrar el motor de JavaScript V8 dentro de una aplicación en C++. Te ayuda a hacer que los objetos y métodos de C++ de tu propia aplicación estén disponibles en JavaScript, y a hacer que los objetos y funciones de JavaScript estén disponibles en tu aplicación de C++.

## Hello world

Echemos un vistazo a un [ejemplo de Hello World](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc) que toma una instrucción de JavaScript como argumento de cadena, la ejecuta como código de JavaScript y imprime el resultado en la salida estándar.

Primero, algunos conceptos clave:

- Un isolate es una instancia de VM con su propio heap.
- Un handle local es un puntero a un objeto. Todos los objetos de V8 se acceden utilizando handles. Son necesarios debido a la forma en que trabaja el recolector de basura de V8.
- Un scope de handle puede considerarse como un contenedor para cualquier número de handles. Cuando hayas terminado con tus handles, en lugar de eliminar cada uno individualmente, puedes simplemente eliminar su scope.
- Un contexto es un entorno de ejecución que permite que códigos de JavaScript separados y no relacionados se ejecuten en una única instancia de V8. Debes especificar explícitamente el contexto en el que deseas que se ejecute cualquier código de JavaScript.

Estos conceptos se discuten con mayor detalle en [la guía avanzada](/docs/embed#advanced-guide).

## Ejecutar el ejemplo

Sigue los pasos a continuación para ejecutar el ejemplo por ti mismo:

1. Descarga el código fuente de V8 siguiendo [las instrucciones de Git](/docs/source-code#using-git).
1. Las instrucciones para este ejemplo de hello world se han probado por última vez con V8 v13.1. Puedes hacer checkout de esta rama con `git checkout branch-heads/13.1 -b sample -t`.
1. Crea una configuración de compilación usando el script de ayuda:

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    Puedes inspeccionar y editar manualmente la configuración de compilación ejecutando:

    ```bash
    gn args out.gn/x64.release.sample
    ```

1. Compila la biblioteca estática en un sistema Linux 64:

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

1. Compila `hello-world.cc`, vinculándolo a la biblioteca estática creada en el proceso de compilación. Por ejemplo, en Linux 64 bits utilizando el compilador GNU y el linker LLD:

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

1. Para código más complejo, V8 falla sin un archivo de datos ICU. Copia este archivo donde esté almacenado tu binario:

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

1. Ejecuta el archivo ejecutable `hello_world` en la línea de comandos. Por ejemplo, en Linux, en el directorio V8, ejecuta:

    ```bash
    ./hello_world
    ```

1. Imprime `Hello, World!`. ¡Yay!  
   Nota: a partir de noviembre de 2024, también podría provocar un fallo de segmento temprano durante el inicio del proceso. La investigación está pendiente. Si te encuentras con esto y puedes averiguar qué está mal, comenta en [issue 377222400](https://issues.chromium.org/issues/377222400), o [envía un parche](https://v8.dev/docs/contribute).

Si buscas un ejemplo que esté sincronizado con la rama principal, revisa el archivo [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc). Este es un ejemplo muy simple y probablemente quieras hacer más que simplemente ejecutar scripts como cadenas. [La guía avanzada a continuación](#advanced-guide) contiene más información para integradores de V8.

## Más código de ejemplo

Las siguientes muestras se proporcionan como parte de la descarga del código fuente.

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

Esta muestra proporciona el código necesario para extender una aplicación hipotética de procesamiento de solicitudes HTTP —que podría formar parte de un servidor web, por ejemplo— para que sea programable. Toma un script de JavaScript como argumento, que debe proporcionar una función llamada `Process`. La función `Process` de JavaScript puede usarse, por ejemplo, para recopilar información como cuántos accesos recibe cada página servida por el servidor web ficticio.

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

Esta muestra toma nombres de archivos como argumentos, luego lee y ejecuta su contenido. Incluye un indicador de comando en el que puedes ingresar fragmentos de código JavaScript que se ejecutan posteriormente. En esta muestra, también se agregan funciones adicionales como `print` a JavaScript mediante el uso de plantillas de objetos y funciones.

## Guía avanzada

Ahora que estás familiarizado con el uso de V8 como una máquina virtual autónoma y con algunos conceptos clave de V8 como manejadores, ámbitos y contextos, discutamos estos conceptos más a fondo e introduzcamos algunos otros conceptos clave para incrustar V8 en tu propia aplicación C++.

La API de V8 proporciona funciones para compilar y ejecutar scripts, acceder a métodos y estructuras de datos de C++, manejar errores y habilitar verificaciones de seguridad. Tu aplicación puede usar V8 como cualquier otra biblioteca C++. Tu código C++ accede a V8 a través de la API de V8 incluyendo el encabezado `include/v8.h`.

### Manejadores y recolección de basura

Un manejador proporciona una referencia a la ubicación de un objeto de JavaScript en el montón de memoria. El recolector de basura de V8 recupera la memoria utilizada por objetos que ya no se pueden acceder. Durante el proceso de recolección de basura, el recolector de basura a menudo mueve objetos a diferentes ubicaciones en el montón. Cuando el recolector de basura mueve un objeto, también actualiza todos los manejadores que se refieren al objeto con la nueva ubicación del objeto.

Un objeto se considera basura si es inaccesible desde JavaScript y no hay manejadores que se refieran a él. De vez en cuando, el recolector de basura elimina todos los objetos considerados basura. El mecanismo de recolección de basura de V8 es clave para el rendimiento de V8.

Existen varios tipos de manejadores:

- Los manejadores locales se mantienen en una pila y se eliminan cuando se llama al destructor correspondiente. La vida útil de estos manejadores está determinada por un ámbito de manejadores, que a menudo se crea al comienzo de una llamada a función. Cuando se elimina el ámbito de manejadores, el recolector de basura es libre de desalojar los objetos previamente referenciados por manejadores en el ámbito de manejadores, siempre que ya no sean accesibles desde JavaScript u otros manejadores. Este tipo de manejador se utiliza en el ejemplo de hola mundo anterior.

    Los manejadores locales tienen la clase `Local<SomeType>`.

    **Nota:** La pila de manejadores no es parte de la pila de llamadas de C++, pero los ámbitos de manejadores están incrustados en la pila de C++. Los ámbitos de manejadores solo pueden ser asignados en pila, no con `new`.

- Los manejadores persistentes proporcionan una referencia a un objeto de JavaScript asignado en el montón, al igual que un manejador local. Hay dos variantes, que difieren en la gestión de vida útil de la referencia que manejan. Usa un manejador persistente cuando necesites mantener una referencia a un objeto por más de una llamada a función, o cuando las vidas de los manejadores no correspondan a ámbitos de C++. Google Chrome, por ejemplo, utiliza manejadores persistentes para referirse a nodos del Modelo de Objeto de Documento (DOM). Un manejador persistente puede hacerse débil, usando `PersistentBase::SetWeak`, para activar una devolución de llamada desde el recolector de basura cuando las únicas referencias a un objeto provienen de manejadores persistentes débiles.

    - Un manejador `UniquePersistent<SomeType>` depende de constructores y destructores de C++ para gestionar la vida útil del objeto subyacente.
    - Un `Persistent<SomeType>` puede ser construido con su constructor, pero debe ser explícitamente limpiado con `Persistent::Reset`.

- Hay otros tipos de manejadores, que se usan raramente y solo mencionaremos brevemente aquí:

    - `Eternal` es un manejador persistente para objetos de JavaScript que se espera que nunca sean eliminados. Es más barato de usar porque libera al recolector de basura de determinar la vigencia de ese objeto.
    - Tanto `Persistent` como `UniquePersistent` no se pueden copiar, lo que los hace inadecuados como valores con contenedores de bibliotecas estándar previos a C++11. `PersistentValueMap` y `PersistentValueVector` proporcionan clases de contenedor para valores persistentes, con semántica similar a mapas y vectores. Los embebedores de C++11 no necesitan estos, ya que las semánticas de movimiento de C++11 resuelven el problema subyacente.

Por supuesto, crear un manejador local cada vez que creas un objeto puede resultar en muchos manejadores. Aquí es donde los ámbitos de manejadores son muy útiles. Puedes pensar en un ámbito de manejadores como un contenedor que contiene muchos manejadores. Cuando se llama al destructor del ámbito de manejadores, todos los manejadores creados dentro de ese ámbito son eliminados de la pila. Como esperarías, esto hace que los objetos a los que los manejadores apuntan sean elegibles para su eliminación del montón por el recolector de basura.

Volviendo a [nuestro muy simple ejemplo de hola mundo](#hello-world), en el siguiente diagrama puedes ver la pila de manejadores y los objetos asignados en el montón. Ten en cuenta que `Context::New()` devuelve un manejador `Local`, y creamos un nuevo manejador `Persistent` basado en él para demostrar el uso de manejadores `Persistent`.

![](/_img/docs/embed/local-persist-handles-review.png)

Cuando se llama al destructor `HandleScope::~HandleScope`, el ámbito de manejo se elimina. Los objetos referenciados por los manejos dentro del ámbito de manejo eliminado son elegibles para ser eliminados en la siguiente recolección de basura si no hay otras referencias hacia ellos. El recolector de basura también puede eliminar los objetos `source_obj` y `script_obj` del montón ya que no están referenciados por ningún manejo ni son accesibles de otro modo desde JavaScript. Dado que el manejo de contexto es un manejo persistente, no se elimina cuando se sale del ámbito de manejo. La única manera de eliminar el manejo de contexto es llamar explícitamente a `Reset` sobre él.

:::nota
**Nota:** A lo largo de este documento, el término "manejo" se refiere a un manejo local. Cuando se habla de un manejo persistente, ese término se usa en su totalidad.
:::

Es importante ser consciente de una trampa común con este modelo: *no puedes devolver un manejo local directamente desde una función que declara un ámbito de manejo*. Si lo haces, el manejo local que intentas devolver será eliminado por el destructor del ámbito de manejo inmediatamente antes de que la función devuelva. La forma adecuada de devolver un manejo local es construir un `EscapableHandleScope` en lugar de un `HandleScope` y llamar al método `Escape` en el ámbito de manejo, pasando el manejo cuyo valor deseas devolver. Aquí tienes un ejemplo de cómo funciona esto en la práctica:

```cpp
// Esta función devuelve un nuevo array con tres elementos: x, y, y z.
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // Crearemos manejos temporales, por lo que usamos un ámbito de manejo.
  v8::EscapableHandleScope handle_scope(isolate);

  // Crear un nuevo array vacío.
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // Devolver un resultado vacío si hubo un error al crear el array.
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // Rellenar los valores
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Devolver el valor a través de Escape.
  return handle_scope.Escape(array);
}
```

El método `Escape` copia el valor de su argumento en el ámbito contenedor, elimina todos los manejos locales y devuelve la nueva copia del manejo que puede ser devuelta de manera segura.

### Contextos

En V8, un contexto es un entorno de ejecución que permite que aplicaciones JavaScript separadas e independientes se ejecuten en una sola instancia de V8. Debes especificar explícitamente el contexto en el que deseas que se ejecute cualquier código JavaScript.

¿Por qué es esto necesario? Porque JavaScript proporciona un conjunto de funciones y objetos utilitarios integrados que pueden ser modificados por código JavaScript. Por ejemplo, si dos funciones JavaScript completamente independientes modificaran el objeto global de la misma manera, es bastante probable que se produzcan resultados inesperados.

En términos de tiempo de CPU y memoria, podría parecer una operación costosa crear un nuevo contexto de ejecución dado el número de objetos integrados que deben construirse. Sin embargo, la amplia caché de V8 asegura que, si bien el primer contexto que crees es algo costoso, los contextos posteriores son mucho más baratos. Esto se debe a que el primer contexto necesita crear los objetos integrados y analizar el código JavaScript integrado, mientras que los contextos siguientes solo tienen que crear los objetos integrados para su contexto. Con la característica de instantáneas de V8 (activada con la opción de compilación `snapshot=yes`, que es el valor predeterminado), el tiempo empleado en crear el primer contexto estará altamente optimizado ya que una instantánea incluye un montón serializado que contiene código ya compilado del código JavaScript integrado. Junto con la recolección de basura, la amplia caché de V8 también es clave para el rendimiento de V8.

Una vez que hayas creado un contexto, puedes entrar y salir de él un número ilimitado de veces. Mientras estés en el contexto A, también puedes entrar a un contexto diferente, B, lo que significa que reemplazas A como el contexto actual con B. Cuando sales de B, A se restaura como el contexto actual. Esto se ilustra a continuación:

![](/_img/docs/embed/intro-contexts.png)

Observa que las funciones y objetos utilitarios integrados de cada contexto se mantienen separados. Opcionalmente, puedes establecer un token de seguridad al crear un contexto. Consulta la sección [Modelo de Seguridad](#security-model) para más información.

La motivación para usar contextos en V8 fue para que cada ventana e iframe en un navegador pudiera tener su propio entorno JavaScript independiente.

### Plantillas

Una plantilla es un modelo para funciones y objetos JavaScript en un contexto. Puedes usar una plantilla para envolver funciones y estructuras de datos de C++ dentro de objetos JavaScript de manera que puedan ser manipulados por scripts JavaScript. Por ejemplo, Google Chrome usa plantillas para envolver nodos DOM de C++ como objetos JavaScript e instalar funciones en el espacio de nombres global. Puedes crear un conjunto de plantillas y luego usar las mismas para cada nuevo contexto que hagas. Puedes tener tantas plantillas como necesites. Sin embargo, solo puedes tener una instancia de cualquier plantilla en un contexto dado.

En JavaScript, hay una fuerte dualidad entre funciones y objetos. Para crear un nuevo tipo de objeto en Java o C++, normalmente definirías una nueva clase. En JavaScript, en cambio, creas una nueva función y generas instancias usando la función como constructor. El diseño y la funcionalidad de un objeto JavaScript están estrechamente ligados a la función que lo construyó. Esto se refleja en la forma en que funcionan las plantillas de V8. Hay dos tipos de plantillas:

- Plantillas de función

    Un template de función es el plano para una sola función. Creas una instancia de JavaScript del template llamando al método `GetFunction` del template dentro del contexto en el que deseas instanciar la función de JavaScript. También puedes asociar un callback de C++ con un template de función que se llama cuando se invoca la instancia de la función de JavaScript.

- Plantillas de objetos

    Cada template de función tiene un template de objeto asociado. Esto se utiliza para configurar objetos creados con esta función como su constructor. Puedes asociar dos tipos de callbacks de C++ con templates de objetos:

    - Los callbacks de acceso se invocan cuando un script accede a una propiedad específica del objeto
    - Los callbacks de interceptores se invocan cuando un script accede a cualquier propiedad del objeto

  [Accesores](#accessors) e [interceptores](#interceptors) se discuten más adelante en este documento.

El siguiente código proporciona un ejemplo de cómo crear un template para el objeto global y configurar las funciones globales incorporadas.

```cpp
// Crear un template para el objeto global y configurar las
// funciones globales incorporadas.
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// Cada procesador obtiene su propio contexto para que
// procesadores diferentes no se afecten entre sí.
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

Este código de ejemplo se toma de `JsHttpProcessor::Initializer` en el ejemplo `process.cc`.

### Accesores

Un accesor es un callback de C++ que calcula y devuelve un valor cuando un script de JavaScript accede a una propiedad de un objeto. Los accesores se configuran a través de un template de objeto, utilizando el método `SetAccessor`. Este método toma el nombre de la propiedad con la que está asociado y dos callbacks que se ejecutan cuando un script intenta leer o escribir la propiedad.

La complejidad de un accesor depende del tipo de datos que estás manipulando:

- [Acceder a variables globales estáticas](#accessing-static-global-variables)
- [Acceder a variables dinámicas](#accessing-dynamic-variables)

### Acceder a variables globales estáticas

Supongamos que hay dos variables enteras de C++, `x` e `y` que deben estar disponibles para JavaScript como variables globales dentro de un contexto. Para hacer esto, necesitas llamar a funciones de acceso de C++ cada vez que un script lea o escriba esas variables. Estas funciones de acceso convierten un entero de C++ a un entero de JavaScript utilizando `Integer::New`, y convierten un entero de JavaScript a un entero de C++ utilizando `Int32Value`. Se proporciona un ejemplo a continuación:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter son tan similares que se omiten para ser breves

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

Ten en cuenta que el template de objeto en el código anterior se crea al mismo tiempo que el contexto. El template podría haberse creado con anticipación y luego usarse para cualquier número de contextos.

### Acceder a variables dinámicas

En el ejemplo anterior, las variables eran estáticas y globales. ¿Qué sucede si los datos que se están manipulando son dinámicos, como en el árbol DOM en un navegador? Imaginemos que `x` e `y` son campos de un objeto en la clase C++ `Point`:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

Para hacer que cualquier número de instancias de `point` en C++ estén disponibles para JavaScript, necesitamos crear un objeto de JavaScript por cada `point` en C++ y establecer una conexión entre el objeto de JavaScript y la instancia de C++. Esto se hace con valores externos y campos internos de objetos.

Primero crea un template de objeto para el objeto `point` envolvente:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

Cada objeto `point` de JavaScript mantiene una referencia al objeto de C++ para el cual es un envoltorio con un campo interno. Estos campos se llaman así porque no se pueden acceder desde JavaScript; solo se pueden acceder desde el código C++. Un objeto puede tener cualquier número de campos internos, y el número de campos internos se establece en el template del objeto de la siguiente manera:

```cpp
point_templ->SetInternalFieldCount(1);
```

Aquí, el recuento de campos internos se establece en `1`, lo que significa que el objeto tiene un campo interno, con un índice de `0`, que apunta a un objeto de C++.

Añade los accesores de `x` e `y` al template:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

A continuación, encapsula un punto C++ creando una nueva instancia de la plantilla y luego establece el campo interno `0` como un encapsulador externo alrededor del punto `p`.

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

El objeto externo es simplemente un encapsulador alrededor de un `void*`. Los objetos externos solo pueden ser usados para almacenar valores de referencia en campos internos. Los objetos de JavaScript no pueden tener referencias directas a objetos de C++, por lo que el valor externo se utiliza como un "puente" para pasar de JavaScript a C++. En ese sentido, los valores externos son lo opuesto a los handles, ya que los handles permiten que C++ haga referencias a objetos de JavaScript.

Aquí está la definición de los accesores `get` y `set` para `x`, las definiciones de los accesores `y` son idénticas excepto que `y` reemplaza a `x`:

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

Los accesores extraen la referencia al objeto `point` que fue encapsulado por el objeto de JavaScript y luego leen y escriben el campo asociado. De esta manera, estos accesores genéricos pueden ser usados en cualquier cantidad de objetos de puntos encapsulados.

### Interceptores

También puedes especificar un callback para cuando un script acceda a cualquier propiedad de un objeto. Esto se llama interceptores. Por eficiencia, existen dos tipos de interceptores:

- *Interceptores de propiedades con nombre* - llamados al acceder a propiedades con nombres de cadena.
  Un ejemplo de esto, en un entorno de navegador, es `document.theFormName.elementName`.
- *Interceptores de propiedades indexadas* - llamados al acceder a propiedades indexadas. Un ejemplo de esto, en un entorno de navegador, es `document.forms.elements[0]`.

El ejemplo `process.cc`, proporcionado con el código fuente de V8, incluye un ejemplo de uso de interceptores. En el siguiente fragmento de código, `SetNamedPropertyHandler` especifica los interceptores `MapGet` y `MapSet`:

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

El interceptor `MapGet` se proporciona a continuación:

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // Obtiene el mapa encapsulado por este objeto.
  map<string, string> *obj = UnwrapMap(info.Holder());

  // Convierte la cadena de JavaScript a un std::string.
  string key = ObjectToString(name);

  // Busca el valor si existe utilizando el método estándar de STL.
  map<string, string>::iterator iter = obj->find(key);

  // Si la clave no está presente, devuelve un handle vacío como señal.
  if (iter == obj->end()) return;

  // De lo contrario, obtiene el valor y lo encapsula en una cadena de JavaScript.
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

Al igual que los accesores, los callbacks especificados se invocan cada vez que se accede a una propiedad. La diferencia entre accesores y interceptores es que los interceptores manejan todas las propiedades, mientras que los accesores están asociados a una propiedad específica.

### Modelo de seguridad

La "política de mismo origen" (introducida por primera vez con Netscape Navigator 2.0) previene que un documento o script cargado desde un "origen" obtenga o establezca propiedades de un documento desde un origen diferente. El término origen se define aquí como una combinación de nombre de dominio (por ejemplo, `www.example.com`), protocolo (por ejemplo, `https`) y puerto. Por ejemplo, `www.example.com:81` no es el mismo origen que `www.example.com`. Los tres deben coincidir para que dos páginas web se consideren de mismo origen. Sin esta protección, una página web malintencionada podría comprometer la integridad de otra página web.

En V8, un "origen" se define como un contexto. El acceso a cualquier contexto que no sea aquel desde el cual estás llamando no está permitido por defecto. Para acceder a un contexto diferente al que estás llamando, necesitas usar tokens de seguridad o callbacks de seguridad. Un token de seguridad puede ser cualquier valor pero típicamente es un símbolo, una cadena canónica que no existe en otro lugar. Opcionalmente, puedes especificar un token de seguridad con `SetSecurityToken` cuando configures un contexto. Si no especificas un token de seguridad, V8 generará automáticamente uno para el contexto que estás creando.

Cuando se intenta acceder a una variable global, el sistema de seguridad de V8 primero verifica el token de seguridad del objeto global que se va a acceder contra el token de seguridad del código que intenta acceder al objeto. Si los tokens coinciden, se concede el acceso. Si los tokens no coinciden, V8 realiza una llamada de retorno para comprobar si se debe permitir el acceso. Puede especificar si se debe permitir el acceso a un objeto configurando el callback de seguridad en el objeto, utilizando el método `SetAccessCheckCallbacks` en plantillas de objetos. El sistema de seguridad de V8 puede entonces obtener el callback de seguridad del objeto que se está accediendo y llamarlo para preguntar si otro contexto está autorizado a acceder a él. Este callback recibe el objeto que se está accediendo, el nombre de la propiedad que está siendo accedida, el tipo de acceso (por ejemplo, lectura, escritura o eliminación) y devuelve si se permite o no el acceso.

Este mecanismo se implementa en Google Chrome de forma que, si los tokens de seguridad no coinciden, se utiliza un callback especial para permitir el acceso solo a lo siguiente: `window.focus()`, `window.blur()`, `window.close()`, `window.location`, `window.open()`, `history.forward()`, `history.back()`, y `history.go()`.

### Excepciones

V8 lanza una excepción si ocurre un error, por ejemplo, cuando un script o función intenta leer una propiedad que no existe, o si se llama a una función que no es una función.

V8 devuelve un handle vacío si una operación no tuvo éxito. Por lo tanto, es importante que su código verifique que un valor de retorno no es un handle vacío antes de continuar la ejecución. Compruebe si un handle está vacío con la función miembro pública `IsEmpty()` de la clase `Local`.

Puede capturar excepciones con `TryCatch`, por ejemplo:

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Excepción: %s\n", *exception_str);
  // ...
}
```

Si el valor devuelto es un handle vacío y no tiene un `TryCatch` en su lugar, su código debe detenerse. Si tiene un `TryCatch`, la excepción se captura y su código puede continuar procesando.

### Herencia

JavaScript es un lenguaje orientado a objetos *sin clases* y, como tal, utiliza herencia prototipal en lugar de herencia clásica. Esto puede ser desconcertante para los programadores formados en lenguajes orientados a objetos convencionales como C++ y Java.

Los lenguajes orientados a objetos basados en clases, como Java y C++, se fundamentan en el concepto de dos entidades distintas: clases e instancias. JavaScript es un lenguaje basado en prototipos y, por lo tanto, no hace esta distinción: simplemente tiene objetos. JavaScript no admite de forma nativa la declaración de jerarquías de clases; sin embargo, el mecanismo de prototipos de JavaScript simplifica el proceso de agregar propiedades y métodos personalizados a todas las instancias de un objeto. En JavaScript, puede agregar propiedades personalizadas a objetos. Por ejemplo:

```js
// Crea un objeto llamado `bicycle`.
function bicycle() {}
// Crea una instancia de `bicycle` llamada `roadbike`.
var roadbike = new bicycle();
// Define una propiedad personalizada, `wheels`, en `roadbike`.
roadbike.wheels = 2;
```

Una propiedad personalizada agregada de esta manera solo existe para esa instancia del objeto. Si creamos otra instancia de `bicycle()`, llamada, por ejemplo, `mountainbike`, `mountainbike.wheels` devolvería `undefined` a menos que se agregue explícitamente la propiedad `wheels`.

A veces, esto es exactamente lo que se requiere; otras veces, sería útil agregar la propiedad personalizada a todas las instancias de un objeto: después de todo, todas las bicicletas tienen ruedas. Aquí es donde el objeto prototipo de JavaScript es muy útil. Para usar el objeto prototipo, haga referencia a la palabra clave `prototype` en el objeto antes de agregarle la propiedad personalizada de la siguiente manera:

```js
// Primero, crea el objeto “bicycle”
function bicycle() {}
// Asigna la propiedad wheels al prototipo del objeto
bicycle.prototype.wheels = 2;
```

Todas las instancias de `bicycle()` ahora tendrán la propiedad `wheels` preconstruida.

El mismo enfoque se utiliza en V8 con plantillas. Cada `FunctionTemplate` tiene un método `PrototypeTemplate` que proporciona una plantilla para el prototipo de la función. Puede establecer propiedades y asociar funciones C++ con esas propiedades en un `PrototypeTemplate`, que estarán presentes en todas las instancias de la correspondiente `FunctionTemplate`. Por ejemplo:

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

Esto hace que todas las instancias de `biketemplate` tengan un método `wheels` en su cadena de prototipos que, cuando se llame, hará que se invoque la función C++ `MyWheelsMethodCallback`.

La clase `FunctionTemplate` de V8 proporciona la función miembro pública `Inherit()` que puede llamar cuando desee que una plantilla de función herede de otra plantilla de función, de la siguiente manera:

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
