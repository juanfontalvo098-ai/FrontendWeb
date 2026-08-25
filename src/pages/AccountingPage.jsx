// src/pages/AccountingPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Landmark, BookOpen, Scale, TrendingUp, DollarSign, Plus,
  FileSpreadsheet, ArrowDownLeft, ArrowUpRight, CheckCircle2,
  Calendar, Search, Filter, ShieldCheck, AlertCircle, Users, RefreshCw,
  Receipt, ShoppingBag, Trash2, UserPlus, Clock, ArrowRightCircle, CreditCard, Building
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP, formatDate, formatDateTime } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';

export const AccountingPage = () => {
  const addToast = useUiStore((state) => state.addToast);
  const { user, activeBranchId } = useAuth();

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'coa' | 'journal' | 'balance' | 'pl' | 'ar' | 'ap'

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [arSummary, setArSummary] = useState({});
  const [payables, setPayables] = useState([]);
  const [apSummary, setApSummary] = useState({});
  const [customersList, setCustomersList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingPayroll, setSyncingPayroll] = useState(false);
  const [syncingMovements, setSyncingMovements] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Filtros Libro Diario
  const [journalRefFilter, setJournalRefFilter] = useState('');
  const [journalSearchQuery, setJournalSearchQuery] = useState('');

  // Filtros y Búsquedas en Cartera (CxC) y Proveedores (CxP)
  const [arSearchQuery, setArSearchQuery] = useState('');
  const [arStatusFilter, setArStatusFilter] = useState('todas');
  const [apSearchQuery, setApSearchQuery] = useState('');
  const [apStatusFilter, setApStatusFilter] = useState('todas');

  // Modales
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [paymentType, setPaymentType] = useState('ar'); // 'ar' | 'ap'
  const [paymentAmount, setPaymentAmount] = useState('');

  // Modal Nueva Cuenta por Cobrar (CxC)
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arCustomerId, setArCustomerId] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arDueDate, setArDueDate] = useState('');
  const [arInvoiceId, setArInvoiceId] = useState('');
  const [arNotes, setArNotes] = useState('');

  // Modal Nueva Cuenta por Pagar (CxP)
  const [apModalOpen, setApModalOpen] = useState(false);
  const [apSupplierId, setApSupplierId] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDueDate, setApDueDate] = useState('');
  const [apNotes, setApNotes] = useState('');

  // Form Cuenta
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('activo');

  // Form Asiento
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryDesc, setEntryDesc] = useState('');
  const [entryLines, setEntryLines] = useState([
    { account_id: '', debit: '', credit: '', description: '' },
    { account_id: '', debit: '', credit: '', description: '' }
  ]);

  // Date filters for P&L and Dashboard
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await api.get(`/accounting/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setDashboardData(data && !data.error ? data : null);
    } catch (err) {
      console.error('Error al cargar dashboard financiero:', err);
      setDashboardData(null);
    }
  };

  const fetchCOA = async () => {
    try {
      const data = await api.get('/accounting/accounts');
      setChartOfAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar plan de cuentas:', err);
      setChartOfAccounts([]);
    }
  };

  const fetchJournal = async () => {
    try {
      const data = await api.get('/accounting/journal');
      setJournalEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar libro diario:', err);
      setJournalEntries([]);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      const data = await api.get('/accounting/balance-sheet');
      setBalanceSheet(data && !data.error ? data : null);
    } catch (err) {
      console.error('Error al cargar balance:', err);
      setBalanceSheet(null);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      const data = await api.get(`/accounting/income-statement?startDate=${startDate}&endDate=${endDate}`);
      setIncomeStatement(data && !data.error ? data : null);
    } catch (err) {
      console.error('Error al cargar P&L:', err);
      setIncomeStatement(null);
    }
  };

  const fetchAR = async () => {
    try {
      const query = arStatusFilter !== 'todas' ? `?status=${arStatusFilter}` : '';
      const data = await api.get(`/accounting/receivable${query}`);
      setReceivables(data && Array.isArray(data.receivables) ? data.receivables : []);
      setArSummary(data && data.summary ? data.summary : {});
    } catch (err) {
      console.error('Error al cargar CxC:', err);
      setReceivables([]);
      setArSummary({});
    }
  };

  const fetchAP = async () => {
    try {
      const query = apStatusFilter !== 'todas' ? `?status=${apStatusFilter}` : '';
      const data = await api.get(`/accounting/payable${query}`);
      setPayables(data && Array.isArray(data.payables) ? data.payables : []);
      setApSummary(data && data.summary ? data.summary : {});
    } catch (err) {
      console.error('Error al cargar CxP:', err);
      setPayables([]);
      setApSummary({});
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setCustomersList([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await api.get('/suppliers');
      setSuppliersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      setSuppliersList([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchCOA(),
      fetchJournal(),
      fetchBalanceSheet(),
      fetchIncomeStatement(),
      fetchAR(),
      fetchAP(),
      fetchCustomers(),
      fetchSuppliers()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [activeBranchId, user?.businessId]);

  useEffect(() => {
    fetchDashboard();
    fetchIncomeStatement();
  }, [startDate, endDate]);

  const handleExportAccountingExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const blob = await api.getBlob(`/accounting/export/excel${queryString}`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Contabilidad_${startDate || 'General'}_al_${endDate || 'Hoy'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('Reporte contable Excel descargado exitosamente (.xlsx)', 'success');
    } catch (err) {
      addToast(err.message || 'Error al exportar contabilidad a Excel', 'danger');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleSyncPayroll = async () => {
    setSyncingPayroll(true);
    try {
      const res = await api.post('/hr/payroll/sync-accounting', {});
      addToast(res.message || 'Nómina sincronizada con éxito en Contabilidad', 'success');
      await Promise.all([
        fetchDashboard(),
        fetchJournal(),
        fetchIncomeStatement(),
        fetchBalanceSheet()
      ]);
    } catch (err) {
      addToast(err.message || 'Error al sincronizar nómina', 'danger');
    } finally {
      setSyncingPayroll(false);
    }
  };

  const handleInitDefaultCOA = async () => {
    if (!window.confirm('¿Inicializar el plan de cuentas comercial colombiano estándar?')) return;
    try {
      await api.post('/accounting/accounts/initialize');
      addToast('Plan de cuentas estándar inicializado', 'success');
      fetchCOA();
    } catch (err) {
      addToast(err.message || 'Error al inicializar cuentas', 'danger');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/accounting/accounts', {
        code: accCode,
        name: accName,
        account_type: accType
      });
      addToast('Cuenta contable creada', 'success');
      setAccountModalOpen(false);
      setAccCode('');
      setAccName('');
      fetchCOA();
    } catch (err) {
      addToast(err.message || 'Error al crear cuenta', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddJournalLine = () => {
    setEntryLines([
      ...entryLines,
      { account_id: '', debit: '', credit: '', description: '' }
    ]);
  };

  const handleJournalLineChange = (index, field, val) => {
    const newLines = [...entryLines];
    newLines[index][field] = val;
    setEntryLines(newLines);
  };

  const calculateJournalTotals = () => {
    let debit = 0, credit = 0;
    entryLines.forEach(l => {
      debit += parseFloat(l.debit) || 0;
      credit += parseFloat(l.credit) || 0;
    });
    return { debit, credit, diff: debit - credit };
  };

  const jTotals = calculateJournalTotals();

  const handleCreateJournalEntry = async (e) => {
    e.preventDefault();
    const totals = calculateJournalTotals();
    if (Math.abs(totals.diff) > 0.01) {
      addToast('El asiento no está cuadrado. Débitos deben ser iguales a Créditos.', 'danger');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/accounting/journal', {
        entry_date: entryDate,
        description: entryDesc,
        lines: entryLines.map(l => ({
          account_id: parseInt(l.account_id, 10),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null
        }))
      });

      addToast('Asiento contable registrado con éxito', 'success');
      setJournalModalOpen(false);
      fetchJournal();
      fetchBalanceSheet();
      fetchDashboard();
    } catch (err) {
      addToast(err.message || 'Error al registrar asiento', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (item, type) => {
    setSelectedItemForPayment(item);
    setPaymentType(type);
    setPaymentAmount(item.balance.toString());
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      addToast('Ingresa un monto válido', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const url = paymentType === 'ar'
        ? `/accounting/receivable/${selectedItemForPayment.id}/payment`
        : `/accounting/payable/${selectedItemForPayment.id}/payment`;

      await api.post(url, { amount: parseFloat(paymentAmount) });
      addToast('Pago registrado exitosamente', 'success');
      setPaymentModalOpen(false);

      if (paymentType === 'ar') fetchAR();
      else fetchAP();
      fetchBalanceSheet();
      fetchDashboard();
    } catch (err) {
      addToast(err.message || 'Error al registrar pago', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAR();
  }, [arStatusFilter]);

  useEffect(() => {
    fetchAP();
  }, [apStatusFilter]);

  const handleOpenNewAR = () => {
    setArCustomerId(customersList.length > 0 ? customersList[0].id.toString() : '');
    setArAmount('');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setArDueDate(d.toISOString().slice(0, 10));
    setArInvoiceId('');
    setArNotes('');
    setArModalOpen(true);
  };

  const handleCreateReceivable = async (e) => {
    e.preventDefault();
    if (!arCustomerId) {
      addToast('Selecciona un cliente para la cuenta por cobrar', 'warning');
      return;
    }
    if (!arAmount || parseFloat(arAmount) <= 0) {
      addToast('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/accounting/receivable', {
        customer_id: parseInt(arCustomerId, 10),
        amount: parseFloat(arAmount),
        due_date: arDueDate,
        invoice_id: arInvoiceId ? parseInt(arInvoiceId, 10) : null,
        notes: arNotes
      });

      addToast('Cuenta por cobrar creada exitosamente', 'success');
      setArModalOpen(false);
      await Promise.all([fetchAR(), fetchBalanceSheet(), fetchDashboard()]);
    } catch (err) {
      addToast(err.message || 'Error al crear cuenta por cobrar', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewAP = () => {
    setApSupplierId(suppliersList.length > 0 ? suppliersList[0].id.toString() : '');
    setApAmount('');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setApDueDate(d.toISOString().slice(0, 10));
    setApNotes('');
    setApModalOpen(true);
  };

  const handleCreatePayable = async (e) => {
    e.preventDefault();
    if (!apSupplierId) {
      addToast('Selecciona un proveedor', 'warning');
      return;
    }
    if (!apAmount || parseFloat(apAmount) <= 0) {
      addToast('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/accounting/payable', {
        supplier_id: parseInt(apSupplierId, 10),
        amount: parseFloat(apAmount),
        due_date: apDueDate,
        notes: apNotes
      });

      addToast('Cuenta por pagar a proveedor registrada', 'success');
      setApModalOpen(false);
      await Promise.all([fetchAP(), fetchBalanceSheet(), fetchDashboard()]);
    } catch (err) {
      addToast(err.message || 'Error al crear cuenta por pagar', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveJournalLine = (index) => {
    if (entryLines.length <= 2) {
      addToast('Un asiento contable requiere al menos 2 líneas', 'warning');
      return;
    }
    const newLines = entryLines.filter((_, i) => i !== index);
    setEntryLines(newLines);
  };

  const handleSyncMovements = async () => {
    try {
      setSyncingMovements(true);
      const res = await api.post('/accounting/sync-movements');
      addToast(res.message || 'Movimientos sincronizados con éxito', 'success');
      await Promise.all([fetchJournal(), fetchDashboard(), fetchIncomeStatement(), fetchBalanceSheet()]);
    } catch (err) {
      addToast(err.message || 'Error al sincronizar movimientos', 'danger');
    } finally {
      setSyncingMovements(false);
    }
  };

  const filteredJournalEntries = (Array.isArray(journalEntries) ? journalEntries : []).filter(e => {
    // Filtro por tipo de referencia
    if (journalRefFilter && e.reference_type !== journalRefFilter) {
      return false;
    }
    // Filtro por búsqueda de texto
    if (journalSearchQuery) {
      const q = journalSearchQuery.toLowerCase().trim();
      const matchNum = (e.entry_number || '').toLowerCase().includes(q);
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchUser = (e.user_name || '').toLowerCase().includes(q);
      const matchLines = (e.lines || []).some(l => 
        (l.account_code || '').toLowerCase().includes(q) ||
        (l.account_name || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q)
      );
      if (!matchNum && !matchDesc && !matchUser && !matchLines) return false;
    }
    return true;
  });

  const filteredAR = (Array.isArray(receivables) ? receivables : []).filter(r => {
    if (!arSearchQuery) return true;
    const q = arSearchQuery.toLowerCase().trim();
    return (
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.customer_phone || '').includes(q) ||
      (r.invoice_number || '').toLowerCase().includes(q)
    );
  });

  const filteredAP = (Array.isArray(payables) ? payables : []).filter(p => {
    if (!apSearchQuery) return true;
    const q = apSearchQuery.toLowerCase().trim();
    return (
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.supplier_phone || '').includes(q) ||
      (p.order_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={24} color="var(--accent-secondary)" /> Contabilidad & Finanzas Integrales
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Libro diario, estado de resultados (P&L), balance general, nómina & jornales y cartera de clientes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon={<FileSpreadsheet size={15} />}
            onClick={handleExportAccountingExcel}
            loading={exportingExcel}
            title="Exportar libro diario, cartera CxC y proveedores CxP a Excel (.xlsx)"
          >
            Exportar Contabilidad (Excel)
          </Button>

          <Button
            variant="secondary"
            icon={<RefreshCw size={15} className={syncingPayroll ? 'animate-spin' : ''} />}
            onClick={handleSyncPayroll}
            loading={syncingPayroll}
            title="Sincronizar todos los pagos de nómina y jornales con contabilidad"
          >
            Sincronizar Nómina
          </Button>

          {activeTab === 'ar' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenNewAR}>
              Nueva Cuenta por Cobrar
            </Button>
          )}

          {activeTab === 'ap' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenNewAP}>
              Nueva Cuenta por Pagar
            </Button>
          )}

          {activeTab === 'coa' && chartOfAccounts.length === 0 && (
            <Button variant="primary" onClick={handleInitDefaultCOA}>
              Inicializar PUC Estándar
            </Button>
          )}
          {activeTab === 'coa' && (
            <Button icon={<Plus size={16} />} onClick={() => setAccountModalOpen(true)}>
              Nueva Cuenta
            </Button>
          )}
          {activeTab === 'journal' && (
            <Button icon={<Plus size={16} />} onClick={() => setJournalModalOpen(true)}>
              Nuevo Asiento
            </Button>
          )}
        </div>
      </div>

      {/* Rango de Fechas Global */}
      <Card style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Calendar size={15} color="var(--accent-primary)" />
            <strong>Período Contable:</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ marginBottom: 0, padding: '4px 8px', fontSize: '12px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>al</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ marginBottom: 0, padding: '4px 8px', fontSize: '12px' }}
            />
            <Button size="sm" variant="secondary" onClick={() => { fetchDashboard(); fetchIncomeStatement(); fetchBalanceSheet(); }}>
              Filtrar
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Financial Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VENTAS POS (INGRESOS)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatCOP(dashboardData?.totalSales || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dashboardData?.invoicesCount || 0} facturas emitidas</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Receipt size={22} />
            </div>
          </div>
        </Card>

        {/* GASTOS DE NÓMINA & PERSONAL */}
        <Card style={{ padding: '12px 16px', borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700 }}>NÓMINA & JORNALES PAGADOS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-danger)' }}>
                {formatCOP(dashboardData?.totalPayroll || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dashboardData?.payrollCount || 0} pagos a colaboradores</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Users size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CARTERA CLIENTES (CXC)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                {formatCOP(arSummary?.total_balance || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cuentas por cobrar activas</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)' }}>
              <ArrowDownLeft size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>DEUDAS PROVEEDORES (CXP)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-warning)' }}>
                {formatCOP(apSummary?.total_balance || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cuentas por pagar</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <ArrowUpRight size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', overflowX: 'auto' }}>
        {[
          { id: 'summary', label: 'Resumen Financiero', icon: Scale },
          { id: 'balance', label: 'Balance General', icon: Landmark },
          { id: 'ar', label: 'Cartera (CxC)', icon: ArrowDownLeft, count: (Array.isArray(receivables) ? receivables : []).filter(r => r.status !== 'pagada').length },
          { id: 'ap', label: 'Proveedores (CxP)', icon: ArrowUpRight, count: (Array.isArray(payables) ? payables : []).filter(p => p.status !== 'pagada').length },
          { id: 'pl', label: 'Estado de Resultados (P&L)', icon: TrendingUp },
          { id: 'journal', label: 'Libro Diario', icon: FileSpreadsheet, count: Array.isArray(journalEntries) ? journalEntries.length : 0 },
          { id: 'coa', label: 'Plan de Cuentas (PUC)', icon: BookOpen, count: Array.isArray(chartOfAccounts) ? chartOfAccounts.length : 0 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <t.icon size={15} />
            {t.label} {t.count !== undefined ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* TAB 1: RESUMEN FINANCIERO */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {chartOfAccounts.length === 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={24} color="#f59e0b" />
                <div>
                  <strong style={{ color: '#f59e0b', fontSize: '13.5px' }}>Plan Único de Cuentas (PUC) pendiente por inicializar</strong>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Para visualizar los balances, estados de resultados y libro mayor de este negocio, inicializa el PUC estándar.
                  </div>
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={handleInitDefaultCOA}>
                Inicializar PUC Estándar Ahora
              </Button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '14px' }}>
            <Card style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <TrendingUp size={18} color="var(--accent-primary)" />
              Rendimiento Operacional & Nómina del Período
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas POS Facturadas (+):</span>
                <strong style={{ color: 'var(--accent-primary)' }}>{formatCOP(dashboardData?.totalSales || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: '3px solid #8b5cf6' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} color="#8b5cf6" /> Pagos a Personal / Jornales (-):
                </span>
                <strong style={{ color: 'var(--accent-danger)' }}>-{formatCOP(dashboardData?.totalPayroll || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Otros Gastos Contables Registrados (-):</span>
                <strong style={{ color: 'var(--accent-danger)' }}>
                  -{formatCOP(Math.max(0, (dashboardData?.totalExpenses || 0) - (dashboardData?.totalPayroll || 0)))}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', borderTop: '2px solid var(--accent-primary)', marginTop: '4px' }}>
                <strong style={{ fontSize: '13.5px' }}>UTILIDAD NETA OPERACIONAL:</strong>
                <strong style={{ fontSize: '16px', color: (dashboardData?.netProfit || 0) >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                  {formatCOP(dashboardData?.netProfit || 0)}
                </strong>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Scale size={18} color="var(--accent-secondary)" />
                Ecuación Patrimonial & Balances
              </h3>
              <Badge variant="success" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 800 }}>
                ✓ Ecuación Cuadrada
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Activos:</span>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Caja, Bancos, Inventarios e Insumos, Cartera CxC</div>
                </div>
                <strong style={{ color: 'var(--accent-primary)', fontSize: '13.5px' }}>{formatCOP(balanceSheet?.totals?.activo || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: '3px solid var(--accent-danger)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Pasivos:</span>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Proveedores CxP, Impuestos por Pagar, Nómina</div>
                </div>
                <strong style={{ color: 'var(--accent-danger)', fontSize: '13.5px' }}>{formatCOP(balanceSheet?.totals?.pasivo || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: '3px solid var(--accent-secondary)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Cartera Clientes por Cobrar (CxC):</span>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{(Array.isArray(receivables) ? receivables : []).filter(r => r.status !== 'pagada').length} cuentas pendientes</div>
                </div>
                <strong style={{ color: 'var(--accent-secondary)', fontSize: '13.5px' }}>{formatCOP(arSummary?.total_balance || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', borderTop: '2px solid var(--accent-secondary)', marginTop: '4px' }}>
                <div>
                  <strong style={{ fontSize: '13.5px' }}>PATRIMONIO NETO (Activo - Pasivo):</strong>
                  <div style={{ fontSize: '10.5px', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                    Activo ({formatCOP(balanceSheet?.totals?.activo || 0)}) = Pasivo + Patrimonio
                  </div>
                </div>
                <strong style={{ fontSize: '16px', color: 'var(--accent-secondary)' }}>
                  {formatCOP(balanceSheet?.totals?.patrimonio || 0)}
                </strong>
              </div>
            </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE GENERAL */}
      {activeTab === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Banner de Verificación de la Ecuación Patrimonial */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={24} color="var(--accent-primary)" />
              <div>
                <strong style={{ color: 'var(--accent-primary)', fontSize: '13.5px' }}>
                  Ecuación Patrimonial Verificada: Activo = Pasivo + Patrimonio
                </strong>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Total Activos ({formatCOP(balanceSheet?.totals?.activo || 0)}) = Pasivos ({formatCOP(balanceSheet?.totals?.pasivo || 0)}) + Patrimonio Neto ({formatCOP(balanceSheet?.totals?.patrimonio || 0)})
                </div>
              </div>
            </div>
            <Badge variant="success" style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 800 }}>
              ✓ 100% Cuadrada
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            {/* Activos */}
            <Card style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '12px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={16} /> ACTIVOS (RECURSOS DE LA EMPRESA)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                {balanceSheet?.accounts?.activo?.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)', marginRight: '6px' }}>{a.code}</span>
                      <span style={{ fontWeight: 600 }}>{a.name}</span>
                      {a.details && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Insumos: {formatCOP(a.details.supplies)} • Mercancías: {formatCOP(a.details.products)}
                        </div>
                      )}
                    </div>
                    <strong style={{ color: 'var(--accent-primary)', fontSize: '13px' }}>{formatCOP(a.balance)}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-elevated)', fontWeight: 800, marginTop: '8px', borderRadius: '6px', borderTop: '2px solid var(--accent-primary)' }}>
                  <span style={{ fontSize: '13px' }}>TOTAL ACTIVOS:</span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '15px' }}>{formatCOP(balanceSheet?.totals?.activo || 0)}</span>
                </div>
              </div>
            </Card>

            {/* Pasivos & Patrimonio */}
            <Card style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent-danger)', marginBottom: '12px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={16} /> PASIVOS & PATRIMONIO
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px', textTransform: 'uppercase' }}>Pasivos (Obligaciones)</div>
                {balanceSheet?.accounts?.pasivo?.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-danger)', marginRight: '6px' }}>{p.code}</span>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <strong style={{ color: 'var(--accent-danger)', fontSize: '12.5px' }}>{formatCOP(Math.abs(p.balance))}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-secondary)', fontWeight: 700, borderRadius: '4px' }}>
                  <span>Total Pasivos:</span>
                  <span style={{ color: 'var(--accent-danger)' }}>{formatCOP(balanceSheet?.totals?.pasivo || 0)}</span>
                </div>

                <div style={{ fontWeight: 800, color: 'var(--accent-secondary)', fontSize: '11px', marginTop: '12px', textTransform: 'uppercase' }}>Patrimonio (Capital & Resultados)</div>
                {balanceSheet?.accounts?.patrimonio?.map(pt => (
                  <div key={pt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-secondary)', marginRight: '6px' }}>{pt.code}</span>
                      <span style={{ fontWeight: 600 }}>{pt.name}</span>
                    </div>
                    <strong style={{ color: 'var(--accent-secondary)', fontSize: '12.5px' }}>{formatCOP(Math.abs(pt.balance))}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-secondary)', fontWeight: 700, borderRadius: '4px' }}>
                  <span>Total Patrimonio Neto:</span>
                  <span style={{ color: 'var(--accent-secondary)' }}>{formatCOP(balanceSheet?.totals?.patrimonio || 0)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-elevated)', fontWeight: 800, borderTop: '2px solid var(--accent-secondary)', marginTop: '8px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px' }}>TOTAL PASIVO + PATRIMONIO:</span>
                  <span style={{ color: 'var(--accent-secondary)', fontSize: '15px' }}>
                    {formatCOP((balanceSheet?.totals?.pasivo || 0) + (balanceSheet?.totals?.patrimonio || 0))}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: CARTERA (CXC) */}
      {activeTab === 'ar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* KPI Banner Cartera */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-secondary)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>CARTERA PENDIENTE (CXC)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                {formatCOP(arSummary?.total_balance || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Saldo total por cobrar</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-primary)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL RECAUDADO / ABONADO</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatCOP(arSummary?.total_paid || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cobros registrados</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-danger)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>CARTERA VENCIDA</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-danger)' }}>
                {formatCOP(arSummary?.overdue_amount || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vencida según fecha pactada</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>CLIENTES CON CRÉDITO ACTIVO</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6' }}>
                {arSummary?.active_customers_count || 0}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Clientes en cartera</div>
            </Card>
          </div>

          {/* Barra de Filtros & Búsqueda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['todas', 'pendiente', 'parcial', 'vencidas', 'pagada'].map(st => (
                <Button
                  key={st}
                  size="sm"
                  variant={arStatusFilter === st ? 'primary' : 'secondary'}
                  onClick={() => setArStatusFilter(st)}
                  style={{ fontSize: '11px', textTransform: 'capitalize' }}
                >
                  {st === 'todas' ? 'Todas' : st}
                </Button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Input
                  placeholder="Buscar cliente, NIT/CC, factura..."
                  value={arSearchQuery}
                  onChange={(e) => setArSearchQuery(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '11.5px', paddingLeft: '28px' }}
                />
                <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Tabla de Cuentas por Cobrar */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Cliente</th>
                    <th style={{ padding: '10px 12px' }}>Factura / Ref</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Monto Crédito</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Abonado</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Saldo Pendiente</th>
                    <th style={{ padding: '10px 12px' }}>Vencimiento</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAR.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>No hay cuentas por cobrar registradas con este filtro.</div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={13} />}
                          onClick={handleOpenNewAR}
                          style={{ marginTop: '10px', fontSize: '11px' }}
                        >
                          Registrar Primera Cuenta por Cobrar
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredAR.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.customer_name || 'Cliente Particular'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {r.customer_doc ? `${r.customer_doc_type || 'CC'}: ${r.customer_doc}` : ''} {r.customer_phone ? `• Tel: ${r.customer_phone}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                          {r.invoice_number ? (
                            <Badge variant="secondary" style={{ fontSize: '10px' }}>{r.invoice_number}</Badge>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Crédito Directo</span>
                          )}
                          {r.notes && <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.notes}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCOP(r.amount)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>{formatCOP(r.paid_amount)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: r.balance > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)', fontSize: '12.5px' }}>
                          {formatCOP(r.balance)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                          <div>{r.due_date ? new Date(r.due_date).toLocaleDateString() : 'Sin fecha'}</div>
                          {r.is_overdue && (
                            <span style={{ fontSize: '9.5px', color: 'var(--accent-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              ⚠️ Vencida
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge variant={r.status === 'pagada' ? 'success' : (r.is_overdue ? 'danger' : (r.status === 'parcial' ? 'info' : 'warning'))} style={{ fontSize: '10px' }}>
                            {r.status === 'pagada' ? 'PAGADA' : (r.is_overdue ? 'VENCIDA' : (r.status === 'parcial' ? 'ABONO PARCIAL' : 'PENDIENTE'))}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {r.status !== 'pagada' ? (
                            <Button size="sm" variant="primary" onClick={() => handleOpenPayment(r, 'ar')} style={{ fontSize: '11px', padding: '3px 8px' }}>
                              Registrar Abono
                            </Button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700 }}>✓ Cancelada</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PROVEEDORES (CXP) */}
      {activeTab === 'ap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* KPI Banner CxP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-warning)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>DEUDAS A PROVEEDORES (CXP)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-warning)' }}>
                {formatCOP(apSummary?.total_balance || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Saldo total por pagar</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-primary)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PAGADO A PROVEEDORES</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatCOP(apSummary?.total_paid || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pagos registrados</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-danger)' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>DEUDAS VENCIDAS</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-danger)' }}>
                {formatCOP(apSummary?.overdue_amount || 0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Exceden fecha límite</div>
            </Card>

            <Card style={{ padding: '10px 14px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>PROVEEDORES CON SALDO</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6' }}>
                {apSummary?.active_suppliers_count || 0}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Proveedores acreedores</div>
            </Card>
          </div>

          {/* Barra de Filtros & Búsqueda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['todas', 'pendiente', 'parcial', 'vencidas', 'pagada'].map(st => (
                <Button
                  key={st}
                  size="sm"
                  variant={apStatusFilter === st ? 'primary' : 'secondary'}
                  onClick={() => setApStatusFilter(st)}
                  style={{ fontSize: '11px', textTransform: 'capitalize' }}
                >
                  {st === 'todas' ? 'Todas' : st}
                </Button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Input
                  placeholder="Buscar proveedor, orden..."
                  value={apSearchQuery}
                  onChange={(e) => setApSearchQuery(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '11.5px', paddingLeft: '28px' }}
                />
                <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Tabla de Cuentas por Pagar */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Proveedor</th>
                    <th style={{ padding: '10px 12px' }}>Orden / Ref</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Monto Factura</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Pagado</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Saldo a Pagar</th>
                    <th style={{ padding: '10px 12px' }}>Vencimiento</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAP.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>No hay cuentas por pagar registradas con este filtro.</div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={13} />}
                          onClick={handleOpenNewAP}
                          style={{ marginTop: '10px', fontSize: '11px' }}
                        >
                          Registrar Primera Cuenta por Pagar
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredAP.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.supplier_name}</div>
                          {p.supplier_phone && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tel: {p.supplier_phone}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                          {p.order_number ? (
                            <Badge variant="secondary" style={{ fontSize: '10px' }}>{p.order_number}</Badge>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Directa</span>
                          )}
                          {p.notes && <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.notes}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCOP(p.amount)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>{formatCOP(p.paid_amount)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: p.balance > 0 ? 'var(--accent-warning)' : 'var(--accent-primary)', fontSize: '12.5px' }}>
                          {formatCOP(p.balance)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                          <div>{p.due_date ? new Date(p.due_date).toLocaleDateString() : 'Sin fecha'}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <Badge variant={p.status === 'pagada' ? 'success' : 'warning'} style={{ fontSize: '10px' }}>
                            {p.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {p.status !== 'pagada' ? (
                            <Button size="sm" variant="secondary" onClick={() => handleOpenPayment(p, 'ap')} style={{ fontSize: '11px', padding: '3px 8px' }}>
                              Registrar Pago
                            </Button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700 }}>✓ Pagada</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: ESTADO DE RESULTADOS (P&L) */}
      {activeTab === 'pl' && (
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Banner Resumen Nómina */}
            {(incomeStatement?.payrollSummary?.total_payroll || 0) > 0 && (
              <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#8b5cf6" />
                  <div>
                    <strong style={{ color: '#8b5cf6', fontSize: '13px' }}>Nómina & Jornales en este Período</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{incomeStatement?.payrollSummary?.count || 0} liquidaciones asentadas contablemente</div>
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-danger)' }}>
                  {formatCOP(incomeStatement?.payrollSummary?.total_payroll || 0)}
                </div>
              </div>
            )}

            {/* Ingresos */}
            <div>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                INGRESOS OPERACIONALES
              </div>
              {incomeStatement?.ingresos?.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>No hay ingresos asentados en este período.</div>
              ) : (
                incomeStatement?.ingresos?.map((ing) => (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <span>{ing.code} {ing.name}</span>
                    <strong style={{ color: 'var(--accent-primary)' }}>{formatCOP(ing.amount)}</strong>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-primary)', fontWeight: 800, fontSize: '12.5px', marginTop: '4px' }}>
                <span>TOTAL INGRESOS:</span>
                <span style={{ color: 'var(--accent-primary)' }}>{formatCOP(incomeStatement?.totalIngresos || 0)}</span>
              </div>
            </div>

            {/* Gastos */}
            <div>
              <div style={{ fontWeight: 800, color: 'var(--accent-danger)', fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                COSTOS Y GASTOS OPERACIONALES (INCLUYE NÓMINA & JORNALES)
              </div>
              {incomeStatement?.gastos?.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>No hay gastos asentados en este período.</div>
              ) : (
                incomeStatement?.gastos?.map((g) => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <span>{g.code} {g.name}</span>
                    <strong style={{ color: 'var(--accent-danger)' }}>{formatCOP(g.amount)}</strong>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-primary)', fontWeight: 800, fontSize: '12.5px', marginTop: '4px' }}>
                <span>TOTAL COSTOS Y GASTOS:</span>
                <span style={{ color: 'var(--accent-danger)' }}>{formatCOP(incomeStatement?.totalGastos || 0)}</span>
              </div>
            </div>

            {/* Resultado Final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '2px solid var(--accent-secondary)' }}>
              <span style={{ fontSize: '14px', fontWeight: 800 }}>UTILIDAD NETA DEL EJERCICIO:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: (incomeStatement?.utilidadNeta || 0) >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                {formatCOP(incomeStatement?.utilidadNeta || 0)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 6: LIBRO DIARIO */}
      {activeTab === 'journal' && (
        <div>
          {/* Filtros de Tipo de Asiento & Buscador */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant={journalRefFilter === '' ? 'primary' : 'secondary'}
                onClick={() => setJournalRefFilter('')}
                style={{ fontSize: '11px' }}
              >
                Todos ({journalEntries.length})
              </Button>
              <Button
                size="sm"
                variant={journalRefFilter === 'invoice' ? 'primary' : 'secondary'}
                onClick={() => setJournalRefFilter('invoice')}
                icon={<Receipt size={13} />}
                style={{ fontSize: '11px' }}
              >
                Ventas POS ({journalEntries.filter(x => x.reference_type === 'invoice').length})
              </Button>
              <Button
                size="sm"
                variant={journalRefFilter === 'cash_movement' ? 'primary' : 'secondary'}
                onClick={() => setJournalRefFilter('cash_movement')}
                icon={<DollarSign size={13} />}
                style={{ fontSize: '11px' }}
              >
                Egresos de Caja ({journalEntries.filter(x => x.reference_type === 'cash_movement').length})
              </Button>
              <Button
                size="sm"
                variant={journalRefFilter === 'payroll' ? 'primary' : 'secondary'}
                onClick={() => setJournalRefFilter('payroll')}
                icon={<Users size={13} />}
                style={{ fontSize: '11px' }}
              >
                Nómina & Jornales ({journalEntries.filter(x => x.reference_type === 'payroll').length})
              </Button>
              <Button
                size="sm"
                variant={journalRefFilter === 'manual' ? 'primary' : 'secondary'}
                onClick={() => setJournalRefFilter('manual')}
                style={{ fontSize: '11px' }}
              >
                Manuales ({journalEntries.filter(x => x.reference_type === 'manual').length})
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '240px' }}>
                <Input
                  placeholder="Buscar asiento, cuenta, monto..."
                  value={journalSearchQuery}
                  onChange={(e) => setJournalSearchQuery(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '11.5px', paddingLeft: '28px' }}
                />
                <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px', pointerEvents: 'none' }} />
              </div>

              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw size={13} className={syncingMovements ? 'spin' : ''} />}
                loading={syncingMovements}
                onClick={handleSyncMovements}
                title="Sincroniza todos los egresos y movimientos de caja al libro diario"
                style={{ fontSize: '11px' }}
              >
                Sincronizar Egresos
              </Button>

              <Button
                size="sm"
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => setJournalModalOpen(true)}
                style={{ fontSize: '11px' }}
              >
                Nuevo Asiento
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredJournalEntries.length === 0 ? (
              <Card style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No hay asientos contables registrados con el filtro seleccionado.
              </Card>
            ) : (
              filteredJournalEntries.map((entry) => {
                const isPayroll = entry.reference_type === 'payroll';
                const isCashMovement = entry.reference_type === 'cash_movement';
                const isInvoice = entry.reference_type === 'invoice';

                let borderLeftColor = undefined;
                if (isPayroll) borderLeftColor = '3px solid #8b5cf6';
                else if (isCashMovement) borderLeftColor = '3px solid #f59e0b';
                else if (isInvoice) borderLeftColor = '3px solid #10b981';

                return (
                  <Card key={entry.id} style={{ padding: '12px 14px', borderLeft: borderLeftColor }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>{entry.entry_number}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(entry.entry_date)}</span>
                        {isPayroll && <Badge variant="info" style={{ fontSize: '10px' }}>NÓMINA / JORNAL</Badge>}
                        {isCashMovement && <Badge variant="warning" style={{ fontSize: '10px' }}>EGRESO / MOVIMIENTO CAJA</Badge>}
                        {isInvoice && <Badge variant="success" style={{ fontSize: '10px' }}>VENTA POS</Badge>}
                        {!isPayroll && !isCashMovement && !isInvoice && (
                          <Badge variant={entry.status === 'aprobado' ? 'secondary' : 'warning'} style={{ fontSize: '10px' }}>
                            {(entry.reference_type || entry.status).toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {entry.user_name ? `Registrado por: ${entry.user_name}` : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                      {entry.description || 'Sin descripción'}
                    </div>

                    {/* Líneas del Asiento */}
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '6px 10px' }}>Cuenta Contable</th>
                            <th style={{ padding: '6px 10px' }}>Detalle</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Débito</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Crédito</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines?.map((line, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                                {line.account_code} - {line.account_name}
                              </td>
                              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{line.description || '---'}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: parseFloat(line.debit) > 0 ? 700 : 400, color: parseFloat(line.debit) > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                {parseFloat(line.debit) > 0 ? formatCOP(line.debit) : '---'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: parseFloat(line.credit) > 0 ? 700 : 400, color: parseFloat(line.credit) > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                                {parseFloat(line.credit) > 0 ? formatCOP(line.credit) : '---'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 7: PLAN DE CUENTAS (PUC) */}
      {activeTab === 'coa' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', width: '120px' }}>Código PUC</th>
                  <th style={{ padding: '8px 12px' }}>Nombre de la Cuenta</th>
                  <th style={{ padding: '8px 12px', width: '120px' }}>Tipo</th>
                  <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(chartOfAccounts) ? chartOfAccounts : []).map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--accent-primary)' }}>{a.code}</td>
                    <td style={{ padding: '8px 12px', fontWeight: a.code.length <= 3 ? 700 : 400 }}>{a.name}</td>
                    <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>
                      <Badge variant={a.account_type === 'activo' || a.account_type === 'ingreso' ? 'success' : (a.account_type === 'pasivo' || a.account_type === 'gasto' ? 'danger' : 'secondary')} style={{ fontSize: '10px' }}>
                        {a.account_type}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Activa</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Nueva Cuenta por Cobrar (CxC) */}
      {arModalOpen && (
        <Modal isOpen={arModalOpen} onClose={() => setArModalOpen(false)} title="Registrar Nueva Cuenta por Cobrar (Cartera)">
          <form onSubmit={handleCreateReceivable} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Cliente (CRM) *</label>
              <select
                value={arCustomerId}
                onChange={(e) => setArCustomerId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px'
                }}
                required
              >
                <option value="">Seleccionar Cliente...</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.document_type || 'CC'}: {c.document_number || 'Sin doc'}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Monto Crédito ($) *</label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="0"
                  value={arAmount}
                  onChange={(e) => setArAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Fecha Vencimiento *</label>
                <Input
                  type="date"
                  value={arDueDate}
                  onChange={(e) => setArDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Notas / Concepto del Crédito</label>
              <Input
                placeholder="Ej: Saldo pendiente por banquete o crédito corporativo"
                value={arNotes}
                onChange={(e) => setArNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button type="button" variant="ghost" onClick={() => setArModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={submitting} icon={<CheckCircle2 size={15} />}>Guardar CxC</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nueva Cuenta por Pagar (CxP) */}
      {apModalOpen && (
        <Modal isOpen={apModalOpen} onClose={() => setApModalOpen(false)} title="Registrar Cuenta por Pagar a Proveedor (CxP)">
          <form onSubmit={handleCreatePayable} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Proveedor *</label>
              <select
                value={apSupplierId}
                onChange={(e) => setApSupplierId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px'
                }}
                required
              >
                <option value="">Seleccionar Proveedor...</option>
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.contact_phone || 'Sin tel'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Monto por Pagar ($) *</label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="0"
                  value={apAmount}
                  onChange={(e) => setApAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Fecha Vencimiento *</label>
                <Input
                  type="date"
                  value={apDueDate}
                  onChange={(e) => setApDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Notas / Factura Proveedor</label>
              <Input
                placeholder="Ej: Factura Proveedor # 4821 - Insumos lácteos"
                value={apNotes}
                onChange={(e) => setApNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button type="button" variant="ghost" onClick={() => setApModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={submitting} icon={<CheckCircle2 size={15} />}>Guardar CxP</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cuenta */}
      <Modal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} title="Nueva Cuenta Contable PUC">
        <form onSubmit={handleCreateAccount}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input label="Código PUC" value={accCode} onChange={(e) => setAccCode(e.target.value)} placeholder="Ej. 5.1.07" required />
            <Select
              label="Tipo de Cuenta"
              value={accType}
              onChange={(e) => setAccType(e.target.value)}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'pasivo', label: 'Pasivo' },
                { value: 'patrimonio', label: 'Patrimonio' },
                { value: 'ingreso', label: 'Ingreso' },
                { value: 'gasto', label: 'Gasto / Costo' },
              ]}
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <Input label="Nombre de la Cuenta" value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Ej. Mantenimiento y Reparaciones" required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setAccountModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Crear Cuenta</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Asiento */}
      <Modal isOpen={journalModalOpen} onClose={() => setJournalModalOpen(false)} title="Registrar Asiento Contable" maxWidth="860px">
        <form onSubmit={handleCreateJournalEntry}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px', marginBottom: '14px' }}>
            <Input label="Fecha del Asiento" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            <Input label="Concepto / Glosa General" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} placeholder="Ej. Pago de arriendo del local o servicios públicos" required />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Movimientos Contables (Partida Doble)
              </span>
              <Button size="sm" variant="secondary" type="button" onClick={handleAddJournalLine} icon={<Plus size={13} />}>
                Agregar Línea
              </Button>
            </div>

            {/* Cabecera de Columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.3fr 1.3fr 2.2fr 38px', gap: '8px', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <div>CUENTA CONTABLE (PUC)</div>
              <div style={{ textAlign: 'right' }}>DÉBITO ($)</div>
              <div style={{ textAlign: 'right' }}>CRÉDITO ($)</div>
              <div>DETALLE / NOTA</div>
              <div style={{ textAlign: 'center' }}></div>
            </div>

            {/* Filas de Movimientos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entryLines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.3fr 1.3fr 2.2fr 38px', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={l.account_id}
                    onChange={(e) => handleJournalLineChange(i, 'account_id', e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '4px',
                      color: 'var(--text-primary)', fontSize: '11.5px'
                    }}
                    required
                  >
                    <option value="">Seleccionar Cuenta...</option>
                    {chartOfAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.account_type})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={l.debit}
                    onChange={(e) => handleJournalLineChange(i, 'debit', e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '4px',
                      color: 'var(--accent-primary)', fontWeight: 700, fontSize: '12px', textAlign: 'right'
                    }}
                  />

                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={l.credit}
                    onChange={(e) => handleJournalLineChange(i, 'credit', e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '4px',
                      color: 'var(--accent-danger)', fontWeight: 700, fontSize: '12px', textAlign: 'right'
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Detalle de la línea..."
                    value={l.description}
                    onChange={(e) => handleJournalLineChange(i, 'description', e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '4px',
                      color: 'var(--text-primary)', fontSize: '11.5px'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveJournalLine(i)}
                    disabled={entryLines.length <= 2}
                    title={entryLines.length <= 2 ? 'Mínimo 2 líneas requeridas' : 'Eliminar línea'}
                    style={{
                      width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', color: entryLines.length <= 2 ? 'var(--text-muted)' : 'var(--accent-danger)',
                      cursor: entryLines.length <= 2 ? 'not-allowed' : 'pointer', borderRadius: '4px', opacity: entryLines.length <= 2 ? 0.4 : 1
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Barra de Cuadre y Balance */}
          <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span>Total Débitos: <strong style={{ color: 'var(--accent-primary)', fontSize: '13px' }}>{formatCOP(jTotals.debit)}</strong></span>
              <span>Total Créditos: <strong style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{formatCOP(jTotals.credit)}</strong></span>
            </div>
            <div>
              {Math.abs(jTotals.diff) <= 0.01 ? (
                <Badge variant="success" style={{ fontSize: '11px', padding: '4px 8px' }}>✓ ASIENTO CUADRADO</Badge>
              ) : (
                <Badge variant="danger" style={{ fontSize: '11px', padding: '4px 8px' }}>⚠️ DESCUADRE: {formatCOP(Math.abs(jTotals.diff))}</Badge>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setJournalModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting} disabled={Math.abs(jTotals.diff) > 0.01} icon={<CheckCircle2 size={15} />}>
              Guardar Asiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Pago Cartera / Proveedores */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={paymentType === 'ar' ? 'Registrar Abono de Cliente (CxC)' : 'Registrar Pago a Proveedor (CxP)'}>
        <form onSubmit={handleSubmitPayment}>
          <div style={{ marginBottom: '12px' }}>
            <Input label="Monto a Abonar / Pagar ($)" type="number" min="1" step="any" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Confirmar Pago</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
