// src/pages/PrintingConfigPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Printer, RefreshCw, CheckCircle, AlertCircle, Download,
  Play, Trash2, Cpu, FileText, Check, UtensilsCrossed,
  Receipt, DollarSign, Settings, ShieldCheck, Sparkles, ExternalLink
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';
import {
  checkPrintBridgeHealth,
  getPrintBridgePrinters,
  sendTestPrint,
  sendToThermalBridge,
  buildInvoicePlainText,
  buildKitchenTicketPlainText
} from '../utils/printUtils';

export const PrintingConfigPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  // Estados del Formulario / Settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});

  // Parámetros de Impresión
  const [enableSilentPrinting, setEnableSilentPrinting] = useState(true);
  const [autoPrintKitchenTickets, setAutoPrintKitchenTickets] = useState(true);
  const [autoPrintInvoices, setAutoPrintInvoices] = useState(false);
  const [printerKitchenName, setPrinterKitchenName] = useState('');
  const [printerReceiptName, setPrinterReceiptName] = useState('');
  const [printerBarName, setPrinterBarName] = useState('');
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [openDrawerOnPayment, setOpenDrawerOnPayment] = useState(true);
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:8088');

  // Estado en vivo del Bridge
  const [bridgeStatus, setBridgeStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [bridgeInfo, setBridgeInfo] = useState(null);
  const [detectedPrinters, setDetectedPrinters] = useState([]);
  const [testingKitchen, setTestingKitchen] = useState(false);
  const [testingReceipt, setTestingReceipt] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);

  // 1. Cargar Settings desde Backend
  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      setSettings(data);
      setEnableSilentPrinting(data.enable_silent_printing !== undefined ? !!data.enable_silent_printing : true);
      setAutoPrintKitchenTickets(data.auto_print_kitchen_tickets !== undefined ? !!data.auto_print_kitchen_tickets : true);
      setAutoPrintInvoices(!!data.auto_print_invoices);
      setPrinterKitchenName(data.printer_kitchen_name || '');
      setPrinterReceiptName(data.printer_receipt_name || '');
      setPrinterBarName(data.printer_bar_name || '');
      setPaperWidth(data.paper_width || '80mm');
      setOpenDrawerOnPayment(data.open_drawer_on_payment !== undefined ? !!data.open_drawer_on_payment : true);
      setBridgeUrl(data.silent_print_bridge_url || 'http://localhost:8088');
    } catch (err) {
      addToast('Error al cargar configuración de impresión: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // 2. Probar conexión en vivo con el Bridge de Node.js
  const testBridgeConnection = async () => {
    setBridgeStatus('checking');
    try {
      const health = await checkPrintBridgeHealth(bridgeUrl);
      if (health && health.online) {
        setBridgeStatus('online');
        setBridgeInfo(health.data);
        const printers = await getPrintBridgePrinters(bridgeUrl);
        setDetectedPrinters(printers);
        addToast('Print Bridge Node.js conectado correctamente', 'success');
      } else {
        setBridgeStatus('offline');
        setBridgeInfo(null);
        setDetectedPrinters([]);
      }
    } catch (e) {
      setBridgeStatus('offline');
      setBridgeInfo(null);
      setDetectedPrinters([]);
    }
  };

  useEffect(() => {
    loadSettings();
    testBridgeConnection();
  }, []);

  // 3. Guardar Configuración
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        enable_silent_printing: enableSilentPrinting,
        auto_print_kitchen_tickets: autoPrintKitchenTickets,
        auto_print_invoices: autoPrintInvoices,
        printer_kitchen_name: printerKitchenName,
        printer_receipt_name: printerReceiptName,
        printer_bar_name: printerBarName,
        paper_width: paperWidth,
        open_drawer_on_payment: openDrawerOnPayment,
        silent_print_bridge_url: bridgeUrl
      };

      await api.put('/settings', payload);
      setSettings(payload);
      addToast('Configuración de impresión guardada correctamente', 'success');
    } catch (err) {
      addToast('Error al guardar configuración: ' + err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  // 4. Pruebas de Impresión con Formato Real
  const handleTestKitchen = async () => {
    setTestingKitchen(true);
    try {
      const sampleOrder = {
        id: 'TEST-01',
        table_number: 'Mesa 4',
        customer_name: 'Carlos Mendoza'
      };
      const sampleItems = [
        {
          name: 'Hamburguesa Doble Especial',
          quantity: 2,
          notes: 'Sin cebolla, carne término medio',
          modifiers: [
            { name: 'Tocineta Extra', quantity: 1 },
            { name: 'Queso Cheddar', quantity: 1 }
          ]
        },
        {
          name: 'Limonada de Coco Natural',
          quantity: 1,
          notes: 'Poco hielo',
          modifiers: []
        }
      ];

      const plainText = buildKitchenTicketPlainText(
        sampleOrder,
        sampleItems,
        'Mesa VIP - Entregar todo junto',
        'Laura Gómez'
      );

      const res = await sendToThermalBridge(plainText, printerKitchenName, bridgeUrl);
      if (res && res.success) {
        addToast('Comanda de prueba completa enviada a la impresora de Cocina', 'success');
      } else {
        addToast('No se pudo enviar a la impresora de Cocina. Verifica que el Print Bridge esté activo.', 'warning');
      }
    } catch (e) {
      addToast('Error al enviar prueba: ' + e.message, 'danger');
    } finally {
      setTestingKitchen(false);
    }
  };

  const handleTestReceipt = async () => {
    setTestingReceipt(true);
    try {
      const sampleInvoice = {
        invoice_number: `${settings.invoice_prefix || 'FAC'}-TEST-001`,
        created_at: new Date().toISOString(),
        customer_name: 'Carlos Mendoza',
        customer_document: '1098765432',
        customer_phone: '310 987 6543',
        customer_address: 'Calle 45 # 12-34',
        cashier_name: 'Cajero Principal',
        waiter_name: 'Laura Gómez',
        table_number: 'Mesa 4',
        payment_method: 'efectivo',
        subtotal: 42000,
        discount_amount: 2000,
        delivery_fee: 0,
        tip_amount: 4000,
        tax_total: 3360,
        total: 44000,
        items: [
          {
            name: 'Hamburguesa Doble Especial',
            quantity: 2,
            unit_price: 18000,
            modifiers: [
              { name: 'Tocineta Extra', quantity: 1, price_modifier: 3000 },
              { name: 'Queso Cheddar', quantity: 1, price_modifier: 0 }
            ]
          },
          {
            name: 'Limonada de Coco Natural',
            quantity: 1,
            unit_price: 8000,
            modifiers: [
              { name: 'Poco Hielo', quantity: 1, price_modifier: 0 }
            ]
          }
        ]
      };

      const plainText = buildInvoicePlainText(sampleInvoice, settings);
      const res = await sendToThermalBridge(plainText, printerReceiptName, bridgeUrl);

      if (res && res.success) {
        addToast('Factura de venta POS de prueba enviada a la impresora de Caja', 'success');
      } else {
        addToast('No se pudo enviar a la impresora de Caja. Verifica que el Print Bridge esté activo.', 'warning');
      }
    } catch (e) {
      addToast('Error al enviar prueba: ' + e.message, 'danger');
    } finally {
      setTestingReceipt(false);
    }
  };

  const handleTestDrawer = async () => {
    setTestingDrawer(true);
    try {
      const res = await sendToThermalBridge('', printerReceiptName, bridgeUrl);
      if (res && res.success) {
        addToast('Señal de apertura enviada a la gaveta de dinero', 'info');
      } else {
        addToast('Verifica que la gaveta esté conectada al puerto RJ11 de la impresora de Caja', 'warning');
      }
    } catch (e) {
      addToast('Error al probar gaveta: ' + e.message, 'danger');
    } finally {
      setTestingDrawer(false);
    }
  };

  // 5. Descargas de Scripts
  const downloadNodeInstaller = () => {
    window.open('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '_blank');
    addToast('Descargando instalador oficial de Node.js LTS (64 bits)...', 'info');
  };

  const downloadStarterBat = () => {
    const batContent = `@echo off\r
title KAMIA POS - Print Bridge Node.js\r
color 0A\r
cls\r
echo ======================================================================\r
echo           KAMIA POS - SERVIDOR DE IMPRESION DIRECTA (NODE.JS)\r
echo ======================================================================\r
echo.\r
where node >nul 2>nul\r
if %errorlevel% neq 0 (\r
    color 0C\r
    echo [ALERTA] Node.js no esta instalado en este computador.\r
    echo Node.js es OBLIGATORIO para el Print Bridge.\r
    echo.\r
    echo Abriendo instalador oficial de Node.js...\r
    start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi\r
    pause\r
    exit /b 1\r
)\r
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i\r
echo [OK] Node.js detectado: %NODE_VERSION%\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
set "BRIDGE_FILE=%TARGET_DIR%\\bridge.js"\r
if exist "%~dp0bridge.js" (\r
    copy /y "%~dp0bridge.js" "%BRIDGE_FILE%" >nul\r
) else (\r
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('$env:LOCALAPPDATA\\GastrosPOS\\PrintBridge\\bridge.js', [System.Convert]::FromBase64String('LyoqCiAqIEtBTUlBIGJ5IEpGIOKAlCBOb2RlLmpzIFRoZXJtYWwgUHJpbnQgQnJpZGdlIHYyLjAKICogU2Vydmlkb3IgSFRUUCBsb2NhbCBwYXJhIGltcHJlc2nDs24gdMOpcm1pY2Egc2lsZW5jaW9zYSBkaXJlY3RhIChFU0MvUE9TKQogKiBQdWVydG8gcG9yIGRlZmVjdG86IDgwODgKICovCgpjb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpOwpjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7CmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7CmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTsKY29uc3QgeyBleGVjLCBleGVjRmlsZSB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwpjb25zdCBuZXQgPSByZXF1aXJlKCduZXQnKTsKCmNvbnN0IFBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODg7CmNvbnN0IEhPU1QgPSAnMC4wLjAuMCc7CgovLyBDb21hbmRvcyBFU0MvUE9TIGVzdMOhbmRhcgpjb25zdCBFU0MgPSAnXHgxQic7CmNvbnN0IEdTID0gJ1x4MUQnOwpjb25zdCBFU0NfSU5JVCA9IGAke0VTQ31AYDsgICAgICAgICAgICAgICAvLyBJbmljaWFsaXphciBpbXByZXNvcmEKY29uc3QgRVNDX0NVVF9GVUxMID0gYCR7R1N9Vlx4MDBgOyAgICAgICAgLy8gQ29ydGUgdG90YWwKY29uc3QgRVNDX0NVVF9QQVJUSUFMID0gYCR7R1N9Vlx4MDFgOyAgICAgLy8gQ29ydGUgcGFyY2lhbApjb25zdCBFU0NfRFJBV0VSID0gYCR7RVNDfXBceDAwXHgxOVx4RkFgOyAvLyBBYnJpciBnYXZldGEgLyBjYWrDs24gbW9uZWRlcm8KCi8qKgogKiBPYnRlbmVyIGxpc3RhIGRlIGltcHJlc29yYXMgZGUgV2luZG93cyB1c2FuZG8gUG93ZXJTaGVsbAogKi8KZnVuY3Rpb24gZ2V0V2luZG93c1ByaW50ZXJzKCkgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gewogICAgY29uc3QgcHNDbWQgPSBgR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IE5hbWUsIERlZmF1bHQsIFBvcnROYW1lLCBEcml2ZXJOYW1lLCBQcmludGVyU3RhdHVzIHwgQ29udmVydFRvLUpzb24gLUNvbXByZXNzYDsKICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNDbWRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA2MDAwIH0sIChlcnIsIHN0ZG91dCkgPT4gewogICAgICBpZiAoZXJyIHx8ICFzdGRvdXQudHJpbSgpKSB7CiAgICAgICAgZXhlYygnd21pYyBwcmludGVyIGdldCBuYW1lLGRlZmF1bHQgL2Zvcm1hdDpjc3YnLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA0MDAwIH0sICh3bWljRXJyLCB3bWljT3V0KSA9PiB7CiAgICAgICAgICBpZiAod21pY0VyciB8fCAhd21pY091dCkgewogICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgICB9CiAgICAgICAgICBjb25zdCBsaW5lcyA9IHdtaWNPdXQuc3BsaXQoJ1xuJykubWFwKGwgPT4gbC50cmltKCkpLmZpbHRlcihCb29sZWFuKS5zbGljZSgxKTsKICAgICAgICAgIGNvbnN0IHByaW50ZXJzID0gbGluZXMubWFwKGxpbmUgPT4gewogICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGxpbmUuc3BsaXQoJywnKTsKICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7CiAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGFydHNbMl0udHJpbSgpLCBpc0RlZmF1bHQ6IHBhcnRzWzFdLnRyaW0oKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZScsIHBvcnQ6ICdVU0IvTFBUJyB9OwogICAgICAgICAgICB9CiAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgICAgfSkuZmlsdGVyKEJvb2xlYW4pOwogICAgICAgICAgcmVzb2x2ZShwcmludGVycy5sZW5ndGggPiAwID8gcHJpbnRlcnMgOiBbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgfSk7CiAgICAgICAgcmV0dXJuOwogICAgICB9CgogICAgICB0cnkgewogICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShzdGRvdXQpOwogICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkgZGF0YSA9IFtkYXRhXTsKICAgICAgICBjb25zdCBwcmludGVycyA9IGRhdGEubWFwKHAgPT4gKHsKICAgICAgICAgIG5hbWU6IHAuTmFtZSB8fCAnSW1wcmVzb3JhJywKICAgICAgICAgIGlzRGVmYXVsdDogQm9vbGVhbihwLkRlZmF1bHQpLAogICAgICAgICAgcG9ydDogcC5Qb3J0TmFtZSB8fCAnJywKICAgICAgICAgIGRyaXZlcjogcC5Ecml2ZXJOYW1lIHx8ICcnLAogICAgICAgICAgc3RhdHVzOiBwLlByaW50ZXJTdGF0dXMgfHwgMwogICAgICAgIH0pKTsKICAgICAgICByZXNvbHZlKHByaW50ZXJzKTsKICAgICAgfSBjYXRjaCAocGFyc2VFcnIpIHsKICAgICAgICByZXNvbHZlKFt7IG5hbWU6ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cycsIGlzRGVmYXVsdDogdHJ1ZSwgcG9ydDogJ0RFRkFVTFQnIH1dKTsKICAgICAgfQogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBSQVcgZW4gaW1wcmVzb3JhIGRlIHJlZCAoVENQIFNvY2tldCBwdWVydG8gOTEwMCkKICovCmZ1bmN0aW9uIHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCA9IDkxMDAsIGJ1ZmZlcikgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7CiAgICBjb25zdCBjbGllbnQgPSBuZXcgbmV0LlNvY2tldCgpOwogICAgY2xpZW50LnNldFRpbWVvdXQoNTAwMCk7CiAgICBjbGllbnQuY29ubmVjdChwb3J0LCBpcCwgKCkgPT4gewogICAgICBjbGllbnQud3JpdGUoYnVmZmVyLCAoKSA9PiB7CiAgICAgICAgY2xpZW50LmVuZCgpOwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgICBjbGllbnQub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpOwogICAgY2xpZW50Lm9uKCd0aW1lb3V0JywgKCkgPT4gewogICAgICBjbGllbnQuZGVzdHJveSgpOwogICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGRlIGNvbmV4acOzbiBhIGxhIGltcHJlc29yYSBlbiAke2lwfToke3BvcnR9YCkpOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBlbiBpbXByZXNvcmEgbG9jYWwvY29tcGFydGlkYSBkZSBXaW5kb3dzIHVzYW5kbyB3aW5zcG9vbCBSQVcgeSBPdXQtUHJpbnRlciBmYWxsYmFjawogKi8KZnVuY3Rpb24gcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgYnVmZmVyKSB7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsKICAgIGNvbnN0IHRlbXBGaWxlID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBga2FtaWFfcHJpbnRfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA2KX0uYmluYCk7CiAgICAKICAgIGZzLndyaXRlRmlsZSh0ZW1wRmlsZSwgYnVmZmVyLCAod3JpdGVFcnIpID0+IHsKICAgICAgaWYgKHdyaXRlRXJyKSByZXR1cm4gcmVqZWN0KHdyaXRlRXJyKTsKCiAgICAgIGNvbnN0IHRhcmdldFByaW50ZXIgPSBwcmludGVyTmFtZSAmJiBwcmludGVyTmFtZSAhPT0gJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSBkZSBXaW5kb3dzJwogICAgICAgID8gcHJpbnRlck5hbWUucmVwbGFjZSgvJy9nLCAiJyciKQogICAgICAgIDogJyc7CgogICAgICBjb25zdCBwc1NjcmlwdCA9IGAKJHRlbXBGaWxlID0gJyR7dGVtcEZpbGUucmVwbGFjZSgvJy9nLCAiJyciKX0nOwokcHJpbnRlck5hbWUgPSAnJHt0YXJnZXRQcmludGVyfSc7CgppZiAoLW5vdCAkcHJpbnRlck5hbWUpIHsKICAkZGVmYXVsdFByaW50ZXIgPSBHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJpbnRlciB8IFdoZXJlLU9iamVjdCB7ICRfLkRlZmF1bHQgLWVxICR0cnVlIH0gfCBTZWxlY3QtT2JqZWN0IC1GaXJzdCAxOwogIGlmICgkZGVmYXVsdFByaW50ZXIpIHsgJHByaW50ZXJOYW1lID0gJGRlZmF1bHRQcmludGVyLk5hbWUgfQogIGVsc2UgewogICAgJGFueVByaW50ZXIgPSBHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJpbnRlciB8IFNlbGVjdC1PYmplY3QgLUZpcnN0IDE7CiAgICBpZiAoJGFueVByaW50ZXIpIHsgJHByaW50ZXJOYW1lID0gJGFueVByaW50ZXIuTmFtZSB9CiAgfQp9CgppZiAoLW5vdCAkcHJpbnRlck5hbWUpIHsKICBleGl0IDEKfQoKIyBEZWZpbmlyIFJhd1ByaW50ZXJIZWxwZXIgY29uIHdpbnNwb29sLmRydiBuYXRpdm8gZGUgV2luZG93cwokY29kZSA9IEAiCnVzaW5nIFN5c3RlbTsKdXNpbmcgU3lzdGVtLlJ1bnRpbWUuSW50ZXJvcFNlcnZpY2VzOwoKcHVibGljIGNsYXNzIFJhd1ByaW50ZXJIZWxwZXIgewogICAgW1N0cnVjdExheW91dChMYXlvdXRLaW5kLlNlcXVlbnRpYWwsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2kpXQogICAgcHVibGljIGNsYXNzIERPQ0lORk9BIHsKICAgICAgICBbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBwdWJsaWMgc3RyaW5nIHBEb2NOYW1lOwogICAgICAgIFtNYXJzaGFsQXMoVW5tYW5hZ2VkVHlwZS5MUFN0cildIHB1YmxpYyBzdHJpbmcgcE91dHB1dEZpbGU7CiAgICAgICAgW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gcHVibGljIHN0cmluZyBwRGF0YVR5cGU7CiAgICB9CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJPcGVuUHJpbnRlckEiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBDaGFyU2V0ID0gQ2hhclNldC5BbnNpLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgT3BlblByaW50ZXIoW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gc3RyaW5nIHN6UHJpbnRlciwgb3V0IEludFB0ciBoUHJpbnRlciwgSW50UHRyIHBkKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIkNsb3NlUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBDbG9zZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIlN0YXJ0RG9jUHJpbnRlckEiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBDaGFyU2V0ID0gQ2hhclNldC5BbnNpLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgU3RhcnREb2NQcmludGVyKEludFB0ciBoUHJpbnRlciwgaW50IGxldmVsLCBbSW4sIE1hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RydWN0KV0gRE9DSU5GT0EgZGkpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiRW5kRG9jUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBFbmREb2NQcmludGVyKEludFB0ciBoUHJpbnRlcik7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJTdGFydFBhZ2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIFN0YXJ0UGFnZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIkVuZFBhZ2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIEVuZFBhZ2VQcmludGVyKEludFB0ciBoUHJpbnRlcik7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJXcml0ZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgV3JpdGVQcmludGVyKEludFB0ciBoUHJpbnRlciwgSW50UHRyIHBCeXRlcywgaW50IGR3Q291bnQsIG91dCBpbnQgZHdXcml0dGVuKTsKCiAgICBwdWJsaWMgc3RhdGljIGJvb2wgU2VuZEJ5dGVzVG9QcmludGVyKHN0cmluZyBzelByaW50ZXJOYW1lLCBieXRlW10gcEJ5dGVzKSB7CiAgICAgICAgSW50UHRyIGhQcmludGVyID0gbmV3IEludFB0cigwKTsKICAgICAgICBET0NJTkZPQSBkaSA9IG5ldyBET0NJTkZPQSgpOwogICAgICAgIGJvb2wgYlN1Y2Nlc3MgPSBmYWxzZTsKCiAgICAgICAgZGkucERvY05hbWUgPSAiS0FNSUEgUE9TIFRpY2tldCI7CiAgICAgICAgZGkucERhdGFUeXBlID0gIlJBVyI7CgogICAgICAgIGlmIChPcGVuUHJpbnRlcihzelByaW50ZXJOYW1lLCBvdXQgaFByaW50ZXIsIEludFB0ci5aZXJvKSkgewogICAgICAgICAgICBpZiAoU3RhcnREb2NQcmludGVyKGhQcmludGVyLCAxLCBkaSkpIHsKICAgICAgICAgICAgICAgIGlmIChTdGFydFBhZ2VQcmludGVyKGhQcmludGVyKSkgewogICAgICAgICAgICAgICAgICAgIEludFB0ciBwVW5tYW5hZ2VkQnl0ZXMgPSBNYXJzaGFsLkFsbG9jQ29UYXNrTWVtKHBCeXRlcy5MZW5ndGgpOwogICAgICAgICAgICAgICAgICAgIE1hcnNoYWwuQ29weShwQnl0ZXMsIDAsIHBVbm1hbmFnZWRCeXRlcywgcEJ5dGVzLkxlbmd0aCk7CiAgICAgICAgICAgICAgICAgICAgaW50IGR3V3JpdHRlbiA9IDA7CiAgICAgICAgICAgICAgICAgICAgYlN1Y2Nlc3MgPSBXcml0ZVByaW50ZXIoaFByaW50ZXIsIHBVbm1hbmFnZWRCeXRlcywgcEJ5dGVzLkxlbmd0aCwgb3V0IGR3V3JpdHRlbik7CiAgICAgICAgICAgICAgICAgICAgTWFyc2hhbC5GcmVlQ29UYXNrTWVtKHBVbm1hbmFnZWRCeXRlcyk7CiAgICAgICAgICAgICAgICAgICAgRW5kUGFnZVByaW50ZXIoaFByaW50ZXIpOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgRW5kRG9jUHJpbnRlcihoUHJpbnRlcik7CiAgICAgICAgICAgIH0KICAgICAgICAgICAgQ2xvc2VQcmludGVyKGhQcmludGVyKTsKICAgICAgICB9CiAgICAgICAgcmV0dXJuIGJTdWNjZXNzOwogICAgfQp9CiJACgp0cnkgewogICAgaWYgKC1ub3QgKFtTeXN0ZW0uTWFuYWdlbWVudC5BdXRvbWF0aW9uLlBTVHlwZU5hbWVdJ1Jhd1ByaW50ZXJIZWxwZXInKS5UeXBlKSB7CiAgICAgICAgQWRkLVR5cGUgLVR5cGVEZWZpbml0aW9uICRjb2RlIC1FcnJvckFjdGlvbiBTdG9wCiAgICB9CiAgICAkYnl0ZXMgPSBbU3lzdGVtLklPLkZpbGVdOjpSZWFkQWxsQnl0ZXMoJHRlbXBGaWxlKQogICAgJG9rID0gW1Jhd1ByaW50ZXJIZWxwZXJdOjpTZW5kQnl0ZXNUb1ByaW50ZXIoJHByaW50ZXJOYW1lLCAkYnl0ZXMpCiAgICBpZiAoJG9rKSB7CiAgICAgICAgZXhpdCAwCiAgICB9Cn0gY2F0Y2ggewogICAgIyBDb250aW51YXIgYWwgZmFsbGJhY2sgZGUgT3V0LVByaW50ZXIKfQoKIyBGYWxsYmFjayBlc3TDoW5kYXIgT3V0LVByaW50ZXIKdHJ5IHsKICAgIEdldC1Db250ZW50IC1QYXRoICR0ZW1wRmlsZSAtRW5jb2RpbmcgRGVmYXVsdCB8IE91dC1QcmludGVyIC1OYW1lICRwcmludGVyTmFtZSAtRXJyb3JBY3Rpb24gU3RvcAogICAgZXhpdCAwCn0gY2F0Y2ggewogICAgIyBTaSBsYSBpbXByZXNvcmEgZXMgdmlydHVhbCBjb21vIFBERiBvIG5vIHJlc3BvbmRlLCBzYWxpciBzaW4gcm9tcGVyCiAgICBleGl0IDAKfQogICAgICBgLnRyaW0oKTsKCiAgICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNTY3JpcHRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA4MDAwIH0sIChwc0VycikgPT4gewogICAgICAgIHRyeSB7IGZzLnVubGlua1N5bmModGVtcEZpbGUpOyB9IGNhdGNoIChlKSB7fQogICAgICAgIC8vIFNpZW1wcmUgcmVzb2x2ZXIgw6l4aXRvIHBhcmEgbm8gaW50ZXJydW1waXIgZWwgZmx1am8gZGVsIFBPUwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBTZXJ2aWRvciBIVFRQCiAqLwpjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhc3luYyAocmVxLCByZXMpID0+IHsKICAvLyBDT1JTIEhlYWRlcnMKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7CiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTsKICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcpOwoKICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7CiAgICByZXMud3JpdGVIZWFkKDIwMCk7CiAgICByZXR1cm4gcmVzLmVuZCgpOwogIH0KCiAgY29uc3QgdXJsID0gcmVxLnVybC5zcGxpdCgnPycpWzBdOwoKICAvLyAxLiBHRVQgL2hlYWx0aCBvIC9zdGF0dXMKICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgKHVybCA9PT0gJy8nIHx8IHVybCA9PT0gJy9oZWFsdGgnIHx8IHVybCA9PT0gJy9zdGF0dXMnKSkgewogICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewogICAgICBzdGF0dXM6ICdvbmxpbmUnLAogICAgICBzZXJ2aWNlOiAnS0FNSUEgTm9kZS5qcyBQcmludCBCcmlkZ2UnLAogICAgICB2ZXJzaW9uOiAnMi4wLjAnLAogICAgICBub2RlVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9uLAogICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSwKICAgICAgYXJjaDogb3MuYXJjaCgpLAogICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSwKICAgICAgdXB0aW1lU2Vjb25kczogTWF0aC5mbG9vcihwcm9jZXNzLnVwdGltZSgpKSwKICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkKICAgIH0pKTsKICB9CgogIC8vIDIuIEdFVCAvcHJpbnRlcnMKICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgdXJsID09PSAnL3ByaW50ZXJzJykgewogICAgdHJ5IHsKICAgICAgY29uc3QgcHJpbnRlcnMgPSBhd2FpdCBnZXRXaW5kb3dzUHJpbnRlcnMoKTsKICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBwcmludGVycyB9KSk7CiAgICB9IGNhdGNoIChlcnIpIHsKICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgIH0KICB9CgogIC8vIDMuIFBPU1QgL3ByaW50CiAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJyAmJiB1cmwgPT09ICcvcHJpbnQnKSB7CiAgICBsZXQgYm9keSA9ICcnOwogICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rOyB9KTsKICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4gewogICAgICB0cnkgewogICAgICAgIGNvbnN0IHBheWxvYWQgPSBKU09OLnBhcnNlKGJvZHkgfHwgJ3t9Jyk7CiAgICAgICAgY29uc3QgeyB0ZXh0LCByYXcsIHByaW50ZXJOYW1lLCBjdXRQYXBlciA9IHRydWUsIG9wZW5EcmF3ZXIgPSBmYWxzZSwgaXAgPSBudWxsLCBwb3J0ID0gOTEwMCB9ID0gcGF5bG9hZDsKCiAgICAgICAgaWYgKCF0ZXh0ICYmICFyYXcpIHsKICAgICAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDQwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRWwgY2FtcG8gInRleHQiIG8gInJhdyIgZXMgcmVxdWVyaWRvJyB9KSk7CiAgICAgICAgfQoKICAgICAgICBsZXQgY2h1bmtzID0gW107CiAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0lOSVQsICdiaW5hcnknKSk7CgogICAgICAgIGlmIChvcGVuRHJhd2VyKSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbShFU0NfRFJBV0VSLCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKHRleHQpIHsKICAgICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKHRleHQsICdsYXRpbjEnKSk7CiAgICAgICAgfQoKICAgICAgICBpZiAocmF3KSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbShyYXcsICdiaW5hcnknKSk7CiAgICAgICAgfQoKICAgICAgICBpZiAoY3V0UGFwZXIgIT09IGZhbHNlKSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbSgnXG5cblxuXG4nLCAnbGF0aW4xJykpOwogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0NVVF9QQVJUSUFMLCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgY29uc3QgZmluYWxCdWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7CgogICAgICAgIGlmIChpcCkgewogICAgICAgICAgYXdhaXQgcHJpbnROZXR3b3JrU29ja2V0KGlwLCBwb3J0LCBmaW5hbEJ1ZmZlcik7CiAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBJbXByZXNpw7NuIGVudmlhZGEgYSBzb2NrZXQgZGUgcmVkICR7aXB9OiR7cG9ydH1gIH0pKTsKICAgICAgICB9CgogICAgICAgIGF3YWl0IHByaW50V2luZG93c1Nwb29sZXIocHJpbnRlck5hbWUsIGZpbmFsQnVmZmVyKTsKICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBUcmFiYWpvIGVudmlhZG8gYSBsYSBjb2xhIGRlICR7cHJpbnRlck5hbWUgfHwgJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSd9YCB9KSk7CgogICAgICB9IGNhdGNoIChlcnIpIHsKICAgICAgICBjb25zb2xlLmVycm9yKCdbUHJpbnRCcmlkZ2VdIEVycm9yIGFsIHByb2Nlc2FyIGltcHJlc2nDs246JywgZXJyKTsKICAgICAgICByZXR1cm4gcmVzLndyaXRlSGVhZCg1MDApLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkpOwogICAgICB9CiAgICB9KTsKICAgIHJldHVybjsKICB9CgogIC8vIDQuIFBPU1QgL3Rlc3QtcHJpbnQKICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHVybCA9PT0gJy90ZXN0LXByaW50JykgewogICAgbGV0IGJvZHkgPSAnJzsKICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHsgYm9keSArPSBjaHVuazsgfSk7CiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHsKICAgICAgdHJ5IHsKICAgICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShib2R5IHx8ICd7fScpOwogICAgICAgIGNvbnN0IHByaW50ZXJOYW1lID0gcGF5bG9hZC5wcmludGVyTmFtZSB8fCBudWxsOwogICAgICAgIGNvbnN0IHRlc3RUeXBlID0gcGF5bG9hZC50eXBlIHx8ICdjb21hbmRhJzsKCiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygnZXMtQ08nKTsKICAgICAgICBjb25zdCBzZXBhcmF0b3IgPSAnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSc7CiAgICAgICAgY29uc3QgbGluZSA9ICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJzsKCiAgICAgICAgbGV0IHRlc3RUZXh0ID0gJyc7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICAgICAgIEtBTUlBIFBPUyAmIEVSUCBieSBKRiAgICAgICAgIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICAgIlRvZG8gdHUgbmVnb2NpbywgY29uZWN0YWRvLiIgICAgIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAgICAqKiogVElDS0VUIERFIFBSVUVCQSBERSBJTVBSRVNJT04gKioqIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtsaW5lfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgRmVjaGEgLyBIb3JhOiAgJHtub3d9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBTZXJ2aWNpbzogICAgICBLQU1JQSBOb2RlLmpzIFByaW50IEJyaWRnZSB2Mi4wXG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBNb3RvcjogICAgICAgICBOb2RlLmpzICR7cHJvY2Vzcy52ZXJzaW9ufVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgSW1wcmVzb3JhOiAgICAgJHtwcmludGVyTmFtZSB8fCAnUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cyd9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBEZXN0aW5vOiAgICAgICAke3Rlc3RUeXBlID09PSAnY29jaW5hJyA/ICdDb2NpbmEgKENvbWFuZGEpJyA6ICh0ZXN0VHlwZSA9PT0gJ2NhamEnID8gJ0NhamEgKEZhY3R1cmFjacOzbiknIDogJ0dlbmVyYWwnKX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYENhcmFjdGVyZXMgRXNwZWNpYWxlcyAvIEFjZW50b3M6XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGDDoSDDqSDDrSDDsyDDuiDDsSDDgSDDiSDDjSDDkyDDmiDDkSAkICUgJiBAICNcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEVzdGFkbzogICAgICAgIENPTkVYSU9OIDEwMCUgRVhJVE9TQVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgSW1wcmVzaW9uOiAgICAgRGlyZWN0YSB5IFNpbGVuY2lvc2EgKE9LKVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAgICAgIMKhVHUgaW1wcmVzb3JhIGVzdGEgbGlzdGEgcGFyYSBvcGVyYXIhIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwoKICAgICAgICBjb25zdCBjaHVua3MgPSBbCiAgICAgICAgICBCdWZmZXIuZnJvbShFU0NfSU5JVCwgJ2JpbmFyeScpLAogICAgICAgICAgQnVmZmVyLmZyb20odGVzdFRleHQsICdsYXRpbjEnKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKCdcblxuXG5cbicsICdsYXRpbjEnKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKEVTQ19DVVRfUEFSVElBTCwgJ2JpbmFyeScpCiAgICAgICAgXTsKCiAgICAgICAgY29uc3QgZmluYWxCdWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7CiAgICAgICAgYXdhaXQgcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgZmluYWxCdWZmZXIpOwoKICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7CiAgICAgICAgICBzdWNjZXNzOiB0cnVlLAogICAgICAgICAgbWVzc2FnZTogYFRpY2tldCBkZSBwcnVlYmEgcHJvY2VzYWRvIGV4aXRvc2FtZW50ZSBwYXJhICR7cHJpbnRlck5hbWUgfHwgJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSd9YAogICAgICAgIH0pKTsKICAgICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgICAgY29uc29sZS5lcnJvcignW1ByaW50QnJpZGdlXSBFcnJvciBhbCBpbXByaW1pciB0ZXN0OicsIGVycik7CiAgICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgICAgfQogICAgfSk7CiAgICByZXR1cm47CiAgfQoKICAvLyA0MDQKICByZXMud3JpdGVIZWFkKDQwNCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdFbmRwb2ludCBubyBlbmNvbnRyYWRvJyB9KSk7Cn0pOwoKc2VydmVyLmxpc3RlbihQT1JULCBIT1NULCAoKSA9PiB7CiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTsKICBjb25zb2xlLmxvZyhg4pyFIEtBTUlBIE5vZGUuanMgUHJpbnQgQnJpZGdlIHYyLjAgaW5pY2lhZG9gKTsKICBjb25zb2xlLmxvZyhgICAgRXNjdWNoYW5kbyBlbjogaHR0cDovL2xvY2FsaG9zdDoke1BPUlR9YCk7CiAgY29uc29sZS5sb2coYCAgIE5vZGUuanM6ICR7cHJvY2Vzcy52ZXJzaW9ufSDigJQgUGxhdGFmb3JtYTogJHtvcy5wbGF0Zm9ybSgpfWApOwogIGNvbnNvbGUubG9nKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7Cn0pOwo='))"\r
)\r
echo [OK] Iniciando KAMIA Print Bridge en http://localhost:8088...\r
echo.\r
cd /d "%TARGET_DIR%"\r
node bridge.js\r
pause\r
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iniciar-bridge.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Script iniciar-bridge.bat descargado (Auto-extraíble)', 'success');
  };

  const downloadInstallerBat = () => {
    const batContent = `@echo off\r
title KAMIA POS - Instalador de Servicio Print Bridge\r
color 0B\r
cls\r
echo ======================================================================\r
echo           KAMIA POS - INSTALADOR DE SERVICIO PRINT BRIDGE (NODE.JS)\r
echo ======================================================================\r
echo.\r
where node >nul 2>nul\r
if %errorlevel% neq 0 (\r
    color 0C\r
    echo [ERROR] Node.js no esta instalado.\r
    echo Descargando Node.js LTS oficial...\r
    start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi\r
    pause\r
    exit /b 1\r
)\r
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i\r
echo   [1/4] Node.js verificado: %NODE_VERSION%\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
set "BRIDGE_FILE=%TARGET_DIR%\\bridge.js"\r
if exist "%~dp0bridge.js" (\r
    copy /y "%~dp0bridge.js" "%BRIDGE_FILE%" >nul\r
) else (\r
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('$env:LOCALAPPDATA\\GastrosPOS\\PrintBridge\\bridge.js', [System.Convert]::FromBase64String('LyoqCiAqIEtBTUlBIGJ5IEpGIOKAlCBOb2RlLmpzIFRoZXJtYWwgUHJpbnQgQnJpZGdlIHYyLjAKICogU2Vydmlkb3IgSFRUUCBsb2NhbCBwYXJhIGltcHJlc2nDs24gdMOpcm1pY2Egc2lsZW5jaW9zYSBkaXJlY3RhIChFU0MvUE9TKQogKiBQdWVydG8gcG9yIGRlZmVjdG86IDgwODgKICovCgpjb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpOwpjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7CmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7CmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTsKY29uc3QgeyBleGVjLCBleGVjRmlsZSB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwpjb25zdCBuZXQgPSByZXF1aXJlKCduZXQnKTsKCmNvbnN0IFBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODg7CmNvbnN0IEhPU1QgPSAnMC4wLjAuMCc7CgovLyBDb21hbmRvcyBFU0MvUE9TIGVzdMOhbmRhcgpjb25zdCBFU0MgPSAnXHgxQic7CmNvbnN0IEdTID0gJ1x4MUQnOwpjb25zdCBFU0NfSU5JVCA9IGAke0VTQ31AYDsgICAgICAgICAgICAgICAvLyBJbmljaWFsaXphciBpbXByZXNvcmEKY29uc3QgRVNDX0NVVF9GVUxMID0gYCR7R1N9Vlx4MDBgOyAgICAgICAgLy8gQ29ydGUgdG90YWwKY29uc3QgRVNDX0NVVF9QQVJUSUFMID0gYCR7R1N9Vlx4MDFgOyAgICAgLy8gQ29ydGUgcGFyY2lhbApjb25zdCBFU0NfRFJBV0VSID0gYCR7RVNDfXBceDAwXHgxOVx4RkFgOyAvLyBBYnJpciBnYXZldGEgLyBjYWrDs24gbW9uZWRlcm8KCi8qKgogKiBPYnRlbmVyIGxpc3RhIGRlIGltcHJlc29yYXMgZGUgV2luZG93cyB1c2FuZG8gUG93ZXJTaGVsbAogKi8KZnVuY3Rpb24gZ2V0V2luZG93c1ByaW50ZXJzKCkgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gewogICAgY29uc3QgcHNDbWQgPSBgR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IE5hbWUsIERlZmF1bHQsIFBvcnROYW1lLCBEcml2ZXJOYW1lLCBQcmludGVyU3RhdHVzIHwgQ29udmVydFRvLUpzb24gLUNvbXByZXNzYDsKICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNDbWRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA2MDAwIH0sIChlcnIsIHN0ZG91dCkgPT4gewogICAgICBpZiAoZXJyIHx8ICFzdGRvdXQudHJpbSgpKSB7CiAgICAgICAgZXhlYygnd21pYyBwcmludGVyIGdldCBuYW1lLGRlZmF1bHQgL2Zvcm1hdDpjc3YnLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA0MDAwIH0sICh3bWljRXJyLCB3bWljT3V0KSA9PiB7CiAgICAgICAgICBpZiAod21pY0VyciB8fCAhd21pY091dCkgewogICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgICB9CiAgICAgICAgICBjb25zdCBsaW5lcyA9IHdtaWNPdXQuc3BsaXQoJ1xuJykubWFwKGwgPT4gbC50cmltKCkpLmZpbHRlcihCb29sZWFuKS5zbGljZSgxKTsKICAgICAgICAgIGNvbnN0IHByaW50ZXJzID0gbGluZXMubWFwKGxpbmUgPT4gewogICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGxpbmUuc3BsaXQoJywnKTsKICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7CiAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGFydHNbMl0udHJpbSgpLCBpc0RlZmF1bHQ6IHBhcnRzWzFdLnRyaW0oKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZScsIHBvcnQ6ICdVU0IvTFBUJyB9OwogICAgICAgICAgICB9CiAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgICAgfSkuZmlsdGVyKEJvb2xlYW4pOwogICAgICAgICAgcmVzb2x2ZShwcmludGVycy5sZW5ndGggPiAwID8gcHJpbnRlcnMgOiBbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgfSk7CiAgICAgICAgcmV0dXJuOwogICAgICB9CgogICAgICB0cnkgewogICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShzdGRvdXQpOwogICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkgZGF0YSA9IFtkYXRhXTsKICAgICAgICBjb25zdCBwcmludGVycyA9IGRhdGEubWFwKHAgPT4gKHsKICAgICAgICAgIG5hbWU6IHAuTmFtZSB8fCAnSW1wcmVzb3JhJywKICAgICAgICAgIGlzRGVmYXVsdDogQm9vbGVhbihwLkRlZmF1bHQpLAogICAgICAgICAgcG9ydDogcC5Qb3J0TmFtZSB8fCAnJywKICAgICAgICAgIGRyaXZlcjogcC5Ecml2ZXJOYW1lIHx8ICcnLAogICAgICAgICAgc3RhdHVzOiBwLlByaW50ZXJTdGF0dXMgfHwgMwogICAgICAgIH0pKTsKICAgICAgICByZXNvbHZlKHByaW50ZXJzKTsKICAgICAgfSBjYXRjaCAocGFyc2VFcnIpIHsKICAgICAgICByZXNvbHZlKFt7IG5hbWU6ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cycsIGlzRGVmYXVsdDogdHJ1ZSwgcG9ydDogJ0RFRkFVTFQnIH1dKTsKICAgICAgfQogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBSQVcgZW4gaW1wcmVzb3JhIGRlIHJlZCAoVENQIFNvY2tldCBwdWVydG8gOTEwMCkKICovCmZ1bmN0aW9uIHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCA9IDkxMDAsIGJ1ZmZlcikgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7CiAgICBjb25zdCBjbGllbnQgPSBuZXcgbmV0LlNvY2tldCgpOwogICAgY2xpZW50LnNldFRpbWVvdXQoNTAwMCk7CiAgICBjbGllbnQuY29ubmVjdChwb3J0LCBpcCwgKCkgPT4gewogICAgICBjbGllbnQud3JpdGUoYnVmZmVyLCAoKSA9PiB7CiAgICAgICAgY2xpZW50LmVuZCgpOwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgICBjbGllbnQub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpOwogICAgY2xpZW50Lm9uKCd0aW1lb3V0JywgKCkgPT4gewogICAgICBjbGllbnQuZGVzdHJveSgpOwogICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGRlIGNvbmV4acOzbiBhIGxhIGltcHJlc29yYSBlbiAke2lwfToke3BvcnR9YCkpOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBlbiBpbXByZXNvcmEgbG9jYWwvY29tcGFydGlkYSBkZSBXaW5kb3dzIHVzYW5kbyB3aW5zcG9vbCBSQVcgeSBPdXQtUHJpbnRlciBmYWxsYmFjawogKi8KZnVuY3Rpb24gcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgYnVmZmVyKSB7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsKICAgIGNvbnN0IHRlbXBGaWxlID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBga2FtaWFfcHJpbnRfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA2KX0uYmluYCk7CiAgICAKICAgIGZzLndyaXRlRmlsZSh0ZW1wRmlsZSwgYnVmZmVyLCAod3JpdGVFcnIpID0+IHsKICAgICAgaWYgKHdyaXRlRXJyKSByZXR1cm4gcmVqZWN0KHdyaXRlRXJyKTsKCiAgICAgIGNvbnN0IHRhcmdldFByaW50ZXIgPSBwcmludGVyTmFtZSAmJiBwcmludGVyTmFtZSAhPT0gJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSBkZSBXaW5kb3dzJwogICAgICAgID8gcHJpbnRlck5hbWUucmVwbGFjZSgvJy9nLCAiJyciKQogICAgICAgIDogJyc7CgogICAgICBjb25zdCBwc1NjcmlwdCA9IGAKJHRlbXBGaWxlID0gJyR7dGVtcEZpbGUucmVwbGFjZSgvJy9nLCAiJyciKX0nOwokcHJpbnRlck5hbWUgPSAnJHt0YXJnZXRQcmludGVyfSc7CgppZiAoLW5vdCAkcHJpbnRlck5hbWUpIHsKICAkZGVmYXVsdFByaW50ZXIgPSBHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJpbnRlciB8IFdoZXJlLU9iamVjdCB7ICRfLkRlZmF1bHQgLWVxICR0cnVlIH0gfCBTZWxlY3QtT2JqZWN0IC1GaXJzdCAxOwogIGlmICgkZGVmYXVsdFByaW50ZXIpIHsgJHByaW50ZXJOYW1lID0gJGRlZmF1bHRQcmludGVyLk5hbWUgfQogIGVsc2UgewogICAgJGFueVByaW50ZXIgPSBHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJpbnRlciB8IFNlbGVjdC1PYmplY3QgLUZpcnN0IDE7CiAgICBpZiAoJGFueVByaW50ZXIpIHsgJHByaW50ZXJOYW1lID0gJGFueVByaW50ZXIuTmFtZSB9CiAgfQp9CgppZiAoLW5vdCAkcHJpbnRlck5hbWUpIHsKICBleGl0IDEKfQoKIyBEZWZpbmlyIFJhd1ByaW50ZXJIZWxwZXIgY29uIHdpbnNwb29sLmRydiBuYXRpdm8gZGUgV2luZG93cwokY29kZSA9IEAiCnVzaW5nIFN5c3RlbTsKdXNpbmcgU3lzdGVtLlJ1bnRpbWUuSW50ZXJvcFNlcnZpY2VzOwoKcHVibGljIGNsYXNzIFJhd1ByaW50ZXJIZWxwZXIgewogICAgW1N0cnVjdExheW91dChMYXlvdXRLaW5kLlNlcXVlbnRpYWwsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2kpXQogICAgcHVibGljIGNsYXNzIERPQ0lORk9BIHsKICAgICAgICBbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBwdWJsaWMgc3RyaW5nIHBEb2NOYW1lOwogICAgICAgIFtNYXJzaGFsQXMoVW5tYW5hZ2VkVHlwZS5MUFN0cildIHB1YmxpYyBzdHJpbmcgcE91dHB1dEZpbGU7CiAgICAgICAgW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gcHVibGljIHN0cmluZyBwRGF0YVR5cGU7CiAgICB9CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJPcGVuUHJpbnRlckEiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBDaGFyU2V0ID0gQ2hhclNldC5BbnNpLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgT3BlblByaW50ZXIoW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gc3RyaW5nIHN6UHJpbnRlciwgb3V0IEludFB0ciBoUHJpbnRlciwgSW50UHRyIHBkKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIkNsb3NlUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBDbG9zZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIlN0YXJ0RG9jUHJpbnRlckEiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBDaGFyU2V0ID0gQ2hhclNldC5BbnNpLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgU3RhcnREb2NQcmludGVyKEludFB0ciBoUHJpbnRlciwgaW50IGxldmVsLCBbSW4sIE1hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RydWN0KV0gRE9DSU5GT0EgZGkpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiRW5kRG9jUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBFbmREb2NQcmludGVyKEludFB0ciBoUHJpbnRlcik7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJTdGFydFBhZ2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIFN0YXJ0UGFnZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIkVuZFBhZ2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIEVuZFBhZ2VQcmludGVyKEludFB0ciBoUHJpbnRlcik7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJXcml0ZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgV3JpdGVQcmludGVyKEludFB0ciBoUHJpbnRlciwgSW50UHRyIHBCeXRlcywgaW50IGR3Q291bnQsIG91dCBpbnQgZHdXcml0dGVuKTsKCiAgICBwdWJsaWMgc3RhdGljIGJvb2wgU2VuZEJ5dGVzVG9QcmludGVyKHN0cmluZyBzelByaW50ZXJOYW1lLCBieXRlW10gcEJ5dGVzKSB7CiAgICAgICAgSW50UHRyIGhQcmludGVyID0gbmV3IEludFB0cigwKTsKICAgICAgICBET0NJTkZPQSBkaSA9IG5ldyBET0NJTkZPQSgpOwogICAgICAgIGJvb2wgYlN1Y2Nlc3MgPSBmYWxzZTsKCiAgICAgICAgZGkucERvY05hbWUgPSAiS0FNSUEgUE9TIFRpY2tldCI7CiAgICAgICAgZGkucERhdGFUeXBlID0gIlJBVyI7CgogICAgICAgIGlmIChPcGVuUHJpbnRlcihzelByaW50ZXJOYW1lLCBvdXQgaFByaW50ZXIsIEludFB0ci5aZXJvKSkgewogICAgICAgICAgICBpZiAoU3RhcnREb2NQcmludGVyKGhQcmludGVyLCAxLCBkaSkpIHsKICAgICAgICAgICAgICAgIGlmIChTdGFydFBhZ2VQcmludGVyKGhQcmludGVyKSkgewogICAgICAgICAgICAgICAgICAgIEludFB0ciBwVW5tYW5hZ2VkQnl0ZXMgPSBNYXJzaGFsLkFsbG9jQ29UYXNrTWVtKHBCeXRlcy5MZW5ndGgpOwogICAgICAgICAgICAgICAgICAgIE1hcnNoYWwuQ29weShwQnl0ZXMsIDAsIHBVbm1hbmFnZWRCeXRlcywgcEJ5dGVzLkxlbmd0aCk7CiAgICAgICAgICAgICAgICAgICAgaW50IGR3V3JpdHRlbiA9IDA7CiAgICAgICAgICAgICAgICAgICAgYlN1Y2Nlc3MgPSBXcml0ZVByaW50ZXIoaFByaW50ZXIsIHBVbm1hbmFnZWRCeXRlcywgcEJ5dGVzLkxlbmd0aCwgb3V0IGR3V3JpdHRlbik7CiAgICAgICAgICAgICAgICAgICAgTWFyc2hhbC5GcmVlQ29UYXNrTWVtKHBVbm1hbmFnZWRCeXRlcyk7CiAgICAgICAgICAgICAgICAgICAgRW5kUGFnZVByaW50ZXIoaFByaW50ZXIpOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgRW5kRG9jUHJpbnRlcihoUHJpbnRlcik7CiAgICAgICAgICAgIH0KICAgICAgICAgICAgQ2xvc2VQcmludGVyKGhQcmludGVyKTsKICAgICAgICB9CiAgICAgICAgcmV0dXJuIGJTdWNjZXNzOwogICAgfQp9CiJACgp0cnkgewogICAgaWYgKC1ub3QgKFtTeXN0ZW0uTWFuYWdlbWVudC5BdXRvbWF0aW9uLlBTVHlwZU5hbWVdJ1Jhd1ByaW50ZXJIZWxwZXInKS5UeXBlKSB7CiAgICAgICAgQWRkLVR5cGUgLVR5cGVEZWZpbml0aW9uICRjb2RlIC1FcnJvckFjdGlvbiBTdG9wCiAgICB9CiAgICAkYnl0ZXMgPSBbU3lzdGVtLklPLkZpbGVdOjpSZWFkQWxsQnl0ZXMoJHRlbXBGaWxlKQogICAgJG9rID0gW1Jhd1ByaW50ZXJIZWxwZXJdOjpTZW5kQnl0ZXNUb1ByaW50ZXIoJHByaW50ZXJOYW1lLCAkYnl0ZXMpCiAgICBpZiAoJG9rKSB7CiAgICAgICAgZXhpdCAwCiAgICB9Cn0gY2F0Y2ggewogICAgIyBDb250aW51YXIgYWwgZmFsbGJhY2sgZGUgT3V0LVByaW50ZXIKfQoKIyBGYWxsYmFjayBlc3TDoW5kYXIgT3V0LVByaW50ZXIKdHJ5IHsKICAgIEdldC1Db250ZW50IC1QYXRoICR0ZW1wRmlsZSAtRW5jb2RpbmcgRGVmYXVsdCB8IE91dC1QcmludGVyIC1OYW1lICRwcmludGVyTmFtZSAtRXJyb3JBY3Rpb24gU3RvcAogICAgZXhpdCAwCn0gY2F0Y2ggewogICAgIyBTaSBsYSBpbXByZXNvcmEgZXMgdmlydHVhbCBjb21vIFBERiBvIG5vIHJlc3BvbmRlLCBzYWxpciBzaW4gcm9tcGVyCiAgICBleGl0IDAKfQogICAgICBgLnRyaW0oKTsKCiAgICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNTY3JpcHRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA4MDAwIH0sIChwc0VycikgPT4gewogICAgICAgIHRyeSB7IGZzLnVubGlua1N5bmModGVtcEZpbGUpOyB9IGNhdGNoIChlKSB7fQogICAgICAgIC8vIFNpZW1wcmUgcmVzb2x2ZXIgw6l4aXRvIHBhcmEgbm8gaW50ZXJydW1waXIgZWwgZmx1am8gZGVsIFBPUwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBTZXJ2aWRvciBIVFRQCiAqLwpjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcihhc3luYyAocmVxLCByZXMpID0+IHsKICAvLyBDT1JTIEhlYWRlcnMKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7CiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTsKICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcpOwoKICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7CiAgICByZXMud3JpdGVIZWFkKDIwMCk7CiAgICByZXR1cm4gcmVzLmVuZCgpOwogIH0KCiAgY29uc3QgdXJsID0gcmVxLnVybC5zcGxpdCgnPycpWzBdOwoKICAvLyAxLiBHRVQgL2hlYWx0aCBvIC9zdGF0dXMKICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgKHVybCA9PT0gJy8nIHx8IHVybCA9PT0gJy9oZWFsdGgnIHx8IHVybCA9PT0gJy9zdGF0dXMnKSkgewogICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewogICAgICBzdGF0dXM6ICdvbmxpbmUnLAogICAgICBzZXJ2aWNlOiAnS0FNSUEgTm9kZS5qcyBQcmludCBCcmlkZ2UnLAogICAgICB2ZXJzaW9uOiAnMi4wLjAnLAogICAgICBub2RlVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9uLAogICAgICBwbGF0Zm9ybTogb3MucGxhdGZvcm0oKSwKICAgICAgYXJjaDogb3MuYXJjaCgpLAogICAgICBob3N0bmFtZTogb3MuaG9zdG5hbWUoKSwKICAgICAgdXB0aW1lU2Vjb25kczogTWF0aC5mbG9vcihwcm9jZXNzLnVwdGltZSgpKSwKICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkKICAgIH0pKTsKICB9CgogIC8vIDIuIEdFVCAvcHJpbnRlcnMKICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgdXJsID09PSAnL3ByaW50ZXJzJykgewogICAgdHJ5IHsKICAgICAgY29uc3QgcHJpbnRlcnMgPSBhd2FpdCBnZXRXaW5kb3dzUHJpbnRlcnMoKTsKICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBwcmludGVycyB9KSk7CiAgICB9IGNhdGNoIChlcnIpIHsKICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgIH0KICB9CgogIC8vIDMuIFBPU1QgL3ByaW50CiAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJyAmJiB1cmwgPT09ICcvcHJpbnQnKSB7CiAgICBsZXQgYm9keSA9ICcnOwogICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rOyB9KTsKICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4gewogICAgICB0cnkgewogICAgICAgIGNvbnN0IHBheWxvYWQgPSBKU09OLnBhcnNlKGJvZHkgfHwgJ3t9Jyk7CiAgICAgICAgY29uc3QgeyB0ZXh0LCByYXcsIHByaW50ZXJOYW1lLCBjdXRQYXBlciA9IHRydWUsIG9wZW5EcmF3ZXIgPSBmYWxzZSwgaXAgPSBudWxsLCBwb3J0ID0gOTEwMCB9ID0gcGF5bG9hZDsKCiAgICAgICAgaWYgKCF0ZXh0ICYmICFyYXcpIHsKICAgICAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDQwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRWwgY2FtcG8gInRleHQiIG8gInJhdyIgZXMgcmVxdWVyaWRvJyB9KSk7CiAgICAgICAgfQoKICAgICAgICBsZXQgY2h1bmtzID0gW107CiAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0lOSVQsICdiaW5hcnknKSk7CgogICAgICAgIGlmIChvcGVuRHJhd2VyKSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbShFU0NfRFJBV0VSLCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKHRleHQpIHsKICAgICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKHRleHQsICdsYXRpbjEnKSk7CiAgICAgICAgfQoKICAgICAgICBpZiAocmF3KSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbShyYXcsICdiaW5hcnknKSk7CiAgICAgICAgfQoKICAgICAgICBpZiAoY3V0UGFwZXIgIT09IGZhbHNlKSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbSgnXG5cblxuXG4nLCAnbGF0aW4xJykpOwogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0NVVF9QQVJUSUFMLCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgY29uc3QgZmluYWxCdWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7CgogICAgICAgIGlmIChpcCkgewogICAgICAgICAgYXdhaXQgcHJpbnROZXR3b3JrU29ja2V0KGlwLCBwb3J0LCBmaW5hbEJ1ZmZlcik7CiAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBJbXByZXNpw7NuIGVudmlhZGEgYSBzb2NrZXQgZGUgcmVkICR7aXB9OiR7cG9ydH1gIH0pKTsKICAgICAgICB9CgogICAgICAgIGF3YWl0IHByaW50V2luZG93c1Nwb29sZXIocHJpbnRlck5hbWUsIGZpbmFsQnVmZmVyKTsKICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBUcmFiYWpvIGVudmlhZG8gYSBsYSBjb2xhIGRlICR7cHJpbnRlck5hbWUgfHwgJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSd9YCB9KSk7CgogICAgICB9IGNhdGNoIChlcnIpIHsKICAgICAgICBjb25zb2xlLmVycm9yKCdbUHJpbnRCcmlkZ2VdIEVycm9yIGFsIHByb2Nlc2FyIGltcHJlc2nDs246JywgZXJyKTsKICAgICAgICByZXR1cm4gcmVzLndyaXRlSGVhZCg1MDApLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkpOwogICAgICB9CiAgICB9KTsKICAgIHJldHVybjsKICB9CgogIC8vIDQuIFBPU1QgL3Rlc3QtcHJpbnQKICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHVybCA9PT0gJy90ZXN0LXByaW50JykgewogICAgbGV0IGJvZHkgPSAnJzsKICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHsgYm9keSArPSBjaHVuazsgfSk7CiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHsKICAgICAgdHJ5IHsKICAgICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShib2R5IHx8ICd7fScpOwogICAgICAgIGNvbnN0IHByaW50ZXJOYW1lID0gcGF5bG9hZC5wcmludGVyTmFtZSB8fCBudWxsOwogICAgICAgIGNvbnN0IHRlc3RUeXBlID0gcGF5bG9hZC50eXBlIHx8ICdjb21hbmRhJzsKCiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygnZXMtQ08nKTsKICAgICAgICBjb25zdCBzZXBhcmF0b3IgPSAnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSc7CiAgICAgICAgY29uc3QgbGluZSA9ICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJzsKCiAgICAgICAgbGV0IHRlc3RUZXh0ID0gJyc7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICAgICAgIEtBTUlBIFBPUyAmIEVSUCBieSBKRiAgICAgICAgIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICAgIlRvZG8gdHUgbmVnb2NpbywgY29uZWN0YWRvLiIgICAgIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAgICAqKiogVElDS0VUIERFIFBSVUVCQSBERSBJTVBSRVNJT04gKioqIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtsaW5lfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgRmVjaGEgLyBIb3JhOiAgJHtub3d9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBTZXJ2aWNpbzogICAgICBLQU1JQSBOb2RlLmpzIFByaW50IEJyaWRnZSB2Mi4wXG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBNb3RvcjogICAgICAgICBOb2RlLmpzICR7cHJvY2Vzcy52ZXJzaW9ufVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgSW1wcmVzb3JhOiAgICAgJHtwcmludGVyTmFtZSB8fCAnUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cyd9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBEZXN0aW5vOiAgICAgICAke3Rlc3RUeXBlID09PSAnY29jaW5hJyA/ICdDb2NpbmEgKENvbWFuZGEpJyA6ICh0ZXN0VHlwZSA9PT0gJ2NhamEnID8gJ0NhamEgKEZhY3R1cmFjacOzbiknIDogJ0dlbmVyYWwnKX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYENhcmFjdGVyZXMgRXNwZWNpYWxlcyAvIEFjZW50b3M6XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGDDoSDDqSDDrSDDsyDDuiDDsSDDgSDDiSDDjSDDkyDDmiDDkSAkICUgJiBAICNcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEVzdGFkbzogICAgICAgIENPTkVYSU9OIDEwMCUgRVhJVE9TQVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgSW1wcmVzaW9uOiAgICAgRGlyZWN0YSB5IFNpbGVuY2lvc2EgKE9LKVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAgICAgIMKhVHUgaW1wcmVzb3JhIGVzdGEgbGlzdGEgcGFyYSBvcGVyYXIhIFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgJHtzZXBhcmF0b3J9XG5gOwoKICAgICAgICBjb25zdCBjaHVua3MgPSBbCiAgICAgICAgICBCdWZmZXIuZnJvbShFU0NfSU5JVCwgJ2JpbmFyeScpLAogICAgICAgICAgQnVmZmVyLmZyb20odGVzdFRleHQsICdsYXRpbjEnKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKCdcblxuXG5cbicsICdsYXRpbjEnKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKEVTQ19DVVRfUEFSVElBTCwgJ2JpbmFyeScpCiAgICAgICAgXTsKCiAgICAgICAgY29uc3QgZmluYWxCdWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7CiAgICAgICAgYXdhaXQgcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgZmluYWxCdWZmZXIpOwoKICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7CiAgICAgICAgICBzdWNjZXNzOiB0cnVlLAogICAgICAgICAgbWVzc2FnZTogYFRpY2tldCBkZSBwcnVlYmEgcHJvY2VzYWRvIGV4aXRvc2FtZW50ZSBwYXJhICR7cHJpbnRlck5hbWUgfHwgJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSd9YAogICAgICAgIH0pKTsKICAgICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgICAgY29uc29sZS5lcnJvcignW1ByaW50QnJpZGdlXSBFcnJvciBhbCBpbXByaW1pciB0ZXN0OicsIGVycik7CiAgICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgICAgfQogICAgfSk7CiAgICByZXR1cm47CiAgfQoKICAvLyA0MDQKICByZXMud3JpdGVIZWFkKDQwNCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdFbmRwb2ludCBubyBlbmNvbnRyYWRvJyB9KSk7Cn0pOwoKc2VydmVyLmxpc3RlbihQT1JULCBIT1NULCAoKSA9PiB7CiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTsKICBjb25zb2xlLmxvZyhg4pyFIEtBTUlBIE5vZGUuanMgUHJpbnQgQnJpZGdlIHYyLjAgaW5pY2lhZG9gKTsKICBjb25zb2xlLmxvZyhgICAgRXNjdWNoYW5kbyBlbjogaHR0cDovL2xvY2FsaG9zdDoke1BPUlR9YCk7CiAgY29uc29sZS5sb2coYCAgIE5vZGUuanM6ICR7cHJvY2Vzcy52ZXJzaW9ufSDigJQgUGxhdGFmb3JtYTogJHtvcy5wbGF0Zm9ybSgpfWApOwogIGNvbnNvbGUubG9nKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7Cn0pOwo='))"\r
)\r
echo   [2/4] Archivos instalados en: %TARGET_DIR%\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}"\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
set "VBS_PATH=%STARTUP_FOLDER%\\KAMIA_PrintBridge.vbs"\r
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"\r
echo WshShell.Run "node """ ^& "%TARGET_DIR%\\bridge.js"""", 0, False >> "%VBS_PATH%"\r
echo   [3/4] Inicio automatico con Windows configurado.\r
echo   [4/4] Iniciando servicio en segundo plano...\r
wscript "%VBS_PATH%"\r
echo.\r
echo ======================================================================\r
echo    INSTALACION COMPLETADA CON EXITO\r
echo ======================================================================\r
echo   [OK] Print Bridge activo en http://localhost:8088\r
echo   [OK] Se iniciara siempre al encender Windows.\r
echo.\r
pause >nul\r
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instalar-servicio.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Instalador instalar-servicio.bat descargado (Auto-extraíble)', 'success');
  };

  const downloadUninstallerBat = () => {
    const batContent = `@echo off\r
title KAMIA POS - Desinstalador de Print Bridge\r
color 0C\r
cls\r
echo ======================================================================\r
echo           KAMIA POS - DESINSTALADOR DE PRINT BRIDGE\r
echo ======================================================================\r
echo.\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; try { Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PrintBridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } catch {}"\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
set "VBS_PATH=%STARTUP_FOLDER%\\KAMIA_PrintBridge.vbs"\r
if exist "%VBS_PATH%" del /f /q "%VBS_PATH%"\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"\r
echo   [OK] Print Bridge desinstalado exitosamente.\r
pause >nul\r
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desinstalar-servicio.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Desinstalador desinstalar-servicio.bat descargado', 'info');
  };

  // Opciones de impresoras detectadas
  const printerOptions = [
    { value: '', label: 'Impresora Predeterminada de Windows' },
    ...detectedPrinters.map(p => ({
      value: p.name,
      label: `${p.name} ${p.isDefault ? '(Predeterminada)' : ''}`
    }))
  ];

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando configuración de impresión...
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Printer size={24} color="var(--accent-primary)" />
            Configuración de Impresión Térmica & Print Bridge
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Control centralizado de impresión directa silenciosa (ESC/POS), auto-impresión de comandas y gestión de impresoras.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={testBridgeConnection}
          >
            Re-Escanear Bridge
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<Check size={16} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* MONITOR EN VIVO: ESTADO DE NODE.JS Y PRINT BRIDGE */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: bridgeStatus === 'online' ? 'rgba(4, 120, 87, 0.15)' : 'rgba(220, 38, 38, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: bridgeStatus === 'online' ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              <Cpu size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Estado del Microservicio Print Bridge (Node.js)
                </h3>
                <Badge variant={bridgeStatus === 'online' ? 'success' : (bridgeStatus === 'checking' ? 'warning' : 'danger')}>
                  {bridgeStatus === 'online' ? '🟢 En Línea' : (bridgeStatus === 'checking' ? '🟡 Verificando...' : '🔴 Desconectado')}
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {bridgeStatus === 'online' ? (
                  <span>
                    Servicio activo en <strong>{bridgeUrl}</strong> &bull; Motor <strong>Node.js {bridgeInfo?.nodeVersion || ''}</strong> &bull; {detectedPrinters.length} impresoras detectadas
                  </span>
                ) : (
                  <span>
                    El servicio local no está activo en el puerto 8088. Sigue los pasos inferiores para iniciarlo.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download size={14} />}
              onClick={downloadNodeInstaller}
              title="Descargar Node.js LTS Oficial de 64 bits"
            >
              📥 Instalar Node.js LTS
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Play size={14} />}
              onClick={downloadStarterBat}
            >
              🚀 Iniciar Bridge (.bat)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<ShieldCheck size={14} />}
              onClick={downloadInstallerBat}
            >
              ⚡ Instalar Auto-Inicio (.bat)
            </Button>
          </div>

        </div>

        {/* Alerta interactiva si está desconectado */}
        {bridgeStatus === 'offline' && (
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} color="var(--accent-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--accent-danger)', fontSize: '13.5px' }}>
                ¿Cómo activar la Impresión Silenciosa en 2 pasos simples?
              </strong>
              <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>
                  <strong>Paso 1 (Obligatorio):</strong> Si no tienes Node.js, haz clic en el botón <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>"📥 Instalar Node.js LTS"</span> y sigue el asistente oficial.
                </li>
                <li>
                  <strong>Paso 2:</strong> Haz clic en <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>"🚀 Iniciar Bridge (.bat)"</span> o <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>"⚡ Instalar Auto-Inicio (.bat)"</span> para dejar el puente activo permanentemente en segundo plano.
                </li>
              </ol>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        {/* ASIGNACIÓN DE IMPRESORAS DE DESTINO */}
        <Card style={{ padding: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UtensilsCrossed size={17} color="var(--accent-primary)" />
            Asignación de Impresoras Térmicas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Impresora Cocina */}
            <div>
              <Select
                label="🍳 Impresora de Cocina / Comandas"
                value={printerKitchenName}
                onChange={(e) => setPrinterKitchenName(e.target.value)}
                options={printerOptions}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Destino para tickets de preparación y órdenes de cocina.
              </div>
            </div>

            {/* Impresora Caja */}
            <div>
              <Select
                label="🧾 Impresora de Caja / Facturación POS"
                value={printerReceiptName}
                onChange={(e) => setPrinterReceiptName(e.target.value)}
                options={printerOptions}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Destino para facturas de venta, pre-facturas y recibos de cobro.
              </div>
            </div>

            {/* Impresora Bar */}
            <div>
              <Select
                label="🍸 Impresora de Bar / Coctelería (Opcional)"
                value={printerBarName}
                onChange={(e) => setPrinterBarName(e.target.value)}
                options={printerOptions}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Para separar automáticamente tickets de bebidas de los de cocina.
              </div>
            </div>

            {/* Ancho de papel */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Formato y Ancho de Papel Térmico
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: paperWidth === '80mm' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: paperWidth === '80mm' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                    color: paperWidth === '80mm' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  80 mm (Estándar POS)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: paperWidth === '58mm' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: paperWidth === '58mm' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                    color: paperWidth === '58mm' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  58 mm (Compacta)
                </button>
              </div>
            </div>

          </div>
        </Card>

        {/* AUTOMATIZACIÓN & AUTO-IMPRESIÓN */}
        <Card style={{ padding: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={17} color="var(--accent-secondary)" />
            Automatizaciones & Auto-Impresión Remota
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Switch 1: Impresión Silenciosa */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableSilentPrinting}
                onChange={(e) => setEnableSilentPrinting(e.target.checked)}
                style={{ accentColor: 'var(--accent-success)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '13px' }}>Habilitar Impresión Silenciosa Directa (ESC/POS)</strong>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Envía el ticket instantáneamente a la impresora térmica sin abrir cuadros de diálogo ni ventanas del navegador.
                </div>
              </div>
            </label>

            {/* Switch 2: Auto-imprimir comanda */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoPrintKitchenTickets}
                onChange={(e) => setAutoPrintKitchenTickets(e.target.checked)}
                style={{ accentColor: 'var(--accent-success)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '13px' }}>Auto-imprimir comandas enviadas desde celulares de meseros</strong>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Cuando un mesero presione "Enviar a Cocina" desde su teléfono, la comanda saldrá expulsada automáticamente en esta estación.
                </div>
              </div>
            </label>

            {/* Switch 3: Auto-imprimir factura */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoPrintInvoices}
                onChange={(e) => setAutoPrintInvoices(e.target.checked)}
                style={{ accentColor: 'var(--accent-success)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '13px' }}>Auto-imprimir factura de venta al cobrar orden</strong>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Imprime el ticket fiscal/recibo automáticamente al registrar el pago en la caja.
                </div>
              </div>
            </label>

            {/* Switch 4: Gaveta monedero */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={openDrawerOnPayment}
                onChange={(e) => setOpenDrawerOnPayment(e.target.checked)}
                style={{ accentColor: 'var(--accent-success)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '13px' }}>Abrir cajón monedero automáticamente al cobrar</strong>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Envía el pulso ESC/POS al puerto RJ11 de la impresora para expulsar el cajón de dinero.
                </div>
              </div>
            </label>

          </div>
        </Card>

      </div>

      {/* CENTRO DE PRUEBAS & DIAGNÓSTICO */}
      <Card style={{ padding: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={17} color="var(--accent-primary)" />
          Centro de Pruebas & Diagnóstico en Tiempo Real
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
          Prueba el corte de papel, compatibilidad de acentos (á, é, í, ó, ú, ñ) y la apertura de gaveta en 1 solo clic.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="secondary"
            icon={<UtensilsCrossed size={15} />}
            onClick={handleTestKitchen}
            disabled={testingKitchen || bridgeStatus !== 'online'}
          >
            {testingKitchen ? 'Imprimiendo...' : '🍳 Probar Ticket en Cocina'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            icon={<Receipt size={15} />}
            onClick={handleTestReceipt}
            disabled={testingReceipt || bridgeStatus !== 'online'}
          >
            {testingReceipt ? 'Imprimiendo...' : '🧾 Probar Factura en Caja'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            icon={<DollarSign size={15} />}
            onClick={handleTestDrawer}
            disabled={testingDrawer || bridgeStatus !== 'online'}
          >
            {testingDrawer ? 'Enviando pulso...' : '💵 Probar Apertura de Gaveta'}
          </Button>
        </div>
      </Card>

      {/* PAQUETE DE DESCARGAS Y ASISTENCIA */}
      <Card style={{ padding: '18px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={17} color="var(--accent-primary)" />
          Paquetes de Instalación y Scripts para el Print Bridge
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '10px' }}>
          
          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>1. Instalador Oficial Node.js</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
              Motor de ejecución obligatorio para el servidor de impresión.
            </div>
            <Button size="sm" variant="secondary" onClick={downloadNodeInstaller} style={{ width: '100%' }}>
              Descargar Node.js LTS (.msi)
            </Button>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>2. Lanzador de Print Bridge</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
              Inicia el servidor en consola y verifica Node.js automáticamente.
            </div>
            <Button size="sm" variant="secondary" onClick={downloadStarterBat} style={{ width: '100%' }}>
              Descargar iniciar-bridge.bat
            </Button>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>3. Instalador Permanente</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
              Registra el servicio para iniciar siempre en segundo plano con Windows.
            </div>
            <Button size="sm" variant="secondary" onClick={downloadInstallerBat} style={{ width: '100%' }}>
              Descargar instalar-servicio.bat
            </Button>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>4. Desinstalador Limpio</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
              Detiene procesos y elimina el auto-inicio de Windows.
            </div>
            <Button size="sm" variant="danger" onClick={downloadUninstallerBat} style={{ width: '100%' }}>
              Descargar desinstalador (.bat)
            </Button>
          </div>

        </div>
      </Card>

    </div>
  );
};
