// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Settings, Store, FileText, Upload, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const SettingsPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [businessName, setBusinessName] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultPaperWidth, setDefaultPaperWidth] = useState('80mm');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.get('/settings');
      if (data) {
        setBusinessName(data.business_name || '');
        setNit(data.nit || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setReceiptFooter(data.receipt_footer || '');
        setLogoUrl(data.logo_url || '');
        setDefaultPaperWidth(data.default_paper_width || '80mm');
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
        receipt_footer: receiptFooter,
        logo_url: logoUrl,
        default_paper_width: defaultPaperWidth
      });
      addToast('Configuración del negocio guardada exitosamente', 'success');
    } catch (err) {
      addToast(err.message || 'Error al guardar la configuración', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando parámetros del negocio...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card header="Configuración General del Negocio & Facturación">
        <form onSubmit={handleSaveSettings}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={20} color="var(--accent-primary)" /> Identificación del Establecimiento
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
                label="NIT / Registro Fiscal" 
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

          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent-primary)" /> Personalización de la Factura y Tickets
            </h3>

            {/* Subida de Archivo de Logo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
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
                  <Button type="button" variant="secondary" icon={<Upload size={16} />} loading={uploadingLogo} onClick={() => document.getElementById('logo-file-input').click()}>
                    Subir Imagen de Logo desde Equipo
                  </Button>
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>O pega una URL:</span>
              </div>
              <Input 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                placeholder="http://localhost:3001/uploads/mi-logo.png"
                style={{ marginTop: '8px' }}
              />
            </div>

            {logoUrl && (
              <div style={{ marginBottom: '16px', background: 'white', padding: '12px', borderRadius: '8px', display: 'inline-block' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Vista previa del logo subido:</div>
                <img src={logoUrl} alt="Logo Prev" style={{ maxHeight: '60px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}

            <Input 
              label="Mensaje o Leyenda al pie del Recibo" 
              value={receiptFooter} 
              onChange={(e) => setReceiptFooter(e.target.value)} 
              placeholder="Ej. ¡Gracias por su visita! Vuelva pronto."
            />

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button type="submit" loading={submitting} icon={<Check size={18} />}>
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
