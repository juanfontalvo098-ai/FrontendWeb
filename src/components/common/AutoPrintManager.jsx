// src/components/common/AutoPrintManager.jsx
import React, { useEffect, useRef } from 'react';
import { getSocket } from '../../api/socket';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { 
  sendToThermalBridge, 
  buildKitchenTicketPlainText, 
  buildInvoicePlainText,
  checkPrintBridgeHealth
} from '../../utils/printUtils';

/**
 * Gestor Global en segundo plano para Auto-Impresión Remota de Comandas y Facturas
 * Utiliza KAMIA Print Bridge (puerto 8088) de forma 100% silenciosa y directa al spooler de Windows.
 * Cero cuadros de confirmación, cero permisos de QZ Tray.
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

    const socket = getSocket();
    if (!socket) return;

    // 1. Escuchar nuevas comandas de cocina enviadas remotamente por meseros
    const handleKitchenTicket = async (ticketData) => {
      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isSilentEnabled = settings.enable_silent_printing !== undefined ? !!settings.enable_silent_printing : true;
      const isAutoKitchenEnabled = settings.auto_print_kitchen_tickets !== undefined ? !!settings.auto_print_kitchen_tickets : true;

      if (isSilentEnabled && isAutoKitchenEnabled && ticketData && ticketData.items && ticketData.items.length > 0) {
        try {
          isPrintingRef.current = true;
          const orderObj = {
            id: ticketData.order_id || ticketData.id,
            order_type: ticketData.order_type || 'mesa',
            table_number: ticketData.table_number || '',
            customer_name: ticketData.customer_name || '',
            delivery_address: ticketData.delivery_address || '',
            delivery_phone: ticketData.delivery_phone || '',
            notes: ticketData.notes || '',
            created_at: ticketData.created_at || new Date().toISOString()
          };

          const plainText = buildKitchenTicketPlainText(
            orderObj,
            ticketData.items,
            ticketData.notes || '',
            ticketData.waiter_name || user?.full_name || 'Móvil / Salón'
          );

          const bridgeUrl = settings.silent_print_bridge_url || 'http://localhost:8088';
          const res = await sendToThermalBridge(
            plainText,
            settings.printer_kitchen_name || null,
            bridgeUrl,
            { cutPaper: true }
          );

          if (res && res.success) {
            const tableLabel = ticketData.table_number ? `Mesa ${ticketData.table_number}` : (ticketData.order_type === 'delivery' ? 'Domicilio' : 'Para Llevar');
            addToast(`🍳 Comanda de ${tableLabel} (#${orderObj.id}) impresa automáticamente en Cocina`, 'info');
          }
        } catch (err) {
          console.error('[AutoPrintManager] Error al auto-imprimir comanda:', err);
        } finally {
          isPrintingRef.current = false;
        }
      }
    };

    // 2. Escuchar facturas creadas remotamente
    const handleInvoiceCreated = async (invoiceData) => {
      let settings = settingsRef.current;
      if (!settings) {
        try {
          settings = await api.get('/settings');
          settingsRef.current = settings;
        } catch (e) {}
      }
      if (!settings) return;

      const isSilentEnabled = settings.enable_silent_printing !== undefined ? !!settings.enable_silent_printing : true;
      const isAutoInvoiceEnabled = !!settings.auto_print_invoices;

      if (isSilentEnabled && isAutoInvoiceEnabled && invoiceData) {
        try {
          isPrintingRef.current = true;
          const plainText = buildInvoicePlainText(invoiceData, settings);
          const bridgeUrl = settings.silent_print_bridge_url || 'http://localhost:8088';
          const res = await sendToThermalBridge(
            plainText,
            settings.printer_receipt_name || null,
            bridgeUrl,
            { cutPaper: true }
          );

          if (res && res.success) {
            addToast(`🧾 Factura #${invoiceData.invoice_number || ''} impresa automáticamente en Caja`, 'info');
          }
        } catch (err) {
          console.error('[AutoPrintManager] Error al auto-imprimir factura:', err);
        } finally {
          isPrintingRef.current = false;
        }
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
