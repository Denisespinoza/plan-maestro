import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getAllUserProfiles, updateUserRole, type UserProfile } from '../lib/auth';
import { Users, ShieldCheck, UserCog, Loader2, RefreshCw } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  { value: 'asistente', label: 'Asistente', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' },
  { value: 'empleado', label: 'Empleado', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
];

function getRoleDisplay(role: string) {
  return ROLE_OPTIONS.find(r => r.value === role) ?? { value: role, label: role, color: 'bg-gray-100 text-gray-600' };
}

export default function UserManagement() {
  const { profile: currentProfile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUserProfiles();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentProfile?.id && newRole !== 'admin') {
      if (!confirm('¿Seguro que querés cambiar tu propio rol? Perderás acceso de administrador.')) return;
    }
    setSaving(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      setError('Error al actualizar rol');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldCheck size={40} className="text-petrol-300" />
        <p className="text-petrol-500 text-sm">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-petrol-800 dark:text-white flex items-center gap-2">
            <UserCog size={24} /> Gestión de Usuarios
          </h1>
          <p className="text-sm text-petrol-500 dark:text-petrol-400 mt-1">{users.length} usuarios registrados</p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="p-2 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
          title="Recargar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-crudo-50 dark:bg-slate-800 rounded-xl border border-petrol-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Users size={32} className="text-petrol-300" />
            <p className="text-petrol-400 text-sm">No hay usuarios</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-petrol-100 dark:bg-slate-700/50 text-xs text-petrol-500 dark:text-petrol-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rol actual</th>
                <th className="px-4 py-3 text-left font-medium">Cambiar rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-petrol-100 dark:divide-slate-700">
              {users.map(user => {
                const roleDisplay = getRoleDisplay(user.role);
                const isSelf = user.id === currentProfile?.id;
                return (
                  <tr key={user.id} className={`text-petrol-700 dark:text-petrol-200 ${isSelf ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-petrol-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-petrol-600 dark:text-petrol-300">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-petrol-800 dark:text-white">
                            {user.full_name || '—'}
                            {isSelf && <span className="ml-1.5 text-xs text-violet-500">(vos)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-petrol-500 dark:text-petrol-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleDisplay.color}`}>
                        {roleDisplay.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {saving === user.id ? (
                        <Loader2 size={16} className="animate-spin text-violet-500" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          className="px-2 py-1.5 bg-white dark:bg-slate-700 border border-petrol-200 dark:border-slate-600 rounded-lg text-sm text-petrol-700 dark:text-petrol-200 focus:ring-2 focus:ring-violet-500"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
