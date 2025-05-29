---
title: 'Die öffentliche API von V8'
description: 'Dieses Dokument behandelt die Stabilität der öffentlichen API von V8 und erklärt, wie Entwickler Änderungen daran vornehmen können.'
---
Dieses Dokument behandelt die Stabilität der öffentlichen API von V8 und erklärt, wie Entwickler Änderungen daran vornehmen können.

## API-Stabilität

Wenn V8 in einer Chromium-Canary-Version absturzanfällig ist, wird es auf die vorherige Canary-Version von V8 zurückgesetzt. Es ist daher wichtig, die API von V8 zwischen den Canary-Versionen kompatibel zu halten.

Wir betreiben kontinuierlich einen [Bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability), der API-Stabilitätsverletzungen signalisiert. Er kompiliert Chromiums HEAD mit der [aktuellen Canary-Version](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary) von V8.

Fehler dieses Bots sind derzeit nur zur Kenntnisnahme und erfordern keine Maßnahmen. Die Verantwortlichen-Liste kann verwendet werden, um abhängige CLs im Falle eines Rollbacks leicht zu identifizieren.

Wenn Sie diesen Bot brechen, denken Sie daran, beim nächsten Mal das Zeitfenster zwischen einer Änderung in V8 und einer abhängigen Änderung in Chromium zu vergrößern.

## Wie man die öffentliche API von V8 ändert

V8 wird von vielen verschiedenen Embeds verwendet: Chrome, Node.js, gjstest usw. Beim Ändern der öffentlichen API von V8 (grundsätzlich die Dateien im `include/`-Verzeichnis) müssen wir sicherstellen, dass die Embeds problemlos auf die neue V8-Version aktualisieren können. Insbesondere können wir nicht davon ausgehen, dass ein Embed gleichzeitig auf die neue V8-Version aktualisiert und seinen Code an die neue API anpasst.

Der Embed sollte in der Lage sein, seinen Code an die neue API anzupassen, während er weiterhin die vorherige Version von V8 verwendet. Alle unten stehenden Anweisungen folgen aus dieser Regel.

- Das Hinzufügen neuer Typen, Konstanten und Funktionen ist sicher, mit einer Ausnahme: Fügen Sie keine neue reine virtuelle Funktion zu einer bestehenden Klasse hinzu. Neue virtuelle Funktionen sollten eine Standardimplementierung haben.
- Das Hinzufügen eines neuen Parameters zu einer Funktion ist sicher, wenn der Parameter einen Standardwert hat.
- Das Entfernen oder Umbenennen von Typen, Konstanten, Funktionen ist unsicher. Verwenden Sie die Makros [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) und [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde), die Compiler-Warnungen verursachen, wenn die veralteten Methoden vom Embed aufgerufen werden. Wenn wir beispielsweise die Funktion `foo` in die Funktion `bar` umbenennen möchten, müssen wir Folgendes tun:
    - Fügen Sie die neue Funktion `bar` in der Nähe der bestehenden Funktion `foo` hinzu.
    - Warten Sie, bis das CL in Chrome ausgerollt wird. Passen Sie Chrome an, um `bar` zu verwenden.
    - Annotieren Sie `foo` mit `V8_DEPRECATED("Use bar instead") void foo();`
    - Passen Sie im gleichen CL die Tests, die `foo` verwenden, so an, dass sie `bar` verwenden.
    - Schreiben Sie im CL die Motivation für die Änderung und Anweisungen für ein höheres Level der Aktualisierung.
    - Warten Sie bis zum nächsten V8-Zweig.
    - Entfernen Sie die Funktion `foo`.

    `V8_DEPRECATE_SOON` ist eine weichere Version von `V8_DEPRECATED`. Chrome wird davon nicht brechen, daher muss Schritt b nicht ausgeführt werden. `V8_DEPRECATE_SOON` reicht nicht aus, um die Funktion zu entfernen.

    Sie müssen weiterhin mit `V8_DEPRECATED` annotieren und auf den nächsten Zweig warten, bevor Sie die Funktion entfernen.

    `V8_DEPRECATED` kann mit der GN-Flag `v8_deprecation_warnings` getestet werden.
    `V8_DEPRECATE_SOON` kann mit `v8_imminent_deprecation_warnings` getestet werden.

- Das Ändern von Funktionssignaturen ist unsicher. Verwenden Sie die Makros `V8_DEPRECATED` und `V8_DEPRECATE_SOON` wie oben beschrieben.

Wir pflegen ein [Dokument mit wichtigen API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) für jede V8-Version.

Es gibt auch eine regelmäßig aktualisierte [Doxygen-API-Dokumentation](https://v8.dev/api).
