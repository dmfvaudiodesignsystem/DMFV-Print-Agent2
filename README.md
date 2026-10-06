# DMFV Print Agent

Programa pequeno que roda no computador da loja (ícone na bandeja do Windows) e deixa o
sistema DMFV imprimir direto nas impressoras instaladas nesse computador, sem janela de impressão.

## Como funciona

O agente abre um servidor **somente local** em `http://127.0.0.1:9101`. O sistema DMFV, rodando no
navegador daquele mesmo computador, fala com ele. Não precisa de domínio fixo, nem de mudança no
seu servidor, nem de abrir porta em roteador.

- `GET  /status`    confirma que o agente está rodando
- `GET  /printers`  lista as impressoras reais instaladas no Windows
- `POST /print`     `{ printer, html, copies, widthMm, heightMm }` imprime um HTML
- `POST /test`      `{ printer, kind }` imprime página de teste (`cupom80`, `cupom58`, `etiqueta`, `a4`)

O sistema monta o cupom, a etiqueta ou o relatório em HTML (com código de barras já desenhado) e o
agente só entrega para a impressora escolhida.

## Rodar para testar

```
npm install
npm start
```

O ícone aparece na bandeja. Para conferir, abra no navegador: http://127.0.0.1:9101/printers
Você deve ver a lista das suas impressoras. No menu do ícone, use **Imprimir teste**.

## Gerar o instalador (.exe)

```
npm run dist
```

O instalador fica em `dist/`. É um instalador único: a loja instala, o agente abre sozinho e passa
a iniciar com o Windows.

## Configuração

Arquivo `config.json` (menu do ícone > Abrir pasta de configuração). Reinicie o agente depois de editar.

- `port`: porta local (padrão 9101)
- `allowedOrigins`: endereços do seu sistema autorizados. Quando tiver o domínio, coloque
  `["https://seudominio.com.br"]` para que nenhum outro site consiga imprimir.
- `token`: opcional. Se preencher, o sistema precisa mandar o mesmo valor (`configure({ token })`).
- `autostart`: iniciar com o Windows
- `apiBaseUrl`: endereço futuro da API. Enquanto estiver vazio, o agente funciona somente no modo local.

### Endereço futuro da API

O endereço padrão fica em `src/constants.js`, na constante `DEFAULT_API_BASE_URL`.
Quando o domínio definitivo estiver pronto, altere somente essa linha, por exemplo:

```js
const DEFAULT_API_BASE_URL = 'https://api.seudominio.com.br';
```

Também é possível sobrescrever o endereço pelo painel do agente em **Configurações** sem recompilar.
Nenhuma chave secreta deve ser salva nesse arquivo: ele contém somente o endereço público da API.

## Usar no sistema

Copie `web/dmfv-printer.js` para o projeto. Exemplo:

```js
import { isOnline, listPrinters, printHtml } from './lib/dmfv-printer';

if (await isOnline()) {
  const printers = await listPrinters();           // preencher o dropdown de impressoras
  await printHtml({
    printer: printers[0].name,
    html: '<h3>DMFV STORE</h3><p>Venda #VEN-000052</p>',
    widthMm: 80                                    // bobina 80 mm; sem widthMm = A4
  });
}
```

A escolha da impressora vale por computador, então guarde no `localStorage` do navegador, não no banco.
O arquivo `PROMPT_AI_STUDIO.md` tem um texto pronto para pedir essa integração ao Gemini.

## Observações

- O Chrome pode pedir uma permissão única de "acesso à rede local" na primeira vez. É só permitir.
- Impressão de etiqueta e cupom usa o driver do Windows (precisa da impressora instalada). Comandos
  diretos (ESC/POS e ZPL) ficam para uma próxima versão.
- Um futuro "modo nuvem" (imprimir de outro aparelho para o PC da loja) pode ser adicionado depois,
  usando o domínio fixo.
