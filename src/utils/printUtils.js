// src/utils/printUtils.js
// Módulo centralizado y unificado de impresión térmica para todo el sistema POS
// Garantiza formatos idénticos, máxima legibilidad y soporte de logo

import { formatCOP, formatDateTime, api } from '../api/client';

/**
 * Envía el ticket directamente al Print Bridge local (puerto 8088) sin diálogos ni confirmaciones de Windows
 */
export const sendToThermalBridge = async (text, printerName = null, bridgeUrl = 'http://localhost:8088') => {
  try {
    const url = (bridgeUrl || 'http://localhost:8088').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${url}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, printerName }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ [PrintUtils] Impresión silenciosa enviada con éxito al Print Bridge:', data);
      return { success: true, data };
    }
  } catch (err) {
    console.warn('⚠️ [PrintUtils] Print Bridge no disponible o inalcanzable, usando modo navegador:', err.message);
  }
  return { success: false };
};

/**
 * Consulta el estado y las impresoras disponibles en el Print Bridge local
 */
export const checkPrintBridgeHealth = async (bridgeUrl = 'http://localhost:8088') => {
  try {
    const url = (bridgeUrl || 'http://localhost:8088').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { online: true, data };
    }
  } catch (e) {
    // Offline
  }
  return { online: false };
};

