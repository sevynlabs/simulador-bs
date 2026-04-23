# BS Finances — Simulador de Consórcio

Quiz interativo que simula consórcio e compara com financiamento tradicional, gerando relatório em PDF para o lead.

## Features

- Quiz em 5 etapas com UX de lead magnet
- 5 categorias: Imóvel, Veículo, Motos, Trator, Máquinas
- Cálculos baseados em taxas reais do **BB Consórcio** (Banco do Brasil)
- Comparação lado-a-lado: Financiamento × Consórcio
- Relatório PDF com logo, dados do lead, comparativo e contato
- Captura de leads com envio para Google Sheets
- Design responsivo (mobile/tablet/desktop) com paleta verde + amarelo
- Tipografia IBM Plex Sans (padrão financeiro)

## Stack

- HTML5 / CSS3 / JavaScript vanilla
- [jsPDF](https://github.com/parallax/jsPDF) via CDN para geração de PDF
- Google Apps Script para integração com Sheets
- Zero dependências de build/bundler

## Estrutura

```
BsFinances/
├── index.html                 # Marcação das 5 etapas
├── styles.css                 # Design system (verde + amarelo)
├── script.js                  # Lógica, cálculo, PDF, Sheets
├── google-apps-script.js      # Código para colar no Apps Script
└── public/
    └── logo.png               # Logo BS Finances
```

## Rodar localmente

```bash
python3 -m http.server 8888
# abra http://localhost:8888
```

## Integração Google Sheets

1. Crie um Google Sheets com cabeçalho: `Data/Hora | Nome | Telefone | Email | Categoria | Credito | Parcelas | Parcela Consórcio | Parcela Financiamento | Total Consórcio | Total Financiamento | Economia R$ | Economia % | Origem`
2. Extensões → Apps Script → cole o conteúdo de `google-apps-script.js`
3. Implantar → Nova implantação → Aplicativo da Web (executar como você, acesso a qualquer pessoa)
4. Cole a URL em `SHEETS_ENDPOINT` (linha ~10 de `script.js`)

## Deploy (Coolify)

O projeto inclui `Dockerfile` + `nginx.conf` prontos para build automático no Coolify.

1. No Coolify: **+ New Resource → Public Repository** (ou **Private** se preferir via GitHub App)
2. URL: `https://github.com/sevynlabs/simulador-bs`
3. Branch: `main`
4. Build Pack: **Dockerfile** (detecção automática)
5. Port: `80`
6. Domínio: aponte o DNS para o servidor e configure em **Domains**
7. Deploy

A cada push na `main`, o Coolify refaz o build automaticamente (se webhook estiver ativo).

## Contato

- WhatsApp: (34) 99923-8855
- Instagram: [@bsfinances](https://instagram.com/bsfinances)
