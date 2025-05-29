---
title: "Blitzschnelles Parsing, Teil 1: Optimierung des Scanners"
author: "Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)), aufsehenerregender Optimierer"
avatars:
  - "toon-verwaest"
date: 2019-03-25 13:33:37
tags:
  - internals
  - parsing
tweet: "1110205101652787200"
description: "Der Grundstein für die Parser-Leistung ist ein schneller Scanner. Dieser Artikel erklärt, wie der JavaScript-Scanner von V8 kürzlich bis zu 2,1× schneller wurde."
---
Um ein JavaScript-Programm auszuführen, muss der Quelltext verarbeitet werden, damit V8 ihn verstehen kann. V8 beginnt damit, den Quelltext in einen abstrakten Syntaxbaum (AST) zu parsen, eine Menge von Objekten, die die Programmstruktur darstellen. Dieser AST wird von Ignition zu Bytecode kompiliert. Die Leistung dieser Parse- und Kompilierungsphasen ist entscheidend: V8 kann keinen Code ausführen, bevor die Kompilierung abgeschlossen ist. In dieser Blogserie konzentrieren wir uns auf das Parsing und die Arbeit, die in V8 geleistet wurde, um einen blitzschnellen Parser bereitzustellen.

<!--truncate-->
Tatsächlich beginnen wir die Serie eine Stufe vor dem Parser. Der Parser von V8 verarbeitet ‚Tokens‘, die vom ‚Scanner‘ bereitgestellt werden. Tokens sind Blöcke aus einem oder mehreren Zeichen, die eine einzige semantische Bedeutung haben: ein String, ein Bezeichner, ein Operator wie `++`. Der Scanner erstellt diese Tokens, indem er aufeinanderfolgende Zeichen aus einem zugrunde liegenden Zeichenstrom kombiniert.

