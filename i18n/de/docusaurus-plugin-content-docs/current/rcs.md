---
title: "Runtime-Anrufstatistiken"
description: "Dieses Dokument erklärt, wie Sie Runtime-Anrufstatistiken verwenden, um detaillierte V8-interne Metriken zu erhalten."
---
[Das Performance-Panel der DevTools](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/) bietet Einblicke in die Laufzeitleistung Ihrer Webanwendung, indem es verschiedene Chrome-interne Metriken visualisiert. Allerdings werden bestimmte Low-Level-V8-Metriken derzeit nicht in DevTools angezeigt. Dieser Artikel führt Sie durch die robusteste Methode, detaillierte V8-interne Metriken, bekannt als Runtime-Anrufstatistiken (Runtime Call Stats, RCS), über `chrome://tracing` zu sammeln.

Tracing zeichnet das Verhalten des gesamten Browsers auf, einschließlich anderer Registerkarten, Fenster und Erweiterungen. Daher funktioniert es am besten, wenn es in einem sauberen Benutzerprofil durchgeführt wird, mit deaktivierten Erweiterungen und ohne andere geöffnete Browser-Registerkarten:

```bash
# Starten Sie eine neue Chrome-Browsersitzung mit einem sauberen Benutzerprofil und deaktivierten Erweiterungen
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Geben Sie die URL der Seite, die Sie messen möchten, in die erste Registerkarte ein, laden Sie die Seite jedoch noch nicht.

![](/_img/rcs/01.png)

Fügen Sie eine zweite Registerkarte hinzu und öffnen Sie `chrome://tracing`. Tipp: Sie können einfach `chrome:tracing` ohne die Schrägstriche eingeben.

![](/_img/rcs/02.png)

Klicken Sie auf die Schaltfläche „Record“, um die Trace-Aufzeichnung vorzubereiten. Wählen Sie zunächst „Webentwickler“ und dann „Kategorien bearbeiten“ aus.

![](/_img/rcs/03.png)

Wählen Sie `v8.runtime_stats` aus der Liste aus. Je nachdem, wie detailliert Ihre Untersuchung ist, können Sie auch andere Kategorien auswählen.

![](/_img/rcs/04.png)

Drücken Sie „Record“ und wechseln Sie zurück zur ersten Registerkarte und laden Sie die Seite. Der schnellste Weg ist die Nutzung von <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd>, um direkt zur ersten Registerkarte zu springen, und dann <kbd>Enter</kbd> zu drücken, um die eingegebene URL zu akzeptieren.

![](/_img/rcs/05.png)

Warten Sie, bis Ihre Seite vollständig geladen ist oder der Puffer voll ist, und stoppen Sie dann die Aufzeichnung.

![](/_img/rcs/06.png)

Suchen Sie nach einem „Renderer“-Abschnitt, der den Seitentitel der aufgezeichneten Registerkarte enthält. Der einfachste Weg, dies zu tun, ist, auf „Prozesse“ zu klicken, dann „Keine“ auszuwählen, um alle Einträge abzuwählen, und anschließend nur den Renderer auszuwählen, für den Sie sich interessieren.

![](/_img/rcs/07.png)

Wählen Sie die Trace-Ereignisse/-Slices aus, indem Sie <kbd>Shift</kbd> drücken und ziehen. Stellen Sie sicher, dass Sie _alle_ Abschnitte einschließen, einschließlich `CrRendererMain` und aller `ThreadPoolForegroundWorker`s. Am unteren Ende erscheint eine Tabelle mit allen ausgewählten Slices.

![](/_img/rcs/08.png)

Scrollen Sie oben rechts in der Tabelle und klicken Sie auf den Link neben „Runtime call stats table“.

![](/_img/rcs/09.png)

In der Ansicht, die erscheint, scrollen Sie nach unten, um eine detaillierte Tabelle zu sehen, in der der Zeitaufwand von V8 aufgeschlüsselt ist.

![](/_img/rcs/10.png)

Durch das Öffnen einer Kategorie können Sie die Daten weiter vertiefen.

![](/_img/rcs/11.png)

## Befehlszeilenschnittstelle

Führen Sie [`d8`](/docs/d8) mit `--runtime-call-stats` aus, um RCS-Metriken über die Befehlszeile zu erhalten:

```bash
d8 --runtime-call-stats foo.js
```
