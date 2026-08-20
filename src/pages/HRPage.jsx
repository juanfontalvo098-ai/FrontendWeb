// src/pages/HRPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Clock, Calendar, DollarSign, Award,
  CheckCircle, XCircle, Plus, Edit2, Trash2, ShieldCheck,
  FileSpreadsheet, Play, StopCircle, Umbrella, UserPlus,
  Zap, Printer, Filter, AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const HRPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'payroll' | 'attendance' | 'schedule' | 'leave'

  // Data states
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [dailyPayModalOpen, setDailyPayModalOpen] = useState(false);
  const [selectedEmpForDailyPay, setSelectedEmpForDailyPay] = useState(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [generatePayrollModalOpen, setGeneratePayrollModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // Form Empleado
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [docType, setDocType] = useState('CC');
  const [docNum, setDocNum] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('Mesero');
  const [salaryType, setSalaryType] = useState('diario'); // 'diario' | 'mensual' | 'por_horas'
  const [dailyRate, setDailyRate] = useState('50000');
  const [baseSalary, setBaseSalary] = useState('1500000');
  const [commissionRate, setCommissionRate] = useState('0');
  const [contractType, setContractType] = useState('indefinido');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');

  // Form Liquidación por Día / Turno
  const [liquidateEmployeeId, setLiquidateEmployeeId] = useState('');
  const [liquidateDateStart, setLiquidateDateStart] = useState(new Date().toISOString().slice(0, 10));
  const [liquidateDateEnd, setLiquidateDateEnd] = useState(new Date().toISOString().slice(0, 10));
  const [liquidateDays, setLiquidateDays] = useState('1');
  const [liquidateDailyRate, setLiquidateDailyRate] = useState('50000');
  const [liquidateBonuses, setLiquidateBonuses] = useState('0');
  const [liquidateDeductions, setLiquidateDeductions] = useState('0');
  const [liquidateNotes, setLiquidateNotes] = useState('');
  const [liquidateMarkAsPaid, setLiquidateMarkAsPaid] = useState(true);

  // Form Turno
  const [shiftEmployeeId, setShiftEmployeeId] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [shiftType, setShiftType] = useState('regular');

  // Form Nómina Masiva
  const [payrollStart, setPayrollStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [payrollEnd, setPayrollEnd] = useState(new Date().toISOString().slice(0, 10));

  // Form Permiso
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('vacaciones');
  const [leaveStart, setLeaveStart] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [leaveNotes, setLeaveNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/hr/employees');
      setEmployees(data || []);
      if (data && data.length > 0 && !shiftEmployeeId) {
        setShiftEmployeeId(data[0].id.toString());
        setLeaveEmployeeId(data[0].id.toString());
        setLiquidateEmployeeId(data[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const data = await api.get('/hr/attendance');
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error('Error al cargar asistencia:', err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const data = await api.get('/hr/schedule');
      setSchedules(data || []);
    } catch (err) {
      console.error('Error al cargar turnos:', err);
    }
  };

  const fetchPayroll = async () => {
    try {
      const data = await api.get('/hr/payroll');
      setPayrollRecords(data || []);
    } catch (err) {
      console.error('Error al cargar nómina:', err);
    }
  };

  const fetchLeave = async () => {
    try {
      const data = await api.get('/hr/leave');
      setLeaveRequests(data || []);
    } catch (err) {
      console.error('Error al cargar permisos:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchAttendance(),
      fetchSchedule(),
      fetchPayroll(),
      fetchLeave(),
      fetchUsers()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Clock in / Clock out
  const handleClockIn = async (employeeId) => {
    try {
      await api.post('/hr/attendance/clock-in', { employee_id: employeeId });
      addToast('Entrada registrada exitosamente', 'success');
      fetchAttendance();
    } catch (err) {
      addToast(err.message || 'Error al registrar entrada', 'danger');
    }
  };

  const handleClockOut = async (employeeId) => {
    try {
      await api.post('/hr/attendance/clock-out', { employee_id: employeeId });
      addToast('Salida registrada exitosamente', 'success');
      fetchAttendance();
    } catch (err) {
      addToast(err.message || 'Error al registrar salida', 'danger');
    }
  };

  // Crear / Editar Empleado
  const handleOpenNewEmployee = () => {
    setEditingEmployee(null);
    setFirstName('');
    setLastName('');
    setDocType('CC');
    setDocNum('');
    setPhone('');
    setEmail('');
    setPosition('Mesero');
    setSalaryType('diario');
    setDailyRate('50000');
    setBaseSalary('1500000');
    setCommissionRate('0');
    setContractType('indefinido');
    setHireDate(new Date().toISOString().slice(0, 10));
    setUserId('');
    setEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setFirstName(emp.first_name || '');
    setLastName(emp.last_name || '');
    setDocType(emp.document_type || 'CC');
    setDocNum(emp.document_number || '');
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setPosition(emp.position || 'Colaborador');
    setSalaryType(emp.salary_type || (parseFloat(emp.daily_rate) > 0 ? 'diario' : 'mensual'));
    setDailyRate(emp.daily_rate ? emp.daily_rate.toString() : '50000');
    setBaseSalary(emp.base_salary ? emp.base_salary.toString() : '1500000');
    setCommissionRate(emp.commission_rate ? emp.commission_rate.toString() : '0');
    setContractType(emp.contract_type || 'indefinido');
    setHireDate(emp.hire_date ? emp.hire_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setUserId(emp.user_id ? emp.user_id.toString() : '');
    setEmployeeModalOpen(true);
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      addToast('El nombre del empleado es obligatorio', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const parsedDaily = parseFloat(dailyRate) || 0;
      const parsedMonthly = parseFloat(baseSalary) || (parsedDaily * 30);

      const payload = {
        first_name: firstName.trim(),
        last_name: (lastName || '').trim(),
        document_type: docType,
        document_number: docNum ? docNum.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        position: position || 'Colaborador',
        salary_type: salaryType,
        daily_rate: salaryType === 'diario' ? parsedDaily : (parsedMonthly / 30),
        base_salary: salaryType === 'mensual' ? parsedMonthly : (parsedDaily * 30),
        commission_rate: parseFloat(commissionRate) || 0,
        contract_type: contractType,
        hire_date: hireDate || null,
        user_id: userId ? parseInt(userId, 10) : null
      };

      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee.id}`, payload);
        addToast('Ficha de empleado actualizada exitosamente', 'success');
      } else {
        await api.post('/hr/employees', payload);
        addToast('Empleado registrado exitosamente', 'success');
      }

      setEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err) {
      addToast(err.message || 'Error al guardar empleado', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`¿Estás seguro de desactivar al empleado "${emp.first_name} ${emp.last_name}"?`)) return;
    try {
      await api.delete(`/hr/employees/${emp.id}`);
      addToast('Empleado desactivado', 'success');
      fetchEmployees();
    } catch (err) {
      addToast(err.message || 'Error al desactivar empleado', 'danger');
    }
  };

  // Abrir Modal Liquidación Rápida por Día(s)
  const handleOpenDailyPayment = (emp) => {
    setSelectedEmpForDailyPay(emp);
    setLiquidateEmployeeId(emp.id.toString());
    setLiquidateDateStart(new Date().toISOString().slice(0, 10));
    setLiquidateDateEnd(new Date().toISOString().slice(0, 10));
    setLiquidateDays('1');
    const rate = parseFloat(emp.daily_rate) > 0 ? emp.daily_rate : (parseFloat(emp.base_salary) / 30 || 50000);
    setLiquidateDailyRate(rate.toString());
    setLiquidateBonuses('0');
    setLiquidateDeductions('0');
    setLiquidateNotes(`Liquidación jornal - ${emp.first_name} ${emp.last_name}`);
    setLiquidateMarkAsPaid(true);
    setDailyPayModalOpen(true);
  };

  const handleSubmitDailyPayment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/hr/payroll/liquidate', {
        employee_id: parseInt(liquidateEmployeeId, 10),
        period_start: liquidateDateStart,
        period_end: liquidateDateEnd,
        days_worked: parseFloat(liquidateDays) || 1,
        daily_rate: parseFloat(liquidateDailyRate) || 0,
        payment_type: 'diario',
        bonuses: parseFloat(liquidateBonuses) || 0,
        deductions: parseFloat(liquidateDeductions) || 0,
        notes: liquidateNotes,
        mark_as_paid: liquidateMarkAsPaid
      });

      addToast(res.message || 'Pago registrado con éxito', 'success');
      setDailyPayModalOpen(false);
      fetchPayroll();
    } catch (err) {
      addToast(err.message || 'Error al liquidar empleado', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Turnos
  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/hr/schedule', {
        employee_id: parseInt(shiftEmployeeId, 10),
        shift_date: shiftDate,
        start_time: shiftStart,
        end_time: shiftEnd,
        shift_type: shiftType
      });
      addToast('Turno programado exitosamente', 'success');
      setShiftModalOpen(false);
      fetchSchedule();
    } catch (err) {
      addToast(err.message || 'Error al programar turno', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('¿Eliminar este turno programado?')) return;
    try {
      await api.delete(`/hr/schedule/${shiftId}`);
      addToast('Turno eliminado', 'success');
      fetchSchedule();
    } catch (err) {
      addToast(err.message || 'Error al eliminar turno', 'danger');
    }
  };

  // Nómina Masiva
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/hr/payroll/generate', {
        period_start: payrollStart,
        period_end: payrollEnd
      });
      addToast('Nómina generada exitosamente', 'success');
      setGeneratePayrollModalOpen(false);
      fetchPayroll();
    } catch (err) {
      addToast(err.message || 'Error al liquidar nómina', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPayroll = async (payrollId) => {
    try {
      await api.post('/hr/payroll/pay', { ids: [payrollId] });
      addToast('Pago registrado exitosamente', 'success');
      fetchPayroll();
    } catch (err) {
      addToast(err.message || 'Error al procesar pago', 'danger');
    }
  };

  // Permisos
  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/hr/leave', {
        employee_id: parseInt(leaveEmployeeId, 10),
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: leaveEnd,
        notes: leaveNotes || null
      });
      addToast('Solicitud de permiso registrada', 'success');
      setLeaveModalOpen(false);
      fetchLeave();
    } catch (err) {
      addToast(err.message || 'Error al registrar permiso', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId, status) => {
    try {
      await api.put(`/hr/leave/${leaveId}/status`, { status });
      addToast(`Solicitud ${status}`, 'success');
      fetchLeave();
    } catch (err) {
      addToast(err.message || 'Error al actualizar solicitud', 'danger');
    }
  };

  // Cálculo del preview de liquidación rápida
  const calcTotalDailyPreview = () => {
    const days = parseFloat(liquidateDays) || 0;
    const rate = parseFloat(liquidateDailyRate) || 0;
    const bon = parseFloat(liquidateBonuses) || 0;
    const ded = parseFloat(liquidateDeductions) || 0;
    return Math.max(0, (days * rate) + bon - ded);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--accent-secondary)" /> Recursos Humanos (RRHH) & Gestión de Personal
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Control de colaboradores, pago y liquidación por <strong>días laborados (jornales)</strong> o salarios mensuales, turnos y reloj de asistencia.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {activeTab === 'employees' && (
            <Button onClick={handleOpenNewEmployee} icon={<UserPlus size={16} />}>
              Nuevo Empleado
            </Button>
          )}
          {activeTab === 'payroll' && (
            <>
              <Button variant="secondary" onClick={() => {
                const firstEmp = employees[0];
                if (firstEmp) handleOpenDailyPayment(firstEmp);
              }} icon={<Zap size={16} />}>
                Pagar Día / Jornal
              </Button>
              <Button onClick={() => setGeneratePayrollModalOpen(true)} icon={<DollarSign size={16} />}>
                Liquidar Período
              </Button>
            </>
          )}
          {activeTab === 'schedule' && (
            <Button onClick={() => setShiftModalOpen(true)} icon={<Plus size={16} />}>
              Programar Turno
            </Button>
          )}
          {activeTab === 'leave' && (
            <Button onClick={() => setLeaveModalOpen(true)} icon={<Plus size={16} />}>
              Solicitar Permiso
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', overflowX: 'auto' }}>
        {[
          { id: 'employees', label: 'Fichas de Personal', icon: Users, count: employees.length },
          { id: 'payroll', label: 'Pagos & Liquidaciones (Jornales)', icon: DollarSign, count: payrollRecords.length },
          { id: 'attendance', label: 'Reloj / Asistencia', icon: Clock, count: attendanceRecords.length },
          { id: 'schedule', label: 'Turnos & Horarios', icon: Calendar, count: schedules.length },
          { id: 'leave', label: 'Permisos & Vacaciones', icon: Umbrella, count: leaveRequests.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <t.icon size={15} />
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* TAB 1: EMPLEADOS */}
      {activeTab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
          {loading ? (
            <Card style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando personal...
            </Card>
          ) : employees.length === 0 ? (
            <Card style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay empleados registrados. Haz clic en "Nuevo Empleado" para registrar al personal.
            </Card>
          ) : (
            employees.map((emp) => {
              const isDaily = emp.salary_type === 'diario';

              return (
                <Card key={emp.id} style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--accent-secondary)', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                          {emp.first_name.charAt(0)}{emp.last_name ? emp.last_name.charAt(0) : ''}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                              {emp.first_name} {emp.last_name}
                            </h3>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>#{emp.business_relative_id}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.position || 'Colaborador'}</div>
                        </div>
                      </div>
                      <Badge variant={isDaily ? 'info' : 'success'} style={{ fontSize: '10px' }}>
                        {isDaily ? 'PAGO DIARIO' : 'MENSUAL'}
                      </Badge>
                    </div>

                    <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Modalidad / Tarifa:</span>
                        <strong style={{ color: 'var(--accent-primary)' }}>
                          {isDaily ? `${formatCOP(emp.daily_rate)} / día` : `${formatCOP(emp.base_salary)} / mes`}
                        </strong>
                      </div>
                      {parseFloat(emp.commission_rate || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Comisión Ventas:</span>
                          <strong style={{ color: 'var(--accent-warning)' }}>
                            {(parseFloat(emp.commission_rate || 0) * 100).toFixed(1)}%
                          </strong>
                        </div>
                      )}
                      {emp.document_number && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Documento:</span>
                          <span>{emp.document_type || 'CC'} {emp.document_number}</span>
                        </div>
                      )}
                      {emp.phone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Teléfono:</span>
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '6px', gap: '6px', flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenDailyPayment(emp)}
                      icon={<Zap size={12} />}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Pagar / Liquidar Día
                    </Button>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClockIn(emp.id)}
                        title="Marcar Entrada"
                        style={{ padding: '4px 6px', color: 'var(--accent-success)' }}
                      >
                        <Play size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClockOut(emp.id)}
                        title="Marcar Salida"
                        style={{ padding: '4px 6px', color: 'var(--accent-danger)' }}
                      >
                        <StopCircle size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditEmployee(emp)}
                        style={{ padding: '4px 6px' }}
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        style={{ padding: '4px 6px', color: 'var(--accent-danger)' }}
                        onClick={() => handleDeleteEmployee(emp)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: NÓMINA & LIQUIDACIONES (JORNALES) */}
      {activeTab === 'payroll' && (
        <div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Colaborador</th>
                    <th style={{ padding: '10px 14px' }}>Modalidad</th>
                    <th style={{ padding: '10px 14px' }}>Período</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Días / Tarifa</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Base</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Bonos / Comis.</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Deducciones</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total a Pagar</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay registros de liquidación o pago. Puedes usar "Pagar Día / Jornal" para registrar pagos inmediatos.
                      </td>
                    </tr>
                  ) : (
                    payrollRecords.map((p, idx) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>#{idx + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                          {p.employee_name}
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.position}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={p.payment_type === 'diario' ? 'info' : 'secondary'} style={{ fontSize: '10px' }}>
                            {p.payment_type ? p.payment_type.toUpperCase() : 'DIARIO'}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {p.period_start} {p.period_end !== p.period_start ? `al ${p.period_end}` : ''}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px' }}>
                          {p.days_worked} día(s) @ {formatCOP(p.daily_rate)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          {formatCOP(p.base_salary)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-success)' }}>
                          +{formatCOP((p.bonuses || 0) + (p.commissions || 0))}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-danger)' }}>
                          -{formatCOP(p.deductions || 0)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: 'var(--accent-primary)' }}>
                          {formatCOP(p.net_pay)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {p.status === 'pagada' ? (
                            <Badge variant="success" style={{ fontSize: '10px' }}>PAGADO</Badge>
                          ) : p.status === 'aprobada' ? (
                            <Badge variant="info" style={{ fontSize: '10px' }}>APROBADO</Badge>
                          ) : (
                            <Badge variant="warning" style={{ fontSize: '10px' }}>PENDIENTE</Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {p.status !== 'pagada' ? (
                            <Button size="sm" variant="secondary" onClick={() => handlePayPayroll(p.id)} icon={<CheckCircle size={12} />}>
                              Pagar
                            </Button>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✓ Liquidado</span>
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

      {/* TAB 3: ASISTENCIA */}
      {activeTab === 'attendance' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Colaborador</th>
                  <th style={{ padding: '10px 14px' }}>Entrada</th>
                  <th style={{ padding: '10px 14px' }}>Salida</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Horas Totales</th>
                  <th style={{ padding: '10px 14px' }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay registros de asistencia aún.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {a.employee_name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {new Date(a.clock_in).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {a.clock_out ? new Date(a.clock_out).toLocaleString('es-CO') : <Badge variant="warning">En turno</Badge>}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>
                        {a.total_hours ? `${a.total_hours} hrs` : '---'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {a.notes || '---'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: TURNOS & HORARIOS */}
      {activeTab === 'schedule' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Fecha</th>
                  <th style={{ padding: '10px 14px' }}>Colaborador</th>
                  <th style={{ padding: '10px 14px' }}>Horario Programado</th>
                  <th style={{ padding: '10px 14px' }}>Tipo de Turno</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay turnos programados. Haz clic en "Programar Turno" para planificar la semana.
                    </td>
                  </tr>
                ) : (
                  schedules.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{s.shift_date}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{s.employee_name} ({s.position})</td>
                      <td style={{ padding: '10px 14px' }}>{s.start_time} - {s.end_time}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant="secondary" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{s.shift_type}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Button size="sm" variant="ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDeleteShift(s.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: PERMISOS & VACACIONES */}
      {activeTab === 'leave' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Colaborador</th>
                  <th style={{ padding: '10px 14px' }}>Tipo</th>
                  <th style={{ padding: '10px 14px' }}>Fechas</th>
                  <th style={{ padding: '10px 14px' }}>Días</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay solicitudes de permiso o vacaciones registradas.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{l.employee_name}</td>
                      <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>{l.leave_type}</td>
                      <td style={{ padding: '10px 14px' }}>{l.start_date} al {l.end_date}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800 }}>{l.total_days} día(s)</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Badge variant={l.status === 'aprobada' ? 'success' : l.status === 'rechazada' ? 'danger' : 'warning'} style={{ fontSize: '10px' }}>
                          {l.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {l.status === 'pendiente' && (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <Button size="sm" variant="secondary" onClick={() => handleApproveLeave(l.id, 'aprobada')}>Aprobar</Button>
                            <Button size="sm" variant="ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => handleApproveLeave(l.id, 'rechazada')}>Rechazar</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Crear / Editar Empleado */}
      <Modal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        title={editingEmployee ? `Editar Empleado #${editingEmployee.business_relative_id}` : 'Registrar Nuevo Empleado'}
      >
        <form onSubmit={handleSubmitEmployee}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Nombres"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej. Carlos"
              required
            />
            <Input
              label="Apellidos"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej. Gómez"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '10px', marginBottom: '10px' }}>
            <Select
              label="Tipo Documento"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={[
                { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
                { value: 'CE', label: 'Cédula de Extranjería (CE)' },
                { value: 'PPT', label: 'Permiso Temporal (PPT)' },
                { value: 'PASAPORTE', label: 'Pasaporte' }
              ]}
            />
            <Input
              label="Número de Documento"
              value={docNum}
              onChange={(e) => setDocNum(e.target.value)}
              placeholder="Ej. 1020304050"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Teléfono Móvil"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 300 123 4567"
            />
            <Input
              label="Cargo / Función"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ej. Mesero, Cocinero, Cajero..."
            />
          </div>

          {/* Modalidad de Pago: Diario vs Mensual */}
          <div style={{ background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: 'var(--accent-secondary)' }}>
              Modalidad de Salario / Liquidación
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
              <Select
                value={salaryType}
                onChange={(e) => setSalaryType(e.target.value)}
                options={[
                  { value: 'diario', label: 'Pago por Día Laborado / Jornal' },
                  { value: 'mensual', label: 'Salario Fijo Mensual' }
                ]}
              />

              {salaryType === 'diario' ? (
                <Input
                  label="Valor por Día Laborado ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={dailyRate}
                  onChange={(e) => {
                    setDailyRate(e.target.value);
                    setBaseSalary((parseFloat(e.target.value || 0) * 30).toString());
                  }}
                  placeholder="50000"
                  required
                />
              ) : (
                <Input
                  label="Salario Mensual ($)"
                  type="number"
                  min="0"
                  step="1000"
                  value={baseSalary}
                  onChange={(e) => {
                    setBaseSalary(e.target.value);
                    setDailyRate((parseFloat(e.target.value || 0) / 30).toFixed(0));
                  }}
                  placeholder="1500000"
                  required
                />
              )}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              {salaryType === 'diario' ? (
                <span>Equivalente mensual estimado (30 días): <strong>{formatCOP((parseFloat(dailyRate) || 0) * 30)}</strong></span>
              ) : (
                <span>Equivalente diario estimado (30 días): <strong>{formatCOP((parseFloat(baseSalary) || 0) / 30)}</strong> / día</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <Input
              label="Comisión sobre Ventas (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="0 (Ej. 2%)"
            />

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Vincular a Usuario POS (Opcional)
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px'
                }}
              >
                <option value="">Sin usuario vinculado</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setEmployeeModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Guardar Empleado</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Liquidar / Pagar Día(s) Laborados */}
      <Modal
        isOpen={dailyPayModalOpen}
        onClose={() => setDailyPayModalOpen(false)}
        title="Liquidar & Pagar Día(s) Laborados / Jornales"
      >
        <form onSubmit={handleSubmitDailyPayment}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              Colaborador
            </label>
            <select
              value={liquidateEmployeeId}
              onChange={(e) => {
                setLiquidateEmployeeId(e.target.value);
                const emp = employees.find(x => x.id.toString() === e.target.value);
                if (emp) {
                  const rate = parseFloat(emp.daily_rate) > 0 ? emp.daily_rate : (parseFloat(emp.base_salary) / 30 || 50000);
                  setLiquidateDailyRate(rate.toString());
                }
              }}
              style={{
                width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '12px'
              }}
              required
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.position}) — Tarifa: {formatCOP(e.daily_rate || (e.base_salary / 30))}/día
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Fecha Inicio"
              type="date"
              value={liquidateDateStart}
              onChange={(e) => setLiquidateDateStart(e.target.value)}
              required
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={liquidateDateEnd}
              onChange={(e) => setLiquidateDateEnd(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Días Laborados"
              type="number"
              step="0.5"
              min="0.5"
              value={liquidateDays}
              onChange={(e) => setLiquidateDays(e.target.value)}
              placeholder="1"
              required
            />
            <Input
              label="Tarifa por Día ($)"
              type="number"
              min="0"
              step="1000"
              value={liquidateDailyRate}
              onChange={(e) => setLiquidateDailyRate(e.target.value)}
              placeholder="50000"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Bonificaciones / Propinas (+)"
              type="number"
              min="0"
              value={liquidateBonuses}
              onChange={(e) => setLiquidateBonuses(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Deducciones / Descuentos (-)"
              type="number"
              min="0"
              value={liquidateDeductions}
              onChange={(e) => setLiquidateDeductions(e.target.value)}
              placeholder="0"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Input
              label="Concepto / Observaciones"
              value={liquidateNotes}
              onChange={(e) => setLiquidateNotes(e.target.value)}
              placeholder="Ej. Pago turno de noche fin de semana"
            />
          </div>

          {/* Resumen Total */}
          <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', marginBottom: '14px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cálculo Base: {liquidateDays} día(s) × {formatCOP(liquidateDailyRate)}:</span>
              <strong>{formatCOP((parseFloat(liquidateDays) || 0) * (parseFloat(liquidateDailyRate) || 0))}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px', fontSize: '14px', fontWeight: 800 }}>
              <span>TOTAL NETO A PAGAR:</span>
              <span style={{ color: 'var(--accent-primary)', fontSize: '16px' }}>{formatCOP(calcTotalDailyPreview())}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setDailyPayModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting} icon={<CheckCircle size={15} />}>
              Registrar Pago Inmediato
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Programar Turno */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title="Programar Turno de Trabajo"
      >
        <form onSubmit={handleCreateShift}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Colaborador</label>
            <select
              value={shiftEmployeeId}
              onChange={(e) => setShiftEmployeeId(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              required
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.position})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <Input label="Fecha del Turno" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input label="Hora Entrada" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required />
            <Input label="Hora Salida" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setShiftModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Programar Turno</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Generar Nómina Período */}
      <Modal
        isOpen={generatePayrollModalOpen}
        onClose={() => setGeneratePayrollModalOpen(false)}
        title="Liquidar Período para Todo el Personal"
      >
        <form onSubmit={handleGeneratePayroll}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <Input label="Fecha Desde" type="date" value={payrollStart} onChange={(e) => setPayrollStart(e.target.value)} required />
            <Input label="Fecha Hasta" type="date" value={payrollEnd} onChange={(e) => setPayrollEnd(e.target.value)} required />
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            El sistema calculará automáticamente los días asistidos o la base de cada colaborador activo.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setGeneratePayrollModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Generar Liquidación</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Permiso */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Solicitud de Permiso / Vacaciones"
      >
        <form onSubmit={handleCreateLeave}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Colaborador</label>
            <select
              value={leaveEmployeeId}
              onChange={(e) => setLeaveEmployeeId(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
              required
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.position})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input label="Fecha Inicio" type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
            <Input label="Fecha Fin" type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Input label="Motivo / Notas" value={leaveNotes} onChange={(e) => setLeaveNotes(e.target.value)} placeholder="Ej. Cita médica o vacaciones anuales" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setLeaveModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Registrar Permiso</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
