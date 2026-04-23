/**
 * BS Finances — Google Apps Script
 * Recebe os dados do quiz e salva numa aba do Google Sheets.
 *
 * COMO USAR:
 * 1. Abra um Google Sheets novo (ex: "BS Finances - Leads")
 * 2. Na primeira linha (cabeçalho), adicione estas colunas EXATAMENTE nessa ordem:
 *    A: Data/Hora
 *    B: Nome
 *    C: Telefone
 *    D: Email
 *    E: Categoria
 *    F: Credito
 *    G: Parcelas
 *    H: Parcela Consórcio
 *    I: Parcela Financiamento
 *    J: Total Consórcio
 *    K: Total Financiamento
 *    L: Economia R$
 *    M: Economia %
 *    N: Origem
 *
 * 3. No menu: Extensões → Apps Script
 * 4. Apague o código padrão e cole TODO este arquivo
 * 5. Clique em "Salvar" (ícone de disquete)
 * 6. Clique em "Implantar" → "Nova implantação"
 * 7. Tipo: "Aplicativo da Web"
 *    - Executar como: "Eu" (seu email)
 *    - Quem tem acesso: "Qualquer pessoa"
 * 8. Clique em "Implantar" e copie a URL
 * 9. Cole essa URL na constante SHEETS_ENDPOINT em script.js
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    const row = [
      new Date(data.timestamp || Date.now()),
      data.nome || '',
      data.telefone || '',
      data.email || '',
      data.categoria || '',
      data.credito || 0,
      data.parcelas || 0,
      data.parcela_consorcio || 0,
      data.parcela_financiamento || 0,
      data.total_consorcio || 0,
      data.total_financiamento || 0,
      data.economia || 0,
      (data.economia_percent || 0) + '%',
      data.origem || ''
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('BS Finances — Endpoint ativo')
    .setMimeType(ContentService.MimeType.TEXT);
}
