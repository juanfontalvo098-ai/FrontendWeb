// src/components/common/AutoPrintManager.jsx
import React, { useEffect, useRef } from 'react';
import { getSocket } from '../../api/socket';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { 
  sendToThermalBridge, 
  buildKitchenTicketPlainText, 
  buildInvoicePlainText 
} from '../../utils/printUtils';

/**
 * Gestor Global en segundo plano para Auto-Impresión Remota de Comandas y Facturas
 * Si una mesera envía una orden desde su celular, este componente recibe el socket
 * y envía el ticket directamente a la impresora térmica local mediante Print Bridge (.bat).
 */
export const AutoPrintManager = () => {
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const settingsRef = useRef(null);

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

    // 1. Escuchar nuevas comandas de cocina enviadas remotamente
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
          const plainText = buildKitchenTicketPlainText(
            ticketData, 
            ticketData.items, 
            ticketData.notes || '', 
            ticketData.waiter_name || 'Móvil / Salón'
          );

          const res = await sendToThermalBridge(
            plainText, 
            settings.printer_kitchen_name || null, 
            settings.silent_print_bridge_url || 'http://localhost:8088'
          );

          if (res && res.success) {
            addToast(`🍳 Comanda de ${ticketData.table_number || 'Mesa'} impresa automáticamente en Cocina`, 'info');
          }
        } catch (err) {
          console.error('[AutoPrintManager] Error al auto-imprimir comanda:', err);
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
          const plainText = buildInvoicePlainText(invoiceData, settings);

          const res = await sendToThermalBridge(
            plainText, 
            settings.printer_receipt_name || null, 
            settings.silent_print_bridge_url || 'http://localhost:8088'
          );

          if (res && res.success) {
            addToast(`🧾 Factura ${invoiceData.invoice_number || ''} impresa automáticamente en Caja`, 'info');
          }
        } catch (err) {
          console.error('[AutoPrintManager] Error al auto-imprimir factura:', err);
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
