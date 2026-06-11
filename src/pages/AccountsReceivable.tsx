import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, X, Save, Loader2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Clock, CreditCard,
} from 'lucide-react';
import {
  getReceivables, createReceivable, updateReceivable, deleteReceivable,
  getReceivablePayments, addReceivablePayment,
  computeReceivableSummary,
  RECEIVABLE_STATUS_CONFIG,
  type AccountsReceivable, type AccountsReceivablePayment, type ReceivableStatus,
} from '../lib/debts';

const currency = (v: number) =>
  v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const today = () => new Date().toISOString().split('T')[0];

const isOverdue = (item: AccountsReceivable) =>
  item.status !== 'collected' && !!item.due_date && item.due_date < today();

type FilterStatus = ReceivableStatus | '';

interface DebtForm {
  debtor_name: string;
  amount: string;
  description: string;
  origin_date: string;
  due_date: string;
  status: ReceivableStatus;
  notes: string;
}

const EMPTY_FORM: DebtForm = {
  debtor_name: '',
  amount: '',
  description: '',
  origin_date: today(),
  due_date: '',
  status: 'pending',
  notes: '',
};

export default function AccountsReceivable() {
  const [items, setItems]           = useState<AccountsReceivable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<AccountsReceivable | null>(null);
  const [form, setForm]             = useState<DebtForm>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments]     = useState<Record<string, AccountsReceivablePayment[]>>({});
  const [payForm, setPayForm]       = useState({ amount: '', date: today(), notes: '' });
  const [payingSaving, setPayingSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setItems(await getReceivables()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const summary = useMemo(() => computeReceivableSummary(items), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      const matchSearch = !q || i.debtor_name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      const matchStatus = !filterStatus || i.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [items, search, filterStatus]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: AccountsReceivable) => {
    setEditing(item);
    setForm({
      debtor_name: item.debtor_name,
      amount: String(item.amount),
      description: item.description,
      origin_date: item.origin_date,
      due_date: item.due_date || '',
      status: item.status,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.debtor_name.trim() || !form.amount) return;
    setSaving(true);
    try {
      const payload = {
        debtor_name: form.debtor_name.trim(),
        amount: Number(form.amount),
        paid_amount: editing?.paid_amount || 0,
        description: form.description.trim(),
        origin_date: form.origin_date,
        due_date: form.due_date || null,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editing) {
        await updateReceivable(editing.id, payload);
      } else {
        await createReceivable(payload);
      }
      setShowModal(false);
      await load();
    } catch (e) { console.error(e); alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta a cobrar?')) return;
    try { await deleteReceivable(id); await load(); } catch (e) { alert('Error al eliminar'); }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setPayForm({ amount: '', date: today(), notes: '' });
    if (!payments[id]) {
      try {
        const p = await getReceivablePayments(id);
        setPayments(prev => ({ ...prev, [id]: p }));
      } catch (e) { console.error(e); }
    }
  };

  const handleAddPayment = async (item: AccountsReceivable) => {
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return;
    setPayingSaving(true);
    try {
      await addReceivablePayment(item.id, amount, payForm.date, payForm.notes, item.paid_amount, item.amount);
      const [newItems, newPayments] = await Promise.all([getReceivables(), getReceivablePayments(item.id)]);
      setItems(newItems);
      setPayments(prev => ({ ...prev, [item.id]: newPayments }));
      setPayForm({ amount: '', date: today(), notes: '' });
    } catch (e) { console.error(e); alert('Error al registrar pago'); }
    finally { setPayingSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-crudo-100">Cuentas a Cobrar</h2>
          <p className="text-xs text-crudo-400 mt-0.5">Lo que terceros le deben a Modeltex</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 text-white"
          style={{ backgroundColor: '#B8860B' }}
        >
          <Plus size={15} /> Nueva deuda
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Pendiente de cobro"
          value={currency(summary.pending)}
          icon={Clock}
          colorClass="bg-amber-500"
          valueClass="text-amber-500"
        />
        <SummaryCard
          label="Vencido"
          value={currency(summary.overdue)}
          icon={AlertCircle}
          colorClass="bg-red-600"
          valueClass="text-red-500"
        />
        <SummaryCard
          label="Cobrado total"
          value={currency(summary.collected)}
          icon={CheckCircle2}
          colorClass="bg-emerald-600"
          valueClass="text-emerald-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-petrol-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Cobrado parcialmente</option>
          <option value="collected">Cobrado total</option>
          <option value="overdue">Vencido</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-petrol-400 text-sm">No hay registros para mostrar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-petrol-500 dark:text-petrol-400 border-b border-petrol-100 dark:border-slate-700 bg-petrol-50 dark:bg-slate-900/30">
                <th className="py-3 px-4">Deudor</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Cobrado</th>
                <th className="py-3 px-4 text-right">Pendiente</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const overdue = isOverdue(item);
                const pending = Number(item.amount) - Number(item.paid_amount);
                const isExpanded = expandedId === item.id;
                return (
                  <>
                    <tr
                      key={item.id}
                      className={`border-b border-petrol-100 dark:border-slate-700/70 transition-colors ${
                        overdue ? 'bg-red-50/40 dark:bg-red-900/10' : 'hover:bg-white/50 dark:hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-crudo-100">{item.debtor_name}</div>
                        <div className="text-xs text-petrol-400 truncate max-w-48">{item.description}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-crudo-200">{currency(Number(item.amount))}</td>
                      <td className="py-3 px-4 text-right text-emerald-500">{currency(Number(item.paid_amount))}</td>
                      <td className={`py-3 px-4 text-right font-bold ${overdue ? 'text-red-500' : 'text-amber-500'}`}>
                        {currency(pending)}
                      </td>
                      <td className="py-3 px-4 text-xs text-crudo-300">
                        {item.due_date
                          ? <span className={overdue ? 'text-red-500 font-semibold' : ''}>{item.due_date}</span>
                          : <span className="text-petrol-400">—</span>
                        }
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={overdue && item.status !== 'collected' ? 'overdue' : item.status} config={RECEIVABLE_STATUS_CONFIG} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                            title={isExpanded ? 'Cerrar historial' : 'Ver historial / registrar pago'}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-500"
                            title="Editar"
                          >
                            <CreditCard size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: payment history + add payment */}
                    {isExpanded && (
                      <tr key={`${item.id}-expanded`} className="bg-slate-900/20 dark:bg-slate-900/40 border-b border-petrol-100 dark:border-slate-700">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Payment history */}
                            <div>
                              <h4 className="text-xs font-semibold text-petrol-400 uppercase mb-2">Historial de cobros</h4>
                              {(payments[item.id] || []).length === 0 ? (
                                <p className="text-xs text-petrol-500">Sin cobros registrados.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {(payments[item.id] || []).map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-xs bg-white/50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                                      <span className="text-crudo-300">{p.payment_date}</span>
                                      <span className="font-semibold text-emerald-500">{currency(Number(p.amount))}</span>
                                      {p.notes && <span className="text-petrol-400 truncate max-w-32">{p.notes}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Add payment form */}
                            {item.status !== 'collected' && (
                              <div>
                                <h4 className="text-xs font-semibold text-petrol-400 uppercase mb-2">Registrar cobro parcial</h4>
                                <div className="flex flex-wrap gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={payForm.amount}
                                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                                    placeholder="Monto cobrado"
                                    className="flex-1 min-w-28 px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                                  />
                                  <input
                                    type="date"
                                    value={payForm.date}
                                    onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))}
                                    className="px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                                  />
                                  <input
                                    value={payForm.notes}
                                    onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Nota (opcional)"
                                    className="flex-1 min-w-28 px-3 py-2 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => handleAddPayment(item)}
                                    disabled={payingSaving || !payForm.amount}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
                                    style={{ backgroundColor: '#B8860B' }}
                                  >
                                    {payingSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Registrar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-crudo-100">{editing ? 'Editar cuenta a cobrar' : 'Nueva cuenta a cobrar'}</h3>
              <button onClick={() => setShowModal(false)} className="text-petrol-400 hover:text-crudo-200"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-petrol-400 mb-1">Nombre del deudor *</label>
                <input
                  value={form.debtor_name}
                  onChange={e => setForm(f => ({ ...f, debtor_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                  placeholder="Nombre o empresa"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-petrol-400 mb-1">Monto total *</label>
                  <input
                    type="number" min="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-400 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ReceivableStatus }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="partial">Cobrado parcialmente</option>
                    <option value="collected">Cobrado total</option>
                    <option value="overdue">Vencido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-400 mb-1">Fecha de origen</label>
                  <input
                    type="date"
                    value={form.origin_date}
                    onChange={e => setForm(f => ({ ...f, origin_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-petrol-400 mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-petrol-400 mb-1">Motivo / descripción</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100"
                  placeholder="Descripción de la deuda"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-petrol-400 mb-1">Notas adicionales</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-crudo-100 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm border border-slate-600 text-petrol-300">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.debtor_name.trim() || !form.amount}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
                style={{ backgroundColor: '#B8860B' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, colorClass, valueClass }: {
  label: string; value: string; icon: typeof Clock; colorClass: string; valueClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-petrol-100 dark:border-slate-600">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClass}`}><Icon size={18} className="text-white" /></div>
        <div>
          <p className="text-xs text-petrol-500 dark:text-petrol-400">{label}</p>
          <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, config }: { status: string; config: Record<string, { label: string; bg: string; text: string }> }) {
  const c = config[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
  );
}
