---
title: &apos;Zusammenführen & Patchen&apos;
description: &apos;Dieses Dokument erklärt, wie V8-Patches in einen Release-Zweig zusammengeführt werden.&apos;
---
Wenn Sie einen Patch für den `main`-Zweig haben (z. B. einen wichtigen Fehlerbehebungs-Patch), der in einen der V8-Release-Zweige (refs/branch-heads/12.5) zusammengeführt werden muss, lesen Sie weiter.

Die folgenden Beispiele verwenden eine verzweigte 12.3-Version von V8. Ersetzen Sie `12.3` durch Ihre Versionsnummer. Lesen Sie die Dokumentation zu [V8-Versionsnummern](/docs/version-numbers) für weitere Informationen.

Ein zugehöriges Problem im V8-Issue-Tracker ist **verpflichtend**, wenn ein Patch zusammengeführt wird. Das erleichtert die Nachverfolgung von Zusammenführungen.

## Was qualifiziert einen Zusammenführungskandidaten?

- Der Patch behebt einen *schweren* Fehler (in absteigender Wichtigkeit):
    1. Sicherheitsfehler
    1. Stabilitätsfehler
    1. Korrektheitsfehler
    1. Leistungsfehler
- Der Patch verändert keine APIs.
- Der Patch ändert kein Verhalten, das vor dem Branch-Cut vorhanden war (es sei denn, die Verhaltensänderung behebt einen Fehler).

Weitere Informationen finden Sie auf der [relevanten Chromium-Seite](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md). Im Zweifelsfall senden Sie eine E-Mail an &lt;v8-dev@googlegroups.com>.

## Der Zusammenführungsprozess

Der Zusammenführungsprozess im V8-Tracker wird durch Attribute gesteuert. Setzen Sie daher bitte das Attribut &apos;Merge-Request&apos; auf den relevanten Chrome-Milestone. Falls die Zusammenführung nur einen V8-[Port](https://v8.dev/docs/ports) betrifft, setzen Sie bitte das HW-Attribut entsprechend, z. B.:

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

Nach der Überprüfung wird dies während der Überprüfung angepasst zu:

```
Merge: Approved-123
oder
Merge: Rejected-123
```

Nachdem das CL eingebracht wurde, wird dies ein weiteres Mal angepasst zu:

```
Merge: Merged-123, Merged-12.3
```

## Wie kann überprüft werden, ob ein Commit bereits zusammengeführt/zurückgesetzt wurde oder Canary-Abdeckung hat?

Verwenden Sie [chromiumdash](https://chromiumdash.appspot.com/commit/), um zu überprüfen, ob das relevante CL Canary-Abdeckung hat.

Im oberen Abschnitt **Releases** sollte ein Canary angezeigt werden.

## Wie erstellt man das Merge-CL

### Option 1: Verwendung von [gerrit](https://chromium-review.googlesource.com/) – Empfohlen

1. Öffnen Sie das CL, das Sie zurückführen möchten.
1. Wählen Sie "Cherry pick" aus dem erweiterten Menü (drei vertikale Punkte in der oberen rechten Ecke).
1. Geben Sie "refs/branch-heads/*XX.X*" als Zielzweig ein (ersetzen Sie *XX.X* durch den richtigen Zweig).
1. Passen Sie die Commit-Nachricht an:
   1. Präfixieren Sie den Titel mit "Merged: ".
   1. Entfernen Sie Zeilen aus dem Footer, die dem ursprünglichen CL entsprechen ("Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"). Behalten Sie auf jeden Fall die Zeile "(cherry picked from commit XXX)", da diese von einigen Tools benötigt wird, um Zusammenführungen mit den ursprünglichen CLs zu verknüpfen.
1. Bei einem Zusammenführungskonflikt erstellen Sie bitte dennoch das CL. Um Konflikte zu lösen (falls vorhanden) - entweder über die Gerrit-UI oder indem Sie den Patch lokal mit dem Befehl "download patch" aus dem Menü (drei vertikale Punkte in der oberen rechten Ecke) abrufen.
1. Zur Überprüfung einreichen.

### Option 2: Verwendung des automatisierten Skripts

Angenommen, Sie führen die Revision af3cf11 in den Zweig 12.2 zusammen (bitte geben Sie vollständige Git-Hashes an - Abkürzungen werden hier zur Vereinfachung verwendet).

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```

### Nach dem Einbringen: Beobachten Sie den [Branch-Wasserfall](https://ci.chromium.org/p/v8)

Wenn einer der Builder nach dem Einbringen Ihres Patches nicht grün ist, setzen Sie die Zusammenführung sofort zurück. Ein Bot (`AutoTagBot`) kümmert sich nach einer Wartezeit von 10 Minuten um die korrekte Versionierung.

## Einen Patch auf eine Canary/Dev-Version anwenden

Falls Sie eine Canary/Dev-Version patchen müssen (was selten passieren sollte), cc vahl@ oder machenbach@ in der entsprechenden Issue. Googler: Bitte werfen Sie einen Blick auf die [interne Seite](http://g3doc/company/teams/v8/patching_a_version), bevor Sie das CL erstellen.

