// src/pages/ProductsPage.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const ProductsPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('productos');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states para producto
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [taxRate, setTaxRate] = useState('0'); // '0', '0.08', '0.19'
  const [taxIncluded, setTaxIncluded] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenNewProduct = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setTaxRate('0');
    setTaxIncluded(1);
    setDescription('');
    setImageUrl('');
    if (categories.length > 0) setCategoryId(categories[0].id.toString());
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingItem(prod);
    setName(prod.name);
    setPrice(Math.round(parseFloat(prod.price || 0)).toString());
    setTaxRate(parseFloat(prod.tax_rate ?? 0).toString());
    setTaxIncluded(prod.tax_included ?? 1);
    setDescription(prod.description || '');
    setImageUrl(prod.image_url || '');
    setCategoryId(prod.category_id.toString());
    setIsProductModalOpen(true);
  };

  const handleProductImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.post('/upload', {
          filename: file.name,
          base64: reader.result
        });
        setImageUrl(res.url);
        addToast('Imagen subida al servidor exitosamente', 'success');
      } catch (err) {
        addToast('Error al subir la imagen del producto', 'danger');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async () => {
    if (!name || !price || !categoryId) {
      addToast('Nombre, precio y categoría son requeridos', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        price: parseFloat(price),
        tax_rate: parseFloat(taxRate),
        tax_included: Boolean(parseInt(taxIncluded, 10)),
        category_id: parseInt(categoryId, 10),
        description: description || undefined,
        image_url: imageUrl || undefined
      };

      if (editingItem) {
        await api.put(`/products/${editingItem.id}`, payload);
        addToast('Producto actualizado', 'success');
      } else {
        await api.post('/products', payload);
        addToast('Producto creado', 'success');
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar producto', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      addToast('Producto eliminado', 'info');
      fetchData();
    } catch (err) {
      addToast('Error al eliminar producto', 'danger');
    }
  };

  const handleSaveCategory = async () => {
    if (!name) {
      addToast('El nombre de la categoría es obligatorio', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/categories', { name, description: description || undefined });
      addToast('Categoría creada', 'success');
      setIsCategoryModalOpen(false);
      setName('');
      setDescription('');
      fetchData();
    } catch (err) {
      addToast('Error al crear categoría', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const getTaxLabel = (rate) => {
    if (!rate || rate === 0) return 'Exento (0%)';
    if (rate === 0.08) return 'Impoconsumo (8%)';
    if (rate === 0.19) return 'IVA (19%)';
    return `${(rate * 100).toFixed(0)}%`;
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando catálogo...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('productos')}
          style={{ padding: '8px 16px', background: activeTab === 'productos' ? 'var(--bg-elevated)' : 'transparent', border: 'none', color: activeTab === 'productos' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
        >
          Productos ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('categorias')}
          style={{ padding: '8px 16px', background: activeTab === 'categorias' ? 'var(--bg-elevated)' : 'transparent', border: 'none', color: activeTab === 'categorias' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
        >
          Categorías ({categories.length})
        </button>
      </div>

      <Card header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{activeTab === 'productos' ? 'Lista de Productos' : 'Lista de Categorías'}</span>
          <Button size="sm" icon={<Plus size={16} />} onClick={activeTab === 'productos' ? handleOpenNewProduct : () => { setName(''); setDescription(''); setIsCategoryModalOpen(true); }}>
            Nuevo {activeTab === 'productos' ? 'Producto' : 'Categoría'}
          </Button>
        </div>
      }>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 8px' }}>Imagen</th>
              <th style={{ padding: '12px 8px' }}>Nombre</th>
              {activeTab === 'productos' && <th style={{ padding: '12px 8px' }}>Categoría</th>}
              {activeTab === 'productos' && <th style={{ padding: '12px 8px' }}>Precio</th>}
              {activeTab === 'productos' && <th style={{ padding: '12px 8px' }}>Impuesto</th>}
              <th style={{ padding: '12px 8px' }}>Estado</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === 'productos' ? (
              products.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={18} color="var(--text-muted)" />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{prod.name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{prod.category_name || 'Sin cat.'}</td>
                  <td style={{ padding: '12px 8px' }}>{formatCOP(prod.price)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <Badge variant={prod.tax_rate > 0 ? 'warning' : 'info'}>{getTaxLabel(prod.tax_rate)}</Badge>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <Badge variant={prod.is_available ? 'success' : 'danger'}>{prod.is_available ? 'Disponible' : 'Agotado'}</Badge>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button onClick={() => handleOpenEditProduct(prod)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '8px' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteProduct(prod.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>-</td>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{cat.name}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <Badge variant="success">Activa</Badge>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID #{cat.id}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal Producto */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingItem ? 'Editar Producto' : 'Nuevo Producto'}>
        <div>
          <Input label="Nombre del Producto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hamburguesa Especial" />
          <Input label="Precio ($)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej. 28000" />
          
          <Select 
            label="Categoría" 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
          />

          <Select 
            label="Tipo de Impuesto (Impoconsumo / IVA / Exento)" 
            value={taxRate} 
            onChange={(e) => setTaxRate(e.target.value)}
            options={[
              { value: '0', label: 'Exento / Sin Impuesto (0%)' },
              { value: '0.08', label: 'Impoconsumo Restaurantes (8%)' },
              { value: '0.19', label: 'IVA General (19%)' }
            ]}
          />

          <Select 
            label="Modalidad del Precio" 
            value={taxIncluded.toString()} 
            onChange={(e) => setTaxIncluded(parseInt(e.target.value, 10))}
            options={[
              { value: '1', label: 'El precio ya incluye el impuesto' },
              { value: '0', label: 'El impuesto se liquida adicional' }
            ]}
          />

          {/* Carga de Imagen del Producto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Imagen del Producto (Subir archivo o pegar URL)
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleProductImageUpload} 
                style={{ display: 'none' }} 
                id="product-image-file" 
              />
              <Button type="button" variant="secondary" icon={<Upload size={16} />} loading={uploadingImage} onClick={() => document.getElementById('product-image-file').click()}>
                Subir Imagen desde Equipo
              </Button>
            </div>
            <Input 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
              placeholder="http://localhost:3001/uploads/hamburguesa.png"
              style={{ marginTop: '8px' }}
            />
            {imageUrl && (
              <div style={{ marginTop: '8px' }}>
                <img src={imageUrl} alt="Preview" style={{ height: '60px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </div>
          
          <Input label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSaveProduct}>Guardar Producto</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Categoría */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Nueva Categoría">
        <div>
          <Input label="Nombre de la Categoría" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Bebidas Calientes" />
          <Input label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSaveCategory}>Guardar Categoría</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
