// src/pages/PrintingConfigPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Printer, RefreshCw, CheckCircle, AlertCircle, Download,
  Play, Trash2, Cpu, FileText, Check, UtensilsCrossed,
  Receipt, DollarSign, Settings, ShieldCheck, Sparkles, ExternalLink,
  Eye, Laptop, MonitorCheck, HelpCircle, Server, FolderDown, Zap
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api, formatCOP, formatDateTime } from '../api/client';
import { useUiStore } from '../store/uiStore';
import {
  openCashDrawer,
  printInvoiceReceipt,
  printKitchenTicket,
  printThermalDocument,
  checkPrintBridgeHealth,
  getPrintBridgePrinters,
  sendTestPrint,
  DEFAULT_BRIDGE_URL
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
  const [silentPrintBridgeUrl, setSilentPrintBridgeUrl] = useState(DEFAULT_BRIDGE_URL);

  // Estado en vivo del KAMIA Print Bridge (Puerto 8182)
  const [bridgeStatus, setBridgeStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [bridgeInfo, setBridgeInfo] = useState(null);
  const [activeBridgeUrl, setActiveBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
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
      setPaperWidth(data.paper_width || data.default_paper_width || '80mm');
      setOpenDrawerOnPayment(data.open_drawer_on_payment !== undefined ? !!data.open_drawer_on_payment : true);
      setSilentPrintBridgeUrl(data.silent_print_bridge_url || DEFAULT_BRIDGE_URL);
    } catch (err) {
      addToast('Error al cargar configuración de impresión: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // 2. Probar conexión en vivo con KAMIA Print Bridge (Puerto 8182)
  const testBridgeConnection = async (targetUrl = null) => {
    setBridgeStatus('checking');
    const url = targetUrl || silentPrintBridgeUrl || DEFAULT_BRIDGE_URL;
    try {
      const health = await checkPrintBridgeHealth(url);
      if (health.online) {
        setBridgeStatus('connected');
        setBridgeInfo(health.data);
        setActiveBridgeUrl(health.activeUrl || url);
        const printers = await getPrintBridgePrinters(health.activeUrl || url);
        setDetectedPrinters(printers);
        addToast(`🟢 Print Bridge conectado en ${health.activeUrl || url}`, 'success');
      } else {
        setBridgeStatus('disconnected');
        setBridgeInfo(null);
        setDetectedPrinters([]);
      }
    } catch (e) {
      setBridgeStatus('disconnected');
      setBridgeInfo(null);
      setDetectedPrinters([]);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      testBridgeConnection(silentPrintBridgeUrl);
    }
  }, [loading, silentPrintBridgeUrl]);

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
        default_paper_width: paperWidth,
        open_drawer_on_payment: openDrawerOnPayment,
        silent_print_bridge_url: silentPrintBridgeUrl.trim() || DEFAULT_BRIDGE_URL
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

  // 4. Descarga Directa del Instalador de Print Bridge
  const downloadFile = (filename, content, mime = 'application/x-bat') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInstaller = () => {
    // Intentar descarga directa desde el servidor backend
    const backendUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+api\/?$/, '');
    const directUrl = `${backendUrl}/print-bridge/Instalar_Print_Bridge_KAMIA.bat`;

    const a = document.createElement('a');
    a.href = directUrl;
    a.download = 'Instalar_Print_Bridge_KAMIA.bat';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast('📥 Descargando instalador automático para Windows...', 'info');
  };

  const handleDownloadRunner = () => {
    const backendUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+api\/?$/, '');
    const directUrl = `${backendUrl}/print-bridge/Iniciar_Print_Bridge.bat`;

    const a = document.createElement('a');
    a.href = directUrl;
    a.download = 'Iniciar_Print_Bridge.bat';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast('📥 Descargando script de inicio rápido...', 'info');
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

  // 5. Pruebas de Impresión con Formato Real y Silencioso
  const handleTestKitchen = async () => {
    setTestingKitchen(true);
    try {
      const res = await sendTestPrint(printerKitchenName || null, 'cocina', silentPrintBridgeUrl);
      if (res && res.success) {
        addToast(`✅ Comanda de prueba enviada a "${printerKitchenName || 'Predeterminada'}"`, 'success');
      } else {
        await printKitchenTicket(
          sampleKitchenOrder,
          sampleKitchenItems,
          { ...settings, enable_silent_printing: false },
          paperWidth
        );
        addToast('Comanda enviada a diálogo de impresión (Modo Fallback)', 'info');
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
      const res = await sendTestPrint(printerReceiptName || null, 'caja', silentPrintBridgeUrl);
      if (res && res.success) {
        addToast(`✅ Factura de prueba enviada a "${printerReceiptName || 'Predeterminada'}"`, 'success');
      } else {
        await printInvoiceReceipt(sampleInvoice, { ...settings, enable_silent_printing: false }, paperWidth);
        addToast('Factura enviada a diálogo de impresión (Modo Fallback)', 'info');
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
      const res = await openCashDrawer(printerReceiptName, silentPrintBridgeUrl);
      if (res && res.success) {
        addToast('💵 Pulso de apertura enviado al cajón monedero (RJ11)', 'success');
      } else {
        addToast(res?.error || 'Verifica que el cajón esté conectado al puerto RJ11 de la impresora térmica', 'warning');
      }
    } catch (e) {
      addToast('Error al probar gaveta: ' + e.message, 'danger');
    } finally {
      setTestingDrawer(false);
    }
  };

  // Opciones de impresoras detectadas
  const printerOptions = [
    { value: '', label: '🖨️ Impresora Predeterminada de Windows' },
    ...detectedPrinters.map(p => {
      const name = typeof p === 'string' ? p : p.name;
      const isDef = p.isDefault ? ' (Predeterminada)' : '';
      return { value: name, label: `🖨️ ${name}${isDef}` };
    })
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
            Servidor de Impresión Térmica Directa (Puerto 8182)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Impresión silenciosa de alta velocidad sin cuadros de diálogo, corte automático de papel y recepción de comandas desde celulares.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={() => testBridgeConnection()}
          >
            Re-Escanear Impresoras
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

      {/* MONITOR EN VIVO: ESTADO DEL PRINT BRIDGE (PUERTO 8182) */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: bridgeStatus === 'connected' ? 'rgba(4, 120, 87, 0.15)' : 'rgba(220, 38, 38, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: bridgeStatus === 'connected' ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              <Server size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  KAMIA Thermal Print Bridge v2.0
                </h3>
                <Badge variant={bridgeStatus === 'connected' ? 'success' : (bridgeStatus === 'checking' ? 'warning' : 'danger')}>
                  {bridgeStatus === 'connected' ? '🟢 Conectado y Listo' : (bridgeStatus === 'checking' ? '🟡 Verificando...' : '🔴 Desconectado')}
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {bridgeStatus === 'connected' ? (
                  <span>
                    Servicio activo en <strong>{activeBridgeUrl}</strong> &bull; <strong>{detectedPrinters.length}</strong> impresoras de Windows detectadas &bull; Modo 100% Silencioso (ESC/POS)
                  </span>
                ) : (
                  <span>
                    El servidor Print Bridge no está en ejecución en este equipo. Descarga e instala el agente abajo para activar la impresión silenciosa.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw size={14} />}
              onClick={() => testBridgeConnection()}
            >
              🔄 Verificar Estado
            </Button>
          </div>

        </div>
      </Card>

      {/* SECCIÓN DE DESCARGA E INSTALACIÓN DIRECTA DESDE LA WEB */}
      <Card style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(16, 185, 129, 0.06))', border: '1.5px solid rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderDown size={20} color="var(--accent-primary)" />
              Descargar Agente de Impresión Térmica para Windows
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, maxWidth: '750px', lineHeight: '1.5' }}>
              ¿Estás en un computador nuevo o no tienes el servidor de impresión instalado? Descarga el instalador con un solo clic. Funciona en Windows 10/11 con o sin Node.js instalado (incluye motor nativo de Windows).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={handleDownloadInstaller}
              style={{ fontWeight: 800 }}
            >
              📥 Descargar Instalador (.bat)
            </Button>
            <Button
              variant="secondary"
              icon={<Play size={14} />}
              onClick={handleDownloadRunner}
            >
              Inicio Rápido (.bat)
            </Button>
          </div>
        </div>

        {/* Pasos de Instalación */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '16px' }}>
          
          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>1</span>
              Descarga el Instalador
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Haz clic en el botón <strong style={{ color: 'var(--text-primary)' }}>"Descargar Instalador (.bat)"</strong> arriba.
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>2</span>
              Ejecútalo en tu Computador
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Abre el archivo descargado en la PC donde está conectada la impresora térmica USB.
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>3</span>
              ¡Listo para Imprimir!
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              El monitor cambiará a <strong style={{ color: 'var(--accent-success)' }}>🟢 Conectado</strong> y se iniciará solo con Windows.
            </div>
          </div>

        </div>
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

            {/* URL del Bridge */}
            <div>
              <Input
                label="🌐 URL del Servidor Print Bridge"
                value={silentPrintBridgeUrl}
                onChange={(e) => setSilentPrintBridgeUrl(e.target.value)}
                placeholder="http://localhost:8182"
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Por defecto: <strong>http://localhost:8182</strong> (también prueba 127.0.0.1 automáticamente).
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
                  📄 80 mm (Estándar POS)
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
                  📄 58 mm (Portátil / Tira)
                </button>
              </div>
            </div>

          </div>
        </Card>

        {/* PARÁMETROS DE AUTO-IMPRESIÓN */}
        <Card style={{ padding: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={17} color="var(--accent-primary)" />
            Automatizaciones de Impresión
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
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
                  Envía el ticket instantáneamente a la impresora térmica sin abrir cuadros de diálogo del navegador.
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
                  Cuando un mesero presione "Enviar a Cocina" desde su teléfono, la comanda saldrá expulsada automáticamente en la impresora de cocina conectada a este equipo.
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
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          Prueba el envío físico silencioso a tus impresoras o visualiza el documento exacto en pantalla.
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
                👁️ Vista Previa & PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Printer size={14} />}
                onClick={handleTestReceipt}
                disabled={testingReceipt}
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
                👁️ Vista Previa & PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Printer size={14} />}
                onClick={handleTestKitchen}
                disabled={testingKitchen}
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
                disabled={testingDrawer}
                style={{ width: '100%' }}
              >
                {testingDrawer ? 'Enviando pulso...' : '💵 Probar Apertura de Gaveta'}
              </Button>
            </div>
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
              <span>Fecha: {formatDateTime(sampleInvoice.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Cajero: {sampleInvoice.cashier_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Mesa: {sampleInvoice.table_number}</span>
            </div>

            <div style={{ borderTop: '1px solid #111827', margin: '6px 0' }} />
            <div style={{ fontSize: '11px' }}>
              <div><strong>Cliente:</strong> {sampleInvoice.customer_name}</div>
              <div><strong>CC/NIT:</strong> {sampleInvoice.customer_document}</div>
              <div><strong>Tel:</strong> {sampleInvoice.customer_phone}</div>
            </div>

            <div style={{ borderTop: '1px solid #111827', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '11px', borderBottom: '1px solid #111827', paddingBottom: '3px' }}>
              <span>Cant. Descripción</span>
              <span>Total</span>
            </div>

            {sampleInvoice.items.map((it, idx) => (
              <div key={idx} style={{ marginTop: '4px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{it.quantity}x {it.name}</span>
                  <span>{formatCOP(it.quantity * it.unit_price)}</span>
                </div>
                {it.modifiers && it.modifiers.map((m, mIdx) => (
                  <div key={mIdx} style={{ fontSize: '10px', color: '#4b5563', paddingLeft: '8px' }}>
                    + {m.name} {m.price_modifier > 0 ? `(+${formatCOP(m.price_modifier)})` : ''}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ borderTop: '1px solid #111827', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Subtotal:</span>
              <span>{formatCOP(sampleInvoice.subtotal)}</span>
            </div>
            {sampleInvoice.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Descuento:</span>
                <span>-{formatCOP(sampleInvoice.discount_amount)}</span>
              </div>
            )}
            {sampleInvoice.tip_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Propina Voluntaria:</span>
                <span>+{formatCOP(sampleInvoice.tip_amount)}</span>
              </div>
            )}
            
            <div style={{ borderTop: '2px solid #111827', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px' }}>
              <span>TOTAL:</span>
              <span>{formatCOP(sampleInvoice.total)}</span>
            </div>
            
            <div style={{ borderTop: '1px dashed #111827', margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
              {settings?.receipt_footer || '¡Gracias por su visita! Vuelva pronto.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => setPreviewInvoiceModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              icon={<Printer size={16} />}
              onClick={handleTestReceipt}
              style={{ flex: 1 }}
            >
              Imprimir Térmica
            </Button>
          </div>

        </div>
      </Modal>

      {/* MODAL 2: VISTA PREVIA COMANDA DE COCINA & GENERADOR PDF */}
      <Modal
        isOpen={previewKitchenModalOpen}
        onClose={() => setPreviewKitchenModalOpen(false)}
        title="🍳 Vista Previa de Comanda de Cocina"
        maxWidth="440px"
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
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '14px' }}>*** COMANDA DE COCINA ***</div>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', margin: '4px 0' }}>
              MESA 4
            </div>
            
            <div style={{ borderTop: '2px solid #111827', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Orden: #{sampleKitchenOrder.id}</span>
              <span>Mesero: {sampleKitchenOrder.waiter_name}</span>
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              Hora: {new Date().toLocaleTimeString('es-CO')}
            </div>

            <div style={{ borderTop: '1px solid #111827', margin: '6px 0' }} />
            <div style={{ fontWeight: 800, fontSize: '11px', borderBottom: '1px solid #111827', paddingBottom: '3px' }}>
              Cant. Producto / Detalles
            </div>

            {sampleKitchenItems.map((it, idx) => (
              <div key={idx} style={{ marginTop: '8px', fontSize: '12px' }}>
                <div style={{ fontWeight: 900, fontSize: '13px' }}>
                  {it.quantity}x {it.name.toUpperCase()}
                </div>
                {it.modifiers && it.modifiers.map((m, mIdx) => (
                  <div key={mIdx} style={{ fontSize: '11px', color: '#1f2937', paddingLeft: '10px', fontWeight: 600 }}>
                    • {m.name}
                  </div>
                ))}
                {it.notes && (
                  <div style={{ fontSize: '11px', fontWeight: 700, paddingLeft: '10px', marginTop: '2px' }}>
                    * NOTA: {it.notes}
                  </div>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px solid #111827', margin: '10px 0' }} />
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700 }}>
              (Comanda Operativa para Producción / Cocina)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => setPreviewKitchenModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              icon={<Printer size={16} />}
              onClick={handleTestKitchen}
              style={{ flex: 1 }}
            >
              Imprimir Térmica
            </Button>
          </div>

        </div>
      </Modal>

    </div>
  );
};
