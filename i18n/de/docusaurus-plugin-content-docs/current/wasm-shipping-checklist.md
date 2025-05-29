---
title: 'Checkliste für Staging und Versand von WebAssembly-Funktionen'
description: 'Dieses Dokument bietet Checklisten mit technischen Anforderungen für den Zeitpunkt, wann eine WebAssembly-Funktion in V8 gestaged und verschickt werden sollte.'
---
Dieses Dokument bietet Checklisten mit technischen Anforderungen für das Staging und den Versand von WebAssembly-Funktionen in V8. Diese Checklisten dienen als Leitfaden und sind möglicherweise nicht auf alle Funktionen anwendbar. Der eigentliche Launch-Prozess wird im [V8 Launch-Prozess](https://v8.dev/docs/feature-launch-process) beschrieben.

# Staging

## Wann eine WebAssembly-Funktion gestaged werden sollte

Das [Staging](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) einer WebAssembly-Funktion markiert das Ende ihrer Implementierungsphase. Die Implementierungsphase ist abgeschlossen, wenn die folgende Checkliste erfüllt ist:

- Die Implementierung in V8 ist abgeschlossen. Dies umfasst:
    - Implementierung in TurboFan (falls zutreffend)
    - Implementierung in Liftoff (falls zutreffend)
    - Implementierung im Interpreter (falls zutreffend)
- Tests in V8 sind verfügbar
- Spezifikationstests werden in V8 durch Ausführung von [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) eingepflegt
- Alle bestehenden Spezifikationstests für Vorschläge bestehen. Fehlende Spezifikationstests sind bedauerlich, sollten das Staging jedoch nicht blockieren.

Beachten Sie, dass die Stufe des Funktionsvorschlags im Standardisierungsprozess für das Staging der Funktion in V8 nicht relevant ist. Der Vorschlag sollte jedoch größtenteils stabil sein.

## Wie man eine WebAssembly-Funktion staged

- Bewegen Sie in [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h) das Funktionsflag von der Makroliste `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` zur Makroliste `FOREACH_WASM_STAGING_FEATURE_FLAG`.
- Fügen Sie in [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) den Namen des Vorschlags-Repositories zur `repos`-Liste von Repositories hinzu.
- Führen Sie [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) aus, um die Spezifikationstests des neuen Vorschlags zu erstellen und hochzuladen.
- Fügen Sie in [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py) den Namen des Vorschlags-Repositories und das Funktionsflag zur `proposal_flags`-Liste hinzu.
- Fügen Sie in [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py) den Namen des Vorschlags-Repositories und das Funktionsflag zur `proposal_flags`-Liste hinzu.

Siehe das [Staging der Typreflektion](https://crrev.com/c/1771791) als Referenz.

# Versand

## Wann ist eine WebAssembly-Funktion bereit zum Versand

- Der [V8 Launch-Prozess](https://v8.dev/docs/feature-launch-process) ist erfüllt.
- Die Implementierung wird durch ein Fuzzing-Tool abgedeckt (falls zutreffend).
- Die Funktion wurde mehrere Wochen lang gestaged, um eine Abdeckung durch Fuzzing-Tests zu erreichen.
- Der Vorschlag der Funktion ist [Stufe 4](https://github.com/WebAssembly/proposals).
- Alle [Spezifikationstests](https://github.com/WebAssembly/spec/tree/master/test) bestehen.
- Die [Chromium DevTools-Checkliste für neue WebAssembly-Funktionen](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview) ist erfüllt.

## Wie man eine WebAssembly-Funktion verschickt

- Bewegen Sie in [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h) das Funktionsflag von der Makroliste `FOREACH_WASM_STAGING_FEATURE_FLAG` zur Makroliste `FOREACH_WASM_SHIPPED_FEATURE_FLAG`.
    - Stellen Sie sicher, dass Sie ein Blink-CQ-Bot im CL hinzufügen, um [Blink Web-Tests](https://v8.dev/docs/blink-layout-tests) auf Fehler zu überprüfen, die durch die Aktivierung der Funktion verursacht wurden (fügen Sie diese Zeile zum Fußtext der CL-Beschreibung hinzu: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- Aktivieren Sie außerdem die Funktion standardmäßig, indem Sie den dritten Parameter in `FOREACH_WASM_SHIPPED_FEATURE_FLAG` auf `true` ändern.
- Setzen Sie eine Erinnerung, um das Funktionsflag nach zwei Meilensteinen zu entfernen.