Der Scanner verarbeitet einen Strom aus Unicode-Zeichen. Diese Unicode-Zeichen werden immer aus einem Strom von UTF-16-Codeeinheiten dekodiert. Es wird nur eine einzige Codierung unterstützt, um das Verzweigen oder Spezialisieren des Scanners und Parsers für verschiedene Codierungen zu vermeiden. Wir haben uns für UTF-16 entschieden, da dies die Codierung von JavaScript-Strings ist und Quellpositionsangaben relativ zu dieser Codierung bereitgestellt werden müssen. Der [`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46) stellt eine (möglicherweise gepufferte) UTF-16-Ansicht über die zugrunde liegende Latin1-, UTF-8- oder UTF-16-Codierung bereit, die V8 von Chrome erhält, das wiederum Daten aus dem Netzwerk empfängt. Zusätzlich zur Unterstützung mehrerer Codierungen erlaubt die Trennung von Scanner und Zeichenstrom V8, transparent so zu scannen, als wäre der gesamte Quelltext verfügbar, selbst wenn bisher nur ein Teil der Daten über das Netzwerk eingegangen ist.

![](/_img/scanner/overview.svg)

Die Schnittstelle zwischen Scanner und Zeichenstrom ist eine Methode namens [`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54), die entweder die nächste UTF-16-Codeeinheit oder `-1` zurückgibt, um das Ende der Eingabe zu kennzeichnen. UTF-16 kann nicht jedes Unicode-Zeichen in einer einzigen Codeeinheit codieren. Zeichen außerhalb der [Basic Multilingual Plane](https://de.wikipedia.org/wiki/Ebene_(Unicode)#Basic_Multilingual_Plane) werden als zwei Codeeinheiten codiert, sogenannte Surrogatpaare. Der Scanner arbeitet jedoch mit Unicode-Zeichen anstelle von UTF-16-Codeeinheiten, daher wird diese Low-Level-Stream-Schnittstelle in einer Methode namens [`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569) gekapselt, die UTF-16-Codeeinheiten in vollständige Unicode-Zeichen dekodiert. Das aktuell dekodierte Zeichen wird gepuffert und von Scan-Methoden wie [`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775) verarbeitet.

Der Scanner [wählt](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=422) eine spezifische Scanner-Methode oder ein Token basierend auf einer maximalen Vorschau von 4 Zeichen, der längsten mehrdeutigen Zeichenfolge in JavaScript[^1]. Sobald eine Methode wie `ScanString` ausgewählt wurde, verarbeitet sie die verbleibenden Zeichen für dieses Token und puffert das erste Zeichen, das nicht Teil des Tokens ist, für das nächste gescannte Token. Im Fall von `ScanString` kopiert sie außerdem die gescannten Zeichen in einen Puffer, der in Latin1 oder UTF-16 codiert ist, während Escape-Sequenzen dekodiert werden.

[^1]: `<!--` ist der Beginn eines HTML-Kommentars, wohingegen `<!-` als „Kleiner als“, „Nicht“, „Minus“ gescannt wird.

## Leerzeichen

Token können durch verschiedene Arten von Leerzeichen getrennt werden, z. B. Zeilenumbruch, Leerzeichen, Tabulator, einzeilige Kommentare, mehrzeilige Kommentare usw. Eine Art von Leerzeichen kann von anderen Arten von Leerzeichen gefolgt werden. Leerzeichen fügen Bedeutung hinzu, wenn sie einen Zeilenumbruch zwischen zwei Token verursachen, was möglicherweise zu [automatischer Semikolon-Einfügung](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion) führt. Daher wird vor dem Scannen des nächsten Tokens sämtliches Leerzeichen übersprungen, wobei beachtet wird, ob ein Zeilenumbruch aufgetreten ist. Der größte Teil des in der Praxis verwendeten JavaScript-Codes ist minimiert, sodass mehrzeichenreiche Leerzeichen glücklicherweise nicht sehr häufig vorkommen. Aus diesem Grund scannt V8 einheitlich jede Art von Leerzeichen unabhängig, als ob es sich um reguläre Token handeln würde. Wenn z. B. das erste Token-Zeichen „/“ ist und von einem weiteren „/“ gefolgt wird, scannt V8 dies als einzeiligen Kommentar, der `Token::WHITESPACE` zurückgibt. Diese Schleife fährt einfach mit dem Scannen der Token [fort](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671), bis wir ein anderes Token als `Token::WHITESPACE` finden. Das bedeutet, dass wir, wenn das nächste Token nicht von Leerzeichen vorausgegangen wird, sofort mit dem Scannen des relevanten Tokens beginnen, ohne explizit auf Leerzeichen prüfen zu müssen.

Die Schleife selbst fügt jedoch jedem gescannten Token einen Overhead hinzu: Sie erfordert einen Verzweigungsbefehl, um das Token zu überprüfen, das wir gerade gescannt haben. Es wäre besser, die Schleife nur dann fortzusetzen, wenn das gerade gescannte Token ein `Token::WHITESPACE` sein könnte. Andernfalls sollten wir die Schleife einfach verlassen. Wir erreichen dies, indem wir die Schleife selbst in eine separate [Hilfsmethode](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178) verschieben, aus der wir sofort zurückkehren, wenn wir sicher sind, dass das Token kein `Token::WHITESPACE` ist. Auch wenn solche Änderungen klein erscheinen mögen, eliminieren sie den Overhead für jedes gescannte Token. Dies macht insbesondere bei sehr kurzen Token wie Satzzeichen einen Unterschied:

![](/_img/scanner/punctuation.svg)

## Scannen von Bezeichnern

Das komplizierteste, aber auch häufigste Token ist das [Bezeichner](https://tc39.es/ecma262/#prod-Identifier)-Token, das für Variablennamen (unter anderem) in JavaScript verwendet wird. Bezeichner beginnen mit einem Unicode-Zeichen mit der Eigenschaft [`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807), gefolgt von einer optionalen Zeichenfolge mit der Eigenschaft [`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947). Es ist recht kostenintensiv zu prüfen, ob ein Unicode-Zeichen die Eigenschaft `ID_Start` oder `ID_Continue` hat. Indem wir eine Cache-Zuordnung von Zeichen zu Eigenschaften einfügen, können wir dies etwas beschleunigen.

Die meisten JavaScript-Quellcodes werden jedoch mit ASCII-Zeichen geschrieben. Von den Zeichen im ASCII-Bereich sind nur `a-z`, `A-Z`, `$` und `_` Bezeichner-Startzeichen. `ID_Continue` umfasst zusätzlich `0-9`. Wir beschleunigen das Scannen von Bezeichnern, indem wir eine Tabelle mit Flags für jedes der 128 ASCII-Zeichen erstellen, die anzeigen, ob das Zeichen ein `ID_Start`-, ein `ID_Continue`-Zeichen usw. ist. Solange sich die betrachteten Zeichen im ASCII-Bereich befinden, schauen wir in dieser Tabelle nach den jeweiligen Flags und überprüfen eine Eigenschaft mit einer einzigen Verzweigung. Zeichen gehören so lange zum Bezeichner, bis wir das erste Zeichen sehen, das nicht die Eigenschaft `ID_Continue` besitzt.

Alle Verbesserungen, die in diesem Beitrag erwähnt werden, summieren sich zur folgenden Differenz in der Leistung des Scannens von Bezeichnern:

![](/_img/scanner/identifiers-1.svg)

Es erscheint möglicherweise kontraintuitiv, dass längere Bezeichner schneller gescannt werden. Das könnte Sie dazu verleiten zu denken, dass es für die Leistung vorteilhaft ist, die Länge des Bezeichners zu erhöhen. Das Scannen längerer Bezeichner ist einfach deshalb schneller in MB/s, weil wir uns länger in einer sehr engen Schleife befinden, ohne zum Parser zurückzukehren. Was für die Leistung Ihrer Anwendung jedoch wichtig ist, ist, wie schnell wir vollständige Token scannen können. Die folgende Grafik zeigt grob die Anzahl der Token, die pro Sekunde relativ zur Token-Länge gescannt werden:

![](/_img/scanner/identifiers-2.svg)

Hier wird deutlich, dass die Verwendung kürzerer Bezeichner für die Leistung des Parsers Ihrer Anwendung vorteilhaft ist: Wir können mehr Token pro Sekunde scannen. Das bedeutet, dass Seiten, die wir scheinbar schneller in MB/s parsen, einfach eine geringere Informationsdichte haben und tatsächlich weniger Token pro Sekunde produzieren.

## Internalisierung minimierter Bezeichner

Alle Zeichenkettenliterale und Bezeichner werden an der Grenze zwischen Scanner und Parser dedupliziert. Wenn der Parser den Wert einer Zeichenkette oder eines Bezeichners anfordert, erhält er für jeden möglichen Literalwert ein eindeutiges Zeichenkettenobjekt. Dies erfordert in der Regel ein Nachschlagen in einer Hashtabelle. Da JavaScript-Code häufig minimiert ist, verwendet V8 eine einfache Nachschlagetabelle für einzelne ASCII-Zeichenketten.

## Schlüsselwörter

Schlüsselwörter sind eine spezielle Teilmenge von Bezeichnern, die von der Sprache definiert sind, z. B. `if`, `else` und `function`. Der Scanner von V8 gibt für Schlüsselwörter andere Token zurück als für Bezeichner. Nach dem Scannen eines Bezeichners müssen wir erkennen, ob der Bezeichner ein Schlüsselwort ist. Da alle Schlüsselwörter in JavaScript nur Kleinbuchstaben `a-z` enthalten, halten wir auch Flags vor, die anzeigen, ob ASCII-Zeichen mögliche Schlüsselwort-Start- und -Fortsetzungszeichen sind.

Wenn ein Bezeichner gemäß den Flags ein Schlüsselwort sein kann, könnten wir durch Umschalten des ersten Zeichens des Bezeichners eine Teilmenge von Schlüsselwort-Kandidaten finden. Es gibt mehr unterschiedliche Anfangszeichen als Längen von Schlüsselwörtern, sodass die Anzahl der nachfolgenden Verzweigungen reduziert wird. Für jedes Zeichen verzweigen wir basierend auf den möglichen Schlüsselwortlängen und vergleichen den Bezeichner nur dann mit dem Schlüsselwort, wenn auch die Länge übereinstimmt.

Es ist besser, eine Technik namens [perfektes Hashing](https://en.wikipedia.org/wiki/Perfect_hash_function) zu verwenden. Da die Liste der Schlüsselwörter statisch ist, können wir eine perfekte Hashfunktion berechnen, die uns für jeden Bezeichner höchstens ein Kandidatenschlüsselwort gibt. V8 verwendet [gperf](https://www.gnu.org/software/gperf/), um diese Funktion zu berechnen. Das [Ergebnis](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h) berechnet einen Hash basierend auf der Länge und den ersten beiden Zeichen des Bezeichners, um das einzelne Kandidatenschlüsselwort zu finden. Wir vergleichen den Bezeichner nur mit dem Schlüsselwort, wenn die Länge dieses Schlüsselworts mit der Eingabelänge des Bezeichners übereinstimmt. Dies beschleunigt insbesondere den Fall, dass ein Bezeichner kein Schlüsselwort ist, da wir weniger Verzweigungen benötigen, um dies herauszufinden.

![](/_img/scanner/keywords.svg)

## Surrogat-Paare

Wie bereits erwähnt, arbeitet unser Scanner mit einem UTF-16-codierten Stream von Zeichen, verbraucht jedoch Unicode-Zeichen. Zeichen in Ergänzungsebenen haben nur eine spezielle Bedeutung für Bezeichner-Token. Wenn solche Zeichen beispielsweise in einem String vorkommen, beenden sie den String nicht. Einzelstehende Surrogate werden von JS unterstützt und einfach aus der Quelle übernommen. Daher ist es besser, Surrogat-Paare erst zu kombinieren, wenn dies unbedingt erforderlich ist, und den Scanner direkt auf UTF-16-Codierungseinheiten statt auf Unicode-Zeichen arbeiten zu lassen. Wenn wir einen String scannen, müssen wir nicht nach Surrogat-Paaren suchen, sie kombinieren und später wieder aufteilen, wenn wir die Zeichen speichern, um einen Literal aufzubauen. Es gibt nur zwei verbleibende Stellen, an denen der Scanner mit Surrogat-Paaren umgehen muss. Zu Beginn des Token-Scans müssen wir nur dann [Surrogat-Paare kombinieren](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515), wenn wir ein Zeichen nicht als etwas anderes erkennen, um zu überprüfen, ob das Ergebnis ein Bezeichneranfang ist. Ebenso müssen wir [Surrogat-Paare kombinieren](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003) im langsamen Pfad des Bezeichnerscans, der mit Nicht-ASCII-Zeichen arbeitet.

## `AdvanceUntil`

Die Schnittstelle zwischen dem Scanner und dem `UTF16CharacterStream` macht die Grenze ziemlich zustandsbehaftet. Der Stream verfolgt seine Position im Puffer, die er nach jedem verbrauchten Code-Einheit erhöht. Der Scanner puffert eine empfangene Code-Einheit, bevor er zur Scanmethode zurückkehrt, die das Zeichen angefordert hat. Diese Methode liest das gepufferte Zeichen und fährt basierend auf dessen Wert fort. Dies sorgt für eine schöne Schichtbildung, ist jedoch ziemlich langsam. Im letzten Herbst hat unser Praktikant Florian Sattler eine verbesserte Schnittstelle entwickelt, die die Vorteile der Schichtbildung beibehält und gleichzeitig viel schnelleren Zugriff auf Code-Einheiten im Stream bietet. Eine generische Funktion [`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72), spezialisiert für einen bestimmten Scan-Helfer, ruft den Helfer für jedes Zeichen im Stream auf, bis der Helfer `false` zurückgibt. Dies bietet dem Scanner direkten Zugriff auf die zugrunde liegenden Daten, ohne die Abstraktionen zu verletzen. Tatsächlich vereinfacht es die Scan-Helfer-Funktionen, da sie sich nicht mit `EndOfInput` beschäftigen müssen.

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil` ist besonders nützlich, um Scan-Funktionen zu beschleunigen, die möglicherweise große Mengen an Zeichen verbrauchen müssen. Wir haben es verwendet, um Bezeichner zu beschleunigen, wie bereits zuvor gezeigt, aber auch Strings[^2] und Kommentare.

[^2]: Strings und Bezeichner, die nicht in Latin1 codiert werden können, sind derzeit teurer, da wir zunächst versuchen, sie als Latin1 zu puffern und dann in UTF-16 zu konvertieren, sobald wir ein Zeichen entdecken, das nicht in Latin1 codiert werden kann.

## Fazit

Die Leistung des Scannens ist die Grundlage der Parser-Leistung. Wir haben unseren Scanner so effizient wie möglich optimiert. Dies führte zu Verbesserungen auf ganzer Linie, wobei die Leistung des Single-Token-Scannens um etwa 1,4×, die String-Scann-Leistung um 1,3×, die Mehrzeilen-Kommentar-Scan-Leistung um 2,1× und die Bezeichner-Scan-Leistung um 1,2–1,5× abhängig von der Bezeichnerlänge verbessert wurde.

Unser Scanner kann jedoch nur so viel leisten. Als Entwickler können Sie die Parsing-Leistung weiter verbessern, indem Sie die Informationsdichte Ihrer Programme erhöhen. Die einfachste Möglichkeit, dies zu tun, besteht darin, Ihren Quellcode zu minimieren, überflüssige Leerzeichen zu entfernen und nach Möglichkeit keine Nicht-ASCII-Bezeichner zu verwenden. Idealerweise werden diese Schritte als Teil eines Build-Prozesses automatisiert, sodass Sie sich beim Erstellen von Code keine Sorgen darüber machen müssen.
