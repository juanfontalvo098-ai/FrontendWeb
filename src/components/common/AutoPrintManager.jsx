// src/components/common/AutoPrintManager.jsx
import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
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
 * - Modo Dual: Escucha en vivo por WebSockets (0ms) + Smart Polling de respaldo (3s).
 * - Garantiza que ninguna comanda enviada desde el celular de un mesero se pierda,
 *   incluso si la conexión a sockets falla o la aplicación corre en servidores serverless como Vercel.
 * - Deduplicación estricta en memoria para imprimir cada ticket exactamente una sola vez.
 */
export const AutoPrintManager = () => {
  const user = useAuthStore((state) => state.user);
  const { socket } = useSocket();
  const addToast = useUiStore((state) => state.addToast);
  const settingsRef = useRef(null);
  const isPrintingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const processedTicketsRef = useRef(new Map()); // key -> timestamp
  const processedInvoicesRef = useRef(new Map()); // key -> timestamp

  const loadSettings = async () => {
    try {
      const data = await api.get('/settings');
      settingsRef.current = data;
      return data;
    } catch (e) {
      console.warn('[AutoPrintManager] No se pudo cargar settings para auto-print:', e.message);
      return null;
    }
  };

  // Función principal de impresión de comanda (compartida por Socket y Polling)
  const processKitchenTicket = async (ticketData) => {
    if (!ticketData) return;

    const orderId = ticketData.order_id || ticketData.id;
    const ticketId = ticketData.id || orderId;
    const now = Date.now();

    // Deduplicación estricta
    const dedupeKey = `ticket_${ticketId}_order_${orderId}`;
    if (processedTicketsRef.current.has(dedupeKey)) {
      const lastPrinted = processedTicketsRef.current.get(dedupeKey);
      if (now - lastPrinted < 30000) {
        return;
      }
    }
    processedTicketsRef.current.set(dedupeKey, now);

    let settings = settingsRef.current;
    if (!settings) {
      settings = await loadSettings();
    }
    if (!settings) return;

    const isAutoKitchenEnabled = settings.auto_print_kitchen_tickets !== false && 
                                 settings.auto_print_kitchen_tickets !== 0 && 
                                 settings.auto_print_kitchen_tickets !== 'false';
    if (!isAutoKitchenEnabled) return;

    // Obtener ítems del ticket
    let items = ticketData.items || [];
    if (typeof ticketData.items_json === 'string') {
      try {
        items = JSON.parse(ticketData.items_json);
      } catch (e) {
        items = [];
      }
    }

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

    if (!items || items.length === 0) return;

    try {
      isPrintingRef.current = true;
      const orderObj = {
        id: orderId || 'NUEVA',
        order_type: ticketData.order_type || orderDetails?.order_type || 'mesa',
        table_number: ticketData.table_number || orderDetails?.table_number || '',
        customer_name: ticketData.customer_name || orderDetails?.customer_name || '',
        delivery_address: ticketData.delivery_address || orderDetails?.delivery_address || '',
        delivery_phone: ticketData.delivery_phone || orderDetails?.delivery_phone || '',
        notes: ticketData.notes || ticketData.order_notes || orderDetails?.notes || '',
        created_at: ticketData.created_at || orderDetails?.created_at || new Date().toISOString()
      };

      const waiterName = ticketData.waiter_name || orderDetails?.waiter_name || user?.full_name || 'Personal';
      const tableLabel = orderObj.table_number 
        ? (orderObj.table_number.toString().toLowerCase().startsWith('mesa') ? orderObj.table_number : `Mesa ${orderObj.table_number}`) 
        : (orderObj.order_type === 'delivery' ? 'Domicilio' : 'Para Llevar');

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

  // Función principal de impresión de factura (compartida)
  const processInvoice = async (invoiceData) => {
    if (!invoiceData) return;
    const invKey = `inv_${invoiceData.invoice_id || invoiceData.id || invoiceData.invoice_number}`;
    const now = Date.now();
    if (processedInvoicesRef.current.has(invKey)) {
      const last = processedInvoicesRef.current.get(invKey);
      if (now - last < 30000) return;
    }
    processedInvoicesRef.current.set(invKey, now);

    let settings = settingsRef.current;
    if (!settings) {
      settings = await loadSettings();
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

  // 1. Escuchar eventos en vivo de WebSocket si está disponible
  useEffect(() => {
    if (!user) return;
    loadSettings();

    if (socket && typeof socket.on === 'function') {
      socket.on('kitchen:new-ticket', processKitchenTicket);
      socket.on('invoice:created', processInvoice);

      return () => {
        socket.off('kitchen:new-ticket', processKitchenTicket);
        socket.off('invoice:created', processInvoice);
      };
    }
  }, [user, socket]);

  // 2. Smart Polling de Respaldo (para entornos Serverless en Vercel o desconexiones de socket)
  useEffect(() => {
    if (!user) return;

    // Inicializar semillas históricas para no imprimir tickets pasados al recargar la página
    const initSeed = async () => {
      try {
        const queue = await api.get('/orders/kitchen-queue').catch(() => []);
        if (Array.isArray(queue)) {
          const now = Date.now();
          queue.forEach(t => {
            const dedupeKey = `ticket_${t.id || t.order_id}_order_${t.order_id}`;
            processedTicketsRef.current.set(dedupeKey, now);
          });
        }
      } catch (e) {}
      isInitializedRef.current = true;
    };

    initSeed();

    const pollingInterval = setInterval(async () => {
      if (!isInitializedRef.current || document.hidden) return;

      try {
        const queue = await api.get('/orders/kitchen-queue').catch(() => []);
        if (Array.isArray(queue) && queue.length > 0) {
          // Procesar tickets nuevos en orden cronológico (los más antiguos primero)
          const reversed = [...queue].reverse();
          for (const ticket of reversed) {
            const dedupeKey = `ticket_${ticket.id || ticket.order_id}_order_${ticket.order_id}`;
            if (!processedTicketsRef.current.has(dedupeKey)) {
              console.log('⚡ [AutoPrintManager] Nueva comanda detectada vía Smart Polling:', ticket);
              await processKitchenTicket(ticket);
            }
          }
        }
      } catch (err) {
        // Silenciar errores de polling transitorios
      }
    }, 3500);

    return () => clearInterval(pollingInterval);
  }, [user]);

  return null;
};
