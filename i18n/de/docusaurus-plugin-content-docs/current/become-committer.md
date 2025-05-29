---
title: 'Ein Committer werden'
description: 'Wie wird man ein V8-Committer? Dieses Dokument erklärt es.'
---
Technisch gesehen sind Committer Personen, die Schreibzugriff auf das V8-Repository haben. Alle Patches müssen von mindestens zwei Committern (einschließlich des Autors) überprüft werden. Unabhängig von dieser Anforderung müssen Patches auch von einem OWNER erstellt oder überprüft werden.

Dieses Privileg wird mit einer gewissen Erwartung an Verantwortungsbewusstsein gewährt: Committer sind Personen, die sich für das V8-Projekt interessieren und dabei helfen möchten, seine Ziele zu erreichen. Committer sind nicht nur Personen, die Änderungen vornehmen können, sondern solche, die ihre Fähigkeit bewiesen haben, mit dem Team zusammenzuarbeiten, die kompetentesten Personen dazu zu bringen, Code zu überprüfen, hochwertigen Code beizutragen und nachzuverfolgen, um Probleme (im Code oder in Tests) zu beheben.

Ein Committer ist ein Beitragender zum Erfolg des V8-Projekts und ein Bürger, der dazu beiträgt, die Projekte erfolgreich zu machen. Siehe [Verantwortung des Committers](/docs/committer-responsibility).

## Wie werde ich ein Committer?

*Hinweis für Googler: Es gibt einen [etwas anderen Ansatz für V8-Teammitglieder](http://go/v8/setup_permissions.md).*

Falls Sie dies noch nicht getan haben, **müssen Sie einen Sicherheitsschlüssel in Ihrem Konto einrichten, bevor Sie in die Committer-Liste aufgenommen werden.**

Kurz gesagt, leisten Sie 20 nicht triviale Beiträge und lassen Sie diese von mindestens drei verschiedenen Personen überprüfen (drei Personen müssen Sie unterstützen). Bitten Sie dann jemanden, Sie zu nominieren. Damit zeigen Sie:

- Ihr Engagement für das Projekt (20 gute Patches erfordern viel Ihrer wertvollen Zeit),
- Ihre Fähigkeit, mit dem Team zusammenzuarbeiten,
- Ihr Verständnis dafür, wie das Team arbeitet (Richtlinien, Prozesse für Tests und Codeüberprüfungen usw.),
- Ihr Verständnis für den Codebestand und den Codierungsstil der Projekte und
- Ihre Fähigkeit, guten Code zu schreiben (zu guter Letzt, aber keineswegs weniger wichtig).

Ein aktueller Committer nominiert Sie, indem er eine E-Mail an [v8-committers@chromium.org](mailto:v8-committers@chromium.org) sendet, die Folgendes enthält:

- Ihren Vor- und Nachnamen
- Ihre E-Mail-Adresse in Gerrit
- eine Erklärung, warum Sie ein Committer sein sollten,
- eine eingebettete Liste von Links zu Überarbeitungen (ungefähr die Top 10), die Ihre Beiträge enthalten.

Zwei weitere Committer müssen Ihre Nominierung unterstützen. Wenn innerhalb von 5 Arbeitstagen keine Einwände erhoben werden, sind Sie ein Committer. Wenn jemand Einwände hat oder weitere Informationen benötigt, diskutieren die Committer und erzielen in der Regel einen Konsens (innerhalb der 5 Arbeitstage). Können Probleme nicht gelöst werden, findet eine Abstimmung unter den aktuellen Committern statt.

Sobald Sie die Zustimmung der bestehenden Committer erhalten haben, erhalten Sie zusätzliche Überprüfungsberechtigungen. Sie werden auch in die Mailingliste [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com) aufgenommen.

Im schlechtesten Fall kann sich der Prozess bis zu zwei Wochen hinziehen. Schreiben Sie weiter Patches! Selbst in den seltenen Fällen, in denen eine Nominierung fehlschlägt, liegt der Einspruch in der Regel an etwas, das leicht zu beheben ist, z. B. „mehr Patches“ oder „nicht genug Personen sind mit der Arbeit dieser Person vertraut“.

## Den Committer-Status beibehalten

Sie müssen wirklich nicht viel tun, um den Committer-Status beizubehalten: Seien Sie einfach weiterhin großartig und helfen Sie dem V8-Projekt!

Im unglücklichen Fall, dass ein Committer weiterhin die gute Bürgerpflicht ignoriert (oder das Projekt aktiv stört), müssen wir möglicherweise den Status dieser Person widerrufen. Der Prozess ist derselbe wie bei der Nominierung eines neuen Committers: Jemand schlägt den Widerruf aus gutem Grund vor, zwei Personen unterstützen den Vorschlag, und wenn kein Konsens erreicht werden kann, kann eine Abstimmung erfolgen. Ich hoffe, das ist einfach genug und dass wir es nie in der Praxis testen müssen.

Zusätzlich kann es, als Sicherheitsmaßnahme, sein, dass wir Ihre Committer-Rechte widerrufen, wenn Sie in Gerrit länger als ein Jahr inaktiv sind (kein Upload, kein Kommentar und keine Überprüfung). Eine Benachrichtigungs-E-Mail wird etwa 7 Tage vor der Entfernung gesendet. Dies ist nicht als Bestrafung gedacht. Wenn Sie danach wieder beitragen möchten, kontaktieren Sie [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com), um die Wiederherstellung zu beantragen, und wir werden dies normalerweise tun.

(Dieses Dokument wurde inspiriert von [become-a-committer](https://dev.chromium.org/getting-involved/become-a-committer).)
