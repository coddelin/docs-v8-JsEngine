---
title: &apos;Release-Prozess&apos;
description: &apos;Dieses Dokument erklärt den V8-Veröffentlichungsprozess.&apos;
---
Der V8-Veröffentlichungsprozess ist eng mit [Chrome’s](https://www.chromium.org/getting-involved/dev-channel) verbunden. Das V8-Team nutzt alle vier Chrome-Veröffentlichungskanäle, um neue Versionen an die Nutzer zu übermitteln.

Wenn Sie nachschauen möchten, welche V8-Version in einer Chrome-Veröffentlichung enthalten ist, können Sie [Chromiumdash](https://chromiumdash.appspot.com/releases) überprüfen. Für jede Chrome-Veröffentlichung wird ein separater Branch im V8-Repository erstellt, um die Rückverfolgung zu erleichtern, z. B. für [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1).

## Canary-Veröffentlichungen

Jeden Tag wird ein neuer Canary-Build über [Chrome’s Canary-Kanal](https://www.google.com/chrome/browser/canary.html?platform=win64) an die Nutzer übermittelt. Normalerweise ist das bereitgestellte Produkt die neueste, ausreichend stabile Version aus [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main).

Branches für eine Canary-Version sehen normalerweise so aus:

## Dev-Veröffentlichungen

Jede Woche wird ein neuer Dev-Build über [Chrome’s Dev-Kanal](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64) an die Nutzer übermittelt. Normalerweise umfasst das bereitgestellte Produkt die neueste ausreichend stabile V8-Version aus dem Canary-Kanal.


## Beta-Veröffentlichungen

Etwa alle 2 Wochen wird ein neuer Haupt-Branch erstellt, z. B. [für Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4). Dies geschieht synchron mit der Erstellung von [Chrome’s Beta-Kanal](https://www.google.com/chrome/browser/beta.html?platform=win64). Der Chrome-Beta-Kanal ist an die Spitze des V8-Branches gebunden. Nach ungefähr 2 Wochen wird der Branch in Stable befördert.

Änderungen werden nur auf den Branch cherry-gepickt, um die Version zu stabilisieren.

Branches für eine Beta-Version sehen normalerweise so aus:

```
refs/branch-heads/12.1
```

Sie basieren auf einem Canary-Branch.

## Stabile Veröffentlichungen

Etwa alle 4 Wochen wird eine neue größere stabile Version veröffentlicht. Es wird kein spezieller Branch erstellt, da der neueste Beta-Branch einfach zu Stable befördert wird. Diese Version wird über [Chrome’s Stable-Kanal](https://www.google.com/chrome/browser/desktop/index.html?platform=win64) an die Nutzer übermittelt.

Branches für eine Stable-Version sehen normalerweise so aus:

```
refs/branch-heads/12.1
```

Sie sind beförderte (wiederverwendete) Beta-Branches.

## API

Chromiumdash bietet auch eine API an, um dieselben Informationen zu sammeln:

```
https://chromiumdash.appspot.com/fetch_milestones (um den V8-Branch-Namen zu erhalten, z. B. refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (um den Git-Hash des V8-Branches zu erhalten)
```

Die folgenden Parameter sind hilfreich:
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## Welche Version sollte ich in meine Anwendung einbetten?

Die Spitze des gleichen Branches, den Chrome’s Stable-Kanal verwendet.

Wir führen häufig wichtige Fehlerbehebungen in einen stabilen Branch zurück, daher sollten Sie diese Updates ebenfalls berücksichtigen, wenn Sie Wert auf Stabilität, Sicherheit und Genauigkeit legen – deshalb empfehlen wir „die Spitze des Branches“ anstelle einer exakten Version.

Sobald ein neuer Branch zu Stable befördert wird, stellen wir die Pflege des vorherigen stabilen Branches ein. Dies geschieht alle vier Wochen, daher sollten Sie darauf vorbereitet sein, mindestens so oft ein Update durchzuführen.

**Verwandt:** [Welche V8-Version sollte ich verwenden?](/docs/version-numbers#which-v8-version-should-i-use%3F)
