# Prompt para colar no Google AI Studio

Cole o conteúdo de `web/dmfv-printer.js` em `src/lib/dmfv-printer.js` e depois envie:

---

Integre o agente local de impressão ao sistema, sem alterar nenhuma regra de negócio existente.
O agente roda no computador do operador em http://127.0.0.1:9101 e já existe o arquivo
`src/lib/dmfv-printer.js` com as funções isOnline, listPrinters, printTest e printHtml.

1. Em Administração, crie a página "Impressoras". Mostre o status do agente (online/offline). Quando
   online, carregue as impressoras reais com listPrinters() e mostre um dropdown para cada função:
   Cupom 80 mm, Cupom 58 mm, Etiquetas e Folha A4. Ao lado de cada uma, um botão "Imprimir teste"
   usando printTest. Inclua "Atualizar lista". Salve a escolha no localStorage (é por computador,
   não no banco). Remova os nomes de impressora fixos que existem hoje.
2. No PDV, ao finalizar a venda, imprima o cupom com printHtml na impressora escolhida (widthMm 80
   ou 58), usando o mesmo layout de nota que já existe. Se o agente estiver offline, caia no
   window.print() atual e avise o operador.
3. Crie a função "Imprimir etiquetas" (estoque e cadastro de produto): escolher produtos, quantidade
   de cópias e tamanho (40x25, 60x30, 100x50 mm), com prévia. Gere o código de barras com JsBarcode
   em SVG dentro do HTML e envie com printHtml na impressora de etiquetas, passando widthMm e heightMm.
4. Em todos os casos, mostre mensagens claras de erro vindas do agente.
