import { supabase } from './supabase';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSystemContext {
  pendingOrders: number;
  activeModels: number;
  totalClients: number;
  latestOrders: Array<{
    order_number: string;
    customer_name: string;
    article_name: string;
    status: string;
    created_at: string;
  }>;
  lowStockModels: Array<{
    code: string;
    name: string;
    quantity_available: number;
  }>;
  generatedAt: string;
}

export async function getAiSystemContext(): Promise<AiSystemContext> {
  const pendingStatuses = ['nuevo', 'en_proceso', 'esperando_confirmacion'];

  const [pendingOrders, activeModels, totalClients, latestOrders, lowStockModels] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', pendingStatuses),
    supabase
      .from('inventory_models')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('order_number, customer_name, article_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('inventory_models')
      .select('code, name, quantity_available')
      .lte('quantity_available', 2)
      .eq('status', 'active')
      .order('quantity_available', { ascending: true })
      .limit(5),
  ]);

  const failures = [pendingOrders, activeModels, totalClients, latestOrders, lowStockModels]
    .map(result => result.error)
    .filter(Boolean);

  if (failures.length > 0) {
    throw new Error(failures.map(error => error?.message).join(' | '));
  }

  return {
    pendingOrders: pendingOrders.count ?? 0,
    activeModels: activeModels.count ?? 0,
    totalClients: totalClients.count ?? 0,
    latestOrders: latestOrders.data ?? [],
    lowStockModels: lowStockModels.data ?? [],
    generatedAt: new Date().toISOString(),
  };
}

export async function sendAiChat(messages: AiChatMessage[], context: AiSystemContext): Promise<string> {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo obtener respuesta del asistente.');
  }

  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    throw new Error('La respuesta del asistente llegó vacía.');
  }

  return payload.reply.trim();
}
