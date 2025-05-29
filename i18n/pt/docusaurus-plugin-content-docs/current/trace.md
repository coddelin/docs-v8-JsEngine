---
title: &apos;Rastreando o V8&apos;
description: &apos;Este documento explica como utilizar o suporte de rastreamento incorporado do V8.&apos;
---
O V8 oferece suporte para rastreamento. Ele [funciona automaticamente quando o V8 está incorporado no Chrome através do sistema de rastreamento do Chrome](/docs/rcs). Mas você também pode habilitá-lo em qualquer V8 standalone ou dentro de um incorporador que usa a Plataforma Padrão. Mais detalhes sobre o trace-viewer podem ser encontrados [aqui](https://github.com/catapult-project/catapult/blob/master/tracing/README.md).

## Rastreamento no `d8`

Para começar o rastreamento, use a opção `--enable-tracing`. O V8 gera um arquivo `v8_trace.json` que você pode abrir no Chrome. Para abrir no Chrome, vá para `chrome://tracing`, clique em “Carregar” e então carregue o arquivo `v8-trace.json`.

Cada evento de rastreamento está associado a um conjunto de categorias, você pode habilitar/desabilitar o registro de eventos de rastreamento com base em suas categorias. Somente com a flag acima, habilitamos apenas as categorias padrões (um conjunto de categorias que possui baixa sobrecarga). Para habilitar mais categorias e ter um controle mais fino dos diferentes parâmetros, você precisa passar um arquivo de configuração.

Aqui está um exemplo de um arquivo de configuração `traceconfig.json`:

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

Um exemplo de chamada ao `d8` com rastreamento e um arquivo traceconfig:

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

O formato de configuração de rastreamento é compatível com o do Chrome Tracing, no entanto, não suportamos expressões regulares na lista de categorias incluídas, e o V8 não precisa da lista de categorias excluídas; portanto, o arquivo de configuração de rastreamento para o V8 pode ser reutilizado no Chrome tracing, mas você não pode reutilizar o arquivo de configuração de rastreamento do Chrome no V8 tracing se o arquivo de configuração de rastreamento contiver expressões regulares; além disso, o V8 ignora a lista de categorias excluídas.

## Habilitando Estatísticas de Chamadas de Runtime no rastreamento

Para obter Estatísticas de Chamadas de Runtime (<abbr>RCS</abbr>), registre o rastreamento com as seguintes duas categorias habilitadas: `v8` e `disabled-by-default-v8.runtime_stats`. Cada evento de rastreamento de nível superior do V8 contém as estatísticas de tempo de execução para o período desse evento. Ao selecionar qualquer um desses eventos em `trace-viewer`, a tabela de estatísticas de runtime é exibida no painel inferior. Selecionar vários eventos cria uma visualização mesclada.

![](/_img/docs/trace/runtime-stats.png)

## Habilitando Estatísticas de Objetos do GC no rastreamento

Para obter as Estatísticas de Objetos do GC no rastreamento, você precisa coletar um rastreamento com a categoria `disabled-by-default-v8.gc_stats` habilitada e também usar as seguintes `--js-flags`:

```
--track_gc_object_stats --noincremental-marking
```

Uma vez que você carrega o rastreamento no `trace-viewer`, procure por pedaços nomeados: `V8.GC_Object_Stats`. As estatísticas aparecem no painel inferior. Selecionar vários pedaços cria uma visualização mesclada.

![](/_img/docs/trace/gc-stats.png)
