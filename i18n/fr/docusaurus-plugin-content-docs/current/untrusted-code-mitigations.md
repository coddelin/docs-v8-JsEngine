---
title: &apos;Atténuations du code non fiable&apos;
description: &apos;Si vous intégrez V8 et exécutez du code JavaScript non fiable, activez les atténuations de V8 pour aider à protéger contre les attaques spéculatives par canal auxiliaire.&apos;
---
Début 2018, des chercheurs du Project Zero de Google ont révélé [une nouvelle classe d&apos;attaques](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) qui [exploitent](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html) les optimisations d&apos;exécution spéculative utilisées par de nombreux processeurs. Étant donné que V8 utilise un compilateur JIT optimisant, TurboFan, pour exécuter rapidement le code JavaScript, il est, dans certaines circonstances, vulnérable aux attaques par canal auxiliaire décrites dans la divulgation.

## Rien ne change si vous exécutez uniquement du code digne de confiance

Si votre produit utilise uniquement une instance intégrée de V8 pour exécuter du code JavaScript ou WebAssembly entièrement sous votre contrôle, alors votre utilisation de V8 est probablement non affectée par la vulnérabilité des attaques spéculatives par canal auxiliaire (SSCA). Une instance de Node.js exécutant uniquement du code en lequel vous avez confiance est un exemple de cas non affecté.

Pour tirer parti de la vulnérabilité, un attaquant doit exécuter un code JavaScript ou WebAssembly spécialement conçu dans votre environnement intégré. Si, en tant que développeur, vous avez un contrôle total sur le code exécuté dans votre instance intégrée de V8, alors cela est très peu probable. Cependant, si votre instance intégrée de V8 autorise le téléchargement et l&apos;exécution de code JavaScript ou WebAssembly arbitraire ou autrement non fiable, ou génère et exécute ensuite du code JavaScript ou WebAssembly qui n&apos;est pas complètement sous votre contrôle (par exemple, s&apos;il l&apos;utilise comme cible de compilation), vous devrez peut-être envisager des atténuations.

## Si vous exécutez du code non fiable…

### Mettez à jour vers la dernière version de V8 pour profiter des atténuations et les activer

Des atténuations pour cette classe d&apos;attaques sont disponibles dans V8 à partir de la version [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), il est donc conseillé de mettre à jour votre copie intégrée de V8 vers la version [v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) ou une version ultérieure. Les versions antérieures de V8, y compris celles qui utilisent encore FullCodeGen et/ou CrankShaft, ne disposent pas d&apos;atténuations pour SSCA.

À partir de la version [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), un nouveau drapeau a été introduit dans V8 pour aider à protéger contre les vulnérabilités SSCA. Ce drapeau, appelé `--untrusted-code-mitigations`, est activé par défaut à l&apos;exécution via un drapeau GN au moment de la construction, appelé `v8_untrusted_code_mitigations`.

Ces atténuations sont activées par le drapeau d&apos;exécution `--untrusted-code-mitigations` :

- Masquage des adresses avant les accès mémoire dans WebAssembly et asm.js pour garantir que les chargements mémoire exécutés de manière spéculative ne puissent pas accéder à la mémoire en dehors des tas WebAssembly et asm.js.
- Masquage des indices dans le code JIT utilisé pour accéder aux tableaux et chaînes JavaScript dans les chemins exécutés de manière spéculative pour garantir que les chargements spéculatifs ne puissent pas être effectués avec des tableaux et des chaînes vers des adresses mémoire qui ne devraient pas être accessibles par le code JavaScript.

Les intégrateurs doivent être conscients que les atténuations peuvent s&apos;accompagner d&apos;un compromis de performance. L&apos;impact réel dépend significativement de votre charge de travail. Pour des charges de travail telles que Speedometer, l&apos;impact est négligeable, mais pour des charges de travail computationnelles plus extrêmes, il peut atteindre jusqu&apos;à 15 %. Si vous avez pleinement confiance dans le code JavaScript et WebAssembly que votre instance intégrée de V8 exécute, vous pouvez choisir de désactiver ces atténuations JIT en spécifiant le drapeau `--no-untrusted-code-mitigations` à l&apos;exécution. Le drapeau GN `v8_untrusted_code_mitigations` peut être utilisé pour activer ou désactiver les atténuations au moment de la construction.

Notez que V8 désactive par défaut ces atténuations sur les plateformes où il est supposé que l&apos;intégrateur utilisera l&apos;isolation des processus, comme les plateformes où Chromium utilise l&apos;isolation des sites.

### Exécutez le code non fiable dans un processus séparé

Si vous exécutez du code JavaScript et WebAssembly non fiable dans un processus séparé de toutes les données sensibles, l&apos;impact potentiel des attaques SSCA est considérablement réduit. Grâce à l&apos;isolation des processus, les attaques SSCA ne peuvent observer que les données qui sont mises en bac à sable à l&apos;intérieur du même processus avec le code exécuté, et non les données provenant d&apos;autres processus.

### Envisagez d&apos;ajuster les minuteries haute précision que vous offrez

Une minuterie haute précision facilite l&apos;observation des canaux auxiliaires dans la vulnérabilité SSCA. Si votre produit offre des minuteries haute précision accessibles par du code JavaScript ou WebAssembly non fiable, envisagez de rendre ces minuteries plus grossières ou d&apos;y ajouter du jitter.
