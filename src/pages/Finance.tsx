import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/types';
import { exportToCSV, exportToPDFSimple } from '../lib/exports';
import { getWhatsAppLink, WHATSAPP_TEMPLATES } from '../lib/clients';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  MessageCircle,
} from 'lucide-react';

export default function Finance() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
    }

  const totalSales = orders.reduce((sum, o) => sum + Number(o.price), 0);
  const totalPaid = orders.reduce((sum, o) => sum + Number(o.paid_amount), 0);
  const totalPending = orders.reduce((sum, o) => sum + Number(o.remaining_balance), 0);
  const paidOrders = orders.filter(o => Number(o.remaining_balance) <= 0 && Number(o.price) > 0);
  const unpaidOrders = orders.filter(o => Number(o.remaining_balance) > 0);
  const deliveredOrders = orders.filter(o => o.status === 'entregado');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crudo-100">Finanzas</h1>
          <p className="text-sm text-crudo-400 mt-1">Seguimiento de pagos y resumen financiero</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(orders, 'modeltex-finanzas')}
            className="px-3 py-2 bg-petrol-700 hover:bg-petrol-600 text-crudo-200 rounded-lg text-xs font-medium border border-petrol-600 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button
            onClick={() => exportToPDFSimple(orders, 'modeltex-finanzas')}
            className="px-3 py-2 bg-petrol-700 hover:bg-petrol-600 text-crudo-200 rounded-lg text-xs font-medium border border-petrol-600 transition-colors flex items-center gap-1.5"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-500"><TrendingUp size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Ventas totales</p>
              <p className="text-xl font-bold text-petrol-800 dark:text-white">${totalSales.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600"><CheckCircle2 size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Total cobrado</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-600"><DollarSign size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Saldo pendiente</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">${totalPending.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-petrol-600"><AlertCircle size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-petrol-500 dark:text-petrol-400">Tasa de cobranza</p>
              <p className="text-xl font-bold text-petrol-800 dark:text-white">
                {totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} /> Pedidos pagados ({paidOrders.length})
          </h2>
          {paidOrders.length === 0 ? (
            <p className="text-xs text-petrol-400">No hay pedidos totalmente pagados</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paidOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs border border-petrol-100 dark:border-slate-600">
                  <div>
                    <span className="font-medium text-violet-600 dark:text-violet-400">{o.order_number}</span>
                    <span className="text-petrol-500 dark:text-petrol-400 ml-2">{o.customer_name}</span>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">${Number(o.price).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <DollarSign size={16} /> Pedidos con saldo ({unpaidOrders.length})
          </h2>
          {unpaidOrders.length === 0 ? (
            <p className="text-xs text-petrol-400">Todos los pedidos están pagados</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unpaidOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs border border-petrol-100 dark:border-slate-600">
                  <div>
                    <span className="font-medium text-violet-600 dark:text-violet-400">{o.order_number}</span>
                    <span className="text-petrol-500 dark:text-petrol-400 ml-2">{o.customer_name}</span>
                    {(o.client_whatsapp || o.phone) && (
                      <a
                        href={getWhatsAppLink(o.client_whatsapp || o.phone, WHATSAPP_TEMPLATES.paymentReminder(o.order_number, Number(o.remaining_balance)))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-green-500 hover:text-green-600 inline-flex items-center"
                      >
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">${Number(o.remaining_balance).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivered orders revenue */}
      <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl p-5 border border-petrol-200 dark:border-slate-700/50">
        <h2 className="text-sm font-semibold text-petrol-700 dark:text-petrol-300 uppercase tracking-wide mb-3">
          Ingresos de pedidos entregados
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Pedidos entregados</p>
            <p className="text-lg font-bold text-petrol-800 dark:text-white">{deliveredOrders.length}</p>
          </div>
          <div>
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Ingresos de entregados</p>
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
              ${deliveredOrders.reduce((s, o) => s + Number(o.price), 0).toLocaleString('es-AR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-petrol-500 dark:text-petrol-400">Pendiente de entregados</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              ${deliveredOrders.reduce((s, o) => s + Number(o.remaining_balance), 0).toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
