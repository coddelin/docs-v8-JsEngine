---
title: &apos;Einordnung von Problemen&apos;
description: &apos;Dieses Dokument erklärt, wie man mit Problemen im V8-Bugtracker umgeht.&apos;
---
Dieses Dokument erklärt, wie man mit Problemen im [V8-Bugtracker](/bugs) umgeht.

## Wie man ein Problem einordnet

- *V8-Bugtracker*: Setze den Status auf `Untriaged`
- *Chromium-Bugtracker*: Setze den Status auf `Untriaged` und füge die Komponente `Blink>JavaScript` hinzu

## Wie man V8-Probleme im Chromium-Bugtracker zuweist

Bitte verschiebe Probleme in die Warteschlange der V8-Fach-Sheriffs für eine der
folgenden Kategorien:

- Speicher: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - Wird in [dieser](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles) Abfrage angezeigt
- Stabilität: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - Wird in [dieser](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) Abfrage angezeigt
    - Kein CC erforderlich, wird automatisch von einem Sheriff eingeordnet
- Leistung: `status=untriaged component:Blink>JavaScript label:Performance`
    - Wird in [dieser](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2) Abfrage angezeigt
    - Kein CC erforderlich, wird automatisch von einem Sheriff eingeordnet
- Clusterfuzz: Setze den Bug auf den folgenden Status:
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - Wird in [dieser](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) Abfrage angezeigt.
    - Kein CC erforderlich, wird automatisch von einem Sheriff eingeordnet
- Sicherheit: Alle Sicherheitsprobleme werden von den Chromium Security-Sheriffs eingeordnet. Weitere Informationen findest du unter [Melden von Sicherheitsbugs](/docs/security-bugs).

Wenn du die Aufmerksamkeit eines Sheriffs benötigst, konsultiere bitte die Rotationsinformationen.

Verwende die Komponente `Blink>JavaScript` für alle Probleme.

**Bitte beachten, dass dies nur für Probleme gilt, die im Chromium-Bugtracker erfasst werden.**