export const getPrintBridgePrinters = async (bridgeUrl = 'http://localhost:8088') => {
  try {
    const url = (bridgeUrl || 'http://localhost:8088').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${url}/printers`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return data.printers || [];
    }
  } catch (e) {
    // Offline
  }
  return [];
};

/**
 * Envía un ticket de prueba con formateo ESC/POS al Print Bridge
 */
export const sendTestPrint = async (printerName = null, type = 'comanda', bridgeUrl = 'http://localhost:8088') => {
  try {
    const url = (bridgeUrl || 'http://localhost:8088').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/test-print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName, type }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
  } catch (err) {
    console.error('Error al enviar test-print al Print Bridge:', err);
  }
  return { success: false };
};

/**
 * Crea e inyecta un iframe oculto para imprimir directamente sin ventanas emergentes descentradas
 */
const printWithIframe = (htmlContent, title = 'Impresión POS') => {
  const prevIframe = document.getElementById('pos-print-iframe');
  if (prevIframe) {
    try { prevIframe.remove(); } catch (e) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '0px';
  iframe.style.left = '0px';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.opacity = '0.001';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Error al invocar impresión en iframe:', e);
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    }, 60000);
  };

  const images = doc.images;
  if (images && images.length > 0) {
    let loaded = 0;
    const total = images.length;
    let timer = null;

    const onDone = () => {
      loaded++;
      if (loaded >= total) {
        if (timer) clearTimeout(timer);
        setTimeout(doPrint, 150);
      }
    };

    for (let i = 0; i < images.length; i++) {
      if (images[i].complete) {
        loaded++;
      } else {
        images[i].onload = onDone;
        images[i].onerror = onDone;
      }
    }

    if (loaded >= total) {
      setTimeout(doPrint, 150);
    } else {
      timer = setTimeout(doPrint, 500);
    }
  } else {
    setTimeout(doPrint, 180);
  }
};

/**
 * Obtiene y normaliza el identificador de mesa o tipo de orden evitando repeticiones como 'MESA MESA'
 */
export const getCleanTableOrType = (orderData = {}) => {
  if (orderData.order_type === 'delivery') return 'DOMICILIO';
  if (orderData.order_type === 'para_llevar') return 'PARA LLEVAR';
  const raw = (orderData.table_number || orderData.table_name || '').toString().trim();
  const clean = raw.replace(/^mesa\s*/i, '').trim();
  if (clean) return `MESA ${clean}`;
  return orderData.id ? `ORDEN #${orderData.id}` : 'SALÓN';
};

/**
 * Genera el encabezado estándar del establecimiento (con logo si existe)
 */
const getBusinessHeaderHTML = (settings, paperWidth = '80mm') => {
  const name = settings?.business_name || 'MI NEGOCIO POS';
  const nit = settings?.tax_id || settings?.nit || '';
  const address = settings?.address || '';
  const phone = settings?.phone || '';
  const logoUrl = settings?.logo_url || '';
  const printTaxRegime = settings?.print_tax_regime !== undefined ? (settings.print_tax_regime === true || settings.print_tax_regime === 1 || settings.print_tax_regime === 'true') : true;
  const taxRegime = settings?.tax_regime;
  const customText = settings?.custom_tax_regime_text;

  let regimeText = '';
  if (printTaxRegime) {
    if (customText && customText.trim()) {
      regimeText = customText.trim();
    } else if (taxRegime === 'impoconsumo') {
      regimeText = 'Impoconsumo (INC 8%)';
    } else if (taxRegime === 'iva') {
      regimeText = 'Responsable de IVA';
    } else if (taxRegime === 'no_responsable') {
      regimeText = 'No Responsable de IVA';
    } else if (taxRegime === 'ambos') {
      regimeText = 'Responsable de IVA e INC (8%)';
    } else if (taxRegime === 'rst') {
      regimeText = 'Régimen Simple de Tributación (RST)';
    } else if (taxRegime && taxRegime !== 'personalizado') {
      regimeText = taxRegime;
    }
  }

  return `
    ${logoUrl ? `
      <div style="text-align: center; margin-bottom: 6px;">
        <img src="${logoUrl}" alt="Logo" class="thermal-logo" />
      </div>
    ` : ''}
    <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '14px' : '16px'}; text-transform: uppercase; letter-spacing: -0.2px; color: #000000;">${name}</div>
    ${nit ? `<div class="center bold" style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; color: #000000;">NIT: ${nit}</div>` : ''}
    ${address ? `<div class="center" style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; color: #000000; margin-top: 1px;">${address}</div>` : ''}
    ${phone ? `<div class="center" style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; color: #000000; margin-top: 1px;">Tel: ${phone}</div>` : ''}
    ${regimeText ? `<div class="center bold" style="font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'}; margin-top: 2px; color: #000000;">${regimeText}</div>` : ''}
  `;
};

/**
 * Estilos CSS térmicos base estandarizados y compatibles con todos los navegadores
 */
const getBaseThermalStyles = (paperWidth = '80mm') => `
  @page {
    margin: 0;
    size: auto;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
    color: #000000 !important;
    background: #ffffff !important;
    -webkit-font-smoothing: antialiased;
  }
  .receipt-wrapper {
    width: ${paperWidth === '58mm' ? '270px' : '350px'} !important;
    max-width: 100% !important;
    padding: 16px 14px !important;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
    font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'} !important;
    line-height: 1.35 !important;
    font-weight: 500 !important;
    color: #000000 !important;
    background: #ffffff !important;
    box-sizing: border-box !important;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .left { text-align: left; }
  .bold { font-weight: 800 !important; color: #000000 !important; }
  .black { font-weight: 900 !important; color: #000000 !important; }
  .solid-line { border-top: 1px solid #000000; margin: 5px 0; }
  .double-line { border-top: 2px solid #000000; margin: 5px 0; }
  .dashed-line { border-top: 1px dashed #000000; margin: 5px 0; }
  .flex-between { display: flex; justify-content: space-between; align-items: flex-start; margin: 2.5px 0; color: #000000; font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  td, th { vertical-align: top; padding: 2.5px 0; color: #000000; }
  .thermal-logo {
    max-height: 55px;
    max-width: 140px;
    object-fit: contain;
    display: inline-block;
    filter: grayscale(100%) contrast(170%);
    image-rendering: crisp-edges;
  }
`;

// =========================================================================
// GENERADORES DE TEXTO PLANO PARA IMPRESORAS TÉRMICAS (PRINT BRIDGE ESC/POS)
// =========================================================================

export const buildKitchenTicketPlainText = (orderData, itemsList = [], notes = '', waiter = 'Personal') => {
  const tableOrType = getCleanTableOrType(orderData);
  const orderId = orderData.id || 'NUEVA';
  const width = 38;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);

  let text = '';
  text += doubleLine + '\n';
  text += '     *** COMANDA DE COCINA ***\n';
  text += `           ${tableOrType}\n`;
  text += doubleLine + '\n';
  text += `Orden: #${orderId}\n`;
  text += `Responsable: ${waiter}\n`;
  text += `Hora/Fecha: ${new Date().toLocaleTimeString('es-CO')} ${new Date().toLocaleDateString('es-CO')}\n`;
  if (orderData.customer_name) text += `Cliente: ${orderData.customer_name}\n`;
  if (orderData.delivery_address) text += `Direccion: ${orderData.delivery_address}\n`;
  if (orderData.delivery_phone) text += `Telefono: ${orderData.delivery_phone}\n`;
  text += line + '\n';
  text += 'Cant   Descripcion\n';
  text += line + '\n';

  itemsList.forEach(item => {
    const qty = item.quantity || item.qty || 1;
    const name = (item.product?.name || item.name || 'Producto').toUpperCase();
    const itemNote = item.notes || item.note || '';
    const rawMods = item.modifiers || item.modifiers_json;
    let parsedMods = [];
    if (rawMods) {
      try {
        parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
      } catch (e) {
        parsedMods = Array.isArray(rawMods) ? rawMods : [];
      }
    }

    text += `${qty}x    ${name}\n`;
    if (Array.isArray(parsedMods) && parsedMods.length > 0) {
      parsedMods.forEach(m => {
        text += `      + ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}\n`;
      });
    }
    if (itemNote) {
      text += `      * NOTA: ${itemNote}\n`;
    }
  });

  if (notes) {
    text += line + '\n';
    text += `OBSERVACIONES: ${notes}\n`;
  }
  text += line + '\n';
  text += ' (Comanda Operativa Cocina / Bar)\n';
  text += doubleLine + '\n';
  return text;
};

export const buildPreFacturaPlainText = (orderData, itemsList = [], settings = {}, calculations = {}) => {
  let subtotal = calculations.itemsSubtotal || 0;
  if (!subtotal) {
    subtotal = itemsList.reduce((acc, it) => acc + ((parseFloat(it.quantity || it.qty) || 1) * (parseFloat(it.unit_price || it.price || it.product?.price) || 0)), 0);
  }
  const discount = parseFloat(calculations.discountVal || orderData.discount_amount || 0);
  const deliveryFee = parseFloat(calculations.delFee || orderData.delivery_fee || 0);
  const baseTotal = Math.max(0, subtotal - discount) + deliveryFee;
  const propinaSugerida = calculations.tipVal !== undefined ? calculations.tipVal : (baseTotal * 0.1);
  const totalConPropina = baseTotal + propinaSugerida;
  const tableOrType = getCleanTableOrType(orderData);

  const isConsumidorFinal = !orderData.customer_name || orderData.customer_name.trim().toLowerCase() === 'consumidor final';
  const width = 38;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);

  let text = '';
  text += doubleLine + '\n';
  text += `        ${(settings?.business_name || 'GASTROSPOS').toUpperCase()}\n`;
  if (settings?.nit) text += `          NIT: ${settings.nit}\n`;
  text += doubleLine + '\n';
  text += '    *** PRE-CUENTA / PRE-FACTURA ***\n';
  text += '   (Documento de control - No fiscal)\n';
  text += line + '\n';
  text += `Espacio / Mesa: ${tableOrType}\n`;
  text += `Atendido por: ${orderData.waiter_name || 'Mesero'}\n`;
  text += `Fecha / Hora: ${new Date().toLocaleString('es-CO')}\n`;
  text += line + '\n';
  text += `Cliente: ${isConsumidorFinal ? 'Consumidor Final' : orderData.customer_name}\n`;
  text += `NIT/CC: ${orderData.customer_document || (isConsumidorFinal ? '222222222222' : '')}\n`;
  if (!isConsumidorFinal && orderData.customer_phone) text += `Tel: ${orderData.customer_phone}\n`;
  if (!isConsumidorFinal && (orderData.delivery_address || orderData.customer_address)) text += `Dir: ${orderData.delivery_address || orderData.customer_address}\n`;
  text += line + '\n';
  text += 'Cant  Producto                   Total\n';
  text += line + '\n';

  itemsList.forEach(it => {
    const qty = it.quantity || it.qty || 1;
    const name = (it.product?.name || it.name || 'Producto').substring(0, 20).padEnd(20, ' ');
    const price = parseFloat(it.unit_price || it.price || it.product?.price || 0);
    const tot = formatCOP(price * qty).padStart(11, ' ');
    text += `${qty}x   ${name} ${tot}\n`;

    const rawMods = it.modifiers || it.modifiers_json;
    let parsedMods = [];
    if (rawMods) {
      try {
        parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
      } catch (e) {
        parsedMods = Array.isArray(rawMods) ? rawMods : [];
      }
    }
    if (Array.isArray(parsedMods) && parsedMods.length > 0) {
      parsedMods.forEach(m => {
        const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
        const extraStr = extra > 0 ? ` (+${formatCOP(extra)})` : '';
        text += `      + ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}${extraStr}\n`;
      });
    }
  });

  text += line + '\n';
  text += `Subtotal Items:`.padEnd(22) + `${formatCOP(subtotal)}`.padStart(16) + '\n';
  if (discount > 0) text += `Descuento:`.padEnd(22) + `-${formatCOP(discount)}`.padStart(16) + '\n';
  if (deliveryFee > 0) text += `Tarifa Domicilio:`.padEnd(22) + `+${formatCOP(deliveryFee)}`.padStart(16) + '\n';
  text += line + '\n';
  text += `TOTAL CONSUMO:`.padEnd(22) + `${formatCOP(baseTotal)}`.padStart(16) + '\n';
  text += `Propina Sugerida (10%):`.padEnd(22) + `+${formatCOP(propinaSugerida)}`.padStart(16) + '\n';
  text += doubleLine + '\n';
  text += `TOTAL CON PROPINA:`.padEnd(20) + `${formatCOP(totalConPropina)}`.padStart(18) + '\n';
  text += line + '\n';
  text += `  ${settings?.receipt_footer || '¡Muchas gracias por su visita!'}\n`;
  text += doubleLine + '\n';
  return text;
};

export const buildInvoicePlainText = (invoice, settings = {}) => {
  const mergedSettings = { ...(invoice.settings || {}), ...settings };
  const width = 38;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);
  const bName = (mergedSettings?.business_name || 'GASTROSPOS RESTAURANTE').toUpperCase();
  const nit = mergedSettings?.nit || '';
  const address = mergedSettings?.address || '';
  const phone = mergedSettings?.phone || '';

  let text = '';
  text += doubleLine + '\n';
  text += `        ${bName}\n`;
  if (nit) text += `          NIT: ${nit}\n`;
  if (address) text += `     Direccion: ${address}\n`;
  if (phone) text += `         Tel: ${phone}\n`;
  if (mergedSettings.print_tax_regime && (mergedSettings.custom_tax_regime_text || mergedSettings.tax_regime)) {
    text += ` Regimen: ${mergedSettings.custom_tax_regime_text || mergedSettings.tax_regime}\n`;
  }
  text += doubleLine + '\n';
  text += '       FACTURA DE VENTA POS\n';
  text += `           N° ${invoice.invoice_number || 'FAC-0001'}\n`;
  text += line + '\n';
  text += `Fecha: ${new Date(invoice.created_at || Date.now()).toLocaleString('es-CO')}\n`;
  text += `Cajero: ${invoice.cashier_name || 'Caja'}\n`;
  if (invoice.waiter_name) text += `Mesero: ${invoice.waiter_name}\n`;
  text += `Mesa / Tipo: ${getCleanTableOrType(invoice)}\n`;
  text += line + '\n';

  const isConsumidorFinal = !invoice.customer_name || invoice.customer_name.trim().toLowerCase() === 'consumidor final';
  text += `Cliente: ${isConsumidorFinal ? 'Consumidor Final' : invoice.customer_name}\n`;
  text += `NIT/CC: ${invoice.customer_document || (isConsumidorFinal ? '222222222222' : '')}\n`;
  text += `Tel: ${isConsumidorFinal ? '' : (invoice.customer_phone || '')}\n`;
  text += `Direccion: ${isConsumidorFinal ? '' : (invoice.customer_address || '')}\n`;
  if (!isConsumidorFinal && invoice.customer_city) text += `Ciudad: ${invoice.customer_city}\n`;
  if (!isConsumidorFinal && invoice.customer_email) text += `Email: ${invoice.customer_email}\n`;
  text += line + '\n';

  text += 'Cant  Descripcion               Total\n';
  text += line + '\n';
  (invoice.items || []).forEach(it => {
    const qty = it.quantity || 1;
    const name = (it.name || 'Item').substring(0, 20).padEnd(20, ' ');
    const total = formatCOP(qty * parseFloat(it.unit_price || 0)).padStart(11, ' ');
    text += `${qty}x   ${name} ${total}\n`;

    const rawMods = it.modifiers || it.modifiers_json;
    let parsedMods = [];
    if (rawMods) {
      try {
        parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
      } catch (e) {
        parsedMods = Array.isArray(rawMods) ? rawMods : [];
      }
    }
    if (Array.isArray(parsedMods) && parsedMods.length > 0) {
      parsedMods.forEach(m => {
        const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
        const extraStr = extra > 0 ? ` (+${formatCOP(extra)})` : '';
        text += `      + ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}${extraStr}\n`;
      });
    }
  });

  text += line + '\n';
  text += `Subtotal:`.padEnd(22) + `${formatCOP(invoice.subtotal || 0)}`.padStart(16) + '\n';
  if (parseFloat(invoice.discount_amount || 0) > 0) {
    text += `Descuento:`.padEnd(22) + `-${formatCOP(invoice.discount_amount)}`.padStart(16) + '\n';
  }
  if (parseFloat(invoice.delivery_fee || 0) > 0) {
    text += `Domicilio:`.padEnd(22) + `+${formatCOP(invoice.delivery_fee)}`.padStart(16) + '\n';
  }
  if (parseFloat(invoice.tip_amount || 0) > 0) {
    text += `Propina:`.padEnd(22) + `+${formatCOP(invoice.tip_amount)}`.padStart(16) + '\n';
  }
  if (parseFloat(invoice.tax_total || 0) > 0) {
    text += `Impuestos Inc:`.padEnd(22) + `${formatCOP(invoice.tax_total)}`.padStart(16) + '\n';
  }

  const isCredit = invoice.payment_method === 'credito' || parseFloat(invoice.credit_balance || invoice.credit_amount || 0) > 0;
  const creditBalance = parseFloat(invoice.credit_balance !== undefined ? invoice.credit_balance : (invoice.credit_amount || (invoice.payment_method === 'credito' ? invoice.total : 0)));
  const paidInitial = Math.max(0, parseFloat(invoice.total || 0) - creditBalance);

  if (isCredit && creditBalance > 0) {
    text += doubleLine + '\n';
    text += '   *** DETALLE VENTA A CREDITO ***\n';
    text += `Total Factura:`.padEnd(22) + `${formatCOP(invoice.total || 0)}`.padStart(16) + '\n';
    text += `Abono Inicial:`.padEnd(22) + `${formatCOP(paidInitial)}`.padStart(16) + '\n';
    text += `VALOR ADEUDADO:`.padEnd(22) + `${formatCOP(creditBalance)}`.padStart(16) + '\n';
    if (invoice.credit_due_date) {
      text += `Fecha Limite: ${invoice.credit_due_date}\n`;
    }
    text += doubleLine + '\n';
  } else {
    text += doubleLine + '\n';
    text += `TOTAL PAGADO:`.padEnd(20) + `${formatCOP(invoice.total || 0)}`.padStart(18) + '\n';
    text += `Forma de Pago: ${(invoice.payment_method || 'Efectivo').toUpperCase()}\n`;
    text += line + '\n';
  }
  text += `  ${mergedSettings?.receipt_footer || '¡Gracias por su compra!'}\n`;
  text += `    Software POS GastrosPOS ERP v1.0\n`;
  text += doubleLine + '\n';
  return text;
};

// =========================================================================
// 1. COMANDA DE COCINA (TICKET TÉRMICO OPERATIVO UNIFICADO)
// =========================================================================
export const printKitchenTicket = async (orderData, itemsList = [], settings = {}, paperWidth = '80mm') => {
  const tableOrType = getCleanTableOrType(orderData);
  const waiter = orderData.waiter_name || orderData.user_name || 'Personal';
  const orderId = orderData.id || 'NUEVA';
  const notes = orderData.notes || orderData.delivery_notes || '';

  // Intentar impresión silenciosa directa si está configurada
  if (settings?.enable_silent_printing) {
    const plainText = buildKitchenTicketPlainText(orderData, itemsList, notes, waiter);
    const silentRes = await sendToThermalBridge(plainText, settings?.printer_kitchen_name || null, settings?.silent_print_bridge_url);
    if (silentRes.success) return true;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comanda Cocina - #${orderId}</title>
        <style>
          ${getBaseThermalStyles(paperWidth)}
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '13px' : '15px'}; color: #000000;">*** COMANDA DE COCINA ***</div>
          <div class="center black" style="font-size: ${paperWidth === '58mm' ? '16px' : '19px'}; margin-top: 2px; text-transform: uppercase; color: #000000;">
            ${tableOrType}
          </div>
          <div class="solid-line"></div>

          <div style="font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'}; font-weight: 700; color: #000000;">
            <div class="flex-between"><span>Orden N°:</span><span class="black">#${orderId}</span></div>
            <div class="flex-between"><span>Responsable:</span><span>${waiter}</span></div>
            <div class="flex-between"><span>Hora / Fecha:</span><span>${new Date().toLocaleTimeString('es-CO')} (${new Date().toLocaleDateString('es-CO')})</span></div>
            ${orderData.customer_name ? `<div class="flex-between"><span>Cliente:</span><span>${orderData.customer_name}</span></div>` : ''}
            ${orderData.delivery_address ? `<div class="flex-between"><span>Dirección:</span><span>${orderData.delivery_address}</span></div>` : ''}
            ${orderData.delivery_phone ? `<div class="flex-between"><span>Teléfono:</span><span>${orderData.delivery_phone}</span></div>` : ''}
          </div>
          <div class="solid-line"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1.5px solid #000000; font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; font-weight: 900; color: #000000;">
                <th style="width: 20%; text-align: left; padding-bottom: 3px;">Cant</th>
                <th style="text-align: left; padding-bottom: 3px;">Producto / Detalles</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(item => {
                const qty = item.quantity || item.qty || 1;
                const name = item.product?.name || item.name || 'Producto';
                const itemNote = item.notes || item.note || '';
                const rawMods = item.modifiers || item.modifiers_json;
                let parsedMods = [];
                if (rawMods) {
                  try {
                    parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                  } catch (e) {
                    parsedMods = Array.isArray(rawMods) ? rawMods : [];
                  }
                }

                return `
                  <tr style="border-bottom: 1px solid #000000;">
                    <td style="font-size: ${paperWidth === '58mm' ? '14px' : '16px'}; font-weight: 900; padding: 4px 0; color: #000000;">${qty}x</td>
                    <td style="padding: 4px 0;">
                      <div style="font-size: ${paperWidth === '58mm' ? '12px' : '14px'}; font-weight: 800; color: #000000; text-transform: uppercase;">${name}</div>
                      ${Array.isArray(parsedMods) && parsedMods.length > 0 ? `
                        <div style="font-size: 11px; font-weight: 700; color: #000000; margin-top: 2px;">
                          ${parsedMods.map(m => `• ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}`).join('<br/>')}
                        </div>
                      ` : ''}
                      ${itemNote ? `
                        <div style="font-size: 11px; font-weight: 800; border: 1px solid #000000; padding: 1px 4px; margin-top: 2px; display: inline-block; color: #000000;">
                          NOTA: ${itemNote}
                        </div>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${notes ? `
            <div class="solid-line"></div>
            <div style="font-size: 11px; font-weight: 800; color: #000000;">
              <strong>OBSERVACIONES GENERALES:</strong>
              <div style="border: 1px solid #000000; padding: 3px 5px; margin-top: 2px; color: #000000;">${notes}</div>
            </div>
          ` : ''}

          <div class="solid-line"></div>
          <div class="center bold" style="font-size: 10px; color: #000000;">(Comanda Operativa para Producción / Bar / Cocina)</div>
        </div>
      </body>
    </html>
  `;

  printWithIframe(html, `Comanda Cocina #${orderId}`);
  return true;
};

// =========================================================================
// 2. PRE-FACTURA / PRE-CUENTA (DOCUMENTO NO FISCAL DE CONTROL)
// =========================================================================
export const printPreFactura = async (orderData, itemsList, settings = {}, paperWidth = '80mm', extras = {}) => {
  let effectiveSettings = settings;
  if (!effectiveSettings || !effectiveSettings.business_name || Object.keys(effectiveSettings).length === 0) {
    try {
      effectiveSettings = await api.get('/settings');
    } catch (e) {
      effectiveSettings = settings || {};
    }
  }
  const mergedSettings = { ...(orderData.settings || {}), ...effectiveSettings };
  let subtotal = extras.itemsSubtotal || 0;
  if (!subtotal) {
    subtotal = itemsList.reduce((acc, it) => acc + ((parseFloat(it.quantity || it.qty) || 1) * (parseFloat(it.unit_price || it.price || it.product?.price) || 0)), 0);
  }

  const discount = parseFloat(extras.discountVal || orderData.discount_amount || 0);
  const deliveryFee = parseFloat(extras.delFee || orderData.delivery_fee || 0);
  const baseTotal = Math.max(0, subtotal - discount) + deliveryFee;
  const propinaSugerida = extras.tipVal !== undefined ? extras.tipVal : (baseTotal * 0.1);
  const totalConPropina = baseTotal + propinaSugerida;
  const tableOrType = getCleanTableOrType(orderData);

  const isConsumidorFinal = !orderData.customer_name || orderData.customer_name.trim().toLowerCase() === 'consumidor final';
  const customerName = isConsumidorFinal ? 'Consumidor Final' : orderData.customer_name;
  const customerDoc = orderData.customer_document || (isConsumidorFinal ? '222222222222' : '');
  const customerPhone = isConsumidorFinal ? '' : (orderData.customer_phone || '');
  const customerAddress = isConsumidorFinal ? '' : (orderData.delivery_address || orderData.customer_address || '');
  const customerEmail = !isConsumidorFinal ? (orderData.customer_email || orderData.email || '') : '';
  const customerCity = !isConsumidorFinal ? (orderData.customer_city || orderData.city || '') : '';

  // Intentar impresión silenciosa directa
  if (settings?.enable_silent_printing) {
    const plainText = buildPreFacturaPlainText(orderData, itemsList, settings, calculations);
    const silentRes = await sendToThermalBridge(plainText, settings?.printer_receipt_name || null, settings?.silent_print_bridge_url);
    if (silentRes.success) return true;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pre-Factura - #${orderData.id || 'NUEVA'}</title>
        <style>
          ${getBaseThermalStyles(paperWidth)}
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${getBusinessHeaderHTML(settings, paperWidth)}
          <div class="solid-line"></div>
          <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000;">*** PRE-CUENTA / PRE-FACTURA ***</div>
          <div class="center bold" style="font-size: 9.5px; color: #000000;">(Documento de control - No válido como factura fiscal)</div>
          <div class="solid-line"></div>

          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Espacio / Tipo:</span><span class="bold">${tableOrType}</span></div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Atendido por:</span><span>${orderData.waiter_name || 'Mesero'}</span></div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Fecha / Hora:</span><span>${formatDateTime(orderData.created_at || Date.now())}</span></div>
          
          <div class="solid-line"></div>
          <div style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; line-height: 1.4;">
            <div><strong>Cliente:</strong> ${customerName}</div>
            <div><strong>NIT/CC:</strong> ${customerDoc}</div>
            <div><strong>Tel.:</strong> ${customerPhone}</div>
            <div><strong>Dirección:</strong> ${customerAddress}</div>
            ${customerCity ? `<div><strong>Ciudad:</strong> ${customerCity}</div>` : ''}
            ${customerEmail ? `<div><strong>Email:</strong> ${customerEmail}</div>` : ''}
          </div>
          <div class="solid-line"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1.5px solid #000000; font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; font-weight: 800; color: #000000;">
                <th style="width: 14%; text-align: left; padding-bottom: 3px;">Cant</th>
                <th style="text-align: left; padding-bottom: 3px;">Producto</th>
                <th style="text-align: right; width: 28%; padding-bottom: 3px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(it => {
                const qty = it.quantity || it.qty || 1;
                const name = it.product?.name || it.name || 'Producto';
                const price = parseFloat(it.unit_price || it.price || it.product?.price || 0);
                const rawMods = it.modifiers || it.modifiers_json;
                let parsedMods = [];
                if (rawMods) {
                  try {
                    parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                  } catch (e) {
                    parsedMods = Array.isArray(rawMods) ? rawMods : [];
                  }
                }
                return `
                  <tr style="border-bottom: 1px solid #000000;">
                    <td style="font-weight: 900; font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; padding: 2.5px 0;">${qty}x</td>
                    <td style="padding: 2.5px 0;">
                      <div style="font-weight: 800; font-size: ${paperWidth === '58mm' ? '12px' : '13.5px'}; color: #000000; text-transform: uppercase;">${name}</div>
                      <div style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; font-weight: 400; color: #000000;">Unit: ${formatCOP(price)}</div>
                      ${Array.isArray(parsedMods) && parsedMods.length > 0 ? `
                        <div style="font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'}; color: #000000; margin-top: 2px; padding-left: 4px; border-left: 2px solid #333;">
                          ${parsedMods.map(m => {
                            const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                            const extraStr = extra > 0 ? ` (+${formatCOP(extra)})` : '';
                            return `<div>• ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}${extraStr}</div>`;
                          }).join('')}
                        </div>
                      ` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 900; font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; padding: 2.5px 0;">${formatCOP(price * qty)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="solid-line"></div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Subtotal Ítems:</span><span class="bold">${formatCOP(subtotal)}</span></div>
          ${discount > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Descuento:</span><span class="bold">-${formatCOP(discount)}</span></div>` : ''}
          ${deliveryFee > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Tarifa Domicilio:</span><span class="bold">+${formatCOP(deliveryFee)}</span></div>` : ''}

          <div class="solid-line"></div>
          <div class="flex-between bold" style="font-size: ${paperWidth === '58mm' ? '13px' : '14.5px'}; color: #000000;">
            <span>TOTAL CONSUMO:</span>
            <span>${formatCOP(baseTotal)}</span>
          </div>

          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; margin-top: 3px; color: #000000;">
            <span>Propina Voluntaria Sugerida (10%):</span>
            <span class="bold">+${formatCOP(propinaSugerida)}</span>
          </div>

          <div class="double-line"></div>
          <div class="flex-between bold" style="font-size: ${paperWidth === '58mm' ? '14px' : '16px'}; color: #000000;">
            <span>TOTAL CON PROPINA:</span>
            <span>${formatCOP(totalConPropina)}</span>
          </div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; color: #000000;">
            <span>Total sin propina:</span>
            <span style="font-weight: 700;">${formatCOP(baseTotal)}</span>
          </div>

          <div class="solid-line"></div>
          <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; margin-top: 4px; color: #000000;">${settings?.receipt_footer || '¡Muchas gracias por su visita!'}</div>
          <div class="center" style="font-size: ${paperWidth === '58mm' ? '10px' : '11px'}; margin-top: 2px; color: #000000; font-style: italic;">La propina es voluntaria y destinada al personal de servicio.</div>
        </div>
      </body>
    </html>
  `;

  printWithIframe(html, `Pre-Factura #${orderData.id || ''}`);
  return true;
};

// =========================================================================
// 3. FACTURA POS OFICIAL (IMPRESIÓN TÉRMICA DEFINITIVA CON LOGO)
// =========================================================================
export const printInvoiceReceipt = async (invoice, settings = {}, paperWidth = '80mm') => {
  let effectiveSettings = settings;
  if (!effectiveSettings || !effectiveSettings.business_name || Object.keys(effectiveSettings).length === 0) {
    try {
      effectiveSettings = await api.get('/settings');
    } catch (e) {
      effectiveSettings = settings || {};
    }
  }
  const mergedSettings = { ...(invoice.settings || {}), ...effectiveSettings };
  const items = invoice.items || [];
  const taxTotal = parseFloat(invoice.tax_total || 0);
  const discount = parseFloat(invoice.discount_amount || 0);
  const deliveryFee = parseFloat(invoice.delivery_fee || 0);
  const tipAmount = parseFloat(invoice.tip_amount || 0);
  const total = parseFloat(invoice.total || 0);
  const subtotal = parseFloat(invoice.subtotal || 0);

  const isConsumidorFinal = !invoice.customer_name || invoice.customer_name.trim().toLowerCase() === 'consumidor final';
  const customerName = isConsumidorFinal ? 'Consumidor Final' : invoice.customer_name;
  const customerDoc = invoice.customer_document || (isConsumidorFinal ? '222222222222' : '');
  const customerPhone = isConsumidorFinal ? '' : (invoice.customer_phone || '');
  const customerAddress = isConsumidorFinal ? '' : (invoice.customer_address || '');
  const customerEmail = !isConsumidorFinal ? (invoice.customer_email || invoice.email || '') : '';
  const customerCity = !isConsumidorFinal ? (invoice.customer_city || invoice.city || '') : '';

  // Intentar impresión silenciosa directa
  if (mergedSettings?.enable_silent_printing) {
    const plainText = buildInvoicePlainText(invoice, mergedSettings);
    const silentRes = await sendToThermalBridge(plainText, mergedSettings?.printer_receipt_name || null, mergedSettings?.silent_print_bridge_url);
    if (silentRes.success) return true;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Factura POS - ${invoice.invoice_number || 'TICKET'}</title>
        <style>
          ${getBaseThermalStyles(paperWidth)}
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${getBusinessHeaderHTML(mergedSettings, paperWidth)}
          <div class="solid-line"></div>
          <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '13px' : '14.5px'}; color: #000000;">FACTURA DE VENTA POS</div>
          <div class="center black" style="font-size: ${paperWidth === '58mm' ? '13.5px' : '15px'}; color: #000000;">N° ${invoice.invoice_number || 'POS-0000'}</div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Fecha:</span><span>${formatDateTime(invoice.created_at || Date.now())}</span></div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Cajero:</span><span>${invoice.cashier_name || 'Caja'}</span></div>
          ${invoice.waiter_name ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};"><span>Mesero:</span><span>${invoice.waiter_name}</span></div>` : ''}
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};">
            <span>Espacio / Mesa:</span>
            <span class="bold">${getCleanTableOrType(invoice)}</span>
          </div>

          <div class="solid-line"></div>
          <div style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; line-height: 1.4;">
            <div><strong>Cliente:</strong> ${customerName}</div>
            <div><strong>NIT/CC:</strong> ${customerDoc}</div>
            <div><strong>Tel.:</strong> ${customerPhone}</div>
            <div><strong>Dirección:</strong> ${customerAddress}</div>
            ${customerCity ? `<div><strong>Ciudad:</strong> ${customerCity}</div>` : ''}
            ${customerEmail ? `<div><strong>Email:</strong> ${customerEmail}</div>` : ''}
          </div>

          <div class="solid-line"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1.5px solid #000000; font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; font-weight: 800; color: #000000;">
                <th style="width: 14%; text-align: left; padding-bottom: 3px;">Cant</th>
                <th style="text-align: left; padding-bottom: 3px;">Descripción</th>
                <th style="text-align: right; width: 28%; padding-bottom: 3px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => {
                const qty = it.quantity || 1;
                const unitPrice = parseFloat(it.unit_price || 0);
                const lineTotal = qty * unitPrice;
                const rawMods = it.modifiers || it.modifiers_json;
                let parsedMods = [];
                if (rawMods) {
                  try {
                    parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                  } catch (e) {
                    parsedMods = Array.isArray(rawMods) ? rawMods : [];
                  }
                }
                return `
                  <tr style="border-bottom: 1px solid #000000;">
                    <td style="font-weight: 900; font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; padding: 2.5px 0;">${qty}x</td>
                    <td style="padding: 2.5px 0;">
                      <div style="font-weight: 800; font-size: ${paperWidth === '58mm' ? '12px' : '13.5px'}; color: #000000; text-transform: uppercase;">${it.name || 'Ítem'}</div>
                      <div style="font-size: ${paperWidth === '58mm' ? '11px' : '12px'}; font-weight: 400; color: #000000;">Unit: ${formatCOP(unitPrice)}</div>
                      ${Array.isArray(parsedMods) && parsedMods.length > 0 ? `
                        <div style="font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'}; color: #000000; margin-top: 2px; padding-left: 4px; border-left: 2px solid #333;">
                          ${parsedMods.map(m => {
                            const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                            const extraStr = extra > 0 ? ` (+${formatCOP(extra)})` : '';
                            return `<div>• ${m.name}${m.quantity > 1 ? ` (x${m.quantity})` : ''}${extraStr}</div>`;
                          }).join('')}
                        </div>
                      ` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 900; font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000; padding: 2.5px 0;">${formatCOP(lineTotal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="solid-line"></div>
          <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Subtotal:</span><span class="bold">${formatCOP(subtotal)}</span></div>
          ${discount > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Descuento:</span><span class="bold">-${formatCOP(discount)}</span></div>` : ''}
          ${deliveryFee > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Tarifa Domicilio:</span><span class="bold">+${formatCOP(deliveryFee)}</span></div>` : ''}
          ${tipAmount > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'};"><span>Propina Voluntaria:</span><span class="bold">+${formatCOP(tipAmount)}</span></div>` : ''}
          ${taxTotal > 0 ? `<div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12px'};"><span>Impuestos Incluidos:</span><span class="bold">${formatCOP(taxTotal)}</span></div>` : ''}

          <div class="double-line"></div>
          ${(() => {
            const isCredit = invoice.payment_method === 'credito' || parseFloat(invoice.credit_balance || invoice.credit_amount || 0) > 0;
            const creditBalance = parseFloat(invoice.credit_balance !== undefined ? invoice.credit_balance : (invoice.credit_amount || (invoice.payment_method === 'credito' ? total : 0)));
            const paidInitial = Math.max(0, total - creditBalance);

            if (isCredit && creditBalance > 0) {
              return `
                <div style="border: 1.5px solid #000000; padding: 6px 8px; margin: 4px 0; background: #fafafa;">
                  <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; color: #000000;">*** CONDICIÓN DE PAGO: CRÉDITO ***</div>
                  <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; margin-top: 4px;">
                    <span>Total Factura:</span>
                    <span class="bold">${formatCOP(total)}</span>
                  </div>
                  <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'};">
                    <span>Abono Inicial Recibido:</span>
                    <span class="bold">${formatCOP(paidInitial)}</span>
                  </div>
                  <div class="flex-between bold" style="font-size: ${paperWidth === '58mm' ? '13px' : '14.5px'}; color: #000000; margin-top: 3px; border-top: 1px dashed #000000; padding-top: 3px;">
                    <span>VALOR ADEUDADO:</span>
                    <span>${formatCOP(creditBalance)}</span>
                  </div>
                  ${invoice.credit_due_date ? `
                    <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'}; margin-top: 2px;">
                      <span>Fecha Límite Pago:</span>
                      <span>${invoice.credit_due_date}</span>
                    </div>
                  ` : ''}
                </div>
              `;
            }

            return `
              <div class="flex-between bold" style="font-size: ${paperWidth === '58mm' ? '14px' : '16px'}; color: #000000;">
                <span>TOTAL PAGADO:</span>
                <span>${formatCOP(total)}</span>
              </div>

              <div class="flex-between" style="font-size: ${paperWidth === '58mm' ? '12px' : '13px'}; margin-top: 3px; color: #000000;">
                <span>Forma de Pago:</span>
                <span class="bold" style="text-transform: capitalize;">${invoice.payment_method || 'Efectivo'}</span>
              </div>
            `;
          })()}

          ${invoice.notes ? `
            <div class="solid-line"></div>
            <div style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12px'}; color: #000000;"><strong>Notas:</strong> ${invoice.notes}</div>
          ` : ''}

          <div class="solid-line"></div>
          <div class="center bold" style="font-size: ${paperWidth === '58mm' ? '11.5px' : '12.5px'}; color: #000000;">${mergedSettings?.receipt_footer || '¡Gracias por su compra! Vuelva pronto.'}</div>
          <div class="center" style="font-size: ${paperWidth === '58mm' ? '10px' : '11px'}; color: #000000; margin-top: 2px; font-style: italic;">Proveedor del software: KAMIA by JF</div>
        </div>
      </body>
    </html>
  `;

  printWithIframe(html, `Factura POS #${invoice.invoice_number || ''}`);
  return true;
};

// =========================================================================
// 4. TICKET DE CIERRE DE TURNO (ARQUEO Z TÉRMICO UNIFICADO)
// =========================================================================
export const printShiftCloseTicket = (shift, settings = {}, paperWidth = '80mm') => {
  if (!shift) return;
  const snapshot = shift.snapshot || {};
  const audit = snapshot.audit || { canceledOrdersCount: 0, canceledAmount: 0 };
  const initialFloat = parseFloat(shift.opening_amount ?? snapshot.initialFloat ?? snapshot.openingAmount ?? 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cierre de Turno - #${shift.id}</title>
        <style>
          ${getBaseThermalStyles(paperWidth)}
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${getBusinessHeaderHTML(settings, paperWidth)}
          <div class="solid-line"></div>
          <div class="center black" style="font-size: ${paperWidth === '58mm' ? '13px' : '15px'};">*** CIERRE DE TURNO ***</div>
          <div class="solid-line"></div>

          <div class="flex-between"><span>Turno N°:</span><span class="black">#${shift.id}</span></div>
          <div class="flex-between"><span>Jornada:</span><span class="bold">${shift.shift_name || 'Turno Principal'}</span></div>
          <div class="flex-between"><span>Responsable:</span><span class="bold">${shift.user_name || 'Cajero'}</span></div>
          <div class="flex-between"><span>Apertura:</span><span>${formatDateTime(shift.opened_at)}</span></div>
          <div class="flex-between"><span>Cierre:</span><span>${formatDateTime(shift.closed_at || Date.now())}</span></div>
          <div class="solid-line"></div>

          <div class="center bold">-- RESUMEN ARQUEO EFECTIVO --</div>
          <div class="flex-between"><span>(+) Base Inicial Float:</span><span>${formatCOP(initialFloat)}</span></div>
          <div class="flex-between"><span>(+) Ventas Efectivo:</span><span>${formatCOP(snapshot.cashSales || 0)}</span></div>
          <div class="flex-between"><span>(+) Ingresos Manuales:</span><span>${formatCOP(snapshot.cashInflows || snapshot.manualIncomes || 0)}</span></div>
          <div class="flex-between"><span>(-) Egresos Manuales:</span><span>${formatCOP(snapshot.cashOutflows || snapshot.manualExpenses || 0)}</span></div>
          <div class="solid-line"></div>
          <div class="flex-between bold" style="font-size: 12px;"><span>EFECTIVO ESPERADO:</span><span>${formatCOP(snapshot.expectedCash || 0)}</span></div>
          <div class="flex-between bold" style="font-size: 12px;"><span>EFECTIVO CONTADO:</span><span>${formatCOP(shift.declared_amount || 0)}</span></div>
          <div class="flex-between bold" style="font-size: 13px; margin-top: 2px;">
            <span>DIFERENCIA EFECTIVO:</span>
            <span>${formatCOP(shift.difference || 0)}</span>
          </div>
          <div class="solid-line"></div>

          <div class="center bold">-- DESGLOSE DE VENTAS --</div>
          <div class="flex-between"><span>Ventas Efectivo:</span><span>${formatCOP(snapshot.cashSales || 0)}</span></div>
          <div class="flex-between"><span>Ventas Tarjeta:</span><span>${formatCOP(snapshot.cardSales || 0)}</span></div>
          <div class="flex-between"><span>Ventas Transferencia/Nequi:</span><span>${formatCOP(snapshot.transferSales || 0)}</span></div>
          <div class="flex-between"><span>Ventas a Crédito (CxC):</span><span>${formatCOP(snapshot.creditSales || 0)}</span></div>
          <div class="double-line"></div>
          <div class="flex-between bold" style="font-size: 14px;">
            <span>VENTAS BRUTAS:</span>
            <span>${formatCOP(shift.gross_revenue || 0)}</span>
          </div>
          <div class="solid-line"></div>

          <div class="center bold">-- OTROS CONCEPTOS --</div>
          <div class="flex-between"><span>Propinas Recaudadas:</span><span>${formatCOP(snapshot.totalTips || 0)}</span></div>
          <div class="flex-between"><span>Devoluciones Pagadas:</span><span>${formatCOP(snapshot.cashRefunds || 0)}</span></div>
          <div class="flex-between"><span>Anulaciones (${audit.canceledOrdersCount || 0}):</span><span>${formatCOP(audit.canceledAmount || 0)}</span></div>
          <div class="dashed-line"></div>

          <br/><br/>
          <div class="center">_______________________________</div>
          <div class="center bold" style="margin-top: 4px; font-size: 11px;">Firma Cajero / Responsable</div>
          <br/>
          <div class="center" style="font-size: 9.5px; color: #555;">Documento de Control Interno de Turno</div>
          <div class="center" style="font-size: 9px; color: #777; margin-top: 4px;">Proveedor del software: KAMIA by JF</div>
        </div>
      </body>
    </html>
  `;

  printWithIframe(html, `Cierre de Turno #${shift.id}`);
  return true;
};

