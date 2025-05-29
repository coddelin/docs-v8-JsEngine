---
title: &apos;V8s Versionsnummerierungsschema&apos;
description: &apos;Dieses Dokument erklärt das Versionsnummerierungsschema von V8.&apos;
---
V8-Versionsnummern haben die Form `x.y.z.w`, wobei:

- `x.y` der Chromium-Meilenstein durch 10 geteilt ist (z.B. M60 → `6.0`)
- `z` automatisch hochgezählt wird, wenn es eine neue [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms) gibt (typischerweise mehrmals täglich)
- `w` bei manuell zurückgemergten Patches nach einem Branch-Punkt hochgezählt wird

Wenn `w` `0` ist, wird es in der Versionsnummer weggelassen. Zum Beispiel wird v5.9.211 (anstelle von „v5.9.211.0“) nach dem Zurückmergen eines Patches auf v5.9.211.1 hochgezählt.

## Welche V8-Version sollte ich verwenden?

Einbetreiber von V8 sollten *im Allgemeinen den Kopf des Branches verwenden, der der Nebenversionsnummer von V8 entspricht, die in Chrome ausgeliefert wird*.

### Die Nebenversionsnummer von V8 finden, die der neuesten stabilen Chrome-Version entspricht

Um diese Version herauszufinden:

1. Gehen Sie zu https://chromiumdash.appspot.com/releases
2. Finden Sie die neueste stabile Chrome-Version in der Tabelle
3. Klicken Sie auf das (i) und überprüfen Sie die Spalte `V8`


### Den Kopf des entsprechenden Branches finden

Die versionsbezogenen Branches von V8 erscheinen nicht im Online-Repository unter https://chromium.googlesource.com/v8/v8.git; es erscheinen stattdessen nur Tags. Um den Kopf dieses Branches zu finden, besuchen Sie die URL in dieser Form:

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

Beispiel: Für die oben gefundene V8-Nebenversion 12.1 gehen wir zu https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1 und finden einen Commit mit dem Titel „Version 12.1.285.2.“

**Vorsicht:** Sie sollten *nicht* einfach das numerisch größte Tag finden, das der oben genannten geringfügigen V8-Version entspricht, da diese manchmal nicht unterstützt werden, z.B. sie werden markiert, bevor entschieden wird, wo Nebenversionen geschnitten werden sollen. Solche Versionen erhalten keine Backports oder Ähnliches.

Beispiel: Die V8-Tags `5.9.212`, `5.9.213`, `5.9.214`, `5.9.214.1`, … und `5.9.223` sind aufgegeben, obwohl sie numerisch größer als der **Branch-Kopf** von 5.9.211.33 sind.

### Den Kopf des entsprechenden Branches auschecken

Wenn Sie den Quellcode bereits haben, können Sie den Kopf direkt auschecken. Wenn Sie den Quellcode mit `depot_tools` abgerufen haben, sollten Sie Folgendes ausführen können:

```bash
git branch --remotes | grep branch-heads/
```

um die relevanten Branches aufzulisten. Sie sollten denjenigen auschecken, der der oben gefundenen geringfügigen V8-Version entspricht, und diesen verwenden. Das Tag, auf dem Sie am Ende landen, ist die geeignete V8-Version für Sie als Einbetreiber.

Wenn Sie `depot_tools` nicht verwendet haben, bearbeiten Sie `.git/config` und fügen Sie die folgende Zeile im Abschnitt `[remote "origin"]` hinzu:

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
