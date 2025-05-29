---
title: "Un `JSON.stringify` bien formé"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: 'JSON.stringify génère désormais des séquences d'échappement pour les solitaires, rendant sa sortie en Unicode valide (et représentable en UTF-8).'
---
`JSON.stringify` était précédemment spécifié pour retourner des chaînes Unicode mal formées si l'entrée contenait des solitaires :

```js
JSON.stringify('\uD800');
// → '"�"'
```

[La proposition “Un `JSON.stringify` bien formé”](https://github.com/tc39/proposal-well-formed-stringify) modifie `JSON.stringify` pour qu'il génère des séquences d'échappement pour les solitaires, rendant sa sortie un Unicode valide (et représentable en UTF-8) :

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Notez que `JSON.parse(stringified)` produit toujours les mêmes résultats qu'avant.

Cette fonctionnalité est une petite correction qui était attendue depuis longtemps en JavaScript. C'est une chose de moins à craindre pour les développeurs JavaScript. En combinaison avec [_JSON ⊂ ECMAScript_](/features/subsume-json), elle permet d'incorporer en toute sécurité des données sérialisées en JSON comme littéraux dans les programmes JavaScript, et d'écrire le code généré sur disque dans n'importe quel encodage compatible Unicode (par exemple UTF-8). Cela est extrêmement utile pour [les cas d'utilisation de métaprogrammation](/features/subsume-json#embedding-json).

## Support de la fonctionnalité

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
