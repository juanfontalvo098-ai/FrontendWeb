// src/pages/PrintingConfigPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Printer, RefreshCw, CheckCircle, AlertCircle, Download,
  Play, Trash2, Cpu, FileText, Check, UtensilsCrossed,
  Receipt, DollarSign, Settings, ShieldCheck, Sparkles, ExternalLink,
  Eye, Laptop, MonitorCheck, HelpCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api, formatCOP, formatDateTime } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { qzService } from '../utils/qzTrayService';
import {
  openCashDrawer,
  printInvoiceReceipt,
  printKitchenTicket,
  printThermalDocument
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

  // Estado Local: ¿Es este equipo la Estación de Impresión?
  const [isPrintStation, setIsPrintStation] = useState(qzService.isPrintStation());

  // Estado en vivo de QZ Tray
  const [qzStatus, setQzStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
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
    } catch (err) {
      addToast('Error al cargar configuración de impresión: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // 2. Probar conexión en vivo con QZ Tray
  const testQzConnection = async () => {
    setQzStatus('checking');
    try {
      const ok = await qzService.connect();
      if (ok && qzService.isQzConnected()) {
        setQzStatus('connected');
        const printers = await qzService.getPrinters(true);
        setDetectedPrinters(printers);
        addToast('🟢 QZ Tray conectado correctamente en este equipo', 'success');
      } else {
        setQzStatus('disconnected');
        setDetectedPrinters([]);
      }
    } catch (e) {
      setQzStatus('disconnected');
      setDetectedPrinters([]);
    }
  };

  useEffect(() => {
    loadSettings();
    testQzConnection();
    setIsPrintStation(qzService.isPrintStation());
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
        open_drawer_on_payment: openDrawerOnPayment
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

  // 4. Alternar estación de impresión
  const handleTogglePrintStation = (checked) => {
    setIsPrintStation(checked);
    qzService.setPrintStation(checked);
    if (checked) {
      addToast('✅ Este equipo fue designado como Estación de Impresión de la Sucursal', 'success');
    } else {
      addToast('ℹ️ Este equipo ya no procesará auto-impresiones de otros dispositivos', 'info');
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

  // 5. Pruebas de Impresión con Formato Real
  const handleTestKitchen = async () => {
    setTestingKitchen(true);
    try {
      const res = await printKitchenTicket(
        sampleKitchenOrder,
        sampleKitchenItems,
        'Mesa VIP - Entregar todo junto',
        sampleKitchenOrder.waiter_name,
        settings,
        paperWidth
      );
      if (res && res.mode === 'qz_tray') {
        addToast(`✅ Comanda de prueba impresa en "${res.printer}" vía QZ Tray`, 'success');
      } else {
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
      const res = await printInvoiceReceipt(sampleInvoice, settings, paperWidth);
      if (res && res.mode === 'qz_tray') {
        addToast(`✅ Factura de prueba impresa en "${res.printer}" vía QZ Tray`, 'success');
      } else {
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
      const res = await openCashDrawer(printerReceiptName);
      if (res && res.success) {
        addToast('Señal de apertura enviada a la gaveta de dinero', 'success');
      } else {
        addToast(res?.error || 'Verifica que la gaveta esté conectada al puerto RJ11 de la impresora de Caja', 'warning');
      }
    } catch (e) {
      addToast('Error al probar gaveta: ' + e.message, 'danger');
    } finally {
      setTestingDrawer(false);
    }
  };

  // 6. Descarga directa del instalador de QZ Tray
  const downloadQzTrayInstaller = () => {
    window.open('https://github.com/qzind/tray/releases/download/v2.2.4/qz-tray-2.2.4.exe', '_blank');
    addToast('Iniciando descarga oficial de QZ Tray v2.2.4 para Windows...', 'info');
  };

  // Opciones de impresoras detectadas
  const printerOptions = [
    { value: '', label: 'Impresora Predeterminada de Windows' },
    ...detectedPrinters.map(p => {
      const name = typeof p === 'string' ? p : p.name;
      return { value: name, label: `🖨️ ${name}` };
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
            Configuración de Impresión Térmica & QZ Tray
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Control de impresión silenciosa con corte automático de papel, detección de impresoras de Windows y enrutamiento de comandas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw size={14} />}
            onClick={testQzConnection}
          >
            Re-Escanear QZ Tray
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

      {/* MONITOR EN VIVO: ESTADO DE QZ TRAY */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: qzStatus === 'connected' ? 'rgba(4, 120, 87, 0.15)' : 'rgba(220, 38, 38, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: qzStatus === 'connected' ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              <Laptop size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Motor de Impresión Profesional: QZ Tray
                </h3>
                <Badge variant={qzStatus === 'connected' ? 'success' : (qzStatus === 'checking' ? 'warning' : 'danger')}>
                  {qzStatus === 'connected' ? '🟢 Conectado y Listo' : (qzStatus === 'checking' ? '🟡 Verificando...' : '🔴 Desconectado (Modo Diálogo)')}
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {qzStatus === 'connected' ? (
                  <span>
                    Comunicación activa en <strong>localhost:8182</strong> &bull; <strong>{detectedPrinters.length}</strong> impresoras de Windows detectadas &bull; Impresión silenciosa habilitada
                  </span>
                ) : (
                  <span>
                    QZ Tray no está abierto en este computador. El sistema usará el diálogo estándar de Windows de forma automática.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="primary"
              icon={<Download size={14} />}
              onClick={downloadQzTrayInstaller}
              title="Descargar Instalador Oficial de QZ Tray para Windows"
            >
              📥 Descargar QZ Tray (.exe Oficial)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw size={14} />}
              onClick={testQzConnection}
            >
              🔄 Verificar Conexión
            </Button>
          </div>

        </div>

        {/* Alerta interactiva si está desconectado */}
        {qzStatus === 'disconnected' && (
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
                ¿Cómo activar la Impresión Silenciosa y Corte Automático con QZ Tray?
              </strong>
              <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>
                  Haz clic en el botón <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>"📥 Descargar QZ Tray (.exe Oficial)"</span> y ejecuta el instalador.
                </li>
                <li>
                  Al abrirse QZ Tray en la bandeja del sistema (junto al reloj de Windows), presiona <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>"🔄 Verificar Conexión"</span>.
                </li>
                <li>
                  En la ventana de confirmación que aparecerá por única vez en tu pantalla, marca la casilla <strong style={{ color: 'var(--text-primary)' }}>"Remember this decision / Recordar decisión"</strong> y presiona <strong style={{ color: 'var(--text-primary)' }}>"Allow / Permitir"</strong>.
                </li>
              </ol>
            </div>
          </div>
        )}
      </Card>

      {/* DESIGNACIÓN DE ESTACIÓN DE IMPRESIÓN */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px', background: isPrintStation ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-secondary)', border: isPrintStation ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: isPrintStation ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: isPrintStation ? '#FFFFFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MonitorCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  Estación de Impresión de la Sucursal (PC de Caja / Cocina)
                </h3>
                {isPrintStation && <Badge variant="primary">🎯 Terminal Activa</Badge>}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Si activas esta opción, este computador escuchará las comandas enviadas por los meseros desde sus celulares y las expulsará físicamente en la impresora térmica conectada.
              </p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              {isPrintStation ? 'Activado en este PC' : 'Desactivado en este dispositivo'}
            </span>
            <input
              type="checkbox"
              checked={isPrintStation}
              onChange={(e) => handleTogglePrintStation(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', width: '22px', height: '22px', cursor: 'pointer' }}
            />
          </label>
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
                <strong style={{ fontSize: '13px' }}>Habilitar Impresión Silenciosa Directa (ESC/POS & QZ Tray)</strong>
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
                  Cuando un mesero presione "Enviar a Cocina" desde su teléfono, la comanda saldrá expulsada automáticamente en la Estación de Impresión.
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
          Visualiza la factura o comanda en pantalla, descárgala en PDF de alta resolución con 1 clic, o prueba la impresión directa.
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
                👁️ Ver Comanda & PDF
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

      {/* GUÍA DE INSTALACIÓN Y PREGUNTAS FRECUENTES */}
      <Card style={{ padding: '18px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={17} color="var(--accent-primary)" />
          Preguntas Frecuentes & Guía de Configuración
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '10px' }}>
          
          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-primary)' }}>
              ¿Por qué usar QZ Tray en lugar del diálogo de impresión?
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
              QZ Tray envía los trabajos de impresión directamente a la cola de Windows sin abrir ventanas emergentes, ajusta el papel de borde a borde y realiza el corte automático de papel por comando ESC/POS.
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-primary)' }}>
              ¿Qué pasa si uso el sistema desde un celular o tablet?
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
              Los meseros pueden pedir desde sus móviles tranquilamente. La comanda se envía por internet a la nube y la <strong>Estación de Impresión</strong> (tu computador de caja) la imprime de inmediato.
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
              onClick={() => printInvoiceReceipt(sampleInvoice, settings, paperWidth)}
            >
              📥 Guardar PDF / Imprimir en Navegador
            </Button>
            <Button
              variant="secondary"
              icon={<Printer size={15} />}
              onClick={handleTestReceipt}
              disabled={testingReceipt}
            >
              ⚡ Enviar a Impresora Térmica
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
              onClick={() => printKitchenTicket(sampleKitchenOrder, sampleKitchenItems, 'Mesa VIP - Entregar todo junto', sampleKitchenOrder.waiter_name, settings, paperWidth)}
            >
              📥 Guardar PDF / Imprimir en Navegador
            </Button>
            <Button
              variant="secondary"
              icon={<Printer size={15} />}
              onClick={handleTestKitchen}
              disabled={testingKitchen}
            >
              ⚡ Enviar a Impresora Térmica
            </Button>
          </div>

        </div>
      </Modal>

    </div>
  );
};
