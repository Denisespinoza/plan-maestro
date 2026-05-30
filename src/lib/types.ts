export type OrderStatus = 'nuevo' | 'en_proceso' | 'esperando_confirmacion' | 'listo_entregar' | 'entregado' | 'cancelado';
export type Priority = 'normal' | 'urgent' | 'very_urgent';
export type ClientType = 'fabricante' | 'emprendedor' | 'taller' | 'revendedor' | 'otro';
export type ClientStatus = 'active' | 'pending' | 'inactive';

// Inventory types
export type Category = 'hombre' | 'mujer' | 'niño' | 'niña' | 'bebé' | 'deportivo' | 'escolar' | 'trabajo' | 'accesorios' | 'otros';
export type ModelStatus = 'active' | 'hidden' | 'archived';
export type FileType = 'pdf_a4' | 'pdf_plotter' | 'plt' | 'dxf' | 'cdr' | 'ai' | 'zip' | 'jpg' | 'png' | 'other';

export interface Client {
  id: string;
  name: string;
  business_name: string;
  contact_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  locality: string;
  province: string;
  client_type: ClientType;
  industry: string;
  notes: string;
  status: ClientStatus;
  is_favorite: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  client_whatsapp: string;
  garment_type: string;
  article_name: string;
  sizes: string;
  quantity: number;
  fabric_type: string;
  work_type: string;
  notes: string;
  delivery_date: string | null;
  status: OrderStatus;
  priority: Priority;
  price: number;
  paid_amount: number;
  remaining_balance: number;
  reference_image_url: string;
  pdf_file_url: string;
  mold_file_url: string;
  created_at: string;
  updated_at: string;
  model_id: string | null;
}

export interface OrderHistoryEntry {
  id: string;
  order_id: string;
  action: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface GarmentType {
  id: string;
  name: string;
  usage_count: number;
}

// Inventory and Mold Library types
export interface InventoryModel {
  id: string;
  code: string;
  name: string;
  category: Category;
  subcategory: string;
  size_curve: string;
  recommended_fabric: string;
  description: string;
  main_photo_url: string;
  quantity_available: number;
  quantity_sold: number;
  status: ModelStatus;
  created_at: string;
  updated_at: string;
}

export interface MoldFile {
  id: string;
  model_id: string;
  file_name: string;
  file_type: FileType;
  file_url: string;
  version: string;
  technical_notes: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgClass: string; textClass: string; dotClass: string }> = {
  nuevo: { label: 'Nuevo', color: '#B8A4FF', bgClass: 'bg-violet-100 dark:bg-violet-900/30', textClass: 'text-violet-700 dark:text-violet-300', dotClass: 'bg-violet-500' },
  en_proceso: { label: 'En proceso', color: '#0F4C5C', bgClass: 'bg-petrol-100 dark:bg-petrol-900/30', textClass: 'text-petrol-700 dark:text-petrol-300', dotClass: 'bg-petrol-500' },
  esperando_confirmacion: { label: 'Esperando confirmación', color: '#F59E0B', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', dotClass: 'bg-amber-500' },
  listo_entregar: { label: 'Listo para entregar', color: '#10B981', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', textClass: 'text-emerald-700 dark:text-emerald-300', dotClass: 'bg-emerald-500' },
  entregado: { label: 'Entregado', color: '#6B7280', bgClass: 'bg-gray-100 dark:bg-gray-700/30', textClass: 'text-gray-600 dark:text-gray-400', dotClass: 'bg-gray-500' },
  cancelado: { label: 'Cancelado', color: '#EF4444', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300', dotClass: 'bg-red-500' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; bgClass: string; textClass: string }> = {
  normal: { label: 'Normal', bgClass: 'bg-gray-100 dark:bg-gray-700/50', textClass: 'text-gray-600 dark:text-gray-400' },
  urgent: { label: 'Urgente', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300' },
  very_urgent: { label: 'Muy urgente', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300' },
};

export const CLIENT_TYPE_CONFIG: Record<ClientType, { label: string }> = {
  fabricante: { label: 'Fabricante' },
  emprendedor: { label: 'Emprendedor' },
  taller: { label: 'Taller' },
  revendedor: { label: 'Revendedor' },
  otro: { label: 'Otro' },
};

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  active: { label: 'Activo', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', textClass: 'text-emerald-700 dark:text-emerald-300', dotClass: 'bg-emerald-500' },
  pending: { label: 'Pendiente', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', dotClass: 'bg-amber-500' },
  inactive: { label: 'Inactivo', bgClass: 'bg-gray-100 dark:bg-gray-700/50', textClass: 'text-gray-600 dark:text-gray-400', dotClass: 'bg-gray-500' },
};

// Inventory configs
export const CATEGORY_CONFIG: Record<Category, { label: string }> = {
  hombre: { label: 'Hombre' },
  mujer: { label: 'Mujer' },
  niño: { label: 'Niño' },
  niña: { label: 'Niña' },
  bebé: { label: 'Bebé' },
  deportivo: { label: 'Deportivo' },
  escolar: { label: 'Escolar' },
  trabajo: { label: 'Trabajo' },
  accesorios: { label: 'Accesorios' },
  otros: { label: 'Otros' },
};

export const MODEL_STATUS_CONFIG: Record<ModelStatus, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  active: { label: 'Activo', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', textClass: 'text-emerald-700 dark:text-emerald-300', dotClass: 'bg-emerald-500' },
  hidden: { label: 'Oculto', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', dotClass: 'bg-amber-500' },
  archived: { label: 'Archivado', bgClass: 'bg-gray-100 dark:bg-gray-700/50', textClass: 'text-gray-600 dark:text-gray-400', dotClass: 'bg-gray-500' },
};

export const FILE_TYPE_CONFIG: Record<FileType, { label: string; extension: string }> = {
  pdf_a4: { label: 'PDF A4', extension: '.pdf' },
  pdf_plotter: { label: 'PDF Plotter', extension: '.pdf' },
  plt: { label: 'PLT', extension: '.plt' },
  dxf: { label: 'DXF', extension: '.dxf' },
  cdr: { label: 'CDR', extension: '.cdr' },
  ai: { label: 'AI', extension: '.ai' },
  zip: { label: 'ZIP', extension: '.zip' },
  jpg: { label: 'JPG', extension: '.jpg' },
  png: { label: 'PNG', extension: '.png' },
  other: { label: 'Otro', extension: '' },
};

export const WORK_TYPE_OPTIONS = [
  'Moldería digital',
  'Cartón',
  'Tizado',
  'Diseño a pedido',
  'Otro',
];

export const STATUS_OPTIONS: OrderStatus[] = ['nuevo', 'en_proceso', 'esperando_confirmacion', 'listo_entregar', 'entregado', 'cancelado'];
export const PRIORITY_OPTIONS: Priority[] = ['normal', 'urgent', 'very_urgent'];
export const CLIENT_TYPE_OPTIONS: ClientType[] = ['fabricante', 'emprendedor', 'taller', 'revendedor', 'otro'];
export const CLIENT_STATUS_OPTIONS: ClientStatus[] = ['active', 'pending', 'inactive'];
export const CATEGORY_OPTIONS: Category[] = ['hombre', 'mujer', 'niño', 'niña', 'bebé', 'deportivo', 'escolar', 'trabajo', 'accesorios', 'otros'];
export const MODEL_STATUS_OPTIONS: ModelStatus[] = ['active', 'hidden', 'archived'];
export const FILE_TYPE_OPTIONS: FileType[] = ['pdf_a4', 'pdf_plotter', 'plt', 'dxf', 'cdr', 'ai', 'zip', 'jpg', 'png', 'other'];
