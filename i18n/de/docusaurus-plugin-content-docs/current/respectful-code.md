---
title: &apos;Respektvoller Code&apos;
description: &apos;Inklusivität steht im Mittelpunkt der Kultur von V8, und unsere Werte beinhalten, einander mit Würde zu behandeln. Daher ist es wichtig, dass jeder beitragen kann, ohne den schädlichen Auswirkungen von Vorurteilen und Diskriminierung ausgesetzt zu sein.&apos;
---

Inklusivität steht im Mittelpunkt der Kultur von V8, und unsere Werte beinhalten, einander mit Würde zu behandeln. Daher ist es wichtig, dass jeder beitragen kann, ohne den schädlichen Auswirkungen von Vorurteilen und Diskriminierung ausgesetzt zu sein. Allerdings können Begriffe in unserer Codebasis, Benutzeroberflächen und Dokumentation diese Diskriminierung aufrechterhalten. Dieses Dokument gibt Leitlinien vor, die darauf abzielen, respektlose Terminologie im Code und in der Dokumentation zu adressieren.

## Richtlinie

Terminologie, die abwertend, verletzend oder diskriminierend ist, sei es direkt oder indirekt, sollte vermieden werden.

## Was fällt unter diese Richtlinie?

Alles, was ein Beitragsleistender während der Arbeit mit V8 lesen würde, einschließlich:

- Namen von Variablen, Typen, Funktionen, Dateien, Build-Regeln, Binaries, exportierten Variablen, ...
- Testdaten
- Systemausgabe und Anzeigen
- Dokumentation (sowohl innerhalb als auch außerhalb von Quelldateien)
- Commit-Nachrichten

## Prinzipien

- Seien Sie respektvoll: abwertende Sprache sollte nicht notwendig sein, um zu beschreiben, wie Dinge funktionieren.
- Respektieren Sie kulturell sensible Sprache: Einige Wörter können bedeutende historische oder politische Bedeutungen haben. Bitte seien Sie sich dessen bewusst und verwenden Sie Alternativen.

## Wie weiß ich, ob bestimmte Terminologie akzeptabel ist oder nicht?

Wenden Sie die oben genannten Prinzipien an. Wenn Sie Fragen haben, können Sie sich an `v8-dev@googlegroups.com` wenden.

## Was sind Beispiele für zu vermeidende Terminologie?

Diese Liste soll NICHT umfassend sein. Sie enthält einige Beispiele, auf die Menschen häufig gestoßen sind.


| Begriff     | Vorgeschlagene Alternativen                                      |
| ----------- | ---------------------------------------------------------------- |
| master      | primär, Kontrollgerät, Leiter, Host                              |
| slave       | Replikat, Untergeordnet, Sekundär, Folgender, Gerät, Peripherie  |
| whitelist   | Positivliste, Ausnahmeliste, Einschlussliste                     |
| blacklist   | Negativliste, Sperrliste, Ausschlussliste                        |
| insane      | unerwartet, katastrophal, inkohärent                             |
| sane        | erwartet, angemessen, vernünftig, gültig                         |
| crazy       | unerwartet, katastrophal, inkohärent                             |
| redline     | Prioritätslinie, Grenze, weiche Grenze                           |


## Was, wenn ich mit etwas interagiere, das gegen diese Richtlinie verstößt?

Diese Situation ist einige Male aufgetreten, insbesondere bei Code, der Spezifikationen implementiert. In diesen Fällen kann das Abweichen von der Sprache der Spezifikation das Verständnis der Implementierung beeinträchtigen. Für diese Umstände empfehlen wir eine der folgenden Optionen, in abnehmender Präferenz:

1. Wenn die Verwendung alternativer Terminologie das Verständnis nicht beeinträchtigt, verwenden Sie alternative Terminologie.
1. Falls dies nicht möglich ist, verbreiten Sie die Terminologie nicht über die Schicht hinaus, die die Schnittstelle bildet. Verwenden Sie, wo nötig, alternative Terminologie an den API-Grenzen.
