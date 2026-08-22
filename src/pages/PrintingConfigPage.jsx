// src/pages/PrintingConfigPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Printer, RefreshCw, CheckCircle, AlertCircle, Download,
  Play, Trash2, Cpu, FileText, Check, UtensilsCrossed,
  Receipt, DollarSign, Settings, ShieldCheck, Sparkles, ExternalLink,
  Eye
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api, formatCOP, formatDateTime } from '../api/client';
import { useUiStore } from '../store/uiStore';
import {
  checkPrintBridgeHealth,
  getPrintBridgePrinters,
  sendTestPrint,
  sendToThermalBridge,
  openCashDrawer,
  buildInvoicePlainText,
  buildKitchenTicketPlainText,
  printInvoiceReceipt,
  printKitchenTicket
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

  // Modales de Vista Previa y PDF
  const [previewInvoiceModalOpen, setPreviewInvoiceModalOpen] = useState(false);
  const [previewKitchenModalOpen, setPreviewKitchenModalOpen] = useState(false);

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

  // Datos de demostración estructurados para pruebas y vista previa
  const sampleInvoice = {
    id: 482,
    invoice_number: `${settings.invoice_prefix || 'FAC'}-00482`,
    created_at: new Date().toISOString(),
    customer_name: 'Carlos Mendoza',
    customer_document: '1098765432',
    customer_phone: '310 987 6543',
    customer_address: 'Calle 45 # 12-34',
    customer_city: 'Bogotá, D.C.',
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

  const sampleKitchenOrder = {
    id: '00482',
    table_number: 'Mesa 4',
    customer_name: 'Carlos Mendoza',
    waiter_name: 'Laura Gómez'
  };

  const sampleKitchenItems = [
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

  // 4. Pruebas de Impresión con Formato Real
  const handleTestKitchen = async () => {
    setTestingKitchen(true);
    try {
      const plainText = buildKitchenTicketPlainText(
        sampleKitchenOrder,
        sampleKitchenItems,
        'Mesa VIP - Entregar todo junto',
        sampleKitchenOrder.waiter_name
      );

      const res = await sendToThermalBridge(plainText, printerKitchenName, bridgeUrl);
      if (res && res.success) {
        addToast('Comanda de prueba enviada a la impresora de Cocina', 'success');
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
      const res = await openCashDrawer(printerReceiptName, bridgeUrl);
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
    const origin = window.location.origin;
    const downloadUrl = `${origin}/print-bridge/bridge.js`;

    const batContent = `@echo off\r
title KAMIA POS - Servidor Print Bridge (Node.js)\r
color 0A\r
cls\r
echo ======================================================================\r
echo           KAMIA POS - SERVIDOR DE IMPRESION DIRECTA (NODE.JS)\r
echo ======================================================================\r
echo.\r
\r
:: 1. Verificar si Node.js esta instalado\r
where node >nul 2>nul\r
if %errorlevel% neq 0 (\r
    color 0C\r
    echo [ALERTA] Node.js no esta instalado en este computador.\r
    echo Node.js es OBLIGATORIO para el Print Bridge.\r
    echo.\r
    echo Abriendo la pagina de descarga oficial de Node.js...\r
    start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi\r
    echo.\r
    echo Por favor completa la instalacion de Node.js y vuelve a ejecutar este archivo.\r
    echo.\r
    pause\r
    exit /b 1\r
)\r
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i\r
echo [OK] Node.js detectado: %NODE_VERSION%\r
echo.\r
\r
:: 2. Preparar directorio local en AppData\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
set "BRIDGE_FILE=%TARGET_DIR%\\bridge.js"\r
\r
:: 3. Copiar archivo local o descargar desde la aplicacion web\r
if exist "%~dp0bridge.js" (\r
    copy /y "%~dp0bridge.js" "%BRIDGE_FILE%" >nul\r
    echo [OK] Archivo bridge.js copiado desde la carpeta actual.\r
) else (\r
    echo Descargando componentes del Print Bridge desde la plataforma...\r
    curl -fsSL -o "%BRIDGE_FILE%" "${downloadUrl}" 2>nul\r
    if not exist "%BRIDGE_FILE%" (\r
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { (New-Object Net.WebClient).DownloadFile('${downloadUrl}', '%BRIDGE_FILE%') } catch {}"\r
    )\r
)\r
\r
:: 4. Validar existencia de bridge.js\r
if not exist "%BRIDGE_FILE%" (\r
    color 0C\r
    echo.\r
    echo [ERROR] No se pudo descargar el archivo bridge.js del servidor.\r
    echo URL de origen: ${downloadUrl}\r
    echo Verifica tu conexion a internet o descarga el archivo manualmente.\r
    echo.\r
    pause\r
    exit /b 1\r
)\r
\r
:: 5. Iniciar servicio en primer plano\r
echo.\r
echo ======================================================================\r
echo   [OK] Iniciando KAMIA Print Bridge en http://localhost:8088...\r
echo   Deja esta ventana abierta o minimizada mientras uses el POS.\r
echo ======================================================================\r
echo.\r
cd /d "%TARGET_DIR%"\r
node bridge.js\r
if %errorlevel% neq 0 (\r
    echo.\r
    color 0C\r
    echo [AVISO] El Print Bridge se ha detenido inesperadamente.\r
    pause\r
)\r
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
    addToast('Script iniciar-bridge.bat descargado', 'success');
  };

  const downloadInstallerBat = () => {
    const origin = window.location.origin;
    const downloadUrl = `${origin}/print-bridge/bridge.js`;

    const batContent = `@echo off\r
title KAMIA POS - Instalador de Servicio Print Bridge (Node.js)\r
color 0B\r
cls\r
echo ======================================================================\r
echo           KAMIA POS - INSTALADOR DE SERVICIO PRINT BRIDGE (NODE.JS)\r
echo ======================================================================\r
echo.\r
\r
:: 1. Verificar si Node.js esta instalado\r
where node >nul 2>nul\r
if %errorlevel% neq 0 (\r
    color 0C\r
    echo [ALERTA] Node.js no esta instalado en este computador.\r
    echo Node.js es OBLIGATORIO para el Print Bridge.\r
    echo.\r
    echo Abriendo la pagina de descarga oficial de Node.js...\r
    start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi\r
    echo.\r
    echo Por favor completa la instalacion de Node.js y vuelve a ejecutar este instalador.\r
    echo.\r
    pause\r
    exit /b 1\r
)\r
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i\r
echo   [1/4] Node.js verificado: %NODE_VERSION%\r
\r
:: 2. Preparar directorio local en AppData\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
set "BRIDGE_FILE=%TARGET_DIR%\\bridge.js"\r
\r
:: 3. Copiar o descargar bridge.js\r
if exist "%~dp0bridge.js" (\r
    copy /y "%~dp0bridge.js" "%BRIDGE_FILE%" >nul\r
    echo   [2/4] Archivo bridge.js copiado localmente.\r
) else (\r
    echo   [2/4] Descargando componentes del Print Bridge...\r
    curl -fsSL -o "%BRIDGE_FILE%" "${downloadUrl}" 2>nul\r
    if not exist "%BRIDGE_FILE%" (\r
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { (New-Object Net.WebClient).DownloadFile('${downloadUrl}', '%BRIDGE_FILE%') } catch {}"\r
    )\r
)\r
\r
if not exist "%BRIDGE_FILE%" (\r
    color 0C\r
    echo   [ERROR] No se pudo descargar bridge.js. Verifica tu internet.\r
    pause\r
    exit /b 1\r
)\r
\r
:: 4. Detener instancias previas\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; try { Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PrintBridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } catch {}"\r
\r
:: 5. Crear script de inicio automatico\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
set "VBS_PATH=%STARTUP_FOLDER%\\KAMIA_PrintBridge.vbs"\r
> "%VBS_PATH%" echo Set WshShell = CreateObject("WScript.Shell")\r
>> "%VBS_PATH%" echo WshShell.Run "node """ ^& "%TARGET_DIR%\\bridge.js"""", 0, False\r
>> "%VBS_PATH%" echo Set WshShell = Nothing\r
echo   [3/4] Inicio automatico con Windows configurado.\r
\r
:: 6. Iniciar el servicio\r
echo   [4/4] Iniciando servicio en segundo plano...\r
wscript "%VBS_PATH%"\r
\r
echo.\r
echo ======================================================================\r
echo    INSTALACION COMPLETADA EXITOSAMENTE\r
echo ======================================================================\r
echo.\r
echo   [OK] El Print Bridge Node.js ya esta activo en http://localhost:8088\r
echo   [OK] Se ejecutara de forma silenciosa cada vez que inicies Windows.\r
echo.\r
pause\r
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
    addToast('Instalador instalar-servicio.bat descargado', 'success');
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
echo   [1/3] Deteniendo procesos de Print Bridge en ejecucion...\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; try { Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PrintBridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } catch {}"\r
\r
echo   [2/3] Eliminando inicio automatico con Windows...\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
if exist "%STARTUP_FOLDER%\\KAMIA_PrintBridge.vbs" del /f /q "%STARTUP_FOLDER%\\KAMIA_PrintBridge.vbs"\r
if exist "%STARTUP_FOLDER%\\GastrosPOS_PrintBridge.vbs" del /f /q "%STARTUP_FOLDER%\\GastrosPOS_PrintBridge.vbs"\r
\r
echo   [3/3] Eliminando archivos instalados...\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"\r
\r
echo.\r
echo ======================================================================\r
echo    PRINT BRIDGE DESINSTALADO Y ELIMINADO EXITOSAMENTE\r
echo ======================================================================\r
echo.\r
echo   [OK] El servicio local (Puerto 8088) ha sido detenido.\r
echo   [OK] Se elimino el inicio automatico con Windows.\r
echo   [OK] Se eliminaron todos los archivos del sistema.\r
echo.\r
echo Presiona cualquier tecla para cerrar esta ventana...\r
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

  const downloadMobileAccessBat = () => {
    const batContent = `@echo off
chcp 65001 >nul
title GastrosPOS - Habilitador de Red Local & Acceso Movil

:: Verificar y auto-elevar a Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Solicitando permisos de Administrador para configurar Firewall de Windows...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cls
echo ====================================================================
echo   GASTROSPOS / KAMIA - CONFIGURADOR DE ACCESO LOCAL PARA MOVILES
echo ====================================================================
echo.
echo [1/2] Configurando perfil de red de Windows a "Red Privada"...
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo   [OK] Perfil de red configurado como Red Privada.
echo.
echo [2/2] Abriendo puertos en Firewall de Windows (5173, 3001, 8088)...
netsh advfirewall firewall delete rule name="GastrosPOS_LAN" >nul 2>&1
netsh advfirewall firewall add rule name="GastrosPOS_LAN" dir=in action=allow protocol=TCP localport=3001,5173,8088 profile=any >nul
echo   [OK] Puertos 5173 (POS Web), 3001 (API Server) y 8088 (Print Bridge) habilitados.
echo.
echo ====================================================================
echo   CONFIGURACION EXITOSA!
echo.
echo   Tus telefonos celulares y tablets ya tienen acceso libre a:
echo   http://192.168.1.2:5173
echo ====================================================================
echo.
pause
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habilitar-acceso-movil.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Descargado habilitar-acceso-movil.bat', 'success');
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
          Centro de Pruebas, Vista Previa & Generador de PDF
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          Visualiza la factura o comanda en pantalla, descárgala en PDF de alta resolución con 1 clic, o prueba la impresión silenciosa directa.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          
          {/* Tarjeta 1: Factura de Caja */}
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
              <Receipt size={16} color="var(--accent-primary)" />
              Factura de Venta POS (Caja)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Encabezado fiscal, productos, adicionales, impuestos, propina y total a pagar.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant="primary"
                icon={<Eye size={14} />}
                onClick={() => setPreviewInvoiceModalOpen(true)}
              >
                👁️ Ver Factura & PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Printer size={14} />}
                onClick={handleTestReceipt}
                disabled={testingReceipt || bridgeStatus !== 'online'}
              >
                {testingReceipt ? 'Enviando...' : '⚡ Imprimir Térmica'}
              </Button>
            </div>
          </div>

          {/* Tarjeta 2: Comanda de Cocina */}
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
              <UtensilsCrossed size={16} color="var(--accent-primary)" />
              Comanda Operativa (Cocina / Bar)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Número de mesa, orden de preparación, notas especiales y modificadores.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant="primary"
                icon={<Eye size={14} />}
                onClick={() => setPreviewKitchenModalOpen(true)}
              >
                👁️ Ver Comanda & PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Printer size={14} />}
                onClick={handleTestKitchen}
                disabled={testingKitchen || bridgeStatus !== 'online'}
              >
                {testingKitchen ? 'Enviando...' : '⚡ Imprimir Térmica'}
              </Button>
            </div>
          </div>

          {/* Tarjeta 3: Gaveta Monedero */}
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
              <DollarSign size={16} color="var(--accent-success)" />
              Cajón Monedero / Gaveta
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Prueba el pulso eléctrico ESC/POS (puerto RJ11) para expulsar la caja de dinero.
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Button
                size="sm"
                variant="secondary"
                icon={<DollarSign size={14} />}
                onClick={handleTestDrawer}
                disabled={testingDrawer || bridgeStatus !== 'online'}
                style={{ width: '100%' }}
              >
                {testingDrawer ? 'Enviando pulso...' : '💵 Probar Apertura de Gaveta'}
              </Button>
            </div>
          </div>

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

          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-primary)' }}>5. Desbloquear Celulares (Firewall)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 8px 0' }}>
              Configura Red Privada y abre puertos para meseros en Wi-Fi.
            </div>
            <Button size="sm" variant="primary" onClick={downloadMobileAccessBat} style={{ width: '100%' }}>
              Descargar habilitar-movil.bat
            </Button>
          </div>

        </div>
      </Card>

      {/* MODAL 1: VISTA PREVIA FACTURA DE VENTA POS & GENERADOR PDF */}
      <Modal
        isOpen={previewInvoiceModalOpen}
        onClose={() => setPreviewInvoiceModalOpen(false)}
        title="🧾 Vista Previa de Factura POS & Exportar PDF"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* Ticket Visual */}
          <div style={{
            width: paperWidth === '58mm' ? '290px' : '360px',
            background: '#ffffff',
            color: '#111827',
            fontFamily: "'Courier New', Courier, monospace, sans-serif",
            fontSize: paperWidth === '58mm' ? '11px' : '12px',
            padding: '20px 16px',
            borderRadius: '6px',
            border: '1px dashed #9ca3af',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            lineHeight: 1.35
          }}>
            {settings?.logo_url && (
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '50px', maxWidth: '140px', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: paperWidth === '58mm' ? '13px' : '15px', textTransform: 'uppercase' }}>
              {settings?.business_name || 'KAMIA RESTAURANTE'}
            </div>
            {settings?.nit && <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '11px' }}>NIT: {settings.nit}</div>}
            {settings?.address && <div style={{ textAlign: 'center', fontSize: '11px' }}>{settings.address}</div>}
            {settings?.phone && <div style={{ textAlign: 'center', fontSize: '11px' }}>Tel: {settings.phone}</div>}
            
            <div style={{ borderTop: '2px solid #111827', margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '13px' }}>FACTURA DE VENTA POS</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>N° {sampleInvoice.invoice_number}</div>
            <div style={{ borderTop: '1px solid #111827', margin: '6px 0' }} />

            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fecha:</span>
                <span>{new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cajero:</span>
                <span style={{ fontWeight: 700 }}>{sampleInvoice.cashier_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mesero:</span>
                <span>{sampleInvoice.waiter_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mesa:</span>
                <span style={{ fontWeight: 700 }}>{sampleInvoice.table_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cliente:</span>
                <span style={{ fontWeight: 700 }}>{sampleInvoice.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>NIT / CC:</span>
                <span>{sampleInvoice.customer_document}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #111827', textAlign: 'left', fontWeight: 800 }}>
                  <th style={{ paddingBottom: '3px', width: '15%' }}>Cant</th>
                  <th style={{ paddingBottom: '3px' }}>Producto</th>
                  <th style={{ paddingBottom: '3px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoice.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dashed #e5e7eb' }}>
                    <td style={{ fontWeight: 800, padding: '4px 0', verticalAlign: 'top' }}>{it.quantity}x</td>
                    <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{it.name}</div>
                      {it.modifiers?.map((m, mIdx) => (
                        <div key={mIdx} style={{ fontSize: '10.5px', color: '#374151', paddingLeft: '4px' }}>
                          + {m.name} {m.price_modifier > 0 ? `(+${formatCOP(m.price_modifier)})` : ''}
                        </div>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, padding: '4px 0', verticalAlign: 'top' }}>
                      {formatCOP(it.quantity * it.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 700 }}>{formatCOP(sampleInvoice.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Descuento:</span>
              <span style={{ fontWeight: 700 }}>-{formatCOP(sampleInvoice.discount_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Propina Sugerida:</span>
              <span style={{ fontWeight: 700 }}>+{formatCOP(sampleInvoice.tip_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Impuestos Inc.:</span>
              <span>{formatCOP(sampleInvoice.tax_total)}</span>
            </div>
            
            <div style={{ borderTop: '2px solid #111827', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px' }}>
              <span>TOTAL A PAGAR:</span>
              <span>{formatCOP(sampleInvoice.total)}</span>
            </div>
            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            
            <div style={{ textAlign: 'center', fontWeight: 700, marginTop: '4px' }}>
              {settings?.receipt_footer || '¡Gracias por su visita y preferencia!'}
            </div>
            <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#6b7280', marginTop: '4px' }}>
              Software POS & ERP: KAMIA by JF
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Download size={15} />}
              onClick={() => printInvoiceReceipt(sampleInvoice, { ...settings, enable_silent_printing: false }, paperWidth)}
            >
              📥 Guardar PDF / Imprimir en Navegador
            </Button>
            <Button
              variant="secondary"
              icon={<Printer size={15} />}
              onClick={handleTestReceipt}
              disabled={testingReceipt || bridgeStatus !== 'online'}
            >
              ⚡ Enviar a Impresora Térmica (ESC/POS)
            </Button>
          </div>

        </div>
      </Modal>

      {/* MODAL 2: VISTA PREVIA COMANDA DE COCINA & EXPORTAR PDF */}
      <Modal
        isOpen={previewKitchenModalOpen}
        onClose={() => setPreviewKitchenModalOpen(false)}
        title="🍳 Vista Previa de Comanda de Cocina & Exportar PDF"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* Ticket Visual Cocina */}
          <div style={{
            width: paperWidth === '58mm' ? '290px' : '360px',
            background: '#ffffff',
            color: '#111827',
            fontFamily: "'Courier New', Courier, monospace, sans-serif",
            fontSize: paperWidth === '58mm' ? '11px' : '12px',
            padding: '20px 16px',
            borderRadius: '6px',
            border: '1px dashed #9ca3af',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            lineHeight: 1.35
          }}>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '13px' }}>*** COMANDA DE COCINA ***</div>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '18px', margin: '4px 0', textTransform: 'uppercase' }}>
              {sampleKitchenOrder.table_number}
            </div>
            <div style={{ borderTop: '2px solid #111827', margin: '6px 0' }} />

            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Orden N°:</span>
                <span style={{ fontWeight: 800 }}>#{sampleKitchenOrder.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Responsable:</span>
                <span>{sampleKitchenOrder.waiter_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hora / Fecha:</span>
                <span>{new Date().toLocaleTimeString('es-CO')} ({new Date().toLocaleDateString('es-CO')})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cliente:</span>
                <span style={{ fontWeight: 700 }}>{sampleKitchenOrder.customer_name}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #111827', textAlign: 'left', fontWeight: 900 }}>
                  <th style={{ paddingBottom: '3px', width: '18%' }}>Cant</th>
                  <th style={{ paddingBottom: '3px' }}>Producto / Notas</th>
                </tr>
              </thead>
              <tbody>
                {sampleKitchenItems.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ fontWeight: 900, fontSize: '15px', padding: '6px 0', verticalAlign: 'top' }}>{it.quantity}x</td>
                    <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>{it.name}</div>
                      {it.modifiers?.map((m, mIdx) => (
                        <div key={mIdx} style={{ fontSize: '11px', color: '#111827', fontWeight: 600 }}>
                          • {m.name}
                        </div>
                      ))}
                      {it.notes && (
                        <div style={{ fontSize: '11px', fontWeight: 800, border: '1px solid #111827', padding: '1px 5px', marginTop: '3px', display: 'inline-block' }}>
                          NOTA: {it.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <div style={{ fontSize: '11px', fontWeight: 700 }}>
              OBSERVACIONES: Mesa VIP - Entregar todo junto
            </div>
            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
              (Comanda Operativa para Producción / Bar / Cocina)
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Download size={15} />}
              onClick={() => printKitchenTicket(sampleKitchenOrder, sampleKitchenItems, { ...settings, enable_silent_printing: false }, paperWidth)}
            >
              📥 Guardar PDF / Imprimir en Navegador
            </Button>
            <Button
              variant="secondary"
              icon={<Printer size={15} />}
              onClick={handleTestKitchen}
              disabled={testingKitchen || bridgeStatus !== 'online'}
            >
              ⚡ Enviar a Impresora Térmica (ESC/POS)
            </Button>
          </div>

        </div>
      </Modal>

    </div>
  );
};
