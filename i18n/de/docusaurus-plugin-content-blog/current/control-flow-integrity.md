---
title: "Control-flow-Integrität in V8"
description: "Dieser Blogbeitrag bespricht die Pläne zur Implementierung der Kontrollfluss-Integrität in V8."
author: "Stephen Röttger"
date: 2023-10-09
tags:
 - Sicherheit
---
Control-flow-Integrität (CFI) ist eine Sicherheitsfunktion, die darauf abzielt, Exploits daran zu hindern, den Kontrollfluss zu kapern. Die Idee ist, dass selbst wenn ein Angreifer es schafft, den Speicher eines Prozesses zu manipulieren, zusätzliche Integritätsprüfungen verhindern können, dass er beliebigen Code ausführt. In diesem Blogbeitrag möchten wir unsere Arbeit zur Aktivierung von CFI in V8 vorstellen.

<!--truncate-->
# Hintergrund

Die Popularität von Chrome macht es zu einem wertvollen Ziel für Zero-Day-Angriffe, und die meisten der in freier Wildbahn beobachteten Exploits zielen auf V8 ab, um anfängliche Codeausführung zu erzielen. V8-Exploits folgen typischerweise einem ähnlichen Muster: Ein anfänglicher Fehler führt zu Speicherbeschädigung, aber oft ist die anfängliche Beschädigung begrenzt und der Angreifer muss einen Weg finden, um beliebig im gesamten Adressraum zu lesen/schreiben. Dies ermöglicht es ihm, den Kontrollfluss zu kapern und Shellcode auszuführen, der den nächsten Schritt der Exploit-Kette ausführt, um aus der Chrome-Sandbox auszubrechen.


Um zu verhindern, dass der Angreifer Speicherbeschädigung in Shellcode-Ausführung umwandelt, implementieren wir Kontrollfluss-Integrität in V8. Dies ist besonders herausfordernd im Zusammenhang mit einem JIT-Compiler. Wenn Sie Daten zur Laufzeit in Maschinencode umwandeln, müssen Sie sicherstellen, dass beschädigte Daten nicht in bösartigen Code umgewandelt werden können. Glücklicherweise bieten moderne Hardwarefunktionen uns die Bausteine, um einen JIT-Compiler zu entwerfen, der auch bei der Verarbeitung beschädigten Speichers robust ist.


Im Folgenden betrachten wir das Problem, unterteilt in drei separate Teile:

- **Vorwärtskanten-CFI** überprüft die Integrität von indirekten Kontrollflussübertragungen wie Funktionszeiger- oder vtable-Aufrufen.
- **Rückwärtskanten-CFI** muss sicherstellen, dass Rücksprungadressen, die vom Stack gelesen werden, gültig sind.
- **JIT-Speicherintegrität** validiert alle Daten, die zur Laufzeit in ausführbaren Speicher geschrieben werden.

# Vorwärtskanten-CFI

Es gibt zwei Hardwarefunktionen, die wir verwenden möchten, um indirekte Aufrufe und Sprünge zu schützen: Landing Pads und Zeiger-Authentifizierung.


## Landing Pads

