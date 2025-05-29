---
title: &apos;Cacheamento de código para desenvolvedores WebAssembly&apos;
author: &apos;[Bill Budge](https://twitter.com/billb), colocando o Ca-ching! no cacheamento&apos;
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - internos
description: &apos;Este artigo explica o cache de código WebAssembly no Chrome e como os desenvolvedores podem tirar proveito disso para acelerar o carregamento de aplicativos com módulos WebAssembly grandes.&apos;
tweet: &apos;1140631433532334081&apos;
---
Existe um ditado entre os desenvolvedores de que o código mais rápido é o código que não roda. Da mesma forma, o código mais rápido para compilar é o código que não precisa ser compilado. O cacheamento de código WebAssembly é uma nova otimização no Chrome e no V8 que tenta evitar a compilação de código armazenando o código nativo produzido pelo compilador. Já escrevemos [anteriormente](/blog/code-caching) [sobre](/blog/improved-code-caching) [como](/blog/code-caching-for-devs) o Chrome e o V8 armazenam em cache o código JavaScript e as melhores práticas para aproveitar essa otimização. Neste post, descrevemos o funcionamento do cache de código WebAssembly do Chrome e como os desenvolvedores podem usá-lo para acelerar o carregamento de aplicativos com grandes módulos WebAssembly.

<!--truncate-->
## Recapitulação da compilação WebAssembly

WebAssembly é uma maneira de executar código não JavaScript na Web. Um aplicativo web pode usar WebAssembly ao carregar um recurso `.wasm`, que contém código parcialmente compilado de outra linguagem, como C, C++ ou Rust (e mais por vir). O trabalho do compilador WebAssembly é decodificar o recurso `.wasm`, validar que está bem formatado e então compilá-lo em código de máquina nativo que pode ser executado na máquina do usuário.

O V8 possui dois compiladores para WebAssembly: Liftoff e TurboFan. [Liftoff](/blog/liftoff) é o compilador básico, que compila módulos o mais rápido possível para que a execução comece o quanto antes. TurboFan é o compilador de otimização do V8 para JavaScript e WebAssembly. Ele funciona em segundo plano para gerar código nativo de alta qualidade e proporcionar o melhor desempenho possível ao aplicativo web a longo prazo. Para módulos grandes de WebAssembly, o TurboFan pode levar um tempo significativo — 30 segundos a um minuto ou mais — para compilar completamente um módulo WebAssembly em código nativo.

É aí que entra o cacheamento de código. Assim que o TurboFan termina de compilar um grande módulo WebAssembly, o Chrome pode salvar o código em seu cache para que, na próxima vez que o módulo for carregado, possamos pular as compilações do Liftoff e do TurboFan, levando a um início mais rápido e menor consumo de energia — compilar código é muito intensivo em CPU.

O cacheamento de código WebAssembly usa o mesmo mecanismo no Chrome utilizado para o cacheamento de código JavaScript. Usamos o mesmo tipo de armazenamento e a mesma técnica de cache de chave dupla que mantém o código compilado por diferentes origens separado, de acordo com o [isolamento de sites](https://developers.google.com/web/updates/2018/07/site-isolation), um importante recurso de segurança do Chrome.

## Algoritmo de cacheamento de código WebAssembly

Por enquanto, o cacheamento de WebAssembly só é implementado para as chamadas das APIs de streaming, `compileStreaming` e `instantiateStreaming`. Essas chamadas operam em uma solicitação HTTP de um recurso `.wasm`, facilitando o uso dos mecanismos de recuperação e cacheamento de recursos do Chrome e fornecendo uma URL de recurso conveniente para usar como chave na identificação do módulo WebAssembly. O algoritmo de cacheamento funciona da seguinte forma:

1. Quando um recurso `.wasm` é solicitado pela primeira vez (ou seja, uma execução _fria_), o Chrome o baixa da rede e o transmite para o V8 compilar. O Chrome também armazena o recurso `.wasm` no cache de recursos do navegador, que é armazenado no sistema de arquivos do dispositivo do usuário. Esse cache de recursos permite que o Chrome carregue o recurso mais rapidamente da próxima vez que ele for necessário.
1. Quando o TurboFan termina de compilar completamente o módulo e se o recurso `.wasm` for suficientemente grande (atualmente 128 kB), o Chrome grava o código compilado no cache de código WebAssembly. Este cache de código é fisicamente separado do cache de recursos mencionado na etapa 1.
1. Quando um recurso `.wasm` é solicitado uma segunda vez (ou seja, uma execução _quente_), o Chrome carrega o recurso `.wasm` a partir do cache de recursos e simultaneamente consulta o cache de código. Se houver um acerto no cache, os bytes do módulo compilado são enviados para o processo do renderizador e passados para o V8, que desserializa o código em vez de compilar o módulo. Desserializar é mais rápido e consome menos CPU do que compilar.
1. Pode acontecer que o código em cache não seja mais válido. Isso pode ocorrer porque o recurso `.wasm` foi alterado ou porque o V8 foi atualizado, algo que se espera ocorrer pelo menos a cada 6 semanas devido ao rápido ciclo de lançamento do Chrome. Nesse caso, o código nativo em cache é removido do cache e a compilação procede como na etapa 1.

Com base nesta descrição, podemos fazer algumas recomendações para melhorar o uso do cache de código WebAssembly em seu site.

## Dica 1: use a API de streaming do WebAssembly

Como o cache de código só funciona com a API de streaming, compile ou instancie seu módulo WebAssembly com `compileStreaming` ou `instantiateStreaming`, como nesse trecho de código JavaScript:

```js
(async () => {
  const fetchPromise = fetch(&apos;fibonacci.wasm&apos;);
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

Este [artigo](https://developers.google.com/web/updates/2018/04/loading-wasm) detalha as vantagens de usar a API de streaming do WebAssembly. O Emscripten tenta usar essa API por padrão ao gerar o código de carregamento para sua aplicação. Observe que o streaming exige que o recurso `.wasm` tenha o tipo MIME correto, então o servidor deve enviar o cabeçalho `Content-Type: application/wasm` na resposta.

## Dica 2: seja amigável ao cache

Como o cache de código depende da URL do recurso e se o recurso `.wasm` está atualizado, os desenvolvedores devem tentar manter ambos estáveis. Se o recurso `.wasm` for buscado de uma URL diferente, ele será considerado diferente, e o V8 terá que compilar o módulo novamente. Da mesma forma, se o recurso `.wasm` não for mais válido no cache de recursos, o Chrome precisará descartar qualquer código armazenado em cache.

### Mantenha seu código estável

Sempre que você envia um novo módulo WebAssembly, ele deve ser completamente recompilado. Envie novas versões de seu código apenas quando necessário para entregar novos recursos ou corrigir bugs. Quando seu código não mudou, informe o Chrome. Quando o navegador faz uma solicitação HTTP para uma URL de recurso, como um módulo WebAssembly, ele inclui a data e hora da última busca dessa URL. Se o servidor souber que o arquivo não mudou, ele pode enviar uma resposta `304 Not Modified`, que informa ao Chrome e V8 que o recurso em cache e, portanto, o código em cache ainda são válidos. Por outro lado, retornar uma resposta `200 OK` atualiza o recurso `.wasm` em cache e invalida o cache de código, revertendo o WebAssembly para uma execução inicial fria. Siga as [melhores práticas de recursos da web](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) usando a resposta para informar ao navegador se o recurso `.wasm` é armazenável em cache, por quanto tempo ele deve ser válido ou quando foi modificado pela última vez.

### Não altere a URL do seu código

O código compilado em cache está associado à URL do recurso `.wasm`, o que facilita sua consulta sem precisar escanear o recurso real. Isso significa que alterar a URL de um recurso (incluindo quaisquer parâmetros de consulta!) cria uma nova entrada no cache de recursos, o que também exige uma recompilação completa e cria uma nova entrada no cache de código.

### Seja generoso (mas não demais!)

A principal heurística do cache de código do WebAssembly é o tamanho do recurso `.wasm`. Se o recurso `.wasm` for menor que um determinado tamanho limite, não armazenamos os bytes do módulo compilado em cache. O raciocínio aqui é que o V8 pode compilar módulos pequenos rapidamente, possivelmente mais rápido do que carregar o código compilado do cache. No momento, o limite é para recursos `.wasm` de 128 kB ou mais.

Mas maior é melhor apenas até certo ponto. Como os caches ocupam espaço na máquina do usuário, o Chrome tem cuidado para não consumir muito espaço. Atualmente, em máquinas desktop, os caches de código normalmente armazenam algumas centenas de megabytes de dados. Como os caches do Chrome também restringem as maiores entradas no cache a uma fração do tamanho total do cache, há um limite adicional de cerca de 150 MB para o código WebAssembly compilado (metade do tamanho total do cache). É importante notar que os módulos compilados são frequentemente 5–7 vezes maiores do que o recurso `.wasm` correspondente em uma máquina desktop típica.

Essa heurística de tamanho, como o restante do comportamento de cache, pode mudar à medida que determinamos o que funciona melhor para usuários e desenvolvedores.

### Use um service worker

O cache de código do WebAssembly é habilitado para workers e service workers, então é possível usá-los para carregar, compilar e armazenar em cache uma nova versão do código, de modo que ela esteja disponível na próxima vez que seu aplicativo começar. Cada site deve executar pelo menos uma compilação completa de um módulo WebAssembly — use workers para esconder isso de seus usuários.

## Rastreamento

Como desenvolvedor, você pode querer verificar se seu módulo compilado está sendo armazenado em cache pelo Chrome. Os eventos de cache de código do WebAssembly não são exibidos por padrão nas Ferramentas do Desenvolvedor do Chrome, então a melhor maneira de descobrir se seus módulos estão sendo armazenados em cache é usar o recurso um pouco mais profundo `chrome://tracing`.

`chrome://tracing` registra rastros instrumentados do Chrome durante um período de tempo. O rastreamento registra o comportamento de todo o navegador, incluindo outras abas, janelas e extensões, então funciona melhor quando feito em um perfil de usuário limpo, com extensões desativadas e sem outras abas do navegador abertas:

```bash
# Inicie uma nova sessão do navegador Chrome com um perfil de usuário limpo e extensões desativadas
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Navegue para `chrome://tracing` e clique em 'Record' para iniciar uma sessão de rastreamento. Na janela de diálogo que aparece, clique em 'Edit Categories' e marque a categoria `devtools.timeline` à direita em 'Disabled by Default Categories' (você pode desmarcar quaisquer outras categorias pré-selecionadas para reduzir a quantidade de dados coletados). Em seguida, clique no botão 'Record' na janela de diálogo para iniciar o rastreamento.

Em outra aba, carregue ou recarregue seu aplicativo. Deixe-o rodar por tempo suficiente, 10 segundos ou mais, para garantir que a compilação TurboFan seja concluída. Quando terminar, clique em 'Stop' para encerrar o rastreamento. Uma visão de eventos em linha de tempo aparecerá. No canto superior direito da janela de rastreamento, há uma caixa de texto, logo à direita de 'View Options'. Digite `v8.wasm` para filtrar eventos que não sejam do WebAssembly. Você deve ver um ou mais dos seguintes eventos:

- `v8.wasm.streamFromResponseCallback` — O recurso de busca passado para instantiateStreaming recebeu uma resposta.
- `v8.wasm.compiledModule` — TurboFan concluiu a compilação do recurso `.wasm`.
- `v8.wasm.cachedModule` — Chrome escreveu o módulo compilado no cache de código.
- `v8.wasm.moduleCacheHit` — Chrome encontrou o código em seu cache enquanto carregava o recurso `.wasm`.
- `v8.wasm.moduleCacheInvalid` — O V8 não conseguiu desserializar o código em cache porque estava desatualizado.

Em uma execução inicial, esperamos ver os eventos `v8.wasm.streamFromResponseCallback` e `v8.wasm.compiledModule`. Isso indica que o módulo WebAssembly foi recebido e a compilação foi bem-sucedida. Se nenhum dos eventos for observado, verifique se as chamadas da API de streaming do WebAssembly estão funcionando corretamente.

Após uma execução inicial, se o limite de tamanho foi excedido, também esperamos ver um evento `v8.wasm.cachedModule`, significando que o código compilado foi enviado para o cache. É possível obter esse evento, mas que a gravação não seja bem-sucedida por algum motivo. Atualmente não há como observar isso, mas os metadados nos eventos podem mostrar o tamanho do código. Módulos muito grandes podem não caber no cache.

Quando o cache funciona corretamente, uma execução já aquecida produz dois eventos: `v8.wasm.streamFromResponseCallback` e `v8.wasm.moduleCacheHit`. Os metadados desses eventos permitem ver o tamanho do código compilado.

Para mais informações sobre como usar o `chrome://tracing`, veja [nosso artigo sobre cache de código JavaScript (byte) para desenvolvedores](/blog/code-caching-for-devs).

## Conclusão

Para a maioria dos desenvolvedores, o cache de código deve funcionar “automaticamente”. Ele funciona melhor, como qualquer cache, quando as coisas estão estáveis. As heurísticas de cache do Chrome podem mudar entre versões, mas o cache de código possui comportamentos que podem ser usados e limitações que podem ser evitadas. Análises cuidadosas usando `chrome://tracing` podem ajudá-lo a ajustar e otimizar o uso do cache de código WebAssembly pelo seu aplicativo web.
