---
title: "Überprüfung des V8-Quellcodes"
description: "Dieses Dokument erklärt, wie man den V8-Quellcode lokal überprüft."
---
Dieses Dokument erklärt, wie man den V8-Quellcode lokal überprüft. Wenn Sie den Quellcode nur online durchsuchen möchten, verwenden Sie diese Links:

- [Durchsuchen](https://chromium.googlesource.com/v8/v8/)
- [Durchsuchen der Cutting Edge Version](https://chromium.googlesource.com/v8/v8/+/master)
- [Änderungen](https://chromium.googlesource.com/v8/v8/+log/master)

## Verwendung von Git

Das Git-Repository von V8 befindet sich unter https://chromium.googlesource.com/v8/v8.git mit einem offiziellen Spiegel auf GitHub: https://github.com/v8/v8.

Klonen Sie keine dieser URLs einfach mit `git clone`! Wenn Sie V8 aus Ihrem Checkout erstellen möchten, folgen Sie stattdessen den nachstehenden Anweisungen, um alles korrekt einzurichten.

## Anweisungen

1. Installieren Sie unter Linux oder macOS zuerst Git und anschließend [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

    Unter Windows folgen Sie den Chromium-Anweisungen ([für Googler](https://goto.google.com/building-chrome-win), [für Nicht-Googler](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)), um Git, Visual Studio, Debugging-Tools für Windows und `depot_tools` zu installieren.

1. Aktualisieren Sie `depot_tools`, indem Sie Folgendes in Ihr Terminal/Shell ausführen. Unter Windows muss dies in der Eingabeaufforderung (`cmd.exe`) erfolgen, statt in PowerShell oder anderen.

    ```
    gclient
    ```

1. Für **Push-Zugriff** müssen Sie eine `.netrc`-Datei mit Ihrem Git-Passwort einrichten:

    1. Gehen Sie zu https://chromium.googlesource.com/new-password und melden Sie sich mit Ihrem Committer-Konto an (in der Regel ein `@chromium.org` Konto). Hinweis: Das Erstellen eines neuen Passworts widerruft nicht automatisch zuvor erstellte Passwörter. Bitte stellen Sie sicher, dass Sie dieselbe E-Mail verwenden, wie für `git config user.email` festgelegt.
    1. Sehen Sie sich die große graue Box mit Shell-Befehlen an. Kopieren Sie diese Zeilen in Ihre Shell.

1. Holen Sie sich nun den V8-Quellcode, einschließlich aller Branches und Abhängigkeiten:

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

Danach befinden Sie sich absichtlich in einem Detached-Head-Zustand.

Optional können Sie angeben, wie neue Branches verfolgt werden sollen:

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

Alternativ können Sie neue lokale Branches wie folgt erstellen (empfohlen):

```bash
git new-branch fix-bug-1234
```

## Auf dem neuesten Stand bleiben

Aktualisieren Sie Ihren aktuellen Branch mit `git pull`. Beachten Sie, dass `git pull` nicht funktioniert, wenn Sie sich nicht in einem Branch befinden. Sie müssen stattdessen `git fetch` verwenden.

```bash
git pull
```

Manchmal werden Abhängigkeiten von V8 aktualisiert. Sie können diese synchronisieren, indem Sie folgendes ausführen:

```bash
gclient sync
```

## Code zur Überprüfung einsenden

```bash
git cl upload
```

## Committen

Sie können das CQ-Kontrollkästchen im Codereview für das Committen verwenden (bevorzugt). Siehe auch die [Chromium-Anweisungen](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md) für CQ-Flags und Fehlerbehebung.

Wenn Sie mehr Trybots als die Standard-Trybots benötigen, fügen Sie die folgenden Informationen Ihrer Commit-Nachricht auf Gerrit hinzu (z. B. für den Hinzufügen eines Nosnap-Bots):

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

Um manuell zu landen, aktualisieren Sie Ihren Branch:

```bash
git pull --rebase origin
```

Dann committen mit

```bash
git cl land
```

## Try-Jobs

Dieser Abschnitt ist nur für Mitglieder des V8-Projekts hilfreich.

### Einen Try-Job aus Codereview erstellen

1. Laden Sie einen CL auf Gerrit hoch.

    ```bash
    git cl upload
    ```

1. Testen Sie den CL, indem Sie einen Try-Job an die Trybots senden:

    ```bash
    git cl try
    ```

1. Warten Sie, bis die Trybots gebaut sind und Sie eine E-Mail mit dem Ergebnis erhalten. Sie können auch den Try-Status Ihres Patches auf Gerrit überprüfen.

1. Wenn das Anwenden des Patches fehlschlägt, müssen Sie entweder Ihren Patch neu basieren oder die V8-Revision angeben, mit der synchronisiert werden soll:

```bash
git cl try --revision=1234
```

### Einen Try-Job aus einem lokalen Branch erstellen

1. Committen Sie einige Änderungen in einem Git-Branch im lokalen Repository.

1. Testen Sie die Änderungen, indem Sie einen Try-Job an die Trybots senden:

    ```bash
    git cl try
    ```

1. Warten Sie, bis die Trybots gebaut sind und Sie eine E-Mail mit dem Ergebnis erhalten. Hinweis: Es gibt derzeit Probleme mit einigen der Replikate. Es wird empfohlen, Try-Jobs aus Codereview zu senden.

### Nützliche Argumente

Das Revision-Argument gibt dem Trybot an, welche Revision der Codebasis für die Anwendung Ihrer lokalen Änderungen verwendet wird. Ohne die Revision wird [V8’s LKGR-Revision](https://v8-status.appspot.com/lkgr) als Basis verwendet.

```bash
git cl try --revision=1234
```

Um zu vermeiden, dass Ihr Try-Job auf allen Bots läuft, verwenden Sie das `--bot`-Flag mit einer durch Komma getrennten Liste von Builder-Namen. Beispiel:

```bash
git cl try --bot=v8_mac_rel
```

### Den Try-Server ansehen

```bash
git cl try-results
```

## Quellcode-Branches

Es gibt mehrere verschiedene Zweige von V8; wenn Sie sich nicht sicher sind, welche Version Sie verwenden sollen, möchten Sie höchstwahrscheinlich die aktuelle stabile Version. Weitere Informationen über die verschiedenen verwendeten Zweige finden Sie in unserem [Freigabeprozess](/docs/release-process).

Sie möchten möglicherweise der V8-Version folgen, die Chrome in seinen stabilen (oder Beta-) Kanälen ausliefert, siehe https://omahaproxy.appspot.com/.
