---
title: 'Richtlinien für Design-Reviews'
description: 'Dieses Dokument erklärt die Richtlinien für Design-Reviews des V8-Projekts.'
---
Bitte stellen Sie sicher, dass Sie die folgenden Richtlinien befolgen, sofern anwendbar.

Es gibt mehrere Gründe für die Formalisierung der Design-Reviews von V8:

1. Klarstellung für individuelle Beitragende (ICs), wer die Entscheidungsträger sind und welche Vorgehensweise zu wählen ist, wenn Projekte aufgrund technischer Meinungsverschiedenheiten nicht vorankommen.
1. Schaffung eines Forums für direkte Design-Diskussionen.
1. Sicherstellung, dass die V8-Technical-Leads (TL) über alle bedeutenden Änderungen informiert sind und die Möglichkeit haben, auf der Ebene der Technical-Leads (TL) Input zu geben.
1. Erhöhung der Mitwirkung aller V8-Beitragenden weltweit.

## Zusammenfassung

![V8’s Design Review Guidelines auf einen Blick](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

Wichtig:

1. Gehen Sie von guten Absichten aus.
1. Seien Sie freundlich und zivilisiert.
1. Seien Sie pragmatisch.

Die vorgeschlagene Lösung basiert auf den folgenden Annahmen/Säulen:

1. Der vorgeschlagene Workflow überträgt die Verantwortung an den individuellen Beitragenden (IC). Sie sind diejenigen, die den Prozess vorantreiben.
1. Ihre leitenden TLs haben die Aufgabe, ihnen zu helfen, sich in diesem Bereich zurechtzufinden und die richtigen LGTM-Geber zu finden.
1. Wenn ein Feature unstrittig ist, sollte fast kein zusätzlicher Aufwand entstehen.
1. Wenn es viele Kontroversen gibt, kann das Feature an das V8 Eng Review Owners Meeting 'eskaliert' werden, wo weitere Schritte entschieden werden.

## Rollen

### Individueller Beitragender (IC)

LGTM: Nicht anwendbar
Diese Person ist der Ersteller des Features und der Verfasser der Design-Dokumentation.

### Der Technical Lead (TL) des IC

LGTM: Muss vorhanden sein
Diese Person ist der TL eines bestimmten Projekts oder einer Komponente. Wahrscheinlich ist dies die Person, die Eigentümer der Hauptkomponente ist, die Ihr Feature betrifft. Falls nicht klar ist, wer der TL ist, wenden Sie sich bitte an die V8 Eng Review Owners unter v8-eng-review-owners@googlegroups.com. TLs sind dafür verantwortlich, bei Bedarf weitere Personen zur Liste der erforderlichen LGTM-Geber hinzuzufügen.

### LGTM-Geber

LGTM: Muss vorhanden sein
Dies ist eine Person, die ein LGTM geben muss. Es könnte ein IC oder ein TL(M) sein.

### “Zufälliger” Prüfer des Dokuments (RRotD)

LGTM: Nicht erforderlich
Dies ist jemand, der das Dokument lediglich überprüft und kommentiert. Sein Input sollte berücksichtigt werden, obwohl sein LGTM nicht erforderlich ist.

### V8 Eng Review Owners

LGTM: Nicht erforderlich
Festgefahrene Vorschläge können an die V8 Eng Review Owners über &lt;v8-eng-review-owners@googlegroups.com> eskaliert werden. Mögliche Anwendungsfälle einer solchen Eskalation:

- Ein LGTM-Geber reagiert nicht
- Es kann kein Konsens zum Design erzielt werden

Die V8 Eng Review Owners können Nicht-LGTMs oder LGTMs außer Kraft setzen.

## Detaillierter Workflow

![V8’s Design Review Guidelines auf einen Blick](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

1. Beginn: IC entscheidet sich, an einem Feature zu arbeiten/bekommt ein Feature zugewiesen.
1. IC schickt ein frühes Design-Dokument/einen Erklärer/eine One-Pager-Version an einige RRotDs.
    1. Prototypen werden als Teil des "Design-Dokuments" betrachtet.
1. IC fügt Personen zur Liste der LGTM-Geber hinzu, von denen sie denkt, dass sie ein LGTM geben sollten. Der TL muss unbedingt auf der Liste der LGTM-Geber stehen.
1. IC integriert Feedback.
1. TL fügt weitere Personen zur Liste der LGTM-Geber hinzu.
1. IC schickt das frühe Design-Dokument/den Erklärer/die One-Pager-Version an &lt;v8-dev+design@googlegroups.com>.
1. IC sammelt die LGTMs. Der TL hilft ihnen.
    1. LGTM-Geber überprüfen das Dokument, fügen Kommentare hinzu und geben entweder ein LGTM oder ein Nicht-LGTM am Anfang des Dokuments. Wenn sie ein Nicht-LGTM hinzufügen, sind sie verpflichtet, den/die Grund(e) dafür aufzulisten.
    1. Optional: LGTM-Geber können sich selbst von der Liste der LGTM-Geber entfernen und/oder andere LGTM-Geber vorschlagen.
    1. IC und TL arbeiten daran, die ungelösten Probleme zu beheben.
    1. Wenn alle LGTM gesammelt sind, senden Sie eine E-Mail an v8-dev@googlegroups.com (z. B. indem Sie den ursprünglichen Thread pingen) und geben Sie die Implementierung bekannt.
1. Optional: Wenn IC und TL blockiert sind und/oder eine breitere Diskussion führen möchten, können sie das Problem an die V8 Eng Review Owners eskalieren.
    1. IC sendet eine E-Mail an v8-eng-review-owners@googlegroups.com.
        1. TL in CC.
        1. Link zum Design-Dokument in der E-Mail.
    1. Jedes Mitglied der V8 Eng Review Owners ist verpflichtet, das Dokument zu überprüfen und sich optional zur Liste der LGTM-Geber hinzuzufügen.
    1. Die nächsten Schritte zur Entblockung des Features werden entschieden.
    1. Wenn der Blockierer danach nicht behoben wird oder neue, unlösbare Blockierer entdeckt werden, gehen Sie zu Punkt 8.
1. Optional: Wenn "Nicht-LGTMs" hinzugefügt werden, nachdem das Feature bereits genehmigt wurde, sollten sie wie normale, ungelöste Probleme behandelt werden.
    1. IC und TL arbeiten daran, die ungelösten Probleme zu beheben.
1. Ende: IC fährt mit dem Feature fort.

Und denken Sie immer daran:

1. Gehen Sie von guten Absichten aus.
1. Seien Sie freundlich und zivilisiert.
1. Seien Sie pragmatisch.

## FAQ

### Wie wird entschieden, ob das Feature ein Design-Dokument benötigt?

Einige Hinweise, wann ein Design-Dokument angebracht ist:

- Berührt mindestens zwei Komponenten
- Erfordert eine Abstimmung mit Nicht-V8-Projekten, z. B. Debugger, Blink
- Dauert länger als eine Woche Aufwand, um implementiert zu werden
- Ist eine Sprachfunktion
- Plattform-spezifischer Code wird berührt
- Änderungen, die für Benutzer sichtbar sind
- Hat besondere Sicherheitsüberlegungen oder die Sicherheitseinwirkung ist nicht offensichtlich

Bei Unsicherheiten, fragen Sie den TL.

### Wie entscheidet man, wen man zur Liste der LGTM-Anbieter hinzufügt?

Einige Hinweise, wann Personen zur Liste der LGTM-Anbieter hinzugefügt werden sollten:

- OWNERs der Quelldateien/Verzeichnisse, die Sie voraussichtlich bearbeiten werden
- Hauptkomponenten-Experten der Komponenten, die Sie voraussichtlich bearbeiten werden
- Nachgelagerte Nutzer Ihrer Änderungen, z. B. wenn Sie eine API ändern

### Wer ist “mein” TL?

Wahrscheinlich ist dies die Person, die Besitzer der Hauptkomponente ist, die Ihre Funktion berühren wird. Wenn nicht klar ist, wer der TL ist, fragen Sie bitte die V8 Eng Review Owners über &lt;v8-eng-review-owners@googlegroups.com>.

### Wo finde ich eine Vorlage für Entwurfsdokumente?

[Hier](https://docs.google.com/document/d/1CWNKvxOYXGMHepW31hPwaFz9mOqffaXnuGqhMqcyFYo/template/preview).

### Was, wenn sich etwas Grundlegendes ändert?

Stellen Sie sicher, dass Sie immer noch die LGTMs haben, z. B. indem Sie die LGTM-Anbieter mit einer klaren, vernünftigen Frist zum Ablehnen kontaktieren.

### LGTM-Anbieter kommentieren nicht mein Dokument, was soll ich tun?

In diesem Fall können Sie diesen Eskalationsweg gehen:

- Kontaktieren Sie sie direkt per E-Mail, Hangouts oder Kommentar/Zuweisung im Dokument und bitten Sie sie ausdrücklich, ein LGTM oder kein LGTM hinzuzufügen.
- Ziehen Sie Ihren TL hinzu und bitten Sie ihn um Hilfe.
- Eskalieren Sie an &lt;v8-eng-review-owners@googlegroups.com>.

### Jemand hat mich als LGTM-Anbieter zu einem Dokument hinzugefügt, was soll ich tun?

V8 strebt an, Entscheidungen transparenter zu machen und die Eskalation erleichtern. Wenn Sie denken, dass der Entwurf gut genug ist und umgesetzt werden sollte, fügen Sie ein „LGTM“ in die Tabellenzelle neben Ihrem Namen ein.

Wenn Sie blockierende Bedenken oder Anmerkungen haben, fügen Sie bitte „Kein LGTM, weil \<Grund>“ in die Tabellenzelle neben Ihrem Namen ein. Seien Sie darauf vorbereitet, um eine weitere Überprüfungsrunde gebeten zu werden.

### Wie funktioniert dies zusammen mit dem Blink Intents-Prozess?

Die Designrichtlinien von V8 ergänzen [V8’s Blink Intent+Errata Prozess](/docs/feature-launch-process). Wenn Sie eine neue WebAssembly- oder JavaScript-Sprachfunktion starten, befolgen Sie bitte V8’s Blink Intent+Errata Prozess und die V8 Designrichtlinien. Es macht wahrscheinlich Sinn, alle LGTMs zu dem Zeitpunkt zu sammeln, an dem Sie eine Absicht zur Implementierung senden würden.
