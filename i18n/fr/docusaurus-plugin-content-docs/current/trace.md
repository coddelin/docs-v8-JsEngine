---
title: 'Suivi de V8'
description: 'Ce document explique comment utiliser la prise en charge de suivi intégrée de V8.'
---
V8 offre une prise en charge pour le suivi. Cela [fonctionne automatiquement lorsque V8 est intégré dans Chrome via le système de suivi de Chrome](/docs/rcs). Mais vous pouvez également l'activer dans tout V8 autonome ou au sein d'un intégrateur qui utilise la plateforme par défaut. Plus de détails sur le trace-viewer sont disponibles [ici](https://github.com/catapult-project/catapult/blob/master/tracing/README.md).

## Suivi dans `d8`

Pour commencer le suivi, utilisez l'option `--enable-tracing`. V8 génère un fichier `v8_trace.json` que vous pouvez ouvrir dans Chrome. Pour l'ouvrir dans Chrome, allez à `chrome://tracing`, cliquez sur « Charger », puis chargez le fichier `v8-trace.json`.

Chaque événement de suivi est associé à un ensemble de catégories, vous pouvez activer/désactiver l’enregistrement des événements de suivi en fonction de leurs catégories. Avec seulement le drapeau ci-dessus, nous activons uniquement les catégories par défaut (un ensemble de catégories avec une faible surcharge). Pour activer davantage de catégories et avoir un contrôle plus précis des différents paramètres, vous devez fournir un fichier de configuration.

Voici un exemple de fichier de configuration `traceconfig.json` :

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

Un exemple d’appel à `d8` avec le suivi et un fichier de configuration de suivi :

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

Le format du fichier de configuration de suivi est compatible avec celui de Chrome Tracing, cependant, nous ne prenons pas en charge les expressions régulières dans la liste des catégories incluses, et V8 n’a pas besoin de liste de catégories exclues, ainsi le fichier de configuration de suivi pour V8 peut être réutilisé dans Chrome Tracing, mais vous ne pouvez pas réutiliser le fichier de configuration de suivi de Chrome dans le suivi de V8 si le fichier contient des expressions régulières. De plus, V8 ignore la liste des catégories exclues.

## Activer les statistiques des appels d'exécution dans le suivi

Pour obtenir les statistiques des appels d'exécution (<abbr>RCS</abbr>), veuillez enregistrer le suivi avec les deux catégories suivantes activées : `v8` et `disabled-by-default-v8.runtime_stats`. Chaque événement V8 de niveau supérieur contient les statistiques d'exécution pour la période de cet événement. En sélectionnant l'un de ces événements dans `trace-viewer`, la table de statistiques d'exécution est affichée dans le panneau inférieur. La sélection de plusieurs événements crée une vue fusionnée.

![](/_img/docs/trace/runtime-stats.png)

## Activer les statistiques des objets GC dans le suivi

Pour obtenir les statistiques des objets GC dans le suivi, vous devez collecter un suivi avec la catégorie `disabled-by-default-v8.gc_stats` activée et utiliser les drapeaux `--js-flags` suivants :

```
--track_gc_object_stats --noincremental-marking
```

Une fois que vous chargez le suivi dans `trace-viewer`, recherchez les tranches nommées : `V8.GC_Object_Stats`. Les statistiques apparaissent dans le panneau inférieur. La sélection de plusieurs tranches crée une vue fusionnée.

![](/_img/docs/trace/gc-stats.png)
