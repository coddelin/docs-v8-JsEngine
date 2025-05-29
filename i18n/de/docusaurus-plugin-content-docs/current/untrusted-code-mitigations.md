---
title: &apos;Nicht vertrauenswürdige Code-Mitigierungen&apos;
description: &apos;Wenn Sie V8 einbetten und nicht vertrauenswürdigen JavaScript-Code ausführen, aktivieren Sie die V8-Maßnahmen, um sich vor spekulativen Seitenkanalangriffen zu schützen.&apos;
---
Anfang 2018 veröffentlichten Forscher von Googles Project Zero [eine neue Klasse von Angriffen](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html), die die spekulativen Ausführungsoptimierungen vieler CPUs [ausnutzen](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html). Da V8 einen optimierenden JIT-Compiler, TurboFan, verwendet, um JavaScript schnell auszuführen, ist es unter bestimmten Umständen anfällig für die in der Offenlegung beschriebenen Seitenkanalangriffe.

## Es ändert sich nichts, wenn Sie nur vertrauenswürdigen Code ausführen

Wenn Ihr Produkt nur eine eingebettete Instanz von V8 verwendet, um JavaScript- oder WebAssembly-Code auszuführen, der vollständig unter Ihrer Kontrolle steht, ist Ihre Nutzung von V8 wahrscheinlich nicht von der Verwundbarkeit durch spekulative Seitenkanalangriffe (SSCA) betroffen. Eine Node.js-Instanz, die nur Code ausführt, dem Sie vertrauen, ist ein solches unbetroffenes Beispiel.

Um von der Verwundbarkeit zu profitieren, muss ein Angreifer speziell gestalteten JavaScript- oder WebAssembly-Code in Ihrer eingebetteten Umgebung ausführen. Wenn Sie als Entwickler die vollständige Kontrolle über den in Ihrer eingebetteten V8-Instanz ausgeführten Code haben, ist dies sehr unwahrscheinlich. Wenn Ihre eingebettete V8-Instanz jedoch beliebigen oder anderweitig nicht vertrauenswürdigen JavaScript- oder WebAssembly-Code erlaubt, herunterzuladen und auszuführen oder sogar JavaScript- oder WebAssembly-Code generiert und anschließend ausführt, der nicht vollständig unter Ihrer Kontrolle steht (z. B. wenn er als Compilation-Ziel verwendet wird), sollten Sie mögliche Maßnahmen in Betracht ziehen.

## Wenn Sie nicht vertrauenswürdigen Code ausführen…

### Aktualisieren Sie auf die neueste V8-Version, um von Maßnahmen zu profitieren und aktivieren Sie Maßnahmen

Ab [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) sind Maßnahmen gegen diese Angriffsart direkt in V8 verfügbar. Es wird daher empfohlen, Ihre eingebettete Kopie von V8 auf [v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) oder später zu aktualisieren. Ältere Versionen von V8, einschließlich Versionen, die immer noch FullCodeGen und/oder CrankShaft verwenden, enthalten keine Maßnahmen gegen SSCA.

Ab [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) wurde eine neue Flagge in V8 eingeführt, um Schutz gegen SSCA-Schwachstellen zu bieten. Dieses Flag, genannt `--untrusted-code-mitigations`, ist standardmäßig zur Laufzeit durch ein Bauprozess-GN-Flag namens `v8_untrusted_code_mitigations` aktiviert.

Diese Maßnahmen werden durch das Laufzeit-Flag `--untrusted-code-mitigations` aktiviert:

- Maskierung von Speicheradressen vor Speicherzugriffen in WebAssembly und asm.js, um sicherzustellen, dass spekulativ ausgeführte Speicherlasten keinen Zugriff auf Speicher außerhalb der WebAssembly- und asm.js-Heaps haben.
- Maskierung von Indizes im JIT-Code, der verwendet wird, um auf JavaScript-Arrays und -Strings in spekulativ ausgeführten Pfaden zuzugreifen, um sicherzustellen, dass spekulative Speicherlasten nicht mit Arrays und Strings auf Speicheradressen durchgeführt werden können, die für JavaScript-Code nicht zugänglich sein sollten.

Entwickler sollten beachten, dass die Maßnahmen möglicherweise mit Leistungseinbußen verbunden sind. Die tatsächliche Auswirkung hängt erheblich von Ihrer Arbeitslast ab. Für Arbeitslasten wie Speedometer ist die Auswirkung vernachlässigbar, aber für extremere Rechenlasten kann sie bis zu 15 % betragen. Wenn Sie dem JavaScript- und WebAssembly-Code, den Ihre eingebettete V8-Instanz ausführt, vollständig vertrauen, können Sie diese JIT-Maßnahmen deaktivieren, indem Sie das Flag `--no-untrusted-code-mitigations` zur Laufzeit angeben. Das GN-Flag `v8_untrusted_code_mitigations` kann verwendet werden, um die Maßnahmen zur Bauzeit zu aktivieren oder zu deaktivieren.

Beachten Sie, dass V8 standardmäßig diese Maßnahmen auf Plattformen deaktiviert, bei denen davon ausgegangen wird, dass der Entwickler Prozessisolierung nutzen wird, wie z. B. Plattformen, bei denen Chromium Webseiten-Isolierung verwendet.

### Sandbox-Ausführung nicht vertrauenswürdigen Codes in einem separaten Prozess

Wenn Sie nicht vertrauenswürdigen JavaScript- und WebAssembly-Code in einem separaten Prozess von sensiblen Daten ausführen, wird die potenzielle Auswirkung von SSCA stark reduziert. Durch Prozessisolierung können SSCA-Angriffe nur Daten beobachten, die innerhalb desselben Prozesses wie der ausführende Code sandboxed sind, nicht jedoch Daten aus anderen Prozessen.

### Ziehen Sie eine Anpassung Ihrer angebotenen hochpräzisen Timer in Betracht

Ein hochpräziser Timer erleichtert das Beobachten von Seitenkanälen in der SSCA-Schwachstelle. Wenn Ihr Produkt hochpräzise Timer bietet, die von nicht vertrauenswürdigem JavaScript- oder WebAssembly-Code abgerufen werden können, sollten Sie erwägen, diese Timer gröber zu machen oder ihnen ein Jitter hinzuzufügen.
