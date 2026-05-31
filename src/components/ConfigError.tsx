import { AlertTriangle, Settings, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { getMissingVars, SETUP_INSTRUCTIONS } from '../lib/config';

export default function ConfigError() {
  const [copied, setCopied] = useState(false);
  const missingVars = getMissingVars();

  const handleCopyInstructions = () => {
    navigator.clipboard.writeText(SETUP_INSTRUCTIONS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-500/10 border-b border-red-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Error de Configuración</h1>
                <p className="text-sm text-slate-400">
                  La aplicación no puede iniciar sin las variables de entorno requeridas
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Missing vars alert */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-amber-400 text-sm font-medium">
                Variables faltantes:
              </p>
              <ul className="mt-2 space-y-1">
                {missingVars.map((varName) => (
                  <li key={varName} className="flex items-center gap-2 text-amber-300/80 text-sm font-mono">
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                    {varName}
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Settings size={16} />
                  Instrucciones de Configuración
                </h2>
                <button
                  onClick={handleCopyInstructions}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-400 text-xs font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={14} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar instrucciones
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                {SETUP_INSTRUCTIONS}
              </pre>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm transition-colors"
              >
                <ExternalLink size={16} />
                Abrir Supabase Dashboard
              </a>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
              >
                <ExternalLink size={16} />
                Abrir Vercel Dashboard
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-900/50 border-t border-slate-700 p-4">
            <p className="text-center text-xs text-slate-500">
              CEO MODELTEX - Centro de Operaciones Modeltex
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