Landing Pads sind spezielle Befehle, die verwendet werden können, um gültige Sprungziele zu markieren. Wenn aktiviert, können indirekte Sprünge nur zu einem Landing-Pad-Befehl springen, alles andere wird eine Ausnahme auslösen.  
Unter ARM64 beispielsweise sind Landing Pads mit der Branch Target Identification (BTI)-Funktion verfügbar, die in Armv8.5-A eingeführt wurde. BTI-Unterstützung ist [bereits aktiviert](https://bugs.chromium.org/p/chromium/issues/detail?id=1145581) in V8.  
Unter x64 wurden Landing Pads mit der Indirect Branch Tracking (IBT) Funktion des Features Control Flow Enforcement Technology (CET) eingeführt.


Das Hinzufügen von Landing Pads bei allen möglichen Zielen für indirekte Sprünge bietet uns jedoch nur grobkörnige Kontrollfluss-Integrität und lässt Angreifern dennoch viel Freiheit. Wir können die Einschränkungen weiter verschärfen, indem wir Funktionssignaturprüfungen hinzufügen (die Argument- und Rückgabetypen an der Aufrufstelle müssen mit der aufgerufenen Funktion übereinstimmen) sowie durch das dynamische Entfernen unnötiger Landing-Pad-Befehle zur Laufzeit.
Diese Funktionen sind Teil des jüngsten [FineIBT-Vorschlags](https://arxiv.org/abs/2303.16353) und wir hoffen, dass sie eine OS-Übernahme erfahren.

## Zeiger-Authentifizierung

Armv8.3-A führte die Zeiger-Authentifizierung (PAC) ein, die verwendet werden kann, um eine Signatur in den oberen unbenutzten Bits eines Zeigers einzubetten. Da die Signatur vor Verwendung des Zeigers überprüft wird, können Angreifer keine beliebigen gefälschten Zeiger für indirekte Sprünge bereitstellen.

# Rückwärtskanten-CFI

Um Rücksprungadressen zu schützen, möchten wir auch zwei separate Hardwarefunktionen verwenden: Schatten-Stacks und PAC.

## Schatten-Stacks

Mit Intel CETs Schatten-Stacks und dem Guarded Control Stack (GCS) in [Armv9.4-A](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022) können wir eine separate Stack nur für Rücksprungadressen haben, die hardwarebasierte Schutzmaßnahmen gegen bösartige Schreibvorgänge bietet. Diese Funktionen bieten ziemlich starke Schutzmaßnahmen gegen das Überschreiben von Rücksprungadressen, aber wir müssen mit Fällen umgehen, in denen wir den Rücksprung-Stack legitim modifizieren, wie während der Optimierung/Deoptimierung und Fehlerbehandlung.

## Zeiger-Authentifizierung (PAC-RET)

Ähnlich wie bei indirekten Sprüngen kann die Zeiger-Authentifizierung verwendet werden, um Rücksprungadressen zu signieren, bevor sie auf den Stack gelegt werden. Dies ist [bereits aktiviert](https://bugs.chromium.org/p/chromium/issues/detail?id=919548) in V8 für ARM64-CPUs.


Ein Nebeneffekt der Verwendung von Hardwareunterstützung für Vorwärts- und Rückwärtskanten-CFI ist, dass wir die Auswirkungen auf die Leistung auf ein Minimum begrenzen können.

# JIT-Speicherintegrität

Eine einzigartige Herausforderung für die CFI in JIT-Compilern besteht darin, dass wir zur Laufzeit Maschinencode in ausführbaren Speicher schreiben müssen. Wir müssen den Speicher so schützen, dass der JIT-Compiler darauf schreiben darf, aber das schreibende Primitive des Angreifers dies nicht tun kann. Ein naiver Ansatz wäre, die Seitenberechtigungen vorübergehend zu ändern, um Schreibzugriff hinzuzufügen/zu entfernen. Dies ist jedoch von Natur aus anfällig, da wir annehmen müssen, dass der Angreifer einen willkürlichen Schreibvorgang gleichzeitig aus einem zweiten Thread auslösen kann.


## Speicherberechtigungen pro Thread

Auf modernen CPUs können wir unterschiedliche Ansichten der Speicherberechtigungen haben, die nur für den aktuellen Thread gelten und schnell im Benutzermodus geändert werden können.
Auf x64-CPUs kann dies mit Speicherzugriffsschlüsseln (pkeys) erreicht werden und ARM hat die [Permission Overlay Extensions](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022) in Armv8.9-A angekündigt.
Dies ermöglicht es uns, den Schreibzugriff auf ausführbaren Speicher fein granuliert umzuschalten, z. B. indem wir ihn mit einem separaten pkey kennzeichnen.


Die JIT-Seiten sind nun für den Angreifer nicht mehr beschreibbar, aber der JIT-Compiler muss immer noch generierten Code darauf schreiben. In V8 befindet sich der generierte Code in [AssemblerBuffers](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/codegen/assembler.h;l=255;drc=064b9a7903b793734b6c03a86ee53a2dc85f0f80) auf dem Heap, der stattdessen vom Angreifer korrumpiert werden kann. Wir könnten die AssemblerBuffers auf die gleiche Weise schützen, aber das würde das Problem nur verlagern. Zum Beispiel müssten wir dann auch den Speicher schützen, in dem der Zeiger auf den AssemblerBuffer gespeichert ist.
Tatsächlich stellt jeder Code, der Schreibzugriff auf solchen geschützten Speicher ermöglicht, eine Angriffsfläche für CFI dar und muss sehr defensiv codiert werden. Zum Beispiel ist jeder Schreibvorgang auf einen Zeiger, der aus ungeschütztem Speicher stammt, ein Game Over, da der Angreifer ihn verwenden könnte, um ausführbaren Speicher zu korrumpieren. Daher ist unser Designziel, so wenige dieser kritischen Abschnitte wie möglich zu haben und den Code darin kurz und eigenständig zu halten.

## Validierung des Kontrollflusses

Wenn wir nicht alle Compiler-Daten schützen möchten, können wir stattdessen davon ausgehen, dass sie aus der Sicht von CFI nicht vertrauenswürdig sind. Bevor wir irgendetwas in ausführbaren Speicher schreiben, müssen wir validieren, dass dies nicht zu beliebigen Kontrollfluss führt. Dazu gehört beispielsweise, dass der geschriebene Code keine Syscall-Anweisungen ausführt oder nicht in beliebigen Code springt. Natürlich müssen wir auch überprüfen, dass er die pkey-Berechtigungen des aktuellen Threads nicht ändert. Beachten Sie, dass wir nicht versuchen, den Code daran zu hindern, beliebigen Speicher zu korrumpieren, da wir davon ausgehen können, dass der Angreifer diese Fähigkeit bereits hat, wenn der Code korrumpiert ist.
Um eine solche Validierung sicher durchzuführen, müssen wir auch erforderliche Metadaten in geschütztem Speicher speichern sowie lokale Variablen auf dem Stack schützen.
Wir haben einige vorläufige Tests durchgeführt, um die Auswirkungen einer solchen Validierung auf die Leistung zu beurteilen. Glücklicherweise tritt die Validierung nicht in leistungskritischen Codepfaden auf, und wir haben keine Rückschritte in den Jetstream- oder Speedometer-Benchmarks beobachtet.

# Bewertung

Offensive Sicherheitsforschung ist ein wesentlicher Bestandteil jedes Minderungskonzepts, und wir versuchen kontinuierlich, neue Wege zu finden, um unsere Schutzmaßnahmen zu umgehen. Hier sind einige Beispiele für Angriffe, die unserer Meinung nach möglich sein könnten, sowie Ideen, sie zu adressieren.

## Korrumpierte Syscall-Argumente

Wie zuvor erwähnt, gehen wir davon aus, dass ein Angreifer ein speicherbeschreibendes Primitive parallel zu anderen laufenden Threads auslösen kann. Wenn ein anderer Thread einen Syscall ausführt, könnten einige der Argumente von einem Angreifer kontrolliert werden, wenn sie aus dem Speicher gelesen werden. Chrome läuft mit einem restriktiven Syscall-Filter, aber es gibt immer noch einige Syscalls, die zur Umgehung der CFI-Schutzmaßnahmen verwendet werden könnten.


Sigaction ist zum Beispiel ein Syscall zum Registrieren von Signal-Handlern. Während unserer Forschung haben wir herausgefunden, dass ein Sigaction-Aufruf in Chrome auf CFI-konforme Weise erreichbar ist. Da die Argumente im Speicher übergeben werden, könnte ein Angreifer diesen Codepfad auslösen und die Signal-Handler-Funktion auf beliebigen Code verweisen lassen. Glücklicherweise können wir dies einfach beheben: entweder den Pfad zum Sigaction-Aufruf blockieren oder ihn nach der Initialisierung mit einem Syscall-Filter blockieren.


Andere interessante Beispiele sind Syscalls für Speicherverwaltung. Wenn beispielsweise ein Thread munmap mit einem korrumpierten Zeiger aufruft, könnte der Angreifer schreibgeschützte Seiten unmapen, und ein darauf folgender mmap-Aufruf könnte diese Adresse erneut verwenden, wodurch der Seite effektiv Schreibberechtigungen hinzugefügt werden.
Einige Betriebssysteme bieten bereits Schutzmaßnahmen gegen diesen Angriff mit Memory Sealing: Apple-Plattformen bieten das [VM\_FLAGS\_PERMANENT](https://github.com/apple-oss-distributions/xnu/blob/1031c584a5e37aff177559b9f69dbd3c8c3fd30a/osfmk/mach/vm_statistics.h#L274)-Flag, und OpenBSD hat einen [mimmutable](https://man.openbsd.org/mimmutable.2)-Syscall.

## Korrumpierte Signal-Frames

Wenn der Kernel einen Signal-Handler ausführt, speichert er den aktuellen CPU-Zustand auf dem Benutzerland-Stack. Ein zweiter Thread könnte den gespeicherten Zustand korrumpieren, der dann vom Kernel wiederhergestellt wird.
Der Schutz davor im Benutzerbereich scheint schwierig, wenn die Signalfrahmendaten nicht vertrauenswürdig sind. In diesem Fall müsste man immer beenden oder den Signalrahmen mit einem bekannten sicheren Zustand überschreiben, zu dem zurückgekehrt werden kann.
Ein vielversprechenderer Ansatz wäre, den Signal-Stack mithilfe von thread-spezifischen Speicherschutzberechtigungen zu sichern. Beispielsweise würde ein pkey-markierter sigaltstack vor bösartigen Überschreibungen schützen, aber es würde erfordern, dass der Kernel vorübergehend Schreibrechte gewährt, wenn der CPU-Zustand darauf gespeichert wird.

# v8CTF

Dies waren nur einige Beispiele für potenzielle Angriffe, die wir zu bewältigen versuchen, und wir möchten auch mehr von der Sicherheitsgemeinschaft lernen. Wenn Sie sich dafür interessieren, versuchen Sie sich am kürzlich gestarteten [v8CTF](https://security.googleblog.com/2023/10/expanding-our-exploit-reward-program-to.html)! Exploitieren Sie V8 und erhalten Sie eine Belohnung, Exploits, die sich gezielt auf n-day-Schwachstellen richten, sind ausdrücklich im Scope enthalten!
