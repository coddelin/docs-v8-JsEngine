---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) et Frank Yung-Fong Tang"
avatars: 
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags: 
  - Intl
  - Node.js 14
description: "L'API Intl.DisplayNames permet d'obtenir des noms localisés de langues, de régions, d'écritures et de devises."
tweet: "1232333889005334529"
---
Les applications Web destinées à un public mondial doivent afficher les noms des langues, des régions, des écritures et des devises dans de nombreuses langues. Les traductions de ces noms nécessitent des données disponibles dans le [Unicode CLDR](http://cldr.unicode.org/translation/). L'intégration de ces données dans l'application engendre un coût en temps de développement. Les utilisateurs préfèrent généralement des traductions cohérentes des noms de langues et de régions, et la mise à jour de ces données en fonction des événements géopolitiques mondiaux nécessite un entretien constant.

<!--truncate-->
Heureusement, la plupart des environnements d'exécution JavaScript incluent déjà ces données de traduction mises à jour. La nouvelle API `Intl.DisplayNames` donne aux développeurs JavaScript un accès direct à ces traductions, permettant ainsi aux applications d'afficher plus facilement des noms localisés.

## Exemples d'utilisation

L'exemple suivant montre comment créer un objet `Intl.DisplayNames` pour obtenir des noms de régions en anglais à l'aide des [codes des pays à deux lettres ISO-3166](https://www.iso.org/iso-3166-country-codes.html).

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'États-Unis'
regionNames.of('BA');
// → 'Bosnie-Herzégovine'
regionNames.of('MM');
// → 'Myanmar (Birmanie)'
```

L'exemple suivant obtient les noms des langues en chinois traditionnel à l'aide de la [grammaire des identifiants de langue Unicode](http://unicode.org/reports/tr35/#Unicode_language_identifier).

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

L'exemple suivant obtient les noms des devises en chinois simplifié à l'aide des [codes de devise à trois lettres ISO-4217](https://www.iso.org/iso-4217-currency-codes.html). Dans les langues ayant des formes singulières et plurielles distinctes, les noms de devises sont au singulier. Pour les formes plurielles, [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat) peut être utilisé.

```js
const currencyNames = new Intl.DisplayNames(['zh-Hans'], {type: 'currency'});
currencyNames.of('USD');
// → '美元'
currencyNames.of('EUR');
// → '欧元'
currencyNames.of('JPY');
// → '日元'
currencyNames.of('CNY');
// → '人民币'
```

L'exemple suivant montre le dernier type pris en charge, les écritures, en anglais, à l'aide des [codes d'écriture à quatre lettres ISO-15924](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabe'
scriptNames.of('Kana');
// → 'Katakana'
```

Pour une utilisation plus avancée, le second paramètre `options` prend également en charge la propriété `style`. La propriété `style` correspond à la largeur du nom affiché et peut être soit `"long"`, `"short"`, ou `"narrow"`. Les valeurs pour différents styles ne diffèrent pas toujours. La valeur par défaut est `"long"`.

```js
const longLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' });
longLanguageNames.of('en-US');
// → 'Anglais américain'
const shortLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'short' });
shortLanguageNames.of('en-US');
// → 'Anglais US'
const narrowLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'narrow' });
narrowLanguageNames.of('en-US');
// → 'Anglais US'
```

## API complète

L'API complète de `Intl.DisplayNames` est la suivante.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

Le constructeur est cohérent avec les autres API `Intl`. Son premier argument est une [liste de locales](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation), et son second paramètre est un paramètre `options` qui prend les propriétés `localeMatcher`, `type` et `style`.

La propriété `"localeMatcher"` est utilisée de la même manière que dans [d'autres API `Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation). La propriété `type` peut être `"region"`, `"language"`, `"currency"`, ou `"script"`. La propriété `style` peut être `"long"`, `"short"`, ou `"narrow"`, avec `"long"` étant la valeur par défaut.

`Intl.DisplayNames.prototype.of( code )` attend les formats suivants en fonction du `type` de l'instance à partir de laquelle elle est construite.

- Lorsque `type` est `"region"`, `code` doit être soit un [code pays à deux lettres ISO-3166](https://www.iso.org/iso-3166-country-codes.html), soit un [code région à trois chiffres UN M49](https://unstats.un.org/unsd/methodology/m49/).
- Lorsque `type` est `"language"`, `code` doit être conforme à la [grammaire de l'identifiant de langue Unicode](https://unicode.org/reports/tr35/#Unicode_language_identifier).
- Lorsque `type` est `"currency"`, `code` doit être un [code de devise à 3 lettres ISO-4217](https://www.iso.org/iso-4217-currency-codes.html).
- Lorsque `type` est `"script"`, `code` doit être un [code de script à 4 lettres ISO-15924](https://unicode.org/iso15924/iso15924-codes.html).

## Conclusion

Comme pour les autres API `Intl`, lorsque `Intl.DisplayNames` sera davantage disponible, les bibliothèques et applications choisiront d'abandonner l'emballage et la livraison de leurs propres données de traduction au profit de l'utilisation de la fonctionnalité native.

## Support de `Intl.DisplayNames`

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
