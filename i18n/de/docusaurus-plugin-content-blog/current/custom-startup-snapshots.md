---
title: "Benutzerdefinierte Start-Snapshots"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), Software Engineer und Lieferant von Motorvorwärmern"
avatars: 
  - "yang-guo"
date: "2015-09-25 13:33:37"
tags: 
  - internals
description: "V8-Embeds können Snapshots nutzen, um die Startzeit zu überspringen, die durch die Initialisierungen von JavaScript-Programmen verursacht wird."
---
Die JavaScript-Spezifikation enthält viele eingebaute Funktionen, von [Mathematikfunktionen](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math) bis hin zu einer [voll ausgestatteten regulären Ausdrucksengine](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions). Jede neu erstellte V8-Umgebung hat diese Funktionen von Anfang an verfügbar. Damit dies funktioniert, müssen das globale Objekt (z. B. das Fensterobjekt in einem Browser) und alle eingebauten Funktionen eingerichtet und initialisiert werden, um in den V8-Heap aufgenommen zu werden, sobald die Umgebung erstellt wird. Es dauert eine ganze Weile, dies von Grund auf neu zu tun.

<!--truncate-->
Glücklicherweise verwendet V8 eine Abkürzung, um die Dinge zu beschleunigen: ähnlich wie das Auftauen einer Tiefkühlpizza für ein schnelles Abendessen, deserialisieren wir einen zuvor vorbereiteten Snapshot direkt in den Heap, um eine initialisierte Umgebung zu erhalten. Auf einem normalen Desktop-Computer kann die Zeit zur Erstellung einer Umgebung von 40 ms auf weniger als 2 ms reduziert werden. Auf einem durchschnittlichen Mobiltelefon könnte dies einen Unterschied zwischen 270 ms und 10 ms bedeuten.

Anwendungen außer Chrome, die V8 einbetten, können mehr als reines JavaScript erfordern. Viele laden zusätzliche Bibliotheksskripte beim Start, bevor die „eigentliche“ Anwendung ausgeführt wird. Zum Beispiel müsste eine einfache TypeScript-VM, die auf V8 basiert, den TypeScript-Compiler beim Start laden, um TypeScript-Quellcode on-the-fly in JavaScript zu übersetzen.

Seit der Veröffentlichung von V8 v4.3 vor zwei Monaten können Embeds Snapshots nutzen, um die Startzeit zu überspringen, die durch eine solche Initialisierung verursacht wird. Der [Testfall](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661) für diese Funktion zeigt, wie diese API funktioniert.

Um einen Snapshot zu erstellen, können wir `v8::V8::CreateSnapshotDataBlob` mit dem einzubettenden Skript als nullterminierten C-String aufrufen. Nach der Erstellung einer neuen Umgebung wird dieses Skript kompiliert und ausgeführt. In unserem Beispiel erstellen wir zwei benutzerdefinierte Start-Snapshots, die jeweils Funktionen definieren, die über das, was JavaScript bereits eingebaut hat, hinausgehen.

Wir können dann `v8::Isolate::CreateParams` verwenden, um eine neu erstellte Isolation so zu konfigurieren, dass sie Umgebungen aus einem benutzerdefinierten Start-Snapshot initialisiert. Umgebungen, die in dieser Isolation erstellt werden, sind exakte Kopien derjenigen, aus der wir einen Snapshot erstellt haben. Die im Snapshot definierten Funktionen stehen zur Verfügung, ohne dass sie erneut definiert werden müssen.

Es gibt eine wichtige Einschränkung dabei: Der Snapshot kann nur den V8-Heap erfassen. Jegliche Interaktion von V8 mit der Außenwelt ist bei der Erstellung des Snapshots unzulässig. Zu solchen Interaktionen gehören:

- Die Definition und der Aufruf von API-Rückrufen (d. h. Funktionen, die über `v8::FunctionTemplate` erstellt wurden)
- Die Erstellung von typisierten Arrays, da der Speicherpuffer möglicherweise außerhalb von V8 zugewiesen wird

Und natürlich sind Werte, die aus Quellen wie `Math.random` oder `Date.now` abgeleitet wurden, festgelegt, sobald der Snapshot erfasst wurde. Sie sind nicht mehr wirklich zufällig und spiegeln auch nicht die aktuelle Zeit wider.

Abgesehen von diesen Einschränkungen bleiben Start-Snapshots eine großartige Möglichkeit, Zeit bei der Initialisierung zu sparen. In unserem obigen Beispiel können wir 100 ms von der Startzeit einsparen, die für das Laden des TypeScript-Compilers auf einem normalen Desktop-Computer aufgewendet wurde. Wir freuen uns, zu sehen, wie Sie benutzerdefinierte Snapshots einsetzen könnten!
