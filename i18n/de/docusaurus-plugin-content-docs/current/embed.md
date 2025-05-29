---
title: &apos;Erste Schritte mit der Einbettung von V8&apos;
description: &apos;Dieses Dokument führt einige wichtige V8-Konzepte ein und bietet ein “Hello World”-Beispiel, um Ihnen den Einstieg in den V8-Code zu erleichtern.&apos;
---
Dieses Dokument führt einige wichtige V8-Konzepte ein und bietet ein “Hello World”-Beispiel, um Ihnen den Einstieg in den V8-Code zu erleichtern.

## Zielgruppe

Dieses Dokument richtet sich an C++-Programmierer, die die V8-JavaScript-Engine in eine C++-Anwendung einbetten möchten. Es hilft Ihnen dabei, die C++-Objekte und -Methoden Ihrer Anwendung für JavaScript verfügbar zu machen und JavaScript-Objekte und -Funktionen für Ihre C++-Anwendung zugänglich zu machen.

## Hello World

Schauen wir uns ein [Hello World Beispiel](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc) an, das eine JavaScript-Anweisung als Zeichenkettenargument nimmt, sie als JavaScript-Code ausführt und das Ergebnis standardmäßig ausgibt.

Zuerst einige wichtige Konzepte:

- Eine Isolate ist eine VM-Instanz mit eigenem Heap.
- Ein lokaler Handle ist ein Zeiger auf ein Objekt. Alle V8-Objekte werden mithilfe von Handles angesprochen. Diese sind notwendig aufgrund der Funktionsweise des V8-Garbage Collectors.
- Ein Handle-Scope kann als Container für beliebig viele Handles angesehen werden. Wenn Sie mit Ihren Handles fertig sind, können Sie anstelle des einzelnen Löschens jedes Handles einfach ihren Scope löschen.
- Ein Kontext ist eine Ausführungsumgebung, die es ermöglicht, separate, nicht zusammenhängende JavaScript-Codes in einer einzigen Instanz von V8 auszuführen. Sie müssen ausdrücklich den Kontext angeben, in dem Sie JavaScript-Code ausführen möchten.

