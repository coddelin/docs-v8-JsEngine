---
title: &apos;Responsabilités des commiteurs et reviewers de V8&apos;
description: &apos;Ce document énumère les directives pour les contributeurs de V8.&apos;
---
Lorsque vous vous engagez dans les dépôts V8, assurez-vous de suivre ces directives (adaptées de https://dev.chromium.org/developers/committers-responsibility) :

1. Trouvez le bon reviewer pour vos modifications et pour les patches que l’on vous demande de revoir.
1. Soyez disponible sur IM et/ou par e-mail avant et après avoir intégré la modification.
1. Surveillez la [waterfall](https://ci.chromium.org/p/v8/g/main/console) jusqu'à ce que tous les bots deviennent verts après votre modification.
1. Lors de l’intégration d’un changement TBR (À Revoir), assurez-vous de notifier les personnes dont vous modifiez le code. En général, il suffit d'envoyer un e-mail de revue.

En bref, faites ce qui est juste pour le projet, pas ce qui est le plus facile pour intégrer du code, et surtout : utilisez votre meilleur jugement.

**N’ayez pas peur de poser des questions. Il y aura toujours quelqu’un prêt à lire immédiatement les messages envoyés à la liste de diffusion v8-committers qui pourra vous aider.**

## Modifications avec plusieurs reviewers

Il arrive occasionnellement que des modifications impliquent beaucoup de reviewers, car plusieurs personnes doivent parfois être au courant d'une modification en raison de responsabilités et d'expertises multiples.

Le problème est qu’en l’absence de directives, aucune responsabilité claire n’est attribuée dans ces revues.

Si vous êtes l’unique reviewer d’une modification, vous savez que vous devez faire un bon travail. Lorsque trois autres personnes sont impliquées, vous supposez parfois que quelqu’un d’autre a dû examiner attentivement une partie de la revue. Parfois, tous les reviewers pensent cela, et la modification n’est pas correctement examinée.

Dans d’autres cas, certains reviewers disent “LGTM” pour un patch, tandis que d’autres attendent encore des modifications. L’auteur peut être confus quant au statut de la revue, et certains patches ont été intégrés alors qu’au moins un reviewer attendait encore des changements avant l’intégration.

En même temps, nous voulons encourager de nombreuses personnes à participer au processus de revue et à suivre ce qui se passe.

Voici donc quelques lignes directrices pour clarifier le processus :

1. Lorsqu’un auteur de patch demande plusieurs reviewers, il doit préciser dans l’e-mail de demande de revue ce qu’il attend comme responsabilités de chaque reviewer. Par exemple, vous pouvez écrire ceci dans l’e-mail :

    ```
    - larry : changements du bitmap
    - sergey : hacks du processus
    - tous les autres : FYI
    ```

1. Dans ce cas, vous pourriez être dans la liste des reviewers parce que vous avez demandé à être au courant des changements multiprocessus, mais vous ne seriez pas le reviewer principal, et l’auteur ainsi que les autres reviewers ne s’attendraient pas à ce que vous examiniez tous les diffs en détail.
1. Si vous recevez une revue incluant de nombreuses autres personnes, et que l’auteur n’a pas fait (1), demandez-lui quelle partie est de votre responsabilité si vous ne souhaitez pas examiner l’ensemble en détail.
1. L’auteur doit attendre l’approbation de toutes les personnes de la liste des reviewers avant d’intégrer.
1. Les personnes qui participent à une revue sans responsabilité claire (c’est-à-dire les revues impromptues) doivent être très réactives et ne pas retarder la revue. L’auteur du patch doit se sentir libre de les relancer sans ménagement si nécessaire.
1. Si vous êtes une personne « FYI » sur une revue, et que vous n’avez pas réellement examiné en détail (ou pas du tout), mais que vous n’avez pas de problème avec le patch, précisez-le. Vous pouvez dire quelque chose comme « tampon en caoutchouc » ou « ACK » au lieu de « LGTM ». De cette manière, les vrais reviewers comprennent qu’ils ne doivent pas compter sur vous pour avoir fait leur travail, mais l’auteur du patch sait qu’il n’a pas à attendre d’autres retours de votre part. Espérons que nous pouvons toujours tenir tout le monde informé tout en ayant une responsabilité claire et des revues détaillées. Cela pourrait même accélérer certains changements puisque vous pouvez rapidement « ACK » les modifications qui ne vous concernent pas, et l’auteur sait qu’il n’a pas à attendre vos retours.
