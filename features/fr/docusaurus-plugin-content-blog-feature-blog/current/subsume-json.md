---
title: &apos;Incorporer JSON, autrement dit JSON ⊂ ECMAScript&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-08-14
tags:
  - ES2019
description: &apos;JSON est désormais un sous-ensemble syntaxique d&apos;ECMAScript.&apos;
tweet: &apos;1161649929904885762&apos;
---
Avec [la proposition _JSON ⊂ ECMAScript_](https://github.com/tc39/proposal-json-superset), JSON devient un sous-ensemble syntaxique d&apos;ECMAScript. Si vous êtes surpris que cela n&apos;était pas déjà le cas, vous n&apos;êtes pas le seul !

## Le comportement ancien d&apos;ES2018

En ES2018, les littéraux de chaîne de caractères d&apos;ECMAScript ne pouvaient pas contenir les caractères séparateurs de ligne U+2028 LINE SEPARATOR et U+2029 PARAGRAPH SEPARATOR non échappés, car ils sont considérés comme des terminaux de ligne même dans ce contexte :

```js
// Une chaîne contenant un caractère U+2028 brut.
const LS = &apos; &apos;;
// → ES2018 : SyntaxError

// Une chaîne contenant un caractère U+2029 brut, produit par `eval` :
const PS = eval(&apos;"\u2029"&apos;);
// → ES2018 : SyntaxError
```

Cela posait problème car les chaînes JSON _peuvent_ contenir ces caractères. En conséquence, les développeurs devaient implémenter une logique de post-traitement spécialisée lors de l&apos;intégration de JSON valide dans des programmes ECMAScript pour gérer ces caractères. Sans cette logique, le code pouvait comporter des bugs subtils, voire des [problèmes de sécurité](#security) !

<!--truncate-->
## Le nouveau comportement

En ES2019, les littéraux de chaîne peuvent désormais contenir les caractères U+2028 et U+2029 bruts, éliminant ainsi la confusion d&apos;incohérence entre ECMAScript et JSON.

```js
// Une chaîne contenant un caractère U+2028 brut.
const LS = &apos; &apos;;
// → ES2018 : SyntaxError
// → ES2019 : pas d&apos;exception

// Une chaîne contenant un caractère U+2029 brut, produit par `eval` :
const PS = eval(&apos;"\u2029"&apos;);
// → ES2018 : SyntaxError
// → ES2019 : pas d&apos;exception
```

Cette petite amélioration simplifie grandement le modèle mental pour les développeurs (une complication de moins à retenir !), et réduit le besoin de logique de post-traitement spécialisée lors de l&apos;intégration de JSON valide dans des programmes ECMAScript.

## Intégrer JSON dans des programmes JavaScript

Grâce à cette proposition, `JSON.stringify` peut désormais être utilisé pour générer des littéraux de chaînes ECMAScript valides, des littéraux d&apos;objet et des littéraux de tableau. Et grâce à la proposition distincte [_`JSON.stringify` bien formé_](/features/well-formed-json-stringify), ces littéraux peuvent être représentés en toute sécurité en UTF-8 et d&apos;autres encodages (pratique si vous souhaitez les écrire dans un fichier sur disque). Cela est extrêmement utile pour les cas d&apos;utilisation liés à la métaprogrammation, comme la création dynamique de code source JavaScript et son écriture sur disque.

Voici un exemple de création d&apos;un programme JavaScript valide intégrant un objet de données donné, en tirant parti de la grammaire JSON qui est désormais un sous-ensemble d&apos;ECMAScript :

```js
// Un objet JavaScript (ou tableau, ou chaîne) représentant des données.
const data = {
  LineTerminators: &apos;\n\r  &apos;,
  // Remarque : la chaîne contient 4 caractères : &apos;\n\r\u2028\u2029&apos;.
};

// Transformez les données en leur forme JSON-stringifiée. Grâce à JSON ⊂
// ECMAScript, la sortie de `JSON.stringify` est garantie d&apos;être
// un littéral ECMAScript syntaxiquement valide :
const jsObjectLiteral = JSON.stringify(data);

// Créez un programme ECMAScript valide qui intègre les données comme un objet
// littéral.
const program = `const data = ${ jsObjectLiteral };`;
// → &apos;const data = {"LineTerminators":"…"};&apos;
// (Un échappement supplémentaire est nécessaire si la cible est un <script> inline.)

// Écrivez un fichier contenant le programme ECMAScript sur disque.
saveToDisk(filePath, program);
```

Le script ci-dessus produit le code suivant, qui s&apos;évalue à un objet équivalent :

```js
const data = {"LineTerminators":"\n\r  "};
```

## Intégrer JSON dans des programmes JavaScript avec `JSON.parse`

Comme expliqué dans [_le coût du JSON_](/blog/cost-of-javascript-2019#json), au lieu d&apos;intégrer les données comme un littéral d&apos;objet JavaScript, comme ceci :

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…les données peuvent être représentées sous forme JSON-stringifiée, puis analysées avec `JSON.parse` au moment de l&apos;exécution, pour de meilleures performances dans le cas d&apos;objets volumineux (10 kB+):

```js
const data = JSON.parse(&apos;{"foo":42,"bar":1337}&apos;); // 🚀
```

Voici un exemple d&apos;implémentation :

```js
// Un objet JavaScript (ou tableau, ou chaîne) représentant des données.
const data = {
  LineTerminators: &apos;\n\r  &apos;,
  // Remarque : la chaîne contient 4 caractères : &apos;\n\r\u2028\u2029&apos;.
};

// Transformez les données en leur forme JSON-stringifiée.
const json = JSON.stringify(data);

// Maintenant, nous voulons insérer le JSON dans un corps de script en tant que
// littéral de chaîne JavaScript selon https://v8.dev/blog/cost-of-javascript-2019#json,
// en échappant les caractères spéciaux comme `\"` dans les données.
// Grâce à JSON ⊂ ECMAScript, la sortie de `JSON.stringify` est
// garantie d&apos;être un littéral ECMAScript syntaxiquement valide :
const jsStringLiteral = JSON.stringify(json);
// Créez un programme ECMAScript valide qui intègre le littéral de chaîne
// JavaScript représentant les données JSON dans un appel `JSON.parse`.
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → &apos;const data = JSON.parse("…");&apos;
// (Un échappement supplémentaire est nécessaire si la cible est un <script> en ligne.)

// Écrire un fichier contenant le programme ECMAScript sur le disque.
saveToDisk(filePath, program);
```

Le script ci-dessus produit le code suivant, qui évalue à un objet équivalent :

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Le benchmark de Google comparant `JSON.parse` avec les littéraux d'objet JavaScript](https://github.com/GoogleChromeLabs/json-parse-benchmark) utilise cette technique dans son étape de construction. La fonctionnalité de Chrome DevTools "copier en JS" a été [considérablement simplifiée](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js) en adoptant une technique similaire.

## Une note sur la sécurité

JSON ⊂ ECMAScript réduit le décalage entre JSON et ECMAScript dans le cas des littéraux de chaîne spécifiquement. Étant donné que les littéraux de chaîne peuvent apparaître dans d'autres structures de données prises en charge par JSON, telles que les objets et les tableaux, cela résout également ces cas, comme le montrent les exemples de code ci-dessus.

Cependant, U+2028 et U+2029 sont toujours traités comme des caractères de terminaison de ligne dans d'autres parties de la grammaire ECMAScript. Cela signifie qu'il existe encore des cas où il est dangereux d'injecter du JSON dans des programmes JavaScript. Considérons cet exemple, où un serveur injecte un contenu fourni par l'utilisateur dans une réponse HTML après l'avoir exécuté via `JSON.stringify()` :

```ejs
<script>
  // Infos de débogage :
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

Notez que le résultat de `JSON.stringify` est injecté dans un commentaire sur une seule ligne dans le script.

Lorsqu'il est utilisé comme dans l'exemple ci-dessus, `JSON.stringify()` est garanti de renvoyer une seule ligne. Le problème est que ce qui constitue une "seule ligne" [diffère entre JSON et ECMAScript](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136). Si `ua` contient un caractère U+2028 ou U+2029 non échappé, nous sortons du commentaire sur une seule ligne et exécutons le reste de `ua` comme code source JavaScript :

```html
<script>
  // Infos de débogage :
  // User-Agent: "Chaîne fournie par l'utilisateur<U+2028>  alert(&apos;XSS&apos;);//"
</script>
<!-- …est équivalent à : -->
<script>
  // Infos de débogage :
  // User-Agent: "Chaîne fournie par l'utilisateur
  alert(&apos;XSS&apos;);//"
</script>
```

:::note
**Note :** Dans l'exemple ci-dessus, le caractère brut U+2028 non échappé est représenté sous la forme `<U+2028>` pour le rendre plus facile à suivre.
:::

JSON ⊂ ECMAScript n'aide pas ici, car il n'impacte que les littéraux de chaîne — et dans ce cas, la sortie de `JSON.stringify` est injectée à une position où elle ne produit pas directement un littéral de chaîne JavaScript.

Sauf si un post-traitement spécial pour ces deux caractères est introduit, le fragment de code ci-dessus présente une vulnérabilité de type cross-site scripting (XSS) !

:::note
**Note :** Il est crucialement important de post-traiter les entrées contrôlées par l'utilisateur pour échapper à toutes les séquences de caractères spéciales, en fonction du contexte. Dans ce cas particulier, nous injectons dans une balise `<script>`, donc nous devons (aussi) [échapper `</script`, `<script` et `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations).
:::

## Support pour JSON ⊂ ECMAScript

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="oui"
                 safari="oui"
                 nodejs="10"
                 babel="oui https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
