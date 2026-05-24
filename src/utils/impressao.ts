import type { Comanda } from '../types'

const TIPO_LABEL: Record<string, string> = {
  mesa: 'Mesa',
  entrega: 'Entrega',
  balcao: 'Balcão',
}

export function imprimirComanda(comanda: Pick<Comanda, 'numero' | 'cliente' | 'tipoAtendimento' | 'mesa' | 'enderecoEntrega' | 'itens' | 'observacaoGeral' | 'criadaEm'>) {
  const agora = new Date(comanda.criadaEm)
  const dataHora = agora.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const tipoLabel = TIPO_LABEL[comanda.tipoAtendimento ?? 'mesa']

  const localInfo = comanda.tipoAtendimento === 'entrega'
    ? `<p style="margin:0">Endereço: <b>${comanda.enderecoEntrega ?? ''}</b></p>`
    : comanda.tipoAtendimento === 'mesa' && comanda.mesa
      ? `<p style="margin:0">Mesa: <b>${comanda.mesa}</b></p>`
      : ''

  const itensHtml = comanda.itens.map(item => `
    <tr>
      <td style="padding:3px 0;vertical-align:top;width:28px"><b>${item.quantidade}x</b></td>
      <td style="padding:3px 0;vertical-align:top">
        ${item.nome}
        ${item.observacao ? `<br><span style="font-size:11px;color:#555">↳ ${item.observacao}</span>` : ''}
      </td>
    </tr>
  `).join('')

  const obsHtml = comanda.observacaoGeral
    ? `<div style="border-top:1px dashed #999;margin-top:8px;padding-top:8px;font-size:12px">
        <b>Obs:</b> ${comanda.observacaoGeral}
       </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda #${comanda.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      width: 72mm;
      padding: 6mm;
      color: #000;
    }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { width: 72mm; }
    }
  </style>
</head>
<body>
  <div class="center">
    <b style="font-size:16px">PedidoCerto</b>
    <p style="font-size:11px;color:#555">Controle de Pedidos</p>
  </div>

  <div class="divider"></div>

  <p><b>Comanda:</b> #${comanda.numero}</p>
  <p><b>Cliente:</b> ${comanda.cliente}</p>
  <p><b>Tipo:</b> ${tipoLabel}</p>
  ${localInfo}
  <p><b>Data/Hora:</b> ${dataHora}</p>

  <div class="divider"></div>

  <table>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  ${obsHtml}

  <div class="divider"></div>
  <div class="center" style="font-size:11px;color:#555">
    <p>Total de itens: ${comanda.itens.reduce((s, i) => s + i.quantidade, 0)}</p>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=420,height=600')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}
