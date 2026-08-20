// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Settings, Store, FileText, Upload, Check, Landmark, Printer, Zap, RefreshCw, AlertCircle, CheckCircle, Download, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { checkPrintBridgeHealth, getPrintBridgePrinters } from '../utils/printUtils';

export const SettingsPage = () => {
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
    const b64Payload = 'IyBHYXN0cm9zUE9TIC0gUHJpbnQgQnJpZGdlIE5hdGl2byBkZSBXaW5kb3dzIChQb3dlclNoZWxsKQokRXJyb3JBY3Rpb25QcmVmZXJlbmNlID0gJ1NpbGVudGx5Q29udGludWUnCgokcG9ydCA9IDgwODgKJGxpc3RlbmVyID0gTmV3LU9iamVjdCBTeXN0ZW0uTmV0Lkh0dHBMaXN0ZW5lcgokbGlzdGVuZXIuUHJlZml4ZXMuQWRkKCJodHRwOi8vbG9jYWxob3N0OiRwb3J0LyIpCgp0cnkgewogICAgJGxpc3RlbmVyLlN0YXJ0KCkKICAgIFdyaXRlLUhvc3QgIltPS10gUHJpbnQgQnJpZGdlIGFjdGl2byBlbiBodHRwOi8vbG9jYWxob3N0OiRwb3J0LyIgLUZvcmVncm91bmRDb2xvciBHcmVlbgp9IGNhdGNoIHsKICAgIFdyaXRlLUhvc3QgIltBVklTT10gUHVlcnRvICRwb3J0IHlhIGFjdGl2byBvIGVuIHVzby4iIC1Gb3JlZ3JvdW5kQ29sb3IgWWVsbG93CiAgICBleGl0IDAKfQoKd2hpbGUgKCR0cnVlKSB7CiAgICB0cnkgewogICAgICAgICRjb250ZXh0ID0gJGxpc3RlbmVyLkdldENvbnRleHQoKQogICAgICAgICRyZXEgPSAkY29udGV4dC5SZXF1ZXN0CiAgICAgICAgJHJlcyA9ICRjb250ZXh0LlJlc3BvbnNlCgogICAgICAgICRyZXMuSGVhZGVycy5BZGQoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJykKICAgICAgICAkcmVzLkhlYWRlcnMuQWRkKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgT1BUSU9OUycpCiAgICAgICAgJHJlcy5IZWFkZXJzLkFkZCgnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKQoKICAgICAgICBpZiAoJHJlcS5IdHRwTWV0aG9kIC1lcSAnT1BUSU9OUycpIHsKICAgICAgICAgICAgJHJlcy5TdGF0dXNDb2RlID0gMjA0CiAgICAgICAgICAgICRyZXMuQ2xvc2UoKQogICAgICAgICAgICBjb250aW51ZQogICAgICAgIH0KCiAgICAgICAgJHBhdGggPSAkcmVxLlVybC5BYnNvbHV0ZVBhdGgKCiAgICAgICAgaWYgKCRyZXEuSHR0cE1ldGhvZCAtZXEgJ0dFVCcgLWFuZCAoJHBhdGggLWVxICcvaGVhbHRoJyAtb3IgJHBhdGggLWVxICcvJykpIHsKICAgICAgICAgICAgJGpzb24gPSAneyJzdGF0dXMiOiJvbmxpbmUiLCJzZXJ2aWNlIjoiR2FzdHJvc1BPUyBOYXRpdmUgUHJpbnQgQnJpZGdlIiwicG9ydCI6ODA4OCwidmVyc2lvbiI6IjEuMC4wIn0nCiAgICAgICAgICAgICRidWYgPSBbU3lzdGVtLlRleHQuRW5jb2RpbmddOjpVVEY4LkdldEJ5dGVzKCRqc29uKQogICAgICAgICAgICAkcmVzLkNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnCiAgICAgICAgICAgICRyZXMuQ29udGVudExlbmd0aDY0ID0gJGJ1Zi5MZW5ndGgKICAgICAgICAgICAgJHJlcy5PdXRwdXRTdHJlYW0uV3JpdGUoJGJ1ZiwgMCwgJGJ1Zi5MZW5ndGgpCiAgICAgICAgICAgICRyZXMuQ2xvc2UoKQogICAgICAgICAgICBjb250aW51ZQogICAgICAgIH0KCiAgICAgICAgaWYgKCRyZXEuSHR0cE1ldGhvZCAtZXEgJ0dFVCcgLWFuZCAkcGF0aCAtZXEgJy9wcmludGVycycpIHsKICAgICAgICAgICAgJHBMaXN0ID0gQCgpCiAgICAgICAgICAgIHRyeSB7CiAgICAgICAgICAgICAgICAkcHJpbnRlcnMgPSBHZXQtQ2ltSW5zdGFuY2UgV2luMzJfUHJpbnRlciAtRXJyb3JBY3Rpb24gU2lsZW50bHlDb250aW51ZSB8IFNlbGVjdC1PYmplY3QgTmFtZSwgRGVmYXVsdCwgUG9ydE5hbWUKICAgICAgICAgICAgICAgIGZvcmVhY2ggKCRwIGluICRwcmludGVycykgewogICAgICAgICAgICAgICAgICAgICRwTGlzdCArPSBAewogICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gW3N0cmluZ10kcC5OYW1lCiAgICAgICAgICAgICAgICAgICAgICAgIGlzRGVmYXVsdCA9IFtib29sXSRwLkRlZmF1bHQKICAgICAgICAgICAgICAgICAgICAgICAgcG9ydCA9IFtzdHJpbmddJHAuUG9ydE5hbWUKICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0gY2F0Y2gge30KICAgICAgICAgICAgJGpzb25PYmogPSBAeyBwcmludGVycyA9ICRwTGlzdCB9CiAgICAgICAgICAgICRqc29uID0gQ29udmVydFRvLUpzb24gJGpzb25PYmoKICAgICAgICAgICAgJGJ1ZiA9IFtTeXN0ZW0uVGV4dC5FbmNvZGluZ106OlVURjguR2V0Qnl0ZXMoJGpzb24pCiAgICAgICAgICAgICRyZXMuQ29udGVudFR5cGUgPSAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcKICAgICAgICAgICAgJHJlcy5Db250ZW50TGVuZ3RoNjQgPSAkYnVmLkxlbmd0aAogICAgICAgICAgICAkcmVzLk91dHB1dFN0cmVhbS5Xcml0ZSgkYnVmLCAwLCAkYnVmLkxlbmd0aCkKICAgICAgICAgICAgJHJlcy5DbG9zZSgpCiAgICAgICAgICAgIGNvbnRpbnVlCiAgICAgICAgfQoKICAgICAgICBpZiAoJHJlcS5IdHRwTWV0aG9kIC1lcSAnUE9TVCcgLWFuZCAkcGF0aCAtZXEgJy9wcmludCcpIHsKICAgICAgICAgICAgJHJlYWRlciA9IE5ldy1PYmplY3QgU3lzdGVtLklPLlN0cmVhbVJlYWRlcigkcmVxLklucHV0U3RyZWFtLCBbU3lzdGVtLlRleHQuRW5jb2RpbmddOjpVVEY4KQogICAgICAgICAgICAkYm9keSA9ICRyZWFkZXIuUmVhZFRvRW5kKCkKICAgICAgICAgICAgJHBheWxvYWQgPSBDb252ZXJ0RnJvbS1Kc29uICRib2R5CiAgICAgICAgICAgICR0ZXh0VG9QcmludCA9ICRwYXlsb2FkLnRleHQKICAgICAgICAgICAgJHByaW50ZXJOYW1lID0gJHBheWxvYWQucHJpbnRlck5hbWUKCiAgICAgICAgICAgIGlmICghW3N0cmluZ106OklzTnVsbE9yV2hpdGVTcGFjZSgkdGV4dFRvUHJpbnQpKSB7CiAgICAgICAgICAgICAgICAkdGVtcEZpbGUgPSBbU3lzdGVtLklPLlBhdGhdOjpDb21iaW5lKFtTeXN0ZW0uSU8uUGF0aF06OkdldFRlbXBQYXRoKCksICJwb3NfdGlja2V0XyQoW1N5c3RlbS5HdWlkXTo6TmV3R3VpZCgpLlRvU3RyaW5nKCdOJykpLnR4dCIpCiAgICAgICAgICAgICAgICBbU3lzdGVtLklPLkZpbGVdOjpXcml0ZUFsbFRleHQoJHRlbXBGaWxlLCAkdGV4dFRvUHJpbnQgKyAiYHJgbmByYG5gcmBuYHJgbiIsIFtTeXN0ZW0uVGV4dC5FbmNvZGluZ106OlVURjgpCiAgICAgICAgICAgICAgICB0cnkgewogICAgICAgICAgICAgICAgICAgIGlmICghW3N0cmluZ106OklzTnVsbE9yV2hpdGVTcGFjZSgkcHJpbnRlck5hbWUpKSB7CiAgICAgICAgICAgICAgICAgICAgICAgIEdldC1Db250ZW50IC1QYXRoICR0ZW1wRmlsZSAtRW5jb2RpbmcgdXRmOCB8IE91dC1QcmludGVyIC1OYW1lICRwcmludGVyTmFtZS5UcmltKCkKICAgICAgICAgICAgICAgICAgICB9IGVsc2UgewogICAgICAgICAgICAgICAgICAgICAgICBHZXQtQ29udGVudCAtUGF0aCAkdGVtcEZpbGUgLUVuY29kaW5nIHV0ZjggfCBPdXQtUHJpbnRlcgogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICBSZW1vdmUtSXRlbSAkdGVtcEZpbGUgLUZvcmNlIC1FcnJvckFjdGlvbiBTaWxlbnRseUNvbnRpbnVlCiAgICAgICAgICAgICAgICB9IGNhdGNoIHsKICAgICAgICAgICAgICAgICAgICBSZW1vdmUtSXRlbSAkdGVtcEZpbGUgLUZvcmNlIC1FcnJvckFjdGlvbiBTaWxlbnRseUNvbnRpbnVlCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KCiAgICAgICAgICAgICRidWYgPSBbU3lzdGVtLlRleHQuRW5jb2RpbmddOjpVVEY4LkdldEJ5dGVzKCd7InN1Y2Nlc3MiOnRydWV9JykKICAgICAgICAgICAgJHJlcy5Db250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04JwogICAgICAgICAgICAkcmVzLkNvbnRlbnRMZW5ndGg2NCA9ICRidWYuTGVuZ3RoCiAgICAgICAgICAgICRyZXMuT3V0cHV0U3RyZWFtLldyaXRlKCRidWYsIDAsICRidWYuTGVuZ3RoKQogICAgICAgICAgICAkcmVzLkNsb3NlKCkKICAgICAgICAgICAgY29udGludWUKICAgICAgICB9CgogICAgICAgICRyZXMuU3RhdHVzQ29kZSA9IDQwNAogICAgICAgICRyZXMuQ2xvc2UoKQogICAgfSBjYXRjaCB7CiAgICAgICAgdHJ5IHsgJHJlcy5DbG9zZSgpIH0gY2F0Y2gge30KICAgIH0KfQo=';

    const batContent = `@echo off\r
title GastrosPOS - Instalador de Impresion Directa Silenciosa\r
color 0A\r
cls\r
echo ======================================================================\r
echo          GASTROSPOS - INSTALADOR DE IMPRESION DIRECTA SILENCIOSA\r
echo ======================================================================\r
echo.\r
echo   [1/3] Creando directorio del agente en el equipo...\r
set "TARGET_DIR=%LOCALAPPDATA%\\GastrosPOS\\PrintBridge"\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
echo   [2/3] Instalando motor de impresion termica nativo...\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b64 = '${b64Payload}'; [System.IO.File]::WriteAllBytes('%TARGET_DIR%\\bridge.ps1', [System.Convert]::FromBase64String($b64))"\r
echo   [3/3] Configurando inicio automatico e invisible con Windows...\r
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"\r
set "VBS_PATH=%STARTUP_FOLDER%\\GastrosPOS_PrintBridge.vbs"\r
> "%VBS_PATH%" echo Set WshShell = CreateObject("WScript.Shell")\r
>> "%VBS_PATH%" echo WshShell.Run "powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File ""%TARGET_DIR%\\bridge.ps1""", 0, False\r
>> "%VBS_PATH%" echo Set WshShell = Nothing\r
wscript "%VBS_PATH%"\r
echo.\r
echo ======================================================================\r
echo    INSTALACION COMPLETADA EXITOSAMENTE (TODO EN UNO)\r
echo ======================================================================\r
echo.\r
echo   [OK] El Print Bridge ya esta activo en segundo plano (Puerto: 8088).\r
echo   [OK] Se ejecutara automaticamente cada vez que enciendas la PC.\r
echo   [OK] Ya puedes imprimir tickets termicos sin cuadros de dialogo.\r
echo.\r
echo ======================================================================\r
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

          {/* Impresión Silenciosa Directa & Auto-Impresión Remota */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} color="#10b981" /> Impresión Directa Silenciosa (Print Bridge con .bat) & Auto-Impresión
              </h3>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button type="button" size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={testBridgeConnection}>
                  Detectar Impresoras
                </Button>
                <Button type="button" size="sm" variant="primary" icon={<Download size={14} />} onClick={downloadUnifiedInstallerBat}>
                  Instalar Print Bridge (.bat)
                </Button>
                <Button type="button" size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={downloadUninstallerBat}>
                  Desinstalar Print Bridge (.bat)
                </Button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Switch 1: Impresión Silenciosa */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={enableSilentPrinting}
                    onChange={(e) => setEnableSilentPrinting(e.target.checked)}
                    style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ fontSize: '13px' }}>Habilitar Impresión Silenciosa Directa (ESC/POS)</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Imprime comandas y facturas de inmediato a la impresora térmica sin abrir la ventana ni cuadro de diálogo de Windows.
                    </div>
                  </div>
                </label>

                {/* Switch 2: Auto-imprimir comanda desde celular */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={autoPrintKitchenTickets}
                    onChange={(e) => setAutoPrintKitchenTickets(e.target.checked)}
                    style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ fontSize: '13px' }}>Auto-imprimir comandas enviadas desde celulares de meseros</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Cuando una mesera presione "Enviar a Cocina" desde su teléfono, la comanda saldrá expulsada automáticamente en esta estación/computador.
                    </div>
                  </div>
                </label>

                {/* Switch 3: Auto-imprimir factura al cobrar */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={autoPrintInvoices}
                    onChange={(e) => setAutoPrintInvoices(e.target.checked)}
                    style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ fontSize: '13px' }}>Auto-imprimir recibo de factura al cerrar/cobrar orden</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Imprime el recibo automáticamente apenas se procese el pago en la caja.
                    </div>
                  </div>
                </label>

              </div>
            </div>

            {/* Selección Inteligente de Impresoras Detectadas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <Select 
                  label="Impresora de Cocina / Bar (Térmica)"
                  value={printerKitchenName}
                  onChange={(e) => setPrinterKitchenName(e.target.value)}
                  options={printerOptions}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {detectedPrinters.length > 0 ? `${detectedPrinters.length} impresoras detectadas en Windows` : 'Abre el Print Bridge para listar automáticamente tus impresoras'}
                </div>
              </div>

              <div>
                <Select 
                  label="Impresora de Caja / Facturación (Térmica)"
                  value={printerReceiptName}
                  onChange={(e) => setPrinterReceiptName(e.target.value)}
                  options={printerOptions}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {detectedPrinters.length > 0 ? `${detectedPrinters.length} impresoras detectadas en Windows` : 'Abre el Print Bridge para listar automáticamente tus impresoras'}
                </div>
              </div>
            </div>

            {/* Estado del bridge */}
            <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', background: bridgeStatus === 'online' ? 'rgba(16, 185, 129, 0.12)' : (bridgeStatus === 'offline' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-primary)'), border: '1px solid var(--border-color)' }}>
              {bridgeStatus === 'online' && (
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <CheckCircle size={17} /> Print Bridge activo y en línea. Impresoras listas: {detectedPrinters.map(p => p.name).join(', ') || 'Impresora Predeterminada de Windows'}.
                </div>
              )}
              {bridgeStatus === 'offline' && (
                <div style={{ color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Print Bridge no detectado en esta computadora.</strong>
                    <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>
                      Haz clic en <strong>"Instalar Print Bridge (.bat)"</strong> y ábrelo con doble clic. Se configurará e iniciará automáticamente en segundo plano para encender siempre con Windows (sin instalar Node.js ni programas adicionales).
                    </div>
                  </div>
                </div>
              )}
              {!bridgeStatus && (
                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Para activar la impresión directa sin ventanas de Windows, haz clic en <strong>"Instalar Print Bridge (.bat)"</strong>.
                </div>
              )}
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