Diese Konzepte werden ausführlicher im [fortgeschrittenen Leitfaden](/docs/embed#advanced-guide) besprochen.

## Beispiel ausführen

Führen Sie die folgenden Schritte aus, um das Beispiel selbst auszuführen:

1. Laden Sie den V8-Quellcode herunter, indem Sie den [Git-Anweisungen](/docs/source-code#using-git) folgen.
2. Die Anweisungen für dieses Hello-World-Beispiel wurden zuletzt mit V8 v13.1 getestet. Sie können diesen Branch mit `git checkout branch-heads/13.1 -b sample -t` auschecken.
3. Erstellen Sie mit dem Hilfsskript eine Build-Konfiguration:

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    Sie können die Build-Konfiguration inspizieren und manuell bearbeiten, indem Sie Folgendes ausführen:

    ```bash
    gn args out.gn/x64.release.sample
    ```

4. Bauen Sie die statische Bibliothek auf einem Linux-64-System:

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

5. Kompilieren Sie `hello-world.cc`, indem Sie mit der im Build-Prozess erstellten statischen Bibliothek verlinken. Zum Beispiel auf einem 64-bit-Linux-System mit dem GNU-Compiler und LLD-Linker:

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

6. Für komplexeren Code benötigt V8 eine ICU-Datendatei. Kopieren Sie diese Datei dorthin, wo Ihre Binärdatei gespeichert ist:

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

7. Führen Sie die `hello_world`-ausführbare Datei in der Befehlszeile aus. Zum Beispiel unter Linux im V8-Verzeichnis:

    ```bash
    ./hello_world
    ```

8. Es druckt `Hello, World!`. Yay!
   Hinweis: Ab November 2024 könnte es auch frühzeitig bei Prozessstart zu einem Segfault kommen. Die Untersuchung läuft noch. Wenn Sie darauf stoßen und herausfinden, was schief läuft, kommentieren Sie bitte [Issue 377222400](https://issues.chromium.org/issues/377222400) oder [reichen Sie einen Patch ein](https://v8.dev/docs/contribute).

Wenn Sie ein Beispiel suchen, das mit dem Hauptbranch synchron ist, sehen Sie sich die Datei [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc) an. Dies ist ein sehr einfaches Beispiel und Sie möchten wahrscheinlich mehr tun, als nur Scripts als Zeichenketten auszuführen. [Der fortgeschrittene Leitfaden weiter unten](#advanced-guide) enthält weitere Informationen für V8-Embedder.

## Weitere Beispielcodes

Die folgenden Beispiele sind Teil des Quellcodedownloads.

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

Dieses Beispiel liefert den erforderlichen Code, um eine hypothetische HTTP-Anfrage-Verarbeitungsanwendung — die z. B. Teil eines Webservers sein könnte — skriptfähig zu machen. Es nimmt ein JavaScript-Script als Argument, das eine Funktion namens `Process` bereitstellen muss. Die JavaScript-`Process`-Funktion kann beispielsweise verwendet werden, um Informationen zu sammeln, wie viele Zugriffe jede vom fiktiven Webserver bereitgestellte Seite erhält.

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

Dieses Beispiel nimmt Dateinamen als Argumente, liest und führt deren Inhalte aus. Es enthält auch eine Kommandozeile, an der Sie JavaScript-Codeausschnitte eingeben können, die dann ausgeführt werden. In diesem Beispiel werden auch zusätzliche Funktionen wie `print` durch die Verwendung von Objekt- und Funktionstemplates zu JavaScript hinzugefügt.

## Fortgeschrittener Leitfaden

Da Sie sich nun mit der Verwendung von V8 als eigenständige virtuelle Maschine und mit einigen Schlüsselkonzepten von V8 wie Handles, Scopes und Kontexten vertraut gemacht haben, lassen Sie uns diese Konzepte weiter vertiefen und einige weitere Konzepte vorstellen, die entscheidend für die Einbettung von V8 in eine eigene C++-Anwendung sind.

Die V8-API stellt Funktionen zum Kompilieren und Ausführen von Skripten, Zugreifen auf C++-Methoden und Datenstrukturen, Behandeln von Fehlern und Aktivieren von Sicherheitsprüfungen bereit. Ihre Anwendung kann V8 wie jede andere C++-Bibliothek verwenden. Ihr C++-Code greift über die V8-API auf V8 zu, indem die Header-Datei `include/v8.h` eingebunden wird.

### Handles und Garbage Collection

Ein Handle bietet einen Verweis auf den Speicherort eines JavaScript-Objekts im Heap. Der V8-Garbage-Collector gibt Speicher von Objekten frei, auf die nicht mehr zugegriffen werden kann. Während des Garbage-Collection-Prozesses verschiebt der Garbage-Collector häufig Objekte an andere Speicherorte im Heap. Wenn der Garbage-Collector ein Objekt verschiebt, aktualisiert er auch alle Handles, die auf das Objekt verweisen, mit dessen neuem Speicherort.

Ein Objekt wird als Garbage angesehen, wenn es von JavaScript aus nicht mehr erreichbar ist und keine Handles darauf verweisen. Von Zeit zu Zeit entfernt der Garbage-Collector alle Objekte, die als Garbage angesehen werden. Der Mechanismus der Garbage Collection ist entscheidend für die Leistung von V8.

Es gibt mehrere Arten von Handles:

- Lokale Handles werden auf einem Stapel gehalten und gelöscht, wenn der entsprechende Destruktor aufgerufen wird. Die Lebensdauer dieser Handles wird durch einen Handle-Bereich bestimmt, der häufig zu Beginn eines Funktionsaufrufs erstellt wird. Wenn der Bereich gelöscht wird, kann der Garbage-Collector die zuvor von Handles in diesem Bereich referenzierten Objekte freigeben, sofern sie nicht mehr von JavaScript oder anderen Handles aus zugänglich sind. Dieser Typ von Handle wird im obigen Hello-World-Beispiel verwendet.

    Lokale Handles haben die Klasse `Local<SomeType>`.

    **Hinweis:** Der Handle-Stapel ist nicht Teil des C++-Callstacks, aber die Handle-Bereiche sind in den C++-Stack eingebettet. Handle-Bereiche können nur auf dem Stapel, nicht mit `new` zugewiesen werden.

- Persistente Handles bieten wie ein lokales Handle einen Verweis auf ein im Heap zugewiesenes JavaScript-Objekt. Es gibt sie in zwei Varianten, die sich in der Verwaltung der Lebensdauer des Referenzobjekts unterscheiden. Verwenden Sie ein persistentes Handle, wenn Sie einen Verweis auf ein Objekt länger als einen Funktionsaufruf aufrechterhalten oder wenn die Lebensdauer von Handles nicht mit C++-Scopes übereinstimmt. Google Chrome verwendet beispielsweise persistente Handles, um auf DOM-Knoten (Document Object Model) zu verweisen. Ein persistentes Handle kann mit `PersistentBase::SetWeak` als schwach markiert werden, um einen Callback vom Garbage-Collector auszulösen, wenn die einzigen Referenzen auf ein Objekt von schwachen persistenten Handles stammen.

    - Ein `UniquePersistent<SomeType>`-Handle verwendet C++-Konstruktoren und Destruktoren zur Verwaltung der Lebensdauer des zugrunde liegenden Objekts.
    - Ein `Persistent<SomeType>` kann mit dessen Konstruktor erstellt werden, muss jedoch explizit mit `Persistent::Reset` gelöscht werden.

- Es gibt weitere, selten verwendete Handle-Typen, die hier nur kurz erwähnt werden:

    - `Eternal` ist ein persistentes Handle für JavaScript-Objekte, die voraussichtlich nie gelöscht werden. Es ist günstiger zu verwenden, da es den Garbage-Collector von der Bestimmung der Lebensfähigkeit dieses Objekts entlastet.
    - Sowohl `Persistent` als auch `UniquePersistent` können nicht kopiert werden, was sie als Werte in Standardbibliothekscontainern vor C++11 ungeeignet macht. `PersistentValueMap` und `PersistentValueVector` bieten Containerklassen für persistente Werte mit map- und vektorähnlicher Semantik. C++11-Einbettungen benötigen diese nicht, da C++11-Move-Semantiken das zugrunde liegende Problem lösen.

Natürlich kann die Erstellung eines lokalen Handles jedes Mal, wenn Sie ein Objekt erstellen, zu einer Vielzahl von Handles führen! Hier sind Handle-Bereiche sehr nützlich. Sie können sich einen Bereich als Container vorstellen, der viele Handles enthält. Wenn der Destruktor des Bereichs aufgerufen wird, werden alle innerhalb dieses Bereichs erstellten Handles aus dem Stapel entfernt. Wie zu erwarten ist, werden dadurch die Objekte, auf die die Handles zeigen, vom Garbage-Collector zur Löschung aus dem Heap freigegeben.

Zurück zu [unserem sehr einfachen Hello-World-Beispiel](#hello-world), im folgenden Diagramm sehen Sie den Handle-Stapel und die im Heap zugewiesenen Objekte. Beachten Sie, dass `Context::New()` ein `Local`-Handle zurückgibt und wir basierend darauf ein neues `Persistent`-Handle erstellen, um die Verwendung von persistenten Handles zu demonstrieren.

![](/_img/docs/embed/local-persist-handles-review.png)

Wenn der Destruktor `HandleScope::~HandleScope` aufgerufen wird, wird der Handle-Bereich gelöscht. Objekte, die durch Handles im gelöschten Handle-Bereich referenziert werden, sind bei der nächsten Garbage Collection zur Entfernung berechtigt, sofern keine anderen Referenzen zu ihnen vorhanden sind. Der Garbage Collector kann auch die Objekte `source_obj` und `script_obj` aus dem Heap entfernen, da sie nicht mehr von Handles referenziert oder anderweitig von JavaScript erreichbar sind. Da der Kontext-Handle ein persistenter Handle ist, wird er beim Verlassen des Handle-Bereichs nicht entfernt. Der einzige Weg, den Kontext-Handle zu entfernen, besteht darin, explizit `Reset` aufzurufen.

:::Hinweis
**Hinweis:** In diesem Dokument bezieht sich der Begriff „Handle“ auf ein lokales Handle. Beim Besprechen eines persistenten Handles wird dieser Begriff vollständig verwendet.
:::

Es ist wichtig, sich einer häufigen Falle in diesem Modell bewusst zu sein: *Sie können keinen lokalen Handle direkt aus einer Funktion zurückgeben, die einen Handle-Bereich deklariert.* Wenn Sie das tun, wird der lokale Handle, den Sie zurückgeben möchten, direkt vor dem Rückruf der Funktion durch den Destruktor des Handle-Bereichs gelöscht. Der richtige Weg, einen lokalen Handle zurückzugeben, besteht darin, einen `EscapableHandleScope` anstelle eines `HandleScope` zu erstellen und die Methode `Escape` des Handle-Bereichs aufzurufen, wobei der Handle übergeben wird, dessen Wert zurückgegeben werden soll. Hier ist ein Beispiel, wie das in der Praxis funktioniert:

```cpp
// Diese Funktion gibt ein neues Array mit drei Elementen x, y und z zurück.
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // Wir erstellen temporäre Handles, daher verwenden wir einen Handle-Bereich.
  v8::EscapableHandleScope handle_scope(isolate);

  // Erstellen Sie ein neues leeres Array.
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // Geben Sie ein leeres Ergebnis zurück, wenn ein Fehler beim Erstellen des Arrays aufgetreten ist.
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // Werte ausfüllen
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Geben Sie den Wert über Escape zurück.
  return handle_scope.Escape(array);
}
```

Die Methode `Escape` kopiert den Wert ihres Arguments in den umgebenden Bereich, löscht alle ihre lokalen Handles und gibt dann die neue Handle-Kopie zurück, die sicher zurückgegeben werden kann.

### Kontexte

In V8 ist ein Kontext eine Ausführungsumgebung, die es ermöglicht, separate, nicht miteinander verbundene JavaScript-Anwendungen in einer einzigen V8-Instanz auszuführen. Sie müssen explizit den Kontext angeben, in dem Sie JavaScript-Code ausführen möchten.

Warum ist dies notwendig? Weil JavaScript eine Reihe von eingebauten Dienstprogrammfunktionen und -objekten bereitstellt, die durch JavaScript-Code geändert werden können. Beispiel: Wenn zwei völlig voneinander getrennte JavaScript-Funktionen beide das globale Objekt auf die gleiche Weise ändern, dann sind unerwartete Ergebnisse ziemlich wahrscheinlich.

In Bezug auf CPU-Zeit und Speicher könnte es eine teure Operation sein, einen neuen Ausführungskontext zu erstellen, angesichts der Anzahl der eingebauten Objekte, die erstellt werden müssen. V8s umfangreiches Caching stellt jedoch sicher, dass, während der erste Kontext, den Sie erstellen, etwas teuer ist, nachfolgende Kontexte wesentlich günstiger sind. Dies liegt daran, dass der erste Kontext die eingebauten Objekte erstellen und den eingebauten JavaScript-Code analysieren muss, während nachfolgende Kontexte nur die eingebauten Objekte für ihren Kontext erstellen müssen. Mit der V8-Snapshot-Funktion (aktiviert mit der Build-Option `snapshot=yes`, was der Standard ist) wird die Zeit, die zur Erstellung des ersten Kontexts benötigt wird, stark optimiert, da ein Snapshot einen serialisierten Heap enthält, der bereits kompilierten Code für den eingebauten JavaScript-Code enthält. Zusammen mit der Garbage Collection ist V8s umfangreiches Caching auch ein Schlüssel zur Performance von V8.

Nachdem Sie einen Kontext erstellt haben, können Sie ihn beliebig oft betreten und verlassen. Während Sie sich in Kontext A befinden, können Sie auch einen anderen Kontext B betreten, wodurch Sie A als aktuellen Kontext durch B ersetzen. Beim Verlassen von B wird A wieder als aktueller Kontext hergestellt. Dies wird unten veranschaulicht:

![](/_img/docs/embed/intro-contexts.png)

Beachten Sie, dass die eingebauten Dienstprogrammfunktionen und -objekte jedes Kontexts getrennt gehalten werden. Beim Erstellen eines Kontexts können Sie optional ein Sicherheitstoken setzen. Weitere Informationen finden Sie im Abschnitt [Sicherheitsmodell](#security-model).

Der Grundgedanke der Verwendung von Kontexten in V8 war, dass jedes Fenster und jeder iframe in einem Browser seine eigene frische JavaScript-Umgebung haben kann.

### Templates

Ein Template ist eine Blaupause für JavaScript-Funktionen und -Objekte in einem Kontext. Sie können ein Template verwenden, um C++-Funktionen und Datenstrukturen in JavaScript-Objekte einzubinden, sodass sie von JavaScript-Skripten manipuliert werden können. Beispiel: Google Chrome verwendet Templates, um C++-DOM-Knoten als JavaScript-Objekte einzubinden und Funktionen im globalen Namespace zu installieren. Sie können eine Reihe von Templates erstellen und dann dieselben für jeden neuen Kontext verwenden, den Sie erstellen. Sie können so viele Templates haben, wie Sie benötigen. Allerdings können Sie nur eine Instanz eines Templates in einem bestimmten Kontext haben.

In JavaScript besteht eine starke Dualität zwischen Funktionen und Objekten. Um eine neue Art von Objekt in Java oder C++ zu erstellen, würden Sie normalerweise eine neue Klasse definieren. In JavaScript erstellen Sie stattdessen eine neue Funktion und erzeugen Instanzen, indem Sie die Funktion als Konstruktor verwenden. Das Layout und die Funktionalität eines JavaScript-Objekts sind eng mit der Funktion verbunden, die es erstellt hat. Dies spiegelt sich in der Funktionsweise von V8-Templates wider. Es gibt zwei Arten von Templates:

- Funktionstemplates

    Ein Funktionsvorlagen dient als Blaupause für eine einzelne Funktion. Sie erstellen eine JavaScript-Instanz der Vorlage, indem Sie die `GetFunction`-Methode der Vorlage im Kontext aufrufen, in dem Sie die JavaScript-Funktion instanziieren möchten. Sie können auch einen C++-Callback mit einer Funktionsvorlage verknüpfen, der aufgerufen wird, wenn die JavaScript-Funktionsinstanz aufgerufen wird.

- Objektvorlagen

    Jede Funktionsvorlage hat eine zugehörige Objektvorlage. Diese wird verwendet, um Objekte zu konfigurieren, die mit dieser Funktion als Konstruktor erstellt wurden. Sie können zwei Arten von C++-Callbacks mit Objektvorlagen verknüpfen:

    - Zugriffspunkte-Callbacks werden aufgerufen, wenn eine spezifische Objekt-Eigenschaft durch ein Skript zugegriffen wird
    - Abfang-Callbacks werden aufgerufen, wenn eine beliebige Objekt-Eigenschaft durch ein Skript zugegriffen wird

  [Accessoren](#accessors) und [Abfänger](#interceptors) werden später in diesem Dokument besprochen.

Der folgende Code bietet ein Beispiel für die Erstellung einer Vorlage für das globale Objekt und das Festlegen der integrierten globalen Funktionen.

```cpp
// Eine Vorlage für das globale Objekt erstellen und
// die integrierten globalen Funktionen festlegen.
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// Jeder Prozessor erhält seinen eigenen Kontext, sodass
// verschiedene Prozessoren sich nicht gegenseitig beeinflussen.
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

Dieser Beispielcode stammt aus `JsHttpProcessor::Initializer` im Beispiel `process.cc`.

### Accessoren

Ein Accessor ist ein C++-Callback, der einen Wert berechnet und zurückgibt, wenn eine Objekt-Eigenschaft durch ein JavaScript-Skript abgerufen wird. Accessoren werden über eine Objektvorlage konfiguriert, indem die Methode `SetAccessor` verwendet wird. Diese Methode nimmt den Namen der mit ihr verknüpften Eigenschaft und zwei Callbacks, die ausgeführt werden, wenn ein Skript versucht, die Eigenschaft zu lesen oder zu schreiben.

Die Komplexität eines Accessors hängt vom Typ der Daten ab, die manipuliert werden:

- [Zugriff auf statische globale Variablen](#accessing-static-global-variables)
- [Zugriff auf dynamische Variablen](#accessing-dynamic-variables)

### Zugriff auf statische globale Variablen

Angenommen, es gibt zwei C++-Integer-Variablen, `x` und `y`, die innerhalb eines Kontexts JavaScript als globale Variablen verfügbar gemacht werden sollen. Dazu müssen C++-Accessor-Funktionen aufgerufen werden, wann immer ein Skript diese Variablen liest oder schreibt. Diese Accessor-Funktionen konvertieren einen C++-Integer in einen JavaScript-Integer mit `Integer::New`, und konvertieren einen JavaScript-Integer in einen C++-Integer mit `Int32Value`. Ein Beispiel ist unten angegeben:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter sind so ähnlich, dass sie aus Gründen der Kürze weggelassen werden

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

Beachten Sie, dass die Objektvorlage im obigen Code zur gleichen Zeit wie der Kontext erstellt wird. Die Vorlage könnte im Voraus erstellt und dann für beliebig viele Kontexte verwendet werden.

### Zugriff auf dynamische Variablen

Im vorherigen Beispiel waren die Variablen statisch und global. Was ist, wenn die Daten, die manipuliert werden, dynamisch sind, wie es bei der DOM-Baumstruktur in einem Browser der Fall ist? Stellen wir uns vor, dass `x` und `y` Objektfelder in der C++-Klasse `Point` sind:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

Um beliebig viele C++-Instanzen von `point` für JavaScript verfügbar zu machen, müssen wir für jede C++-Instanz von `point` ein JavaScript-Objekt erstellen und eine Verbindung zwischen dem JavaScript-Objekt und der C++-Instanz herstellen. Dies geschieht mit externen Werten und internen Objektfeldern.

Zuerst erstellen Sie eine Objektvorlage für das `point`-Wrapper-Objekt:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

Jedes JavaScript-`point`-Objekt behält eine Referenz auf das C++-Objekt, für das es ein Wrapper ist, mit einem internen Feld. Diese Felder werden so genannt, weil sie nicht von JavaScript aus zugänglich sind, sondern nur von C++-Code. Ein Objekt kann beliebig viele interne Felder haben, die Anzahl der internen Felder wird auf der Objektvorlage wie folgt festgelegt:

```cpp
point_templ->SetInternalFieldCount(1);
```

Hier wird die Anzahl der internen Felder auf `1` gesetzt. Das bedeutet, dass das Objekt ein internes Feld mit einem Index von `0` besitzt, das auf ein C++-Objekt zeigt.

Fügen Sie die Accessoren `x` und `y` zur Vorlage hinzu:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

Als nächstes wird ein C++-Punkt durch Erstellen einer neuen Instanz der Vorlage umschlossen, und dann wird das interne Feld `0` auf einen externen Wrapper um den Punkt `p` gesetzt.

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

Das externe Objekt ist einfach ein Wrapper um einen `void*`. Externe Objekte können nur verwendet werden, um Referenzwerte in internen Feldern zu speichern. JavaScript-Objekte können nicht direkt auf C++-Objekte verweisen, daher wird der externe Wert als „Brücke“ verwendet, um von JavaScript nach C++ zu wechseln. In diesem Sinne sind externe Werte das Gegenteil von Handles, da Handles C++ ermöglichen, Referenzen auf JavaScript-Objekte zu erstellen.

Hier ist die Definition der `get`- und `set`-Zugriffsmethoden für `x`, die Definitionen der `y`-Zugriffsmethoden sind identisch, außer dass `y` `x` ersetzt:

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

Zugriffsmethoden extrahieren die Referenz auf das `point`-Objekt, das durch das JavaScript-Objekt umschlossen wurde, und lesen und schreiben dann das zugehörige Feld. Auf diese Weise können diese generischen Zugriffsmethoden auf eine beliebige Anzahl umschlossener Punktobjekte angewendet werden.

### Interceptoren

Sie können auch einen Callback angeben, der immer dann ausgelöst wird, wenn ein Skript eine Objekteigenschaft zugreift. Diese werden Abfangmethoden genannt. Aus Effizienzgründen gibt es zwei Arten von Abfangmethoden:

- *Benannte Eigenschaftsabfangmethoden* - werden aufgerufen, wenn auf Eigenschaften mit Zeichenfolkennamen zugegriffen wird. Ein Beispiel hierfür in einer Browserumgebung ist `document.theFormName.elementName`.
- *Indizierte Eigenschaftsabfangmethoden* - werden aufgerufen, wenn auf indizierte Eigenschaften zugegriffen wird. Ein Beispiel hierfür in einer Browserumgebung ist `document.forms.elements[0]`.

Das Beispiel `process.cc`, das mit dem V8-Quellcode bereitgestellt wird, enthält ein Beispiel für die Verwendung von Abfangmethoden. In folgendem Code-Snippet gibt `SetNamedPropertyHandler` die Abfangmethoden `MapGet` und `MapSet` an:

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

Der `MapGet`-Abfangmethode ist unten angegeben:

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // Holen Sie sich die Map, die durch dieses Objekt umschlossen wurde.
  map<string, string> *obj = UnwrapMap(info.Holder());

  // Konvertieren Sie die JavaScript-Zeichenfolge in eine std::string.
  string key = ObjectToString(name);

  // Suchen Sie den Wert, falls er existiert, anhand der Standard-STL-Idiomatik.
  map<string, string>::iterator iter = obj->find(key);

  // Wenn der Schlüssel nicht vorhanden ist, geben Sie einen leeren Handle als Signal zurück.
  if (iter == obj->end()) return;

  // Andernfalls holen Sie den Wert und umschließen ihn in einer JavaScript-Zeichenfolge.
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

Ähnlich wie bei Zugriffsmethoden werden die angegebenen Rückrufe jedes Mal aufgerufen, wenn eine Eigenschaft zugegriffen wird. Der Unterschied zwischen Zugriffs- und Abfangmethoden besteht darin, dass Abfangmethoden alle Eigenschaften behandeln, während Zugriffsmethoden mit einer bestimmten Eigenschaft verknüpft sind.

### Sicherheitsmodell

Die „Same-Origin-Policy“ (erstmals eingeführt mit Netscape Navigator 2.0) verhindert, dass ein Dokument oder Skript, das von einer bestimmten „Herkunft“ geladen wurde, Eigenschaften eines Dokuments von einer anderen „Herkunft“ lesen oder setzen kann. Der Begriff Herkunft wird hier als Kombination aus Domainname (z. B. `www.example.com`), Protokoll (z. B. `https`) und Port definiert. Zum Beispiel ist `www.example.com:81` nicht dieselbe Herkunft wie `www.example.com`. Alle drei müssen übereinstimmen, damit zwei Webseiten als gleiche Herkunft betrachtet werden. Ohne diesen Schutz könnte eine böswillige Webseite die Integrität einer anderen Webseite gefährden.

In V8 wird eine „Herkunft“ als ein Kontext definiert. Der Zugriff auf jeden anderen Kontext als den, von dem aus Sie aufrufen, ist standardmäßig nicht erlaubt. Um auf einen anderen Kontext als den aufzurufen, von dem aus Sie aufrufen, müssen Sie Sicherheitstoken oder Sicherheitsrückrufe verwenden. Ein Sicherheitstoken kann jeder beliebige Wert sein, wird jedoch typischerweise als Symbol dargestellt, eine kanonische Zeichenfolge, die sonst nirgends existiert. Sie können bei der Einrichtung eines Kontexts optional ein Sicherheitstoken mit `SetSecurityToken` angeben. Wenn Sie kein Sicherheitstoken angeben, generiert V8 automatisch eines für den Kontext, den Sie erstellen.

Wenn versucht wird, auf eine globale Variable zuzugreifen, überprüft das V8-Sicherheitssystem zunächst das Sicherheitstoken des globalen Objekts, auf das zugegriffen werden soll, im Vergleich zu dem Sicherheitstoken des Codes, der versucht, darauf zuzugreifen. Wenn die Tokens übereinstimmen, wird der Zugriff gewährt. Wenn die Tokens nicht übereinstimmen, führt V8 einen Rückruf aus, um zu prüfen, ob der Zugriff erlaubt werden sollte. Sie können festlegen, ob der Zugriff auf ein Objekt erlaubt sein soll, indem Sie den Sicherheitsrückruf für das Objekt mit der Methode `SetAccessCheckCallbacks` auf Objektvorlagen einrichten. Das V8-Sicherheitssystem kann dann den Sicherheitsrückruf des Objekts abrufen und ausführen, um zu überprüfen, ob ein anderer Kontext darauf zugreifen darf. Dieser Rückruf erhält das Objekt, auf das zugegriffen wird, den Namen der zugreifenden Eigenschaft, die Art des Zugriffs (z. B. Lesen, Schreiben oder Löschen) und gibt zurück, ob der Zugriff erlaubt wird oder nicht.

Dieser Mechanismus ist in Google Chrome implementiert, sodass im Falle nicht übereinstimmender Sicherheitstokens ein spezieller Rückruf verwendet wird, der nur den Zugriff auf die folgenden Elemente erlaubt: `window.focus()`, `window.blur()`, `window.close()`, `window.location`, `window.open()`, `history.forward()`, `history.back()`, und `history.go()`.

### Ausnahmen

V8 löst eine Ausnahme aus, wenn ein Fehler auftritt — zum Beispiel, wenn ein Skript oder eine Funktion versucht, auf eine nicht vorhandene Eigenschaft zuzugreifen, oder wenn eine Funktion aufgerufen wird, die keine Funktion ist.

V8 gibt einen leeren Handle zurück, wenn eine Operation nicht erfolgreich war. Es ist daher wichtig, dass Ihr Code überprüft, ob ein Rückgabewert kein leerer Handle ist, bevor die Ausführung fortgesetzt wird. Überprüfen Sie mit der öffentlichen Memberfunktion `IsEmpty()` der Klasse `Local` auf einen leeren Handle.

Sie können Ausnahmen mit `TryCatch` abfangen, zum Beispiel:

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Ausnahme: %s\n", *exception_str);
  // ...
}
```

Wenn der zurückgegebene Wert ein leerer Handle ist und Sie keinen `TryCatch` eingerichtet haben, muss Ihr Code abbrechen. Falls Sie jedoch einen `TryCatch` eingerichtet haben, wird die Ausnahme abgefangen und Ihr Code kann weiterhin verarbeitet werden.

### Vererbung

JavaScript ist eine objektorientierte Sprache ohne Klassen und verwendet daher prototypale Vererbung anstelle von klassischer Vererbung. Dies kann für Programmierer, die in konventionellen objektorientierten Sprachen wie C++ und Java geschult wurden, verwirrend sein.

Klassifikationsbasierte objektorientierte Sprachen wie Java und C++ beruhen auf dem Konzept zweier unterschiedlicher Entitäten: Klassen und Instanzen. JavaScript ist eine prototypbasierte Sprache und macht diese Unterscheidung nicht: Es gibt einfach Objekte. JavaScript unterstützt nativ keine Deklaration von Klassenhierarchien. Der Prototyp-Mechanismus von JavaScript erleichtert jedoch das Hinzufügen benutzerdefinierter Eigenschaften und Methoden zu allen Instanzen eines Objekts. In JavaScript können Sie benutzerdefinierte Eigenschaften zu Objekten hinzufügen. Zum Beispiel:

```js
// Ein Objekt namens `bicycle` erstellen.
function bicycle() {}
// Eine Instanz von `bicycle` namens `roadbike` erstellen.
var roadbike = new bicycle();
// Eine benutzerdefinierte Eigenschaft `wheels` für `roadbike` definieren.
roadbike.wheels = 2;
```

Eine auf diese Weise hinzugefügte benutzerdefinierte Eigenschaft existiert nur für diese Instanz des Objekts. Wenn wir eine weitere Instanz von `bicycle()` erstellen, zum Beispiel `mountainbike`, würde `mountainbike.wheels` `undefined` zurückgeben, sofern die Eigenschaft `wheels` nicht explizit hinzugefügt wird.

Manchmal ist genau das erforderlich, andere Male wäre es hilfreich, die benutzerdefinierte Eigenschaft allen Instanzen eines Objekts hinzuzufügen — schließlich haben alle Fahrräder Räder. Hier ist das Prototyp-Objekt von JavaScript sehr nützlich. Um das Prototyp-Objekt zu verwenden, verweisen Sie auf das Schlüsselwort `prototype` des Objekts, bevor Sie die benutzerdefinierte Eigenschaft wie folgt hinzufügen:

```js
// Zuerst das „bicycle“-Objekt erstellen
function bicycle() {}
// Die Eigenschaft `wheels` dem Prototyp des Objekts zuweisen
bicycle.prototype.wheels = 2;
```

Alle Instanzen von `bicycle()` verfügen nun über die Eigenschaft `wheels`, die von Anfang an in ihnen eingebaut ist.

Dieselbe Vorgehensweise wird in V8 mit Templates angewendet. Jedes `FunctionTemplate` verfügt über eine `PrototypeTemplate`-Methode, die eine Vorlage für den Prototyp der Funktion bereitstellt. Sie können Eigenschaften festlegen und C++-Funktionen mit diesen Eigenschaften auf einer `PrototypeTemplate` verknüpfen, die anschließend bei allen Instanzen der entsprechenden `FunctionTemplate`-Funktion vorhanden sind. Zum Beispiel:

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

Dies bewirkt, dass alle Instanzen von `biketemplate` eine `wheels`-Methode in ihrer Prototyp-Kette haben, die beim Aufruf dazu führt, dass die C++-Funktion `MyWheelsMethodCallback` aufgerufen wird.

Die `FunctionTemplate`-Klasse von V8 stellt die öffentliche Memberfunktion `Inherit()` bereit, die Sie aufrufen können, wenn Sie möchten, dass eine Funktionstemplate von einer anderen Funktionstemplate erbt, wie folgt:

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
