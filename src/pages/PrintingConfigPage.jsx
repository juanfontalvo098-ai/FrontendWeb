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
  sendToThermalBridge
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

  // 4. Pruebas de Impresión
  const handleTestKitchen = async () => {
    setTestingKitchen(true);
    try {
      const res = await sendTestPrint(printerKitchenName, 'cocina', bridgeUrl);
      if (res && res.success) {
        addToast('Ticket de prueba enviado a la impresora de Cocina', 'success');
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
      const res = await sendTestPrint(printerReceiptName, 'caja', bridgeUrl);
      if (res && res.success) {
        addToast('Factura de prueba enviada a la impresora de Caja', 'success');
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
echo [OK] Iniciando KAMIA Print Bridge en http://localhost:8088...\r
echo.\r
cd /d "%~dp0"\r
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
    addToast('Script iniciar-bridge.bat descargado', 'success');
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
echo   [2/4] Copiando archivos a: %TARGET_DIR%\r
copy /y "%~dp0bridge.js" "%TARGET_DIR%\\bridge.js" >nul\r
copy /y "%~dp0package.json" "%TARGET_DIR%\\package.json" >nul\r
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
