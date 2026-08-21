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
        addToast(res?.error || 'No se pudo enviar a la impresora de Cocina. Verifica que el Print Bridge esté activo.', 'warning');
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
        addToast(res?.error || 'No se pudo enviar a la impresora de Caja. Verifica que el Print Bridge esté activo.', 'warning');
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
        addToast(res?.error || 'Verifica que la gaveta esté conectada al puerto RJ11 de la impresora de Caja', 'warning');
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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('$env:LOCALAPPDATA\\GastrosPOS\\PrintBridge\\bridge.js', [System.Convert]::FromBase64String('LyoqCiAqIEtBTUlBIGJ5IEpGIOKAlCBOb2RlLmpzIFRoZXJtYWwgUHJpbnQgQnJpZGdlIHYyLjAKICogU2Vydmlkb3IgSFRUUCBsb2NhbCBwYXJhIGltcHJlc2nDs24gdMOpcm1pY2Egc2lsZW5jaW9zYSBkaXJlY3RhIChFU0MvUE9TKQogKiBQdWVydG8gcG9yIGRlZmVjdG86IDgwODgKICovCgpjb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpOwpjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7CmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7CmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTsKY29uc3QgeyBleGVjLCBleGVjRmlsZSB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwpjb25zdCBuZXQgPSByZXF1aXJlKCduZXQnKTsKCmNvbnN0IFBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODg7CmNvbnN0IEhPU1QgPSAnMC4wLjAuMCc7CgovLyBDb21hbmRvcyBFU0MvUE9TIGVzdMOhbmRhcgpjb25zdCBFU0MgPSAnXHgxQic7CmNvbnN0IEdTID0gJ1x4MUQnOwpjb25zdCBFU0NfSU5JVCA9IGAke0VTQ31AYDsgICAgICAgICAgICAgICAvLyBJbmljaWFsaXphciBpbXByZXNvcmEKY29uc3QgRVNDX0NVVF9GVUxMID0gYCR7R1N9Vlx4MDBgOyAgICAgICAgLy8gQ29ydGUgdG90YWwKY29uc3QgRVNDX0NVVF9QQVJUSUFMID0gYCR7R1N9Vlx4MDFgOyAgICAgLy8gQ29ydGUgcGFyY2lhbApjb25zdCBFU0NfRFJBV0VSID0gYCR7RVNDfXBceDAwXHgxOVx4RkFgOyAvLyBBYnJpciBnYXZldGEgLyBjYWrDs24gbW9uZWRlcm8KCi8qKgogKiBPYnRlbmVyIGxpc3RhIGRlIGltcHJlc29yYXMgZGUgV2luZG93cyB1c2FuZG8gUG93ZXJTaGVsbAogKi8KZnVuY3Rpb24gZ2V0V2luZG93c1ByaW50ZXJzKCkgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gewogICAgY29uc3QgcHNDbWQgPSBgR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IE5hbWUsIERlZmF1bHQsIFBvcnROYW1lLCBEcml2ZXJOYW1lLCBQcmludGVyU3RhdHVzIHwgQ29udmVydFRvLUpzb24gLUNvbXByZXNzYDsKICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNDbWRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA2MDAwIH0sIChlcnIsIHN0ZG91dCkgPT4gewogICAgICBpZiAoZXJyIHx8ICFzdGRvdXQudHJpbSgpKSB7CiAgICAgICAgZXhlYygnd21pYyBwcmludGVyIGdldCBuYW1lLGRlZmF1bHQgL2Zvcm1hdDpjc3YnLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA0MDAwIH0sICh3bWljRXJyLCB3bWljT3V0KSA9PiB7CiAgICAgICAgICBpZiAod21pY0VyciB8fCAhd21pY091dCkgewogICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgICB9CiAgICAgICAgICBjb25zdCBsaW5lcyA9IHdtaWNPdXQuc3BsaXQoJ1xuJykubWFwKGwgPT4gbC50cmltKCkpLmZpbHRlcihCb29sZWFuKS5zbGljZSgxKTsKICAgICAgICAgIGNvbnN0IHByaW50ZXJzID0gbGluZXMubWFwKGxpbmUgPT4gewogICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGxpbmUuc3BsaXQoJywnKTsKICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7CiAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGFydHNbMl0udHJpbSgpLCBpc0RlZmF1bHQ6IHBhcnRzWzFdLnRyaW0oKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZScsIHBvcnQ6ICdVU0IvTFBUJyB9OwogICAgICAgICAgICB9CiAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgICAgfSkuZmlsdGVyKEJvb2xlYW4pOwogICAgICAgICAgcmVzb2x2ZShwcmludGVycy5sZW5ndGggPiAwID8gcHJpbnRlcnMgOiBbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgfSk7CiAgICAgICAgcmV0dXJuOwogICAgICB9CgogICAgICB0cnkgewogICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShzdGRvdXQpOwogICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkgZGF0YSA9IFtkYXRhXTsKICAgICAgICBjb25zdCBwcmludGVycyA9IGRhdGEubWFwKHAgPT4gKHsKICAgICAgICAgIG5hbWU6IHAuTmFtZSB8fCAnSW1wcmVzb3JhJywKICAgICAgICAgIGlzRGVmYXVsdDogQm9vbGVhbihwLkRlZmF1bHQpLAogICAgICAgICAgcG9ydDogcC5Qb3J0TmFtZSB8fCAnJywKICAgICAgICAgIGRyaXZlcjogcC5Ecml2ZXJOYW1lIHx8ICcnLAogICAgICAgICAgc3RhdHVzOiBwLlByaW50ZXJTdGF0dXMgfHwgMwogICAgICAgIH0pKTsKICAgICAgICByZXNvbHZlKHByaW50ZXJzKTsKICAgICAgfSBjYXRjaCAocGFyc2VFcnIpIHsKICAgICAgICByZXNvbHZlKFt7IG5hbWU6ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cycsIGlzRGVmYXVsdDogdHJ1ZSwgcG9ydDogJ0RFRkFVTFQnIH1dKTsKICAgICAgfQogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBSQVcgZW4gaW1wcmVzb3JhIGRlIHJlZCAoVENQIFNvY2tldCBwdWVydG8gOTEwMCkKICovCmZ1bmN0aW9uIHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCA9IDkxMDAsIGJ1ZmZlcikgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7CiAgICBjb25zdCBjbGllbnQgPSBuZXcgbmV0LlNvY2tldCgpOwogICAgY2xpZW50LnNldFRpbWVvdXQoNTAwMCk7CiAgICBjbGllbnQuY29ubmVjdChwb3J0LCBpcCwgKCkgPT4gewogICAgICBjbGllbnQud3JpdGUoYnVmZmVyLCAoKSA9PiB7CiAgICAgICAgY2xpZW50LmVuZCgpOwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgICBjbGllbnQub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpOwogICAgY2xpZW50Lm9uKCd0aW1lb3V0JywgKCkgPT4gewogICAgICBjbGllbnQuZGVzdHJveSgpOwogICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGRlIGNvbmV4acOzbiBhIGxhIGltcHJlc29yYSBlbiAke2lwfToke3BvcnR9YCkpOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBlbiBpbXByZXNvcmEgbG9jYWwvY29tcGFydGlkYSBkZSBXaW5kb3dzIHVzYW5kbyB3aW5zcG9vbCBSQVcgeSBPdXQtUHJpbnRlciBmYWxsYmFjawogKi8KZnVuY3Rpb24gcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgYnVmZmVyKSB7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsKICAgIGNvbnN0IGlzVmlydHVhbCA9IC8ocGRmfG9uZW5vdGV8eHBzfGZheCkvaS50ZXN0KHByaW50ZXJOYW1lIHx8ICcnKTsKICAgIGNvbnN0IGV4dCA9IGlzVmlydHVhbCA/ICcudHh0JyA6ICcuYmluJzsKICAgIGNvbnN0IHRlbXBGaWxlID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBga2FtaWFfcHJpbnRfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA2KX0ke2V4dH1gKTsKCiAgICBsZXQgZmlsZURhdGEgPSBidWZmZXI7CiAgICBpZiAoaXNWaXJ0dWFsKSB7CiAgICAgIC8vIExpbXBpYXIgY8OzZGlnb3MgZGUgY29udHJvbCBFU0MvUE9TIGVuIE5vZGUuanMgcGFyYSBxdWUgZWwgdGV4dG8gc2VhIDEwMCUgcHVybyB5IGxlZ2libGUKICAgICAgY29uc3QgcmF3U3RyID0gYnVmZmVyLnRvU3RyaW5nKCdsYXRpbjEnKTsKICAgICAgY29uc3QgY2xlYW5TdHIgPSByYXdTdHIucmVwbGFjZSgvW15ceDIwLVx4N0VcclxuXHRceEEwLVx4RkZdL2csICcnKTsKICAgICAgZmlsZURhdGEgPSBCdWZmZXIuZnJvbShjbGVhblN0ciwgJ3V0ZjgnKTsKCiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgZG9jc0RpciA9IHBhdGguam9pbihvcy5ob21lZGlyKCksICdEb2N1bWVudHMnKTsKICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkb2NzRGlyKSkgewogICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKS5zbGljZSgwLCAxOSk7CiAgICAgICAgICBjb25zdCBzYXZlZEZpbGUgPSBwYXRoLmpvaW4oZG9jc0RpciwgYEtBTUlBX0ZhY3R1cmFfUE9TXyR7dGltZXN0YW1wfS50eHRgKTsKICAgICAgICAgIGNvbnN0IGxhdGVzdEZpbGUgPSBwYXRoLmpvaW4oZG9jc0RpciwgJ1VsdGltYV9GYWN0dXJhX1BPUy50eHQnKTsKICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoc2F2ZWRGaWxlLCBjbGVhblN0ciwgJ3V0ZjgnKTsKICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMobGF0ZXN0RmlsZSwgY2xlYW5TdHIsICd1dGY4Jyk7CiAgICAgICAgICAvLyBBYnJpciBhdXRvbcOhdGljYW1lbnRlIGVsIGFyY2hpdm8gZ2VuZXJhZG8gcGFyYSB2aXN0YSBwcmV2aWEgaW5tZWRpYXRhCiAgICAgICAgICBleGVjKGBzdGFydCAiIiAiJHtsYXRlc3RGaWxlfSJgKTsKICAgICAgICB9CiAgICAgIH0gY2F0Y2ggKGRvY0VycikgewogICAgICAgIGNvbnNvbGUud2FybignW1ByaW50QnJpZGdlXSBObyBzZSBwdWRvIGd1YXJkYXIgY29waWEgZW4gRG9jdW1lbnRvczonLCBkb2NFcnIubWVzc2FnZSk7CiAgICAgIH0KICAgIH0KCiAgICBmcy53cml0ZUZpbGUodGVtcEZpbGUsIGZpbGVEYXRhLCAod3JpdGVFcnIpID0+IHsKICAgICAgaWYgKHdyaXRlRXJyKSByZXR1cm4gcmVqZWN0KHdyaXRlRXJyKTsKCiAgICAgIGNvbnN0IHRhcmdldFByaW50ZXIgPSBwcmludGVyTmFtZSAmJiBwcmludGVyTmFtZSAhPT0gJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSBkZSBXaW5kb3dzJwogICAgICAgID8gcHJpbnRlck5hbWUucmVwbGFjZSgvJy9nLCAiJyciKQogICAgICAgIDogJyc7CgogICAgICBjb25zdCBwc1NjcmlwdCA9IGlzVmlydHVhbCA/IGAKJHRlbXBGaWxlID0gJyR7dGVtcEZpbGUucmVwbGFjZSgvJy9nLCAiJyciKX0nOwokcHJpbnRlck5hbWUgPSAnJHt0YXJnZXRQcmludGVyfSc7CmlmICgtbm90ICRwcmludGVyTmFtZSkgewogICRkZWZhdWx0UHJpbnRlciA9IEdldC1DaW1JbnN0YW5jZSBXaW4zMl9QcmludGVyIHwgV2hlcmUtT2JqZWN0IHsgJF8uRGVmYXVsdCAtZXEgJHRydWUgfSB8IFNlbGVjdC1PYmplY3QgLUZpcnN0IDE7CiAgaWYgKCRkZWZhdWx0UHJpbnRlcikgeyAkcHJpbnRlck5hbWUgPSAkZGVmYXVsdFByaW50ZXIuTmFtZSB9Cn0KdHJ5IHsKICBHZXQtQ29udGVudCAtUGF0aCAkdGVtcEZpbGUgLUVuY29kaW5nIFVURjggfCBPdXQtUHJpbnRlciAtTmFtZSAkcHJpbnRlck5hbWUgLUVycm9yQWN0aW9uIFNpbGVudGx5Q29udGludWUKfSBjYXRjaCB7fQpleGl0IDAKYC50cmltKCkgOiBgCiR0ZW1wRmlsZSA9ICcke3RlbXBGaWxlLnJlcGxhY2UoLycvZywgIicnIil9JzsKJHByaW50ZXJOYW1lID0gJyR7dGFyZ2V0UHJpbnRlcn0nOwoKaWYgKC1ub3QgJHByaW50ZXJOYW1lKSB7CiAgJGRlZmF1bHRQcmludGVyID0gR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBXaGVyZS1PYmplY3QgeyAkXy5EZWZhdWx0IC1lcSAkdHJ1ZSB9IHwgU2VsZWN0LU9iamVjdCAtRmlyc3QgMTsKICBpZiAoJGRlZmF1bHRQcmludGVyKSB7ICRwcmludGVyTmFtZSA9ICRkZWZhdWx0UHJpbnRlci5OYW1lIH0KICBlbHNlIHsKICAgICRhbnlQcmludGVyID0gR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IC1GaXJzdCAxOwogICAgaWYgKCRhbnlQcmludGVyKSB7ICRwcmludGVyTmFtZSA9ICRhbnlQcmludGVyLk5hbWUgfQogIH0KfQoKaWYgKC1ub3QgJHByaW50ZXJOYW1lKSB7CiAgZXhpdCAxCn0KCiRjb2RlID0gQCIKdXNpbmcgU3lzdGVtOwp1c2luZyBTeXN0ZW0uUnVudGltZS5JbnRlcm9wU2VydmljZXM7CgpwdWJsaWMgY2xhc3MgUmF3UHJpbnRlckhlbHBlciB7CiAgICBbU3RydWN0TGF5b3V0KExheW91dEtpbmQuU2VxdWVudGlhbCwgQ2hhclNldCA9IENoYXJTZXQuQW5zaSldCiAgICBwdWJsaWMgY2xhc3MgRE9DSU5GT0EgewogICAgICAgIFtNYXJzaGFsQXMoVW5tYW5hZ2VkVHlwZS5MUFN0cildIHB1YmxpYyBzdHJpbmcgcERvY05hbWU7CiAgICAgICAgW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gcHVibGljIHN0cmluZyBwT3V0cHV0RmlsZTsKICAgICAgICBbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBwdWJsaWMgc3RyaW5nIHBEYXRhVHlwZTsKICAgIH0KCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIk9wZW5QcmludGVyQSIsIFNldExhc3RFcnJvciA9IHRydWUsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2ksIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBPcGVuUHJpbnRlcihbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBzdHJpbmcgc3pQcmludGVyLCBvdXQgSW50UHRyIGhQcmludGVyLCBJbnRQdHIgcGQpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiQ2xvc2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIENsb3NlUHJpbnRlcihJbnRQdHIgaFByaW50ZXIpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiU3RhcnREb2NQcmludGVyQSIsIFNldExhc3RFcnJvciA9IHRydWUsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2ksIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBTdGFydERvY1ByaW50ZXIoSW50UHRyIGhQcmludGVyLCBpbnQgbGV2ZWwsIFtJbiwgTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHJ1Y3QpXSBET0NJTkZPQSBkaSk7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJFbmREb2NQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIEVuZERvY1ByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIlN0YXJ0UGFnZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgU3RhcnRQYWdlUHJpbnRlcihJbnRQdHIgaFByaW50ZXIpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiRW5kUGFnZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgRW5kUGFnZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIldyaXRlUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBXcml0ZVByaW50ZXIoSW50UHRyIGhQcmludGVyLCBJbnRQdHIgcEJ5dGVzLCBpbnQgZHdDb3VudCwgb3V0IGludCBkd1dyaXR0ZW4pOwoKICAgIHB1YmxpYyBzdGF0aWMgYm9vbCBTZW5kQnl0ZXNUb1ByaW50ZXIoc3RyaW5nIHN6UHJpbnRlck5hbWUsIGJ5dGVbXSBwQnl0ZXMpIHsKICAgICAgICBJbnRQdHIgaFByaW50ZXIgPSBuZXcgSW50UHRyKDApOwogICAgICAgIERPQ0lORk9BIGRpID0gbmV3IERPQ0lORk9BKCk7CiAgICAgICAgYm9vbCBiU3VjY2VzcyA9IGZhbHNlOwoKICAgICAgICBkaS5wRG9jTmFtZSA9ICJLQU1JQSBQT1MgVGlja2V0IjsKICAgICAgICBkaS5wRGF0YVR5cGUgPSAiUkFXIjsKCiAgICAgICAgaWYgKE9wZW5QcmludGVyKHN6UHJpbnRlck5hbWUsIG91dCBoUHJpbnRlciwgSW50UHRyLlplcm8pKSB7CiAgICAgICAgICAgIGlmIChTdGFydERvY1ByaW50ZXIoaFByaW50ZXIsIDEsIGRpKSkgewogICAgICAgICAgICAgICAgaWYgKFN0YXJ0UGFnZVByaW50ZXIoaFByaW50ZXIpKSB7CiAgICAgICAgICAgICAgICAgICAgSW50UHRyIHBVbm1hbmFnZWRCeXRlcyA9IE1hcnNoYWwuQWxsb2NDb1Rhc2tNZW0ocEJ5dGVzLkxlbmd0aCk7CiAgICAgICAgICAgICAgICAgICAgTWFyc2hhbC5Db3B5KHBCeXRlcywgMCwgcFVubWFuYWdlZEJ5dGVzLCBwQnl0ZXMuTGVuZ3RoKTsKICAgICAgICAgICAgICAgICAgICBpbnQgZHdXcml0dGVuID0gMDsKICAgICAgICAgICAgICAgICAgICBiU3VjY2VzcyA9IFdyaXRlUHJpbnRlcihoUHJpbnRlciwgcFVubWFuYWdlZEJ5dGVzLCBwQnl0ZXMuTGVuZ3RoLCBvdXQgZHdXcml0dGVuKTsKICAgICAgICAgICAgICAgICAgICBNYXJzaGFsLkZyZWVDb1Rhc2tNZW0ocFVubWFuYWdlZEJ5dGVzKTsKICAgICAgICAgICAgICAgICAgICBFbmRQYWdlUHJpbnRlcihoUHJpbnRlcik7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICBFbmREb2NQcmludGVyKGhQcmludGVyKTsKICAgICAgICAgICAgfQogICAgICAgICAgICBDbG9zZVByaW50ZXIoaFByaW50ZXIpOwogICAgICAgIH0KICAgICAgICByZXR1cm4gYlN1Y2Nlc3M7CiAgICB9Cn0KIkAKCnRyeSB7CiAgICBpZiAoLW5vdCAoW1N5c3RlbS5NYW5hZ2VtZW50LkF1dG9tYXRpb24uUFNUeXBlTmFtZV0nUmF3UHJpbnRlckhlbHBlcicpLlR5cGUpIHsKICAgICAgICBBZGQtVHlwZSAtVHlwZURlZmluaXRpb24gJGNvZGUgLUVycm9yQWN0aW9uIFN0b3AKICAgIH0KICAgICRieXRlcyA9IFtTeXN0ZW0uSU8uRmlsZV06OlJlYWRBbGxCeXRlcygkdGVtcEZpbGUpCiAgICAkb2sgPSBbUmF3UHJpbnRlckhlbHBlcl06OlNlbmRCeXRlc1RvUHJpbnRlcigkcHJpbnRlck5hbWUsICRieXRlcykKICAgIGlmICgkb2spIHsKICAgICAgICBleGl0IDAKICAgIH0KfSBjYXRjaCB7fQoKdHJ5IHsKICAgIEdldC1Db250ZW50IC1QYXRoICR0ZW1wRmlsZSAtRW5jb2RpbmcgRGVmYXVsdCB8IE91dC1QcmludGVyIC1OYW1lICRwcmludGVyTmFtZSAtRXJyb3JBY3Rpb24gU3RvcAogICAgZXhpdCAwCn0gY2F0Y2ggewogICAgZXhpdCAwCn0KYC50cmltKCk7CgogICAgICBleGVjRmlsZSgncG93ZXJzaGVsbCcsIFsnLU5vUHJvZmlsZScsICctRXhlY3V0aW9uUG9saWN5JywgJ0J5cGFzcycsICctQ29tbWFuZCcsIHBzU2NyaXB0XSwgeyB3aW5kb3dzSGlkZTogdHJ1ZSwgdGltZW91dDogODAwMCB9LCAocHNFcnIpID0+IHsKICAgICAgICB0cnkgeyBmcy51bmxpbmtTeW5jKHRlbXBGaWxlKTsgfSBjYXRjaCAoZSkge30KICAgICAgICByZXNvbHZlKHRydWUpOwogICAgICB9KTsKICAgIH0pOwogIH0pOwp9CgovKioKICogU2Vydmlkb3IgSFRUUAogKi8KY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXN5bmMgKHJlcSwgcmVzKSA9PiB7CiAgLy8gQ09SUyBIZWFkZXJzCiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTsKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgT1BUSU9OUycpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7CiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKTsKCiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykgewogICAgcmVzLndyaXRlSGVhZCgyMDApOwogICAgcmV0dXJuIHJlcy5lbmQoKTsKICB9CgogIGNvbnN0IHVybCA9IHJlcS51cmwuc3BsaXQoJz8nKVswXTsKCiAgLy8gMS4gR0VUIC9oZWFsdGggbyAvc3RhdHVzCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmICh1cmwgPT09ICcvJyB8fCB1cmwgPT09ICcvaGVhbHRoJyB8fCB1cmwgPT09ICcvc3RhdHVzJykpIHsKICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsKICAgICAgc3RhdHVzOiAnb25saW5lJywKICAgICAgc2VydmljZTogJ0tBTUlBIE5vZGUuanMgUHJpbnQgQnJpZGdlJywKICAgICAgdmVyc2lvbjogJzIuMC4wJywKICAgICAgbm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvbiwKICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksCiAgICAgIGFyY2g6IG9zLmFyY2goKSwKICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksCiAgICAgIHVwdGltZVNlY29uZHM6IE1hdGguZmxvb3IocHJvY2Vzcy51cHRpbWUoKSksCiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpCiAgICB9KSk7CiAgfQoKICAvLyAyLiBHRVQgL3ByaW50ZXJzCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHVybCA9PT0gJy9wcmludGVycycpIHsKICAgIHRyeSB7CiAgICAgIGNvbnN0IHByaW50ZXJzID0gYXdhaXQgZ2V0V2luZG93c1ByaW50ZXJzKCk7CiAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgcHJpbnRlcnMgfSkpOwogICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDUwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAgICB9CiAgfQoKICAvLyAzLiBQT1NUIC9wcmludAogIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgdXJsID09PSAnL3ByaW50JykgewogICAgbGV0IGJvZHkgPSAnJzsKICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHsgYm9keSArPSBjaHVuazsgfSk7CiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHsKICAgICAgdHJ5IHsKICAgICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShib2R5IHx8ICd7fScpOwogICAgICAgIGNvbnN0IHsgdGV4dCwgcmF3LCBwcmludGVyTmFtZSwgY3V0UGFwZXIgPSB0cnVlLCBvcGVuRHJhd2VyID0gZmFsc2UsIGlwID0gbnVsbCwgcG9ydCA9IDkxMDAgfSA9IHBheWxvYWQ7CgogICAgICAgIGlmICghdGV4dCAmJiAhcmF3KSB7CiAgICAgICAgICByZXR1cm4gcmVzLndyaXRlSGVhZCg0MDApLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0VsIGNhbXBvICJ0ZXh0IiBvICJyYXciIGVzIHJlcXVlcmlkbycgfSkpOwogICAgICAgIH0KCiAgICAgICAgbGV0IGNodW5rcyA9IFtdOwogICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKEVTQ19JTklULCAnYmluYXJ5JykpOwoKICAgICAgICBpZiAob3BlbkRyYXdlcikgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0RSQVdFUiwgJ2JpbmFyeScpKTsKICAgICAgICB9CgogICAgICAgIGlmICh0ZXh0KSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbSh0ZXh0LCAnbGF0aW4xJykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKHJhdykgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20ocmF3LCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKGN1dFBhcGVyICE9PSBmYWxzZSkgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oJ1xuXG5cblxuJywgJ2xhdGluMScpKTsKICAgICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKEVTQ19DVVRfUEFSVElBTCwgJ2JpbmFyeScpKTsKICAgICAgICB9CgogICAgICAgIGNvbnN0IGZpbmFsQnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpOwoKICAgICAgICBpZiAoaXApIHsKICAgICAgICAgIGF3YWl0IHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCwgZmluYWxCdWZmZXIpOwogICAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgSW1wcmVzacOzbiBlbnZpYWRhIGEgc29ja2V0IGRlIHJlZCAke2lwfToke3BvcnR9YCB9KSk7CiAgICAgICAgfQoKICAgICAgICBhd2FpdCBwcmludFdpbmRvd3NTcG9vbGVyKHByaW50ZXJOYW1lLCBmaW5hbEJ1ZmZlcik7CiAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgVHJhYmFqbyBlbnZpYWRvIGEgbGEgY29sYSBkZSAke3ByaW50ZXJOYW1lIHx8ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEnfWAgfSkpOwoKICAgICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgICAgY29uc29sZS5lcnJvcignW1ByaW50QnJpZGdlXSBFcnJvciBhbCBwcm9jZXNhciBpbXByZXNpw7NuOicsIGVycik7CiAgICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgICAgfQogICAgfSk7CiAgICByZXR1cm47CiAgfQoKICAvLyA0LiBQT1NUIC90ZXN0LXByaW50CiAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJyAmJiB1cmwgPT09ICcvdGVzdC1wcmludCcpIHsKICAgIGxldCBib2R5ID0gJyc7CiAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bms7IH0pOwogICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7CiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoYm9keSB8fCAne30nKTsKICAgICAgICBjb25zdCBwcmludGVyTmFtZSA9IHBheWxvYWQucHJpbnRlck5hbWUgfHwgbnVsbDsKICAgICAgICBjb25zdCB0ZXN0VHlwZSA9IHBheWxvYWQudHlwZSB8fCAnY29tYW5kYSc7CgogICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoJ2VzLUNPJyk7CiAgICAgICAgY29uc3Qgc2VwYXJhdG9yID0gJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nOwogICAgICAgIGNvbnN0IGxpbmUgPSAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7CgogICAgICAgIGxldCB0ZXN0VGV4dCA9ICcnOwogICAgICAgIHRlc3RUZXh0ICs9IGAke3NlcGFyYXRvcn1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCAgICAgICAgICBLQU1JQSBQT1MgJiBFUlAgYnkgSkYgICAgICAgICBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCAgICAgICJUb2RvIHR1IG5lZ29jaW8sIGNvbmVjdGFkby4iICAgICBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgKioqIFRJQ0tFVCBERSBQUlVFQkEgREUgSU1QUkVTSU9OICoqKiBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEZlY2hhIC8gSG9yYTogICR7bm93fVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgU2VydmljaW86ICAgICAgS0FNSUEgTm9kZS5qcyBQcmludCBCcmlkZ2UgdjIuMFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgTW90b3I6ICAgICAgICAgTm9kZS5qcyAke3Byb2Nlc3MudmVyc2lvbn1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEltcHJlc29yYTogICAgICR7cHJpbnRlck5hbWUgfHwgJ1ByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgRGVzdGlubzogICAgICAgJHt0ZXN0VHlwZSA9PT0gJ2NvY2luYScgPyAnQ29jaW5hIChDb21hbmRhKScgOiAodGVzdFR5cGUgPT09ICdjYWphJyA/ICdDYWphIChGYWN0dXJhY2nDs24pJyA6ICdHZW5lcmFsJyl9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAke2xpbmV9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBDYXJhY3RlcmVzIEVzcGVjaWFsZXMgLyBBY2VudG9zOlxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgw6Egw6kgw60gw7Mgw7ogw7Egw4Egw4kgw40gw5Mgw5ogw5EgJCAlICYgQCAjXG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAke2xpbmV9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBFc3RhZG86ICAgICAgICBDT05FWElPTiAxMDAlIEVYSVRPU0FcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEltcHJlc2lvbjogICAgIERpcmVjdGEgeSBTaWxlbmNpb3NhIChPSylcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICDCoVR1IGltcHJlc29yYSBlc3RhIGxpc3RhIHBhcmEgb3BlcmFyISBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKCiAgICAgICAgY29uc3QgY2h1bmtzID0gWwogICAgICAgICAgQnVmZmVyLmZyb20oRVNDX0lOSVQsICdiaW5hcnknKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKHRlc3RUZXh0LCAnbGF0aW4xJyksCiAgICAgICAgICBCdWZmZXIuZnJvbSgnXG5cblxuXG4nLCAnbGF0aW4xJyksCiAgICAgICAgICBCdWZmZXIuZnJvbShFU0NfQ1VUX1BBUlRJQUwsICdiaW5hcnknKQogICAgICAgIF07CgogICAgICAgIGNvbnN0IGZpbmFsQnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpOwogICAgICAgIGF3YWl0IHByaW50V2luZG93c1Nwb29sZXIocHJpbnRlck5hbWUsIGZpbmFsQnVmZmVyKTsKCiAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewogICAgICAgICAgc3VjY2VzczogdHJ1ZSwKICAgICAgICAgIG1lc3NhZ2U6IGBUaWNrZXQgZGUgcHJ1ZWJhIHByb2Nlc2FkbyBleGl0b3NhbWVudGUgcGFyYSAke3ByaW50ZXJOYW1lIHx8ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEnfWAKICAgICAgICB9KSk7CiAgICAgIH0gY2F0Y2ggKGVycikgewogICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tQcmludEJyaWRnZV0gRXJyb3IgYWwgaW1wcmltaXIgdGVzdDonLCBlcnIpOwogICAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDUwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAgICAgIH0KICAgIH0pOwogICAgcmV0dXJuOwogIH0KCiAgLy8gNDA0CiAgcmVzLndyaXRlSGVhZCg0MDQpLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRW5kcG9pbnQgbm8gZW5jb250cmFkbycgfSkpOwp9KTsKCnNlcnZlci5saXN0ZW4oUE9SVCwgSE9TVCwgKCkgPT4gewogIGNvbnNvbGUubG9nKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7CiAgY29uc29sZS5sb2coYOKchSBLQU1JQSBOb2RlLmpzIFByaW50IEJyaWRnZSB2Mi4wIGluaWNpYWRvYCk7CiAgY29uc29sZS5sb2coYCAgIEVzY3VjaGFuZG8gZW46IGh0dHA6Ly9sb2NhbGhvc3Q6JHtQT1JUfWApOwogIGNvbnNvbGUubG9nKGAgICBOb2RlLmpzOiAke3Byb2Nlc3MudmVyc2lvbn0g4oCUIFBsYXRhZm9ybWE6ICR7b3MucGxhdGZvcm0oKX1gKTsKICBjb25zb2xlLmxvZygnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpOwp9KTsK'))"\r
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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('$env:LOCALAPPDATA\\GastrosPOS\\PrintBridge\\bridge.js', [System.Convert]::FromBase64String('LyoqCiAqIEtBTUlBIGJ5IEpGIOKAlCBOb2RlLmpzIFRoZXJtYWwgUHJpbnQgQnJpZGdlIHYyLjAKICogU2Vydmlkb3IgSFRUUCBsb2NhbCBwYXJhIGltcHJlc2nDs24gdMOpcm1pY2Egc2lsZW5jaW9zYSBkaXJlY3RhIChFU0MvUE9TKQogKiBQdWVydG8gcG9yIGRlZmVjdG86IDgwODgKICovCgpjb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpOwpjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7CmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7CmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTsKY29uc3QgeyBleGVjLCBleGVjRmlsZSB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpOwpjb25zdCBuZXQgPSByZXF1aXJlKCduZXQnKTsKCmNvbnN0IFBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODg7CmNvbnN0IEhPU1QgPSAnMC4wLjAuMCc7CgovLyBDb21hbmRvcyBFU0MvUE9TIGVzdMOhbmRhcgpjb25zdCBFU0MgPSAnXHgxQic7CmNvbnN0IEdTID0gJ1x4MUQnOwpjb25zdCBFU0NfSU5JVCA9IGAke0VTQ31AYDsgICAgICAgICAgICAgICAvLyBJbmljaWFsaXphciBpbXByZXNvcmEKY29uc3QgRVNDX0NVVF9GVUxMID0gYCR7R1N9Vlx4MDBgOyAgICAgICAgLy8gQ29ydGUgdG90YWwKY29uc3QgRVNDX0NVVF9QQVJUSUFMID0gYCR7R1N9Vlx4MDFgOyAgICAgLy8gQ29ydGUgcGFyY2lhbApjb25zdCBFU0NfRFJBV0VSID0gYCR7RVNDfXBceDAwXHgxOVx4RkFgOyAvLyBBYnJpciBnYXZldGEgLyBjYWrDs24gbW9uZWRlcm8KCi8qKgogKiBPYnRlbmVyIGxpc3RhIGRlIGltcHJlc29yYXMgZGUgV2luZG93cyB1c2FuZG8gUG93ZXJTaGVsbAogKi8KZnVuY3Rpb24gZ2V0V2luZG93c1ByaW50ZXJzKCkgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gewogICAgY29uc3QgcHNDbWQgPSBgR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IE5hbWUsIERlZmF1bHQsIFBvcnROYW1lLCBEcml2ZXJOYW1lLCBQcmludGVyU3RhdHVzIHwgQ29udmVydFRvLUpzb24gLUNvbXByZXNzYDsKICAgIGV4ZWNGaWxlKCdwb3dlcnNoZWxsJywgWyctTm9Qcm9maWxlJywgJy1FeGVjdXRpb25Qb2xpY3knLCAnQnlwYXNzJywgJy1Db21tYW5kJywgcHNDbWRdLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA2MDAwIH0sIChlcnIsIHN0ZG91dCkgPT4gewogICAgICBpZiAoZXJyIHx8ICFzdGRvdXQudHJpbSgpKSB7CiAgICAgICAgZXhlYygnd21pYyBwcmludGVyIGdldCBuYW1lLGRlZmF1bHQgL2Zvcm1hdDpjc3YnLCB7IHdpbmRvd3NIaWRlOiB0cnVlLCB0aW1lb3V0OiA0MDAwIH0sICh3bWljRXJyLCB3bWljT3V0KSA9PiB7CiAgICAgICAgICBpZiAod21pY0VyciB8fCAhd21pY091dCkgewogICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgICB9CiAgICAgICAgICBjb25zdCBsaW5lcyA9IHdtaWNPdXQuc3BsaXQoJ1xuJykubWFwKGwgPT4gbC50cmltKCkpLmZpbHRlcihCb29sZWFuKS5zbGljZSgxKTsKICAgICAgICAgIGNvbnN0IHByaW50ZXJzID0gbGluZXMubWFwKGxpbmUgPT4gewogICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGxpbmUuc3BsaXQoJywnKTsKICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7CiAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGFydHNbMl0udHJpbSgpLCBpc0RlZmF1bHQ6IHBhcnRzWzFdLnRyaW0oKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZScsIHBvcnQ6ICdVU0IvTFBUJyB9OwogICAgICAgICAgICB9CiAgICAgICAgICAgIHJldHVybiBudWxsOwogICAgICAgICAgfSkuZmlsdGVyKEJvb2xlYW4pOwogICAgICAgICAgcmVzb2x2ZShwcmludGVycy5sZW5ndGggPiAwID8gcHJpbnRlcnMgOiBbeyBuYW1lOiAnSW1wcmVzb3JhIFByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnLCBpc0RlZmF1bHQ6IHRydWUsIHBvcnQ6ICdERUZBVUxUJyB9XSk7CiAgICAgICAgfSk7CiAgICAgICAgcmV0dXJuOwogICAgICB9CgogICAgICB0cnkgewogICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShzdGRvdXQpOwogICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkgZGF0YSA9IFtkYXRhXTsKICAgICAgICBjb25zdCBwcmludGVycyA9IGRhdGEubWFwKHAgPT4gKHsKICAgICAgICAgIG5hbWU6IHAuTmFtZSB8fCAnSW1wcmVzb3JhJywKICAgICAgICAgIGlzRGVmYXVsdDogQm9vbGVhbihwLkRlZmF1bHQpLAogICAgICAgICAgcG9ydDogcC5Qb3J0TmFtZSB8fCAnJywKICAgICAgICAgIGRyaXZlcjogcC5Ecml2ZXJOYW1lIHx8ICcnLAogICAgICAgICAgc3RhdHVzOiBwLlByaW50ZXJTdGF0dXMgfHwgMwogICAgICAgIH0pKTsKICAgICAgICByZXNvbHZlKHByaW50ZXJzKTsKICAgICAgfSBjYXRjaCAocGFyc2VFcnIpIHsKICAgICAgICByZXNvbHZlKFt7IG5hbWU6ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEgZGUgV2luZG93cycsIGlzRGVmYXVsdDogdHJ1ZSwgcG9ydDogJ0RFRkFVTFQnIH1dKTsKICAgICAgfQogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBSQVcgZW4gaW1wcmVzb3JhIGRlIHJlZCAoVENQIFNvY2tldCBwdWVydG8gOTEwMCkKICovCmZ1bmN0aW9uIHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCA9IDkxMDAsIGJ1ZmZlcikgewogIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7CiAgICBjb25zdCBjbGllbnQgPSBuZXcgbmV0LlNvY2tldCgpOwogICAgY2xpZW50LnNldFRpbWVvdXQoNTAwMCk7CiAgICBjbGllbnQuY29ubmVjdChwb3J0LCBpcCwgKCkgPT4gewogICAgICBjbGllbnQud3JpdGUoYnVmZmVyLCAoKSA9PiB7CiAgICAgICAgY2xpZW50LmVuZCgpOwogICAgICAgIHJlc29sdmUodHJ1ZSk7CiAgICAgIH0pOwogICAgfSk7CiAgICBjbGllbnQub24oJ2Vycm9yJywgKGVycikgPT4gcmVqZWN0KGVycikpOwogICAgY2xpZW50Lm9uKCd0aW1lb3V0JywgKCkgPT4gewogICAgICBjbGllbnQuZGVzdHJveSgpOwogICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGRlIGNvbmV4acOzbiBhIGxhIGltcHJlc29yYSBlbiAke2lwfToke3BvcnR9YCkpOwogICAgfSk7CiAgfSk7Cn0KCi8qKgogKiBJbXByaW1pciBlbiBpbXByZXNvcmEgbG9jYWwvY29tcGFydGlkYSBkZSBXaW5kb3dzIHVzYW5kbyB3aW5zcG9vbCBSQVcgeSBPdXQtUHJpbnRlciBmYWxsYmFjawogKi8KZnVuY3Rpb24gcHJpbnRXaW5kb3dzU3Bvb2xlcihwcmludGVyTmFtZSwgYnVmZmVyKSB7CiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsKICAgIGNvbnN0IGlzVmlydHVhbCA9IC8ocGRmfG9uZW5vdGV8eHBzfGZheCkvaS50ZXN0KHByaW50ZXJOYW1lIHx8ICcnKTsKICAgIGNvbnN0IGV4dCA9IGlzVmlydHVhbCA/ICcudHh0JyA6ICcuYmluJzsKICAgIGNvbnN0IHRlbXBGaWxlID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBga2FtaWFfcHJpbnRfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA2KX0ke2V4dH1gKTsKCiAgICBsZXQgZmlsZURhdGEgPSBidWZmZXI7CiAgICBpZiAoaXNWaXJ0dWFsKSB7CiAgICAgIC8vIExpbXBpYXIgY8OzZGlnb3MgZGUgY29udHJvbCBFU0MvUE9TIGVuIE5vZGUuanMgcGFyYSBxdWUgZWwgdGV4dG8gc2VhIDEwMCUgcHVybyB5IGxlZ2libGUKICAgICAgY29uc3QgcmF3U3RyID0gYnVmZmVyLnRvU3RyaW5nKCdsYXRpbjEnKTsKICAgICAgY29uc3QgY2xlYW5TdHIgPSByYXdTdHIucmVwbGFjZSgvW15ceDIwLVx4N0VcclxuXHRceEEwLVx4RkZdL2csICcnKTsKICAgICAgZmlsZURhdGEgPSBCdWZmZXIuZnJvbShjbGVhblN0ciwgJ3V0ZjgnKTsKCiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgZG9jc0RpciA9IHBhdGguam9pbihvcy5ob21lZGlyKCksICdEb2N1bWVudHMnKTsKICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhkb2NzRGlyKSkgewogICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKS5zbGljZSgwLCAxOSk7CiAgICAgICAgICBjb25zdCBzYXZlZEZpbGUgPSBwYXRoLmpvaW4oZG9jc0RpciwgYEtBTUlBX0ZhY3R1cmFfUE9TXyR7dGltZXN0YW1wfS50eHRgKTsKICAgICAgICAgIGNvbnN0IGxhdGVzdEZpbGUgPSBwYXRoLmpvaW4oZG9jc0RpciwgJ1VsdGltYV9GYWN0dXJhX1BPUy50eHQnKTsKICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoc2F2ZWRGaWxlLCBjbGVhblN0ciwgJ3V0ZjgnKTsKICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMobGF0ZXN0RmlsZSwgY2xlYW5TdHIsICd1dGY4Jyk7CiAgICAgICAgICAvLyBBYnJpciBhdXRvbcOhdGljYW1lbnRlIGVsIGFyY2hpdm8gZ2VuZXJhZG8gcGFyYSB2aXN0YSBwcmV2aWEgaW5tZWRpYXRhCiAgICAgICAgICBleGVjKGBzdGFydCAiIiAiJHtsYXRlc3RGaWxlfSJgKTsKICAgICAgICB9CiAgICAgIH0gY2F0Y2ggKGRvY0VycikgewogICAgICAgIGNvbnNvbGUud2FybignW1ByaW50QnJpZGdlXSBObyBzZSBwdWRvIGd1YXJkYXIgY29waWEgZW4gRG9jdW1lbnRvczonLCBkb2NFcnIubWVzc2FnZSk7CiAgICAgIH0KICAgIH0KCiAgICBmcy53cml0ZUZpbGUodGVtcEZpbGUsIGZpbGVEYXRhLCAod3JpdGVFcnIpID0+IHsKICAgICAgaWYgKHdyaXRlRXJyKSByZXR1cm4gcmVqZWN0KHdyaXRlRXJyKTsKCiAgICAgIGNvbnN0IHRhcmdldFByaW50ZXIgPSBwcmludGVyTmFtZSAmJiBwcmludGVyTmFtZSAhPT0gJ0ltcHJlc29yYSBQcmVkZXRlcm1pbmFkYSBkZSBXaW5kb3dzJwogICAgICAgID8gcHJpbnRlck5hbWUucmVwbGFjZSgvJy9nLCAiJyciKQogICAgICAgIDogJyc7CgogICAgICBjb25zdCBwc1NjcmlwdCA9IGlzVmlydHVhbCA/IGAKJHRlbXBGaWxlID0gJyR7dGVtcEZpbGUucmVwbGFjZSgvJy9nLCAiJyciKX0nOwokcHJpbnRlck5hbWUgPSAnJHt0YXJnZXRQcmludGVyfSc7CmlmICgtbm90ICRwcmludGVyTmFtZSkgewogICRkZWZhdWx0UHJpbnRlciA9IEdldC1DaW1JbnN0YW5jZSBXaW4zMl9QcmludGVyIHwgV2hlcmUtT2JqZWN0IHsgJF8uRGVmYXVsdCAtZXEgJHRydWUgfSB8IFNlbGVjdC1PYmplY3QgLUZpcnN0IDE7CiAgaWYgKCRkZWZhdWx0UHJpbnRlcikgeyAkcHJpbnRlck5hbWUgPSAkZGVmYXVsdFByaW50ZXIuTmFtZSB9Cn0KdHJ5IHsKICBHZXQtQ29udGVudCAtUGF0aCAkdGVtcEZpbGUgLUVuY29kaW5nIFVURjggfCBPdXQtUHJpbnRlciAtTmFtZSAkcHJpbnRlck5hbWUgLUVycm9yQWN0aW9uIFNpbGVudGx5Q29udGludWUKfSBjYXRjaCB7fQpleGl0IDAKYC50cmltKCkgOiBgCiR0ZW1wRmlsZSA9ICcke3RlbXBGaWxlLnJlcGxhY2UoLycvZywgIicnIil9JzsKJHByaW50ZXJOYW1lID0gJyR7dGFyZ2V0UHJpbnRlcn0nOwoKaWYgKC1ub3QgJHByaW50ZXJOYW1lKSB7CiAgJGRlZmF1bHRQcmludGVyID0gR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBXaGVyZS1PYmplY3QgeyAkXy5EZWZhdWx0IC1lcSAkdHJ1ZSB9IHwgU2VsZWN0LU9iamVjdCAtRmlyc3QgMTsKICBpZiAoJGRlZmF1bHRQcmludGVyKSB7ICRwcmludGVyTmFtZSA9ICRkZWZhdWx0UHJpbnRlci5OYW1lIH0KICBlbHNlIHsKICAgICRhbnlQcmludGVyID0gR2V0LUNpbUluc3RhbmNlIFdpbjMyX1ByaW50ZXIgfCBTZWxlY3QtT2JqZWN0IC1GaXJzdCAxOwogICAgaWYgKCRhbnlQcmludGVyKSB7ICRwcmludGVyTmFtZSA9ICRhbnlQcmludGVyLk5hbWUgfQogIH0KfQoKaWYgKC1ub3QgJHByaW50ZXJOYW1lKSB7CiAgZXhpdCAxCn0KCiRjb2RlID0gQCIKdXNpbmcgU3lzdGVtOwp1c2luZyBTeXN0ZW0uUnVudGltZS5JbnRlcm9wU2VydmljZXM7CgpwdWJsaWMgY2xhc3MgUmF3UHJpbnRlckhlbHBlciB7CiAgICBbU3RydWN0TGF5b3V0KExheW91dEtpbmQuU2VxdWVudGlhbCwgQ2hhclNldCA9IENoYXJTZXQuQW5zaSldCiAgICBwdWJsaWMgY2xhc3MgRE9DSU5GT0EgewogICAgICAgIFtNYXJzaGFsQXMoVW5tYW5hZ2VkVHlwZS5MUFN0cildIHB1YmxpYyBzdHJpbmcgcERvY05hbWU7CiAgICAgICAgW01hcnNoYWxBcyhVbm1hbmFnZWRUeXBlLkxQU3RyKV0gcHVibGljIHN0cmluZyBwT3V0cHV0RmlsZTsKICAgICAgICBbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBwdWJsaWMgc3RyaW5nIHBEYXRhVHlwZTsKICAgIH0KCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIk9wZW5QcmludGVyQSIsIFNldExhc3RFcnJvciA9IHRydWUsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2ksIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBPcGVuUHJpbnRlcihbTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHIpXSBzdHJpbmcgc3pQcmludGVyLCBvdXQgSW50UHRyIGhQcmludGVyLCBJbnRQdHIgcGQpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiQ2xvc2VQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIENsb3NlUHJpbnRlcihJbnRQdHIgaFByaW50ZXIpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiU3RhcnREb2NQcmludGVyQSIsIFNldExhc3RFcnJvciA9IHRydWUsIENoYXJTZXQgPSBDaGFyU2V0LkFuc2ksIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBTdGFydERvY1ByaW50ZXIoSW50UHRyIGhQcmludGVyLCBpbnQgbGV2ZWwsIFtJbiwgTWFyc2hhbEFzKFVubWFuYWdlZFR5cGUuTFBTdHJ1Y3QpXSBET0NJTkZPQSBkaSk7CgogICAgW0RsbEltcG9ydCgid2luc3Bvb2wuRHJ2IiwgRW50cnlQb2ludCA9ICJFbmREb2NQcmludGVyIiwgU2V0TGFzdEVycm9yID0gdHJ1ZSwgRXhhY3RTcGVsbGluZyA9IHRydWUsIENhbGxpbmdDb252ZW50aW9uID0gQ2FsbGluZ0NvbnZlbnRpb24uU3RkQ2FsbCldCiAgICBwdWJsaWMgc3RhdGljIGV4dGVybiBib29sIEVuZERvY1ByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIlN0YXJ0UGFnZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgU3RhcnRQYWdlUHJpbnRlcihJbnRQdHIgaFByaW50ZXIpOwoKICAgIFtEbGxJbXBvcnQoIndpbnNwb29sLkRydiIsIEVudHJ5UG9pbnQgPSAiRW5kUGFnZVByaW50ZXIiLCBTZXRMYXN0RXJyb3IgPSB0cnVlLCBFeGFjdFNwZWxsaW5nID0gdHJ1ZSwgQ2FsbGluZ0NvbnZlbnRpb24gPSBDYWxsaW5nQ29udmVudGlvbi5TdGRDYWxsKV0KICAgIHB1YmxpYyBzdGF0aWMgZXh0ZXJuIGJvb2wgRW5kUGFnZVByaW50ZXIoSW50UHRyIGhQcmludGVyKTsKCiAgICBbRGxsSW1wb3J0KCJ3aW5zcG9vbC5EcnYiLCBFbnRyeVBvaW50ID0gIldyaXRlUHJpbnRlciIsIFNldExhc3RFcnJvciA9IHRydWUsIEV4YWN0U3BlbGxpbmcgPSB0cnVlLCBDYWxsaW5nQ29udmVudGlvbiA9IENhbGxpbmdDb252ZW50aW9uLlN0ZENhbGwpXQogICAgcHVibGljIHN0YXRpYyBleHRlcm4gYm9vbCBXcml0ZVByaW50ZXIoSW50UHRyIGhQcmludGVyLCBJbnRQdHIgcEJ5dGVzLCBpbnQgZHdDb3VudCwgb3V0IGludCBkd1dyaXR0ZW4pOwoKICAgIHB1YmxpYyBzdGF0aWMgYm9vbCBTZW5kQnl0ZXNUb1ByaW50ZXIoc3RyaW5nIHN6UHJpbnRlck5hbWUsIGJ5dGVbXSBwQnl0ZXMpIHsKICAgICAgICBJbnRQdHIgaFByaW50ZXIgPSBuZXcgSW50UHRyKDApOwogICAgICAgIERPQ0lORk9BIGRpID0gbmV3IERPQ0lORk9BKCk7CiAgICAgICAgYm9vbCBiU3VjY2VzcyA9IGZhbHNlOwoKICAgICAgICBkaS5wRG9jTmFtZSA9ICJLQU1JQSBQT1MgVGlja2V0IjsKICAgICAgICBkaS5wRGF0YVR5cGUgPSAiUkFXIjsKCiAgICAgICAgaWYgKE9wZW5QcmludGVyKHN6UHJpbnRlck5hbWUsIG91dCBoUHJpbnRlciwgSW50UHRyLlplcm8pKSB7CiAgICAgICAgICAgIGlmIChTdGFydERvY1ByaW50ZXIoaFByaW50ZXIsIDEsIGRpKSkgewogICAgICAgICAgICAgICAgaWYgKFN0YXJ0UGFnZVByaW50ZXIoaFByaW50ZXIpKSB7CiAgICAgICAgICAgICAgICAgICAgSW50UHRyIHBVbm1hbmFnZWRCeXRlcyA9IE1hcnNoYWwuQWxsb2NDb1Rhc2tNZW0ocEJ5dGVzLkxlbmd0aCk7CiAgICAgICAgICAgICAgICAgICAgTWFyc2hhbC5Db3B5KHBCeXRlcywgMCwgcFVubWFuYWdlZEJ5dGVzLCBwQnl0ZXMuTGVuZ3RoKTsKICAgICAgICAgICAgICAgICAgICBpbnQgZHdXcml0dGVuID0gMDsKICAgICAgICAgICAgICAgICAgICBiU3VjY2VzcyA9IFdyaXRlUHJpbnRlcihoUHJpbnRlciwgcFVubWFuYWdlZEJ5dGVzLCBwQnl0ZXMuTGVuZ3RoLCBvdXQgZHdXcml0dGVuKTsKICAgICAgICAgICAgICAgICAgICBNYXJzaGFsLkZyZWVDb1Rhc2tNZW0ocFVubWFuYWdlZEJ5dGVzKTsKICAgICAgICAgICAgICAgICAgICBFbmRQYWdlUHJpbnRlcihoUHJpbnRlcik7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICBFbmREb2NQcmludGVyKGhQcmludGVyKTsKICAgICAgICAgICAgfQogICAgICAgICAgICBDbG9zZVByaW50ZXIoaFByaW50ZXIpOwogICAgICAgIH0KICAgICAgICByZXR1cm4gYlN1Y2Nlc3M7CiAgICB9Cn0KIkAKCnRyeSB7CiAgICBpZiAoLW5vdCAoW1N5c3RlbS5NYW5hZ2VtZW50LkF1dG9tYXRpb24uUFNUeXBlTmFtZV0nUmF3UHJpbnRlckhlbHBlcicpLlR5cGUpIHsKICAgICAgICBBZGQtVHlwZSAtVHlwZURlZmluaXRpb24gJGNvZGUgLUVycm9yQWN0aW9uIFN0b3AKICAgIH0KICAgICRieXRlcyA9IFtTeXN0ZW0uSU8uRmlsZV06OlJlYWRBbGxCeXRlcygkdGVtcEZpbGUpCiAgICAkb2sgPSBbUmF3UHJpbnRlckhlbHBlcl06OlNlbmRCeXRlc1RvUHJpbnRlcigkcHJpbnRlck5hbWUsICRieXRlcykKICAgIGlmICgkb2spIHsKICAgICAgICBleGl0IDAKICAgIH0KfSBjYXRjaCB7fQoKdHJ5IHsKICAgIEdldC1Db250ZW50IC1QYXRoICR0ZW1wRmlsZSAtRW5jb2RpbmcgRGVmYXVsdCB8IE91dC1QcmludGVyIC1OYW1lICRwcmludGVyTmFtZSAtRXJyb3JBY3Rpb24gU3RvcAogICAgZXhpdCAwCn0gY2F0Y2ggewogICAgZXhpdCAwCn0KYC50cmltKCk7CgogICAgICBleGVjRmlsZSgncG93ZXJzaGVsbCcsIFsnLU5vUHJvZmlsZScsICctRXhlY3V0aW9uUG9saWN5JywgJ0J5cGFzcycsICctQ29tbWFuZCcsIHBzU2NyaXB0XSwgeyB3aW5kb3dzSGlkZTogdHJ1ZSwgdGltZW91dDogODAwMCB9LCAocHNFcnIpID0+IHsKICAgICAgICB0cnkgeyBmcy51bmxpbmtTeW5jKHRlbXBGaWxlKTsgfSBjYXRjaCAoZSkge30KICAgICAgICByZXNvbHZlKHRydWUpOwogICAgICB9KTsKICAgIH0pOwogIH0pOwp9CgovKioKICogU2Vydmlkb3IgSFRUUAogKi8KY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoYXN5bmMgKHJlcSwgcmVzKSA9PiB7CiAgLy8gQ09SUyBIZWFkZXJzCiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTsKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgT1BUSU9OUycpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7CiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKTsKCiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykgewogICAgcmVzLndyaXRlSGVhZCgyMDApOwogICAgcmV0dXJuIHJlcy5lbmQoKTsKICB9CgogIGNvbnN0IHVybCA9IHJlcS51cmwuc3BsaXQoJz8nKVswXTsKCiAgLy8gMS4gR0VUIC9oZWFsdGggbyAvc3RhdHVzCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmICh1cmwgPT09ICcvJyB8fCB1cmwgPT09ICcvaGVhbHRoJyB8fCB1cmwgPT09ICcvc3RhdHVzJykpIHsKICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsKICAgICAgc3RhdHVzOiAnb25saW5lJywKICAgICAgc2VydmljZTogJ0tBTUlBIE5vZGUuanMgUHJpbnQgQnJpZGdlJywKICAgICAgdmVyc2lvbjogJzIuMC4wJywKICAgICAgbm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvbiwKICAgICAgcGxhdGZvcm06IG9zLnBsYXRmb3JtKCksCiAgICAgIGFyY2g6IG9zLmFyY2goKSwKICAgICAgaG9zdG5hbWU6IG9zLmhvc3RuYW1lKCksCiAgICAgIHVwdGltZVNlY29uZHM6IE1hdGguZmxvb3IocHJvY2Vzcy51cHRpbWUoKSksCiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpCiAgICB9KSk7CiAgfQoKICAvLyAyLiBHRVQgL3ByaW50ZXJzCiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHVybCA9PT0gJy9wcmludGVycycpIHsKICAgIHRyeSB7CiAgICAgIGNvbnN0IHByaW50ZXJzID0gYXdhaXQgZ2V0V2luZG93c1ByaW50ZXJzKCk7CiAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgcHJpbnRlcnMgfSkpOwogICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDUwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAgICB9CiAgfQoKICAvLyAzLiBQT1NUIC9wcmludAogIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgdXJsID09PSAnL3ByaW50JykgewogICAgbGV0IGJvZHkgPSAnJzsKICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IHsgYm9keSArPSBjaHVuazsgfSk7CiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHsKICAgICAgdHJ5IHsKICAgICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShib2R5IHx8ICd7fScpOwogICAgICAgIGNvbnN0IHsgdGV4dCwgcmF3LCBwcmludGVyTmFtZSwgY3V0UGFwZXIgPSB0cnVlLCBvcGVuRHJhd2VyID0gZmFsc2UsIGlwID0gbnVsbCwgcG9ydCA9IDkxMDAgfSA9IHBheWxvYWQ7CgogICAgICAgIGlmICghdGV4dCAmJiAhcmF3KSB7CiAgICAgICAgICByZXR1cm4gcmVzLndyaXRlSGVhZCg0MDApLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0VsIGNhbXBvICJ0ZXh0IiBvICJyYXciIGVzIHJlcXVlcmlkbycgfSkpOwogICAgICAgIH0KCiAgICAgICAgbGV0IGNodW5rcyA9IFtdOwogICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKEVTQ19JTklULCAnYmluYXJ5JykpOwoKICAgICAgICBpZiAob3BlbkRyYXdlcikgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oRVNDX0RSQVdFUiwgJ2JpbmFyeScpKTsKICAgICAgICB9CgogICAgICAgIGlmICh0ZXh0KSB7CiAgICAgICAgICBjaHVua3MucHVzaChCdWZmZXIuZnJvbSh0ZXh0LCAnbGF0aW4xJykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKHJhdykgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20ocmF3LCAnYmluYXJ5JykpOwogICAgICAgIH0KCiAgICAgICAgaWYgKGN1dFBhcGVyICE9PSBmYWxzZSkgewogICAgICAgICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oJ1xuXG5cblxuJywgJ2xhdGluMScpKTsKICAgICAgICAgIGNodW5rcy5wdXNoKEJ1ZmZlci5mcm9tKEVTQ19DVVRfUEFSVElBTCwgJ2JpbmFyeScpKTsKICAgICAgICB9CgogICAgICAgIGNvbnN0IGZpbmFsQnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpOwoKICAgICAgICBpZiAoaXApIHsKICAgICAgICAgIGF3YWl0IHByaW50TmV0d29ya1NvY2tldChpcCwgcG9ydCwgZmluYWxCdWZmZXIpOwogICAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgSW1wcmVzacOzbiBlbnZpYWRhIGEgc29ja2V0IGRlIHJlZCAke2lwfToke3BvcnR9YCB9KSk7CiAgICAgICAgfQoKICAgICAgICBhd2FpdCBwcmludFdpbmRvd3NTcG9vbGVyKHByaW50ZXJOYW1lLCBmaW5hbEJ1ZmZlcik7CiAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgVHJhYmFqbyBlbnZpYWRvIGEgbGEgY29sYSBkZSAke3ByaW50ZXJOYW1lIHx8ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEnfWAgfSkpOwoKICAgICAgfSBjYXRjaCAoZXJyKSB7CiAgICAgICAgY29uc29sZS5lcnJvcignW1ByaW50QnJpZGdlXSBFcnJvciBhbCBwcm9jZXNhciBpbXByZXNpw7NuOicsIGVycik7CiAgICAgICAgcmV0dXJuIHJlcy53cml0ZUhlYWQoNTAwKS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTsKICAgICAgfQogICAgfSk7CiAgICByZXR1cm47CiAgfQoKICAvLyA0LiBQT1NUIC90ZXN0LXByaW50CiAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJyAmJiB1cmwgPT09ICcvdGVzdC1wcmludCcpIHsKICAgIGxldCBib2R5ID0gJyc7CiAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bms7IH0pOwogICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7CiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoYm9keSB8fCAne30nKTsKICAgICAgICBjb25zdCBwcmludGVyTmFtZSA9IHBheWxvYWQucHJpbnRlck5hbWUgfHwgbnVsbDsKICAgICAgICBjb25zdCB0ZXN0VHlwZSA9IHBheWxvYWQudHlwZSB8fCAnY29tYW5kYSc7CgogICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoJ2VzLUNPJyk7CiAgICAgICAgY29uc3Qgc2VwYXJhdG9yID0gJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nOwogICAgICAgIGNvbnN0IGxpbmUgPSAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7CgogICAgICAgIGxldCB0ZXN0VGV4dCA9ICcnOwogICAgICAgIHRlc3RUZXh0ICs9IGAke3NlcGFyYXRvcn1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCAgICAgICAgICBLQU1JQSBQT1MgJiBFUlAgYnkgSkYgICAgICAgICBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCAgICAgICJUb2RvIHR1IG5lZ29jaW8sIGNvbmVjdGFkby4iICAgICBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgKioqIFRJQ0tFVCBERSBQUlVFQkEgREUgSU1QUkVTSU9OICoqKiBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7bGluZX1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEZlY2hhIC8gSG9yYTogICR7bm93fVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgU2VydmljaW86ICAgICAgS0FNSUEgTm9kZS5qcyBQcmludCBCcmlkZ2UgdjIuMFxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgTW90b3I6ICAgICAgICAgTm9kZS5qcyAke3Byb2Nlc3MudmVyc2lvbn1cbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEltcHJlc29yYTogICAgICR7cHJpbnRlck5hbWUgfHwgJ1ByZWRldGVybWluYWRhIGRlIFdpbmRvd3MnfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgRGVzdGlubzogICAgICAgJHt0ZXN0VHlwZSA9PT0gJ2NvY2luYScgPyAnQ29jaW5hIChDb21hbmRhKScgOiAodGVzdFR5cGUgPT09ICdjYWphJyA/ICdDYWphIChGYWN0dXJhY2nDs24pJyA6ICdHZW5lcmFsJyl9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAke2xpbmV9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBDYXJhY3RlcmVzIEVzcGVjaWFsZXMgLyBBY2VudG9zOlxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgw6Egw6kgw60gw7Mgw7ogw7Egw4Egw4kgw40gw5Mgw5ogw5EgJCAlICYgQCAjXG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGAke2xpbmV9XG5gOwogICAgICAgIHRlc3RUZXh0ICs9IGBFc3RhZG86ICAgICAgICBDT05FWElPTiAxMDAlIEVYSVRPU0FcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYEltcHJlc2lvbjogICAgIERpcmVjdGEgeSBTaWxlbmNpb3NhIChPSylcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKICAgICAgICB0ZXN0VGV4dCArPSBgICAgICDCoVR1IGltcHJlc29yYSBlc3RhIGxpc3RhIHBhcmEgb3BlcmFyISBcbmA7CiAgICAgICAgdGVzdFRleHQgKz0gYCR7c2VwYXJhdG9yfVxuYDsKCiAgICAgICAgY29uc3QgY2h1bmtzID0gWwogICAgICAgICAgQnVmZmVyLmZyb20oRVNDX0lOSVQsICdiaW5hcnknKSwKICAgICAgICAgIEJ1ZmZlci5mcm9tKHRlc3RUZXh0LCAnbGF0aW4xJyksCiAgICAgICAgICBCdWZmZXIuZnJvbSgnXG5cblxuXG4nLCAnbGF0aW4xJyksCiAgICAgICAgICBCdWZmZXIuZnJvbShFU0NfQ1VUX1BBUlRJQUwsICdiaW5hcnknKQogICAgICAgIF07CgogICAgICAgIGNvbnN0IGZpbmFsQnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpOwogICAgICAgIGF3YWl0IHByaW50V2luZG93c1Nwb29sZXIocHJpbnRlck5hbWUsIGZpbmFsQnVmZmVyKTsKCiAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewogICAgICAgICAgc3VjY2VzczogdHJ1ZSwKICAgICAgICAgIG1lc3NhZ2U6IGBUaWNrZXQgZGUgcHJ1ZWJhIHByb2Nlc2FkbyBleGl0b3NhbWVudGUgcGFyYSAke3ByaW50ZXJOYW1lIHx8ICdJbXByZXNvcmEgUHJlZGV0ZXJtaW5hZGEnfWAKICAgICAgICB9KSk7CiAgICAgIH0gY2F0Y2ggKGVycikgewogICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tQcmludEJyaWRnZV0gRXJyb3IgYWwgaW1wcmltaXIgdGVzdDonLCBlcnIpOwogICAgICAgIHJldHVybiByZXMud3JpdGVIZWFkKDUwMCkuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSk7CiAgICAgIH0KICAgIH0pOwogICAgcmV0dXJuOwogIH0KCiAgLy8gNDA0CiAgcmVzLndyaXRlSGVhZCg0MDQpLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRW5kcG9pbnQgbm8gZW5jb250cmFkbycgfSkpOwp9KTsKCnNlcnZlci5saXN0ZW4oUE9SVCwgSE9TVCwgKCkgPT4gewogIGNvbnNvbGUubG9nKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7CiAgY29uc29sZS5sb2coYOKchSBLQU1JQSBOb2RlLmpzIFByaW50IEJyaWRnZSB2Mi4wIGluaWNpYWRvYCk7CiAgY29uc29sZS5sb2coYCAgIEVzY3VjaGFuZG8gZW46IGh0dHA6Ly9sb2NhbGhvc3Q6JHtQT1JUfWApOwogIGNvbnNvbGUubG9nKGAgICBOb2RlLmpzOiAke3Byb2Nlc3MudmVyc2lvbn0g4oCUIFBsYXRhZm9ybWE6ICR7b3MucGxhdGZvcm0oKX1gKTsKICBjb25zb2xlLmxvZygnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpOwp9KTsK'))"\r
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
