// src/components/common/AutoPrintManager.jsx
import React, { useEffect, useRef } from 'react';
import { getSocket } from '../../api/socket';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { 
  printKitchenTicket, 
  printInvoiceReceipt,
  isSilentPrintingActive,
  DEFAULT_BRIDGE_URL
} from '../../utils/printUtils';

/**
 * Gestor Global en segundo plano para Auto-Impresión Remota de Comandas y Facturas
 * Escucha en vivo las señales de WebSocket (kitchen:new-ticket, invoice:created)
 * - Si la impresión silenciosa está activada: envía directamente a la impresora térmica vía Print Bridge.
 * - Si la impresión silenciosa está desactivada: abre automáticamente el cuadro de diálogo de Windows.
 * Incluye filtro de deduplicación estricta para evitar impresiones repetidas.
 */
export const AutoPrintManager = () => {
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const settingsRef = useRef(null);
  const isPrintingRef = useRef(false);
  const processedTicketsRef = useRef(new Map()); // id -> timestamp
  const processedInvoicesRef = useRef(new Map()); // id -> timestamp

  const loadSettings = async () => {
    try {
      const data = await api.get('/settings');
      settingsRef.current = data;
    } catch (e) {
      console.warn('[AutoPrintManager] No se pudo cargar settings para auto-print:', e.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadSettings();

    const socket = getSocket();
    if (!socket) return;

    // 1. Escuchar nuevas comandas de cocina enviadas remotamente por meseros
    const handleKitchenTicket = async (ticketData) => {
      if (!ticketData) return;

      const orderId = ticketData.order_id || ticketData.id;
      const now = Date.now();

      // Deduplicación estricta: evitar imprimir la misma comanda más de una vez en una ventana de 15 segundos
      const dedupKey = `${orderId}_${ticketData.items ? ticketData.items.length : 'full'}`;
      if (processedTicketsRef.current.has(dedupKey)) {
        const lastPrinted = processedTicketsRef.current.get(dedupKey);
        if (now - lastPrinted < 15000) {
          console.log('ℹ️ [AutoPrintManager] Señal duplicada ignorada (deduplicada):', dedupKey);
          return;
        }
      }
      processedTicketsRef.current.set(dedupKey, now);

      console.log('⚡ [AutoPrintManager] Procesando comanda de cocina vía WebSocket:', ticketData);

      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isAutoKitchenEnabled = settings.auto_print_kitchen_tickets !== false && settings.auto_print_kitchen_tickets !== 0 && settings.auto_print_kitchen_tickets !== 'false';
      if (!isAutoKitchenEnabled) {
        console.log('ℹ️ [AutoPrintManager] Auto-impresión de comandas desactivada en configuración');
        return;
      }

      // Si los ítems no vienen en el payload o están vacíos, consultarlos de la API
      let items = ticketData.items || [];
      let orderDetails = null;

      if ((!items || items.length === 0) && orderId) {
        try {
          orderDetails = await api.get(`/orders/${orderId}`);
          if (orderDetails && orderDetails.items) {
            items = orderDetails.items;
          }
        } catch (e) {
          console.warn('⚠️ [AutoPrintManager] No se pudieron cargar los ítems de la orden:', e.message);
        }
      }

      if (!items || items.length === 0) {
        console.warn('⚠️ [AutoPrintManager] Comanda sin ítems, omitiendo impresión');
        return;
      }

      try {
        isPrintingRef.current = true;
        const orderObj = {
          id: orderId || 'NUEVA',
          order_type: ticketData.order_type || orderDetails?.order_type || 'mesa',
          table_number: ticketData.table_number || orderDetails?.table_number || '',
          customer_name: ticketData.customer_name || orderDetails?.customer_name || '',
          delivery_address: ticketData.delivery_address || orderDetails?.delivery_address || '',
          delivery_phone: ticketData.delivery_phone || orderDetails?.delivery_phone || '',
          notes: ticketData.notes || orderDetails?.notes || '',
          created_at: ticketData.created_at || orderDetails?.created_at || new Date().toISOString()
        };

        const waiterName = ticketData.waiter_name || orderDetails?.waiter_name || user?.full_name || 'Personal';
        const tableLabel = orderObj.table_number ? (orderObj.table_number.toLowerCase().startsWith('mesa') ? orderObj.table_number : `Mesa ${orderObj.table_number}`) : (orderObj.order_type === 'delivery' ? 'Domicilio' : 'Para Llevar');

        // Ejecutar impresión (silenciosa si enable_silent_printing es true, o cuadro de diálogo de Windows si es false)
        const printRes = await printKitchenTicket(
          orderObj,
          items,
          orderObj.notes,
          waiterName,
          settings,
          settings?.default_paper_width || '80mm'
        );

        if (printRes && printRes.mode === 'print_bridge') {
          addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) auto-impresa en Cocina (Silenciosa)`, 'success');
        } else {
          addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) enviada a diálogo de impresión`, 'info');
        }
      } catch (err) {
        console.error('❌ [AutoPrintManager] Error al procesar comanda:', err);
      } finally {
        isPrintingRef.current = false;
      }
    };

    // 2. Escuchar facturas creadas remotamente
    const handleInvoiceCreated = async (invoiceData) => {
      if (!invoiceData) return;
      const invKey = `${invoiceData.invoice_id || invoiceData.id || invoiceData.invoice_number}`;
      const now = Date.now();
      if (processedInvoicesRef.current.has(invKey)) {
        const last = processedInvoicesRef.current.get(invKey);
        if (now - last < 15000) return;
      }
      processedInvoicesRef.current.set(invKey, now);

      console.log('⚡ [AutoPrintManager] Recibida señal de factura creada vía WebSocket:', invoiceData);

      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isAutoInvoiceEnabled = settings.auto_print_invoices === true || settings.auto_print_invoices === 1 || settings.auto_print_invoices === 'true';
      if (!isAutoInvoiceEnabled) return;

      try {
        isPrintingRef.current = true;
        const printRes = await printInvoiceReceipt(invoiceData, settings, settings?.default_paper_width || '80mm');
        if (printRes && printRes.mode === 'print_bridge') {
          addToast(`🧾 Factura #${invoiceData.invoice_number || ''} auto-impresa en Caja (Silenciosa)`, 'success');
        } else {
          addToast(`🧾 Factura #${invoiceData.invoice_number || ''} enviada a diálogo de impresión`, 'info');
        }
      } catch (err) {
        console.error('[AutoPrintManager] Error al procesar factura:', err);
      } finally {
        isPrintingRef.current = false;
      }
    };

    socket.on('kitchen:new-ticket', handleKitchenTicket);
    socket.on('invoice:created', handleInvoiceCreated);

    return () => {
      socket.off('kitchen:new-ticket', handleKitchenTicket);
      socket.off('invoice:created', handleInvoiceCreated);
    };
  }, [user]);

  return null;
};
