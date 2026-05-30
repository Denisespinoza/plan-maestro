import { useState, useEffect } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getTodayAttendance,
  registerEntry,
  registerExit,
  getEmployeePayments,
  createPayment,
  deletePayment,
  getPersonalStats,
} from '../lib/personal';
import type { Employee, EmployeeAttendance, EmployeePayment, EmployeeStatus, PaymentType } from '../lib/types';
import {
  EMPLOYEE_STATUS_CONFIG,
  EMPLOYEE_STATUS_OPTIONS,
  PAYMENT_TYPE_CONFIG,
  PAYMENT_TYPE_OPTIONS,
} from '../lib/types';
import { Users, Plus, CreditCard as Edit3, Trash2, Clock, DollarSign, X, Save, Loader2, LogIn, LogOut, TrendingUp, TrendingDown } from 'lucide-react';

export default function Personal() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<EmployeeAttendance | null>(null);
  const [payments, setPayments] = useState<EmployeePayment[]>([]);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    phone: '',
    position: '',
    start_date: new Date().toISOString().split('T')[0],
    monthly_salary: 0,
    status: 'active' as EmployeeStatus,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_type: 'adelanto' as PaymentType,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, statsData] = await Promise.all([
        getEmployees(),
        getPersonalStats(),
      ]);
      setEmployees(employeesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    try {
      const [todayAtt, employeePayments] = await Promise.all([
        getTodayAttendance(employee.id),
        getEmployeePayments(employee.id),
      ]);
      setAttendance(todayAtt);
      setPayments(employeePayments);
    } catch (err) {
      console.error(err);
    }
  };

  const openNewEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      phone: '',
      position: '',
      start_date: new Date().toISOString().split('T')[0],
      monthly_salary: 0,
      status: 'active',
    });
    setShowEmployeeModal(true);
  };

  const openEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone || '',
      position: employee.position || '',
      start_date: employee.start_date || new Date().toISOString().split('T')[0],
      monthly_salary: employee.monthly_salary || 0,
      status: employee.status as EmployeeStatus,
    });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!employeeForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeForm);
      } else {
        await createEmployee(employeeForm);
      }
      setShowEmployeeModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee(id);
      setDeleteConfirm(null);
      setSelectedEmployee(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar empleado');
    }
  };

  const handleEntry = async () => {
    if (!selectedEmployee) return;
    try {
      const att = await registerEntry(selectedEmployee.id);
      setAttendance(att);
    } catch (err) {
      console.error(err);
      alert('Error al registrar entrada');
    }
  };

  const handleExit = async () => {
    if (!selectedEmployee) return;
    try {
      const att = await registerExit(selectedEmployee.id);
      setAttendance(att);
    } catch (err) {
      console.error(err);
      alert('Error al registrar salida');
    }
  };

  const openPaymentModal = () => {
    setPaymentForm({ amount: 0, payment_type: 'adelanto', notes: '' });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedEmployee || paymentForm.amount <= 0) return;
    setSaving(true);
    try {
      await createPayment({
        employee_id: selectedEmployee.id,
        amount: paymentForm.amount,
        payment_type: paymentForm.payment_type,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      const employeePayments = await getEmployeePayments(selectedEmployee.id);
      setPayments(employeePayments);
      loadData(); // Refresh stats
    } catch (err) {
      console.error(err);
      alert('Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment(id);
      if (selectedEmployee) {
        const employeePayments = await getEmployeePayments(selectedEmployee.id);
        setPayments(employeePayments);
      }
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar pago');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = selectedEmployee ? Math.max(0, Number(selectedEmployee.monthly_salary) - totalPaid) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crudo-100">Personal</h1>
          <p className="text-sm text-crudo-400 mt-1">{employees.length} empleados registrados</p>
        </div>
        <button onClick={openNewEmployee} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
          <Plus size={18} /> Nuevo Empleado
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500">Total empleados</p>
            <p className="text-xl font-bold text-petrol-800 dark:text-white">{stats.totalEmployees}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500">Activos</p>
            <p className="text-xl font-bold text-emerald-600">{stats.activeEmployees}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500">Inactivos</p>
            <p className="text-xl font-bold text-gray-500">{stats.inactiveEmployees}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500">Total sueldos</p>
            <p className="text-xl font-bold text-petrol-700 dark:text-petrol-300">${stats.totalSalaries.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 flex items-center gap-1"><TrendingUp size={12}/> Pagado</p>
            <p className="text-xl font-bold text-emerald-600">${stats.totalPaid.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-crudo-50 dark:bg-slate-800 rounded-lg p-3 border border-petrol-200 dark:border-slate-700">
            <p className="text-xs text-petrol-500 flex items-center gap-1"><TrendingDown size={12}/> Pendiente</p>
            <p className="text-xl font-bold text-amber-600">${stats.totalPending.toLocaleString('es-AR')}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employees list */}
        <div className="lg:col-span-1 bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-petrol-100 dark:bg-slate-700/50 border-b border-petrol-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300">Empleados</h2>
          </div>
          <div className="divide-y divide-petrol-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
            {employees.length === 0 ? (
              <div className="p-6 text-center text-petrol-400 text-sm">
                <Users size={24} className="mx-auto mb-2 opacity-50" />
                Sin empleados
              </div>
            ) : (
              employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  className={`w-full text-left p-3 hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    selectedEmployee?.id === emp.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-petrol-800 dark:text-white text-sm">{emp.name}</p>
                      <p className="text-xs text-petrol-500">{emp.position || 'Sin puesto'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${EMPLOYEE_STATUS_CONFIG[emp.status as EmployeeStatus]?.bgClass} ${EMPLOYEE_STATUS_CONFIG[emp.status as EmployeeStatus]?.textClass}`}>
                      {EMPLOYEE_STATUS_CONFIG[emp.status as EmployeeStatus]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-petrol-400 mt-1">
                    Sueldo: ${Number(emp.monthly_salary).toLocaleString('es-AR')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Employee detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEmployee ? (
            <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-8 border border-petrol-200 dark:border-slate-700 text-center">
              <Users size={40} className="mx-auto text-petrol-300 mb-3" />
              <p className="text-petrol-500 text-sm">Seleccioná un empleado</p>
            </div>
          ) : (
            <>
              {/* Employee info */}
              <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-4 border border-petrol-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-petrol-800 dark:text-white">{selectedEmployee.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedEmployee.position && (
                        <span className="text-xs px-2 py-0.5 bg-petrol-100 dark:bg-petrol-800 rounded text-petrol-600 dark:text-petrol-300">
                          {selectedEmployee.position}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${EMPLOYEE_STATUS_CONFIG[selectedEmployee.status as EmployeeStatus]?.bgClass} ${EMPLOYEE_STATUS_CONFIG[selectedEmployee.status as EmployeeStatus]?.textClass}`}>
                        {EMPLOYEE_STATUS_CONFIG[selectedEmployee.status as EmployeeStatus]?.label}
                      </span>
                    </div>
                    {selectedEmployee.phone && (
                      <p className="text-sm text-petrol-500 mt-1">{selectedEmployee.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditEmployee(selectedEmployee)} className="p-2 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-slate-700 rounded-lg">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => setDeleteConfirm(selectedEmployee.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-petrol-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-petrol-500">Sueldo mensual</p>
                    <p className="text-lg font-bold text-petrol-800 dark:text-white">${Number(selectedEmployee.monthly_salary).toLocaleString('es-AR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500">Pagado este mes</p>
                    <p className="text-lg font-bold text-emerald-600">${totalPaid.toLocaleString('es-AR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-petrol-500">Pendiente</p>
                    <p className="text-lg font-bold text-amber-600">${pending.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-4 border border-petrol-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 flex items-center gap-2">
                    <Clock size={16} /> Asistencia de hoy
                  </h4>
                </div>
                <div className="flex items-center gap-4">
                  {attendance ? (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg">
                        Entrada: {attendance.entry_time || '-'}
                      </span>
                      <span className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg">
                        Salida: {attendance.exit_time || '-'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-petrol-500">Sin registro de asistencia</span>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={handleEntry}
                    disabled={!!attendance?.entry_time}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    <LogIn size={14} /> Entrada
                  </button>
                  <button
                    onClick={handleExit}
                    disabled={!attendance?.entry_time || !!attendance?.exit_time}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-1"
                  >
                    <LogOut size={14} /> Salida
                  </button>
                </div>
              </div>

              {/* Payments */}
              <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-petrol-100 dark:bg-slate-700/50 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 flex items-center gap-2">
                    <DollarSign size={16} /> Pagos del mes
                  </h4>
                  <button onClick={openPaymentModal} className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                    <Plus size={14} /> Pago
                  </button>
                </div>
                <div className="divide-y divide-petrol-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                  {payments.length === 0 ? (
                    <div className="p-4 text-center text-petrol-400 text-sm">Sin pagos este mes</div>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${PAYMENT_TYPE_CONFIG[p.payment_type as PaymentType]?.color}`}>
                              {PAYMENT_TYPE_CONFIG[p.payment_type as PaymentType]?.label}
                            </span>
                            <span className="text-sm font-medium text-petrol-800 dark:text-white">${Number(p.amount).toLocaleString('es-AR')}</span>
                          </div>
                          <p className="text-xs text-petrol-500 mt-0.5">
                            {new Date(p.date).toLocaleDateString('es-AR')}
                            {p.notes && ` - ${p.notes}`}
                          </p>
                        </div>
                        <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700">
            <div className="p-4 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-petrol-800 dark:text-white">
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-petrol-400 hover:text-petrol-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={employeeForm.name}
                  onChange={e => setEmployeeForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Puesto</label>
                  <input
                    type="text"
                    value={employeeForm.position}
                    onChange={e => setEmployeeForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Fecha ingreso</label>
                  <input
                    type="date"
                    value={employeeForm.start_date}
                    onChange={e => setEmployeeForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Sueldo mensual</label>
                  <input
                    type="number"
                    min={0}
                    value={employeeForm.monthly_salary}
                    onChange={e => setEmployeeForm(f => ({ ...f, monthly_salary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Estado</label>
                  <select
                    value={employeeForm.status}
                    onChange={e => setEmployeeForm(f => ({ ...f, status: e.target.value as EmployeeStatus }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  >
                    {EMPLOYEE_STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{EMPLOYEE_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-petrol-200 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 bg-white dark:bg-slate-700 text-petrol-600 border border-petrol-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSaveEmployee} disabled={saving || !employeeForm.name.trim()} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700">
            <div className="p-4 border-b border-petrol-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-petrol-800 dark:text-white">Registrar Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-petrol-400 hover:text-petrol-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Monto *</label>
                <input
                  type="number"
                  min={0}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Tipo</label>
                <select
                  value={paymentForm.payment_type}
                  onChange={e => setPaymentForm(f => ({ ...f, payment_type: e.target.value as PaymentType }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                >
                  {PAYMENT_TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{PAYMENT_TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-petrol-600 dark:text-petrol-400 mb-1">Notas</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="p-4 border-t border-petrol-200 dark:border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-white dark:bg-slate-700 text-petrol-600 border border-petrol-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSavePayment} disabled={saving || paymentForm.amount <= 0} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-crudo-50 dark:bg-slate-800 rounded-xl shadow-xl border border-petrol-200 dark:border-slate-700 p-5">
            <h3 className="text-lg font-semibold text-petrol-800 dark:text-white mb-2">Eliminar empleado</h3>
            <p className="text-sm text-petrol-600 dark:text-petrol-400 mb-4">¿Estás seguro? Se eliminarán también todos los pagos y asistencias.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-white dark:bg-slate-700 text-petrol-600 border border-petrol-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => handleDeleteEmployee(deleteConfirm)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
