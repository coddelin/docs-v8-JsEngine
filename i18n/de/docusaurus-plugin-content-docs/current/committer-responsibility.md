---
title: &apos;Verantwortlichkeiten von V8-Kommittierenden und Gutachter:innen&apos;
description: &apos;Dieses Dokument listet Richtlinien für V8-Beitragende auf.&apos;
---
Wenn Sie in die V8-Repositories einchecken, stellen Sie sicher, dass Sie diese Richtlinien befolgen (angepasst von https://dev.chromium.org/developers/committers-responsibility):

1. Finden Sie die richtige Person, die Ihre Änderungen überprüft, sowie die passende Person für Patches, die Sie überprüfen sollen.
1. Seien Sie vor und nach dem Einchecken der Änderung per IM und/oder E-Mail erreichbar.
1. Beobachten Sie den [Waterfall](https://ci.chromium.org/p/v8/g/main/console), bis alle Bots nach Ihrer Änderung grün werden.
1. Wenn Sie eine TBR-Änderung (To Be Reviewed) einchecken, stellen Sie sicher, dass Sie die Personen benachrichtigen, deren Code Sie ändern. Üblicherweise reicht es, die Review-E-Mail zu senden.

Kurz gesagt: Treffen Sie die richtige Entscheidung für das Projekt, nicht die einfachste Lösung, um den Code einzuchecken, und vor allem: Nutzen Sie Ihr bestes Urteilsvermögen.

**Haben Sie keine Angst, Fragen zu stellen. Es gibt immer jemanden, der die Nachrichten auf der v8-committers-Mailingliste sofort liest und Ihnen helfen kann.**

## Änderungen mit mehreren Gutachter:innen

Gelegentlich gibt es Änderungen mit vielen Gutachter:innen, da manchmal mehrere Personen aufgrund verschiedener Verantwortlichkeiten und Fachgebiete eingebunden werden müssen.

Das Problem ist, dass ohne einige Richtlinien keine klare Verantwortung in diesen Reviews zugewiesen wird.

Wenn Sie die einzige Person sind, die eine Änderung überprüft, wissen Sie, dass Sie gute Arbeit leisten müssen. Wenn es jedoch drei weitere Personen gibt, gehen Sie möglicherweise davon aus, dass jemand anderes einen Teil der Überprüfung sorgfältig angeschaut hat. Manchmal denken das alle Gutachter:innen, und die Änderung wird nicht ordnungsgemäß überprüft.

In anderen Fällen sagen einige Gutachter:innen „LGTM“ zu einem Patch, während andere immer noch Änderungen erwarten. Der/die Autor:in kann über den Status der Überprüfung verwirrt sein, und einige Patches wurden eingecheckt, bei denen mindestens ein:e Gutachter:in weitere Änderungen vor dem Einchecken erwartet hat.

Gleichzeitig möchten wir viele Menschen ermutigen, am Review-Prozess teilzunehmen und über die Vorgänge informiert zu bleiben.

Hier sind also einige Richtlinien, um den Prozess zu klären:

1. Wenn ein:e Patchautor:in mehr als eine:n Gutachter:in anfragt, sollte in der Review-Anfrage-E-Mail klar gemacht werden, welche Verantwortung jede:r Gutachter:in hat. Zum Beispiel könnten Sie dies in die E-Mail schreiben:

    ```
    - larry: Änderungen an Bitmaps
    - sergey: Prozess-Hacks
    - alle anderen: Nur zur Info (FYI)
    ```

1. In diesem Fall könnten Sie auf der Review-Liste stehen, weil Sie darum gebeten haben, über Änderungen für Mehrprozess-Unterstützung informiert zu werden. Sie wären jedoch nicht Hauptgutachter:in, und der/die Autor:in sowie andere Gutachter:innen würden nicht erwarten, dass Sie alle Diffs im Detail überprüfen.
1. Wenn Sie ein Review erhalten, das viele andere Personen beinhaltet, und der/die Autor:in (1) nicht ausgeführt hat, fragen Sie bitte nach, wofür Sie verantwortlich sind, wenn Sie nicht alles im Detail überprüfen möchten.
1. Der/die Autor:in sollte die Zustimmung aller Personen auf der Gutachterliste abwarten, bevor die Änderung eingecheckt wird.
1. Personen, die bei einem Review ohne klare Review-Verantwortung (d.h. Drive-by-Reviews) beteiligt sind, sollten sehr responsiv sein und das Review nicht verzögern. Der/die Patchautor:in sollte sich frei fühlen, sie energisch anzufragen, wenn nötig.
1. Wenn Sie eine „Nur zur Info“-Person (FYI) bei einem Review sind und nicht tatsächlich im Detail (oder überhaupt nicht) überprüft haben, aber kein Problem mit dem Patch haben, notieren Sie dies. Sie könnten beispielsweise „Rubber Stamp“ oder „ACK“ anstatt „LGTM“ sagen. Auf diese Weise wissen die tatsächlichen Gutachter:innen, dass sie nicht darauf vertrauen können, dass Sie ihre Arbeit erledigt haben, aber der/die Autor:in des Patches weiß, dass kein weiteres Feedback von Ihnen erwartet werden muss. Hoffentlich können wir so alle informiert halten, klare Verantwortlichkeiten schaffen und detaillierte Reviews durchführen. Es könnte sogar einige Änderungen beschleunigen, da Sie schnell „ACK“ sagen können, wenn es Ihnen egal ist, und der/die Autor:in weiß, dass kein Feedback von Ihrer Seite erwartet werden muss.
