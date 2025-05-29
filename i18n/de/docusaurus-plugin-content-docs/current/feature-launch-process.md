---
title: "Implementierung und Auslieferung von JavaScript/WebAssembly-Sprachfunktionen"
description: "Dieses Dokument erklärt den Prozess der Implementierung und Auslieferung von JavaScript- oder WebAssembly-Sprachfunktionen in V8."
---
Im Allgemeinen folgt V8 dem [Blink Intent-Prozess für bereits definierte konsensbasierte Standards](https://www.chromium.org/blink/launching-features/#process-existing-standard) für JavaScript- und WebAssembly-Sprachfunktionen. V8-spezifische Ergänzungen sind unten aufgeführt. Bitte folgen Sie dem Blink Intent-Prozess, sofern die Ergänzungen nichts anderes vorsehen.

Wenn Sie Fragen zu diesem Thema bezüglich JavaScript-Funktionen haben, senden Sie bitte eine E-Mail an [syg@chromium.org](mailto:syg@chromium.org) und [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

Für WebAssembly-Funktionen senden Sie bitte eine E-Mail an [gdeepti@chromium.org](mailto:gdeepti@chromium.org) und [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

## Ergänzungen

### JavaScript-Funktionen warten normalerweise bis zur Stufe 3+

Als Faustregel wartet V8 mit der Implementierung von JavaScript-Funktionsvorschlägen, bis diese auf [Stufe 3 oder später in TC39](https://tc39.es/process-document/) vorankommen. TC39 hat seinen eigenen Konsensprozess, und Stufe 3 oder später signalisiert expliziten Konsens unter TC39-Delegierten, einschließlich aller Browser-Anbieter, dass ein Funktionsvorschlag bereit für die Implementierung ist. Dieser externe Konsensprozess bedeutet, dass Stufe 3+-Funktionen keine Intent-E-Mails außer Intent to Ship senden müssen.

### TAG-Überprüfung

Für kleinere JavaScript- oder WebAssembly-Funktionen ist eine TAG-Überprüfung nicht erforderlich, da TC39 und die Wasm CG bereits eine erhebliche technische Aufsicht bieten. Wenn die Funktion groß oder systemübergreifend ist (z. B. Änderungen an anderen Webplattform-APIs oder Modifikationen an Chromium erforderlich macht), wird eine TAG-Überprüfung empfohlen.

### Sowohl V8- als auch Blink-Flags sind erforderlich

Bei der Implementierung einer Funktion sind sowohl ein V8-Flag als auch eine Blink `base::Feature` erforderlich.

Blink-Funktionen sind erforderlich, damit Chrome Funktionen in Notfallsituationen deaktivieren kann, ohne neue Binärdateien zu verteilen. Dies wird normalerweise in [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h), [`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc) und [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc) implementiert.

### Fuzzing ist erforderlich, um auszuliefern

JavaScript- und WebAssembly-Funktionen müssen mindestens 4 Wochen oder einen (1) Veröffentlichungssprung gefuzzt werden, wobei alle Fuzzing-Fehler behoben sein müssen, bevor sie ausgeliefert werden können.

Für fertig programmierte JavaScript-Funktionen starten Sie das Fuzzing, indem Sie die Funktionsflagge in die `JAVASCRIPT_STAGED_FEATURES_BASE`-Makros in [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h) verschieben.

Für WebAssembly siehe die [WebAssembly-Auslieferungscheckliste](/docs/wasm-shipping-checklist).

### [Chromestatus](https://chromestatus.com/) und Prüfungs-Gates

Der Blink Intent-Prozess umfasst eine Reihe von Prüfungs-Gates, die auf dem Eintrag einer Funktion in [Chromestatus](https://chromestatus.com/) genehmigt werden müssen, bevor ein Intent to Ship zur Genehmigung durch API-Besitzer versendet wird.

Diese Gates sind auf Web-APIs zugeschnitten, und einige Gates sind möglicherweise nicht auf JavaScript- und WebAssembly-Funktionen anwendbar. Nachfolgend finden Sie allgemeine Hinweise. Die Einzelheiten variieren von Funktion zu Funktion; wenden Sie die Hinweise nicht blind an!

#### Datenschutz

Die meisten JavaScript- und WebAssembly-Funktionen haben keinen Einfluss auf den Datenschutz. In seltenen Fällen können Funktionen neue Fingerabdrucksvektoren hinzufügen, die Informationen über das Betriebssystem oder die Hardware eines Benutzers offenlegen.

#### Sicherheit

Obwohl JavaScript und WebAssembly häufige Angriffsvektoren in Sicherheitslücken sind, fügen die meisten neuen Funktionen keine zusätzliche Angriffsfläche hinzu. [Fuzzing](#fuzzing) ist erforderlich und mindert einige der Risiken.

Funktionen, die bekannte beliebte Angriffsvektoren betreffen, wie `ArrayBuffer`s in JavaScript, und Funktionen, die Seitenkanalangriffe ermöglichen könnten, müssen einer zusätzlichen Prüfung unterzogen und überprüft werden.

#### Unternehmen

Im Rahmen ihres Standardisierungsprozesses in TC39 und der Wasm CG werden JavaScript- und WebAssembly-Funktionen bereits einer intensiven Überprüfung der Abwärtskompatibilität unterzogen. Es ist äußerst selten, dass Funktionen absichtlich nicht abwärtskompatibel sind.

Für JavaScript können kürzlich ausgelieferte Funktionen auch über `chrome://flags/#disable-javascript-harmony-shipping` deaktiviert werden.

#### Debugging-Fähigkeit

Die Debugging-Fähigkeit von JavaScript- und WebAssembly-Funktionen unterscheidet sich erheblich von Funktion zu Funktion. JavaScript-Funktionen, die nur neue integrierte Methoden hinzufügen, benötigen keine zusätzliche Debugger-Unterstützung, während WebAssembly-Funktionen, die neue Fähigkeiten hinzufügen, möglicherweise erhebliche zusätzliche Debugger-Unterstützung benötigen.

Weitere Einzelheiten finden Sie in der [JavaScript-Funktions-Debugging-Checkliste](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) und der [WebAssembly-Funktions-Debugging-Checkliste](https://goo.gle/devtools-wasm-checklist).

Im Zweifelsfall ist dieses Gateway anwendbar.

#### Testen

Anstelle von WPT sind Test262-Tests ausreichend für JavaScript-Funktionen, und WebAssembly-Spezifikationstests sind ausreichend für WebAssembly-Funktionen.

Das Hinzufügen von Web Platform Tests (WPT) ist nicht erforderlich, da JavaScript- und WebAssembly-Sprachfunktionen über ihre eigenen interoperablen Testrepositories verfügen, die von mehreren Implementierungen ausgeführt werden. Sie können jedoch gerne einige hinzufügen, wenn Sie glauben, dass es vorteilhaft ist.

Für JavaScript-Funktionen sind explizite Korrektheitstests in [Test262](https://github.com/tc39/test262) erforderlich. Beachten Sie, dass Tests im [Staging-Verzeichnis](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging) ausreichen.

Für WebAssembly-Funktionen sind explizite Korrektheitstests im [WebAssembly Spec Test Repo](https://github.com/WebAssembly/spec/tree/master/test) erforderlich.

Für Leistungstests liegt JavaScript bereits den meisten bestehenden Leistungsbenchmarks zugrunde, wie etwa Speedometer.

### Wen man in CC setzen sollte

**Jede** „Absicht zu `$etwas`“-E-Mail (z. B. „Absicht zu implementieren“) sollte zusätzlich zu [blink-dev@chromium.org](mailto:blink-dev@chromium.org) auch [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) in CC setzen. Auf diese Weise bleiben auch andere V8-Einbettungen auf dem Laufenden.

### Link zum Spezifikations-Repository

Der Blink Intent-Prozess erfordert eine Erklärung. Anstatt ein neues Dokument zu schreiben, können Sie stattdessen gerne auf das jeweilige Spezifikations-Repository verlinken (z. B. [`import.meta`](https://github.com/tc39/proposal-import-meta)).
