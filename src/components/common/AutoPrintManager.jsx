// src/components/common/AutoPrintManager.jsx
import React, { useEffect, useRef } from 'react';
import { getSocket } from '../../api/socket';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { qzService } from '../../utils/qzTrayService';
import { 
  sendToThermalBridge, 
  buildKitchenTicketPlainText, 
  buildInvoicePlainText,
  printKitchenTicket,
  printInvoiceReceipt
} from '../../utils/printUtils';

/**
 * Gestor Global en segundo plano para Auto-Impresión Remota de Comandas y Facturas
 * Escucha en vivo las señales de WebSocket (kitchen:new-ticket, invoice:created)
 * y envía automáticamente el trabajo de impresión a QZ Tray o KAMIA Print Bridge.
 */
export const AutoPrintManager = () => {
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const settingsRef = useRef(null);
  const isPrintingRef = useRef(false);

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

    // Conectar silenciosamente con QZ Tray si está activo
    qzService.connect().catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    // 1. Escuchar nuevas comandas de cocina enviadas remotamente por meseros
    const handleKitchenTicket = async (ticketData) => {
      if (!ticketData) return;
      console.log('⚡ [AutoPrintManager] Recibida señal de comanda de cocina vía WebSocket:', ticketData);

      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isAutoKitchenEnabled = settings.auto_print_kitchen_tickets !== undefined ? !!settings.auto_print_kitchen_tickets : true;
      if (!isAutoKitchenEnabled) {
        console.log('ℹ️ [AutoPrintManager] Auto-impresión de comandas desactivada en configuración');
        return;
      }

      // Si los ítems no vienen en el payload o están vacíos, consultarlos de la API
      let items = ticketData.items || [];
      let orderDetails = null;

      const orderId = ticketData.order_id || ticketData.id;
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
        const tableLabel = orderObj.table_number ? `Mesa ${orderObj.table_number}` : (orderObj.order_type === 'delivery' ? 'Domicilio' : 'Para Llevar');

        // Intento 1: QZ Tray si está conectado
        if (qzService.isQzConnected()) {
          const res = await printKitchenTicket(orderObj, items, orderObj.notes, waiterName, settings, settings.paper_width || '80mm');
          addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) auto-impresa en Cocina (QZ Tray)`, 'success');
          return;
        }

        // Intento 2: Print Bridge (puerto 8088)
        const plainText = buildKitchenTicketPlainText(orderObj, items, orderObj.notes, waiterName);
        const bridgeUrl = settings.silent_print_bridge_url || 'http://localhost:8088';
        const bridgeRes = await sendToThermalBridge(plainText, settings.printer_kitchen_name || null, bridgeUrl, { cutPaper: true });

        if (bridgeRes && bridgeRes.success) {
          addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) auto-impresa en Cocina (Print Bridge)`, 'success');
        } else {
          // Intento 3: Reintentar con printKitchenTicket
          await printKitchenTicket(orderObj, items, orderObj.notes, waiterName, settings, settings.paper_width || '80mm');
          addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) enviada a impresión`, 'info');
        }
      } catch (err) {
        console.error('❌ [AutoPrintManager] Error al auto-imprimir comanda:', err);
      } finally {
        isPrintingRef.current = false;
      }
    };

    // 2. Escuchar facturas creadas remotamente
    const handleInvoiceCreated = async (invoiceData) => {
      if (!invoiceData) return;
      console.log('⚡ [AutoPrintManager] Recibida señal de factura creada vía WebSocket:', invoiceData);

      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isAutoInvoiceEnabled = !!settings.auto_print_invoices;
      if (!isAutoInvoiceEnabled) return;

      try {
        isPrintingRef.current = true;
        if (qzService.isQzConnected()) {
          await printInvoiceReceipt(invoiceData, settings, settings.paper_width || '80mm');
          addToast(`🧾 Factura #${invoiceData.invoice_number || ''} auto-impresa en Caja (QZ Tray)`, 'success');
        } else {
          const plainText = buildInvoicePlainText(invoiceData, settings);
          const bridgeUrl = settings.silent_print_bridge_url || 'http://localhost:8088';
          const res = await sendToThermalBridge(plainText, settings.printer_receipt_name || null, bridgeUrl, { cutPaper: true });
          if (res && res.success) {
            addToast(`🧾 Factura #${invoiceData.invoice_number || ''} auto-impresa en Caja (Print Bridge)`, 'success');
          }
        }
      } catch (err) {
        console.error('[AutoPrintManager] Error al auto-imprimir factura:', err);
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
