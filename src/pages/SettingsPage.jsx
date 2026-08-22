// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Store, FileText, Upload, Check, Landmark, Printer, Zap, RefreshCw, AlertCircle, CheckCircle, Download, Trash2, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  const [businessName, setBusinessName] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxRegime, setTaxRegime] = useState('impoconsumo');
  const [printTaxRegime, setPrintTaxRegime] = useState(true);
  const [customTaxRegimeText, setCustomTaxRegimeText] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('FAC');
  const [economicActivityCode, setEconomicActivityCode] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultPaperWidth, setDefaultPaperWidth] = useState('80mm');

  // Impresión Silenciosa Directa (Print Bridge)
  const [enableSilentPrinting, setEnableSilentPrinting] = useState(false);
  const [autoPrintKitchenTickets, setAutoPrintKitchenTickets] = useState(false);
  const [autoPrintInvoices, setAutoPrintInvoices] = useState(false);
  const [silentPrintBridgeUrl, setSilentPrintBridgeUrl] = useState('http://localhost:8088');
  const [printerKitchenName, setPrinterKitchenName] = useState('');
  const [printerReceiptName, setPrinterReceiptName] = useState('');
  const [bridgeStatus, setBridgeStatus] = useState('unknown'); // 'online', 'offline', 'testing', 'unknown'
  const [detectedPrinters, setDetectedPrinters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/settings');
        setBusinessName(data.business_name || '');
        setNit(data.nit || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setTaxRegime(data.tax_regime || 'impoconsumo');
        setPrintTaxRegime(data.print_tax_regime !== false);
        setCustomTaxRegimeText(data.custom_tax_regime_text || '');
        setInvoicePrefix(data.invoice_prefix || 'FAC');
        setEconomicActivityCode(data.economic_activity_code || '');
        setReceiptFooter(data.receipt_footer || '');
        setLogoUrl(data.logo_url || '');
        setDefaultPaperWidth(data.default_paper_width || '80mm');

        setEnableSilentPrinting(Boolean(data.enable_silent_printing));
        setAutoPrintKitchenTickets(Boolean(data.auto_print_kitchen_tickets));
        setAutoPrintInvoices(Boolean(data.auto_print_invoices));
        setSilentPrintBridgeUrl(data.silent_print_bridge_url || 'http://localhost:8088');
        setPrinterKitchenName(data.printer_kitchen_name || '');
        setPrinterReceiptName(data.printer_receipt_name || '');
      } catch (err) {
        addToast('Error al cargar la configuración', 'danger');
      } finally {
        setLoading(false);
      }

      // Probar si el print bridge está activo
      const health = await checkPrintBridgeHealth(silentPrintBridgeUrl);
      if (health.online) {
        setBridgeStatus('online');
        const printers = await getPrintBridgePrinters(silentPrintBridgeUrl);
        setDetectedPrinters(printers);
      } else {
        setBridgeStatus('offline');
      }
    })();
  }, []);

  const testBridgeConnection = async () => {
    setBridgeStatus('testing');
    const health = await checkPrintBridgeHealth(silentPrintBridgeUrl);
    if (health.online) {
      setBridgeStatus('online');
      const printers = await getPrintBridgePrinters(silentPrintBridgeUrl);
      setDetectedPrinters(printers);
      addToast(`¡Print Bridge conectado! Se detectaron ${printers.length} impresoras en Windows.`, 'success');
    } else {
      setBridgeStatus('offline');
      setDetectedPrinters([]);
      addToast('No se pudo contactar con el Print Bridge. Abre iniciar-impresora.bat en esta PC.', 'warning');
    }
  };

  // Descargar el instalador todo-en-uno que configura e inicia el Print Bridge automáticamente con Windows
  const downloadUnifiedInstallerBat = () => {
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
:: 1. Verificar Node.js\r
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
    echo.\r
    echo   [ERROR] No se pudo descargar bridge.js.\r
    echo   URL: ${downloadUrl}\r
    echo   Verifica tu conexion a internet e intenta nuevamente.\r
    echo.\r
    pause\r
    exit /b 1\r
)\r
echo   [2/4] Archivos del puente instalados en: %TARGET_DIR%\r
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
:: 6. Iniciar el servicio inmediatamente en segundo plano\r
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
echo   [OK] Ya puedes imprimir tickets termicos de forma directa y silenciosa.\r
echo.\r
echo Presiona cualquier tecla para cerrar esta ventana...\r
pause >nul\r
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instalar-print-bridge.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Instalador instalar-print-bridge.bat descargado', 'success');
  };

  // Descargar el desinstalador que detiene el servicio y elimina todos los archivos y el inicio automático
  const downloadUninstallerBat = () => {
    const batContent = `@echo off\r
title GastrosPOS - Desinstalador de Print Bridge\r
color 0C\r
cls\r
echo ======================================================================\r
echo           GASTROSPOS - DESINSTALADOR DE PRINT BRIDGE\r
echo ======================================================================\r
echo.\r
echo   [1/3] Deteniendo procesos de Print Bridge en ejecucion...\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; try { Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*PrintBridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } catch {}"\r
echo   [2/3] Eliminando inicio automatico con Windows...\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
set "VBS_PATH=%STARTUP_FOLDER%\\GastrosPOS_PrintBridge.vbs"\r
if exist "%VBS_PATH%" (\r
    del /f /q "%VBS_PATH%"\r
    echo   [OK] Archivo GastrosPOS_PrintBridge.vbs eliminado del inicio de Windows.\r
) else (\r
    echo   [OK] No se encontro archivo de inicio automatico.\r
)\r
echo   [3/3] Eliminando archivos y directorio del agente...\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if exist "%TARGET_DIR%" (\r
    rmdir /s /q "%TARGET_DIR%"\r
    echo   [OK] Carpeta PrintBridge eliminada de AppData.\r
) else (\r
    echo   [OK] Carpeta PrintBridge no existia.\r
)\r
echo.\r
echo ======================================================================\r
echo    PRINT BRIDGE DESINSTALADO Y ELIMINADO EXITOSAMENTE\r
echo ======================================================================\r
echo.\r
echo   [OK] El servicio local (Puerto 8088) ha sido detenido.\r
echo   [OK] Se elimino el inicio automatico con Windows.\r
echo   [OK] Se eliminaron todos los scripts y archivos del sistema.\r
echo.\r
echo ======================================================================\r
echo Presiona cualquier tecla para cerrar esta ventana...\r
pause >nul\r
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desinstalar-print-bridge.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Desinstalador desinstalar-print-bridge.bat descargado', 'info');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.post('/upload', {
          filename: file.name,
          base64: reader.result
        });
        setLogoUrl(res.url);
        addToast('Logo subido e instalado en el servidor', 'success');
      } catch (err) {
        addToast('Error al subir la imagen del logo', 'danger');
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put('/settings', {
        business_name: businessName,
        nit,
        address,
        phone,
        tax_regime: taxRegime,
        print_tax_regime: printTaxRegime,
        custom_tax_regime_text: customTaxRegimeText,
        invoice_prefix: invoicePrefix.trim().toUpperCase(),
        economic_activity_code: economicActivityCode,
        receipt_footer: receiptFooter,
        logo_url: logoUrl,
        default_paper_width: defaultPaperWidth,
        enable_silent_printing: enableSilentPrinting,
        auto_print_kitchen_tickets: autoPrintKitchenTickets,
        auto_print_invoices: autoPrintInvoices,
        silent_print_bridge_url: silentPrintBridgeUrl.trim(),
        printer_kitchen_name: printerKitchenName.trim(),
        printer_receipt_name: printerReceiptName.trim()
      });
      addToast('Configuración del negocio guardada exitosamente', 'success');
    } catch (err) {
      addToast(err.message || 'Error al guardar la configuración', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Construcción de opciones dinámicas para el select de impresoras
  const printerOptions = [
    { value: '', label: 'Impresora Predeterminada de Windows' },
    ...detectedPrinters.map(p => ({
      value: p.name,
      label: p.isDefault ? `${p.name} (Predeterminada)` : p.name
    }))
  ];

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando parámetros del negocio...</div>;
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card header="Configuración General del Negocio & Facturación">
        <form onSubmit={handleSaveSettings}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={18} color="var(--accent-primary)" /> Identificación del Establecimiento
            </h3>
            
            <Input 
              label="Nombre Comercial del Negocio" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)} 
              placeholder="Ej. Mi Restaurante Gourmet"
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input 
                label="NIT / Cédula Fiscal" 
                value={nit} 
                onChange={(e) => setNit(e.target.value)} 
                placeholder="Ej. 900.123.456-7"
                required
              />
              <Input 
                label="Teléfono de Contacto" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Ej. (604) 444-5566"
              />
            </div>

            <Input 
              label="Dirección del Establecimiento" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Ej. Calle 10 # 43-12, Medellín"
            />
          </div>

          {/* Régimen Tributario y Responsabilidad Fiscal */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={18} color="var(--accent-secondary)" /> Responsabilidad Tributaria & Régimen Fiscal
              </h3>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600 }}>
                <input 
                  type="checkbox"
                  checked={printTaxRegime}
                  onChange={(e) => setPrintTaxRegime(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>Imprimir en el encabezado del ticket</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <Select 
                label="Responsabilidad de Impuestos" 
                value={taxRegime} 
                onChange={(e) => setTaxRegime(e.target.value)}
                options={[
                  { value: 'impoconsumo', label: 'Responsable de Impuesto Nacional al Consumo (INC 8%)' },
                  { value: 'iva', label: 'Responsable de IVA (Régimen Común)' },
                  { value: 'no_responsable', label: 'No Responsable de IVA / Impoconsumo (Régimen Simplificado)' },
                  { value: 'ambos', label: 'Responsable de IVA e Impuesto al Consumo (8%)' },
                  { value: 'rst', label: 'Régimen Simple de Tributación (RST)' },
                  { value: 'personalizado', label: 'Texto Personalizado / Otro' }
                ]}
              />
              <Input 
                label="Código Actividad Económica (CIIU)" 
                value={economicActivityCode} 
                onChange={(e) => setEconomicActivityCode(e.target.value)} 
                placeholder="Ej. 5611 (Restaurantes)"
              />
            </div>

            {taxRegime === 'personalizado' && (
              <div style={{ marginTop: '10px' }}>
                <Input 
                  label="Texto Personalizado de Responsabilidad Tributaria *"
                  value={customTaxRegimeText}
                  onChange={(e) => setCustomTaxRegimeText(e.target.value)}
                  placeholder="Ej. Responsable de INC tarifa 8% - Matrícula Mercantil 12345"
                  required={taxRegime === 'personalizado'}
                />
              </div>
            )}

            {/* Vista previa en tiempo real */}
            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Encabezado en Factura/Ticket: </span>
              {printTaxRegime ? (
                <strong style={{ color: '#10b981' }}>
                  {customTaxRegimeText.trim() ? customTaxRegimeText.trim() : (
                    taxRegime === 'impoconsumo' ? 'Impoconsumo (INC 8%)' :
                    taxRegime === 'iva' ? 'Responsable de IVA' :
                    taxRegime === 'no_responsable' ? 'No Responsable de IVA' :
                    taxRegime === 'ambos' ? 'Responsable de IVA e INC (8%)' :
                    taxRegime === 'rst' ? 'Régimen Simple de Tributación (RST)' :
                    'Impoconsumo (INC 8%)'
                  )}
                </strong>
              ) : (
                <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                  (No se imprimirá en el encabezado)
                </span>
              )}
            </div>
          </div>

          {/* Personalización de Tickets y Factura */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-primary)" /> Personalización de la Factura y Tickets
            </h3>

            {/* Subida de Archivo de Logo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Logo del Negocio (Subir archivo de imagen al servidor)
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                  id="logo-file-input" 
                />
                <label htmlFor="logo-file-input" style={{ cursor: 'pointer' }}>
                  <Button type="button" variant="secondary" size="sm" icon={<Upload size={14} />} loading={uploadingLogo} onClick={() => document.getElementById('logo-file-input').click()}>
                    Subir Imagen de Logo
                  </Button>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>O ingresa URL:</span>
              </div>
              <Input 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                placeholder="http://localhost:3001/uploads/mi-logo.png"
                style={{ marginTop: '8px' }}
              />
            </div>

            {logoUrl && (
              <div style={{ marginBottom: '16px', background: 'white', padding: '12px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-color)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#666', fontWeight: 600, marginBottom: '4px' }}>Logo actual de este negocio:</div>
                  <img src={logoUrl} alt="Logo Prev" style={{ maxHeight: '55px', maxWidth: '160px', objectFit: 'contain', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <Button type="button" variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => { setLogoUrl(''); addToast('Logo retirado. Guarda los cambios para aplicar.', 'info'); }}>
                  Eliminar Logo
                </Button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
              <div>
                <Input 
                  label="Prefijo de Numeración de Factura" 
                  value={invoicePrefix} 
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())} 
                  placeholder="Ej. FAC, POS, ICH..."
                  maxLength={10}
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Ejemplo de factura: <strong style={{ color: 'var(--accent-primary)' }}>{invoicePrefix.trim() ? invoicePrefix.trim().toUpperCase() : 'FAC'}-0001</strong>
                </div>
              </div>

              <Select 
                label="Ancho de Papel Térmico por Defecto" 
                value={defaultPaperWidth} 
                onChange={(e) => setDefaultPaperWidth(e.target.value)}
                options={[
                  { value: '80mm', label: '80mm (Estándar POS)' },
                  { value: '58mm', label: '58mm (Portátil / Tira angosta)' }
                ]}
              />
            </div>

            <Input 
              label="Mensaje o Leyenda al pie del Recibo" 
              value={receiptFooter} 
              onChange={(e) => setReceiptFooter(e.target.value)} 
              placeholder="Ej. ¡Gracias por su visita! Vuelva pronto."
              style={{ marginTop: '10px' }}
            />
          </div>

          {/* Tarjeta de Acceso a Configuración de Impresión */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Printer size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>
                    Configuración de Impresión Térmica & Print Bridge (Node.js)
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Asignación de impresoras de Cocina/Caja, formato 80mm/58mm, instalador de Node.js y pruebas en vivo.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                icon={<ArrowRight size={15} />}
                onClick={() => navigate('/configuracion-impresion')}
              >
                Abrir Configuración de Impresión
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button type="submit" loading={submitting} icon={<Check size={16} />}>
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};


