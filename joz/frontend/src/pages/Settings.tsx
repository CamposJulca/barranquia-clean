import { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  User,
  Shield,
  Loader2,
  Save,
  Key,
  Eye,
  EyeOff,
  Activity,
  Scissors,
  Users,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  getReglas,
  createRegla,
  updateRegla,
  deleteRegla,
  runDeteccion,
} from '../services/api';
import api from '../services/api';

// ── ICON MAP ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Activity> = {
  Activity,
  Scissors,
  Users,
  AlertTriangle,
  Shield,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Activity;
}

// ── TIPOS ──────────────────────────────────────────────────────────────────

interface Regla {
  id: number;
  nombre: string;
  tipo_motor: string;
  habilitada: boolean;
  orden: number;
  descripcion_simple: string;
  descripcion_tecnica: string;
  formula: string;
  variables: { symbol: string; meaning: string }[];
  parametros: Record<string, number | string[]>;
  severidad_reglas: { level: string; condition: string; color: string }[];
  icono: string;
  color: string;
  es_sistema: boolean;
  creada_en: string | null;
  actualizada_en: string | null;
}

// ── Metadata de parámetros por motor ───────────────────────────────────────

interface ParamMeta {
  key: string;
  label: string;
  step: number;
  min: number;
  max: number;
  suffix: string;
}

const PARAMS_POR_MOTOR: Record<string, ParamMeta[]> = {
  zscore: [
    { key: 'zscore_media', label: 'Z-score severidad media', step: 0.1, min: 0.5, max: 10, suffix: 'σ' },
    { key: 'zscore_alta', label: 'Z-score severidad alta', step: 0.1, min: 1, max: 15, suffix: 'σ' },
    { key: 'zscore_critica', label: 'Z-score severidad crítica', step: 0.1, min: 1.5, max: 20, suffix: 'σ' },
  ],
  conteo: [
    { key: 'min_txns', label: 'Mínimo txns (media)', step: 1, min: 2, max: 50, suffix: 'txns/día' },
    { key: 'min_txns_alta', label: 'Mínimo txns (alta)', step: 1, min: 3, max: 100, suffix: 'txns/día' },
    { key: 'min_txns_critica', label: 'Mínimo txns (crítica)', step: 1, min: 5, max: 200, suffix: 'txns/día' },
  ],
  ratio: [
    { key: 'ratio_media', label: 'Ratio mínimo para alertar', step: 0.1, min: 1, max: 50, suffix: 'x promedio' },
    { key: 'ratio_alta', label: 'Ratio para severidad alta', step: 0.1, min: 1, max: 50, suffix: 'x promedio' },
  ],
};

const MOTOR_LABELS: Record<string, string> = {
  zscore: 'Z-Score (desviación estadística)',
  conteo: 'Conteo (agrupación y umbral)',
  ratio: 'Ratio (proporción vs promedio)',
};

const DEFAULTS_POR_MOTOR: Record<string, Record<string, number>> = {
  zscore: { zscore_media: 2.0, zscore_alta: 3.0, zscore_critica: 4.0 },
  conteo: { min_txns: 5, min_txns_alta: 10, min_txns_critica: 20 },
  ratio: { ratio_media: 2.0, ratio_alta: 3.0 },
};

const MOTOR_COLORS: Record<string, string> = {
  zscore: '#f59e0b',
  conteo: '#8b5cf6',
  ratio: '#06b6d4',
};

// Tipos de transacción permitidos para tipos_aplicables.
// Si el ERP suma tipos nuevos (Venta, etc), ampliar acá y en el backend
// (_validar_regla.TIPOS_VALIDOS en views.py).
const TIPOS_TRANSACCION = ['Aporte', 'Retiro'] as const;
type TipoTxn = typeof TIPOS_TRANSACCION[number];

const getTiposAplicables = (parametros: Regla['parametros']): TipoTxn[] => {
  const raw = parametros?.tipos_aplicables;
  if (!Array.isArray(raw) || raw.length === 0) return [...TIPOS_TRANSACCION];
  return raw.filter((t): t is TipoTxn => TIPOS_TRANSACCION.includes(t as TipoTxn));
};

// ── USUARIOS ───────────────────────────────────────────────────────────────

function UsersPanel() {
  const username = localStorage.getItem('joz_username') || 'admin';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage({ text: 'Completa todos los campos.', ok: false });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden.', ok: false });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.post('/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ text: 'Contraseña actualizada correctamente.', ok: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'No se pudo cambiar la contraseña.';
      setMessage({ text: msg, ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#2a3a50] bg-[#162032] p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#d4a853]" />
          Usuario actual
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0c1220] rounded-xl p-4 border border-[#2a3a50]">
            <span className="text-[10px] uppercase tracking-widest text-[#4a5a6a] font-semibold">Usuario</span>
            <p className="text-white font-medium mt-1">{username}</p>
          </div>
          <div className="bg-[#0c1220] rounded-xl p-4 border border-[#2a3a50]">
            <span className="text-[10px] uppercase tracking-widest text-[#4a5a6a] font-semibold">Rol</span>
            <p className="text-white font-medium mt-1 flex items-center gap-2">
              Administrador
              <Badge className="bg-[#d4a853]/10 text-[#d4a853] border-[#d4a853]/20 text-[10px]">Superuser</Badge>
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-[#2a3a50] bg-[#162032] p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-[#d4a853]" />
          Cambiar contraseña
        </h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Contraseña actual</Label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#0c1220] border border-[#2a3a50] text-white rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/50 focus:border-[#d4a853]/50"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5a6a] hover:text-[#7a8ea0] transition">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Nueva contraseña</Label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0c1220] border border-[#2a3a50] text-white rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/50 focus:border-[#d4a853]/50"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5a6a] hover:text-[#7a8ea0] transition">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Confirmar contraseña</Label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0c1220] border border-[#2a3a50] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/50 focus:border-[#d4a853]/50"
            />
          </div>
          {message && (
            <div className={`rounded-lg px-4 py-2.5 text-sm border ${message.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {message.text}
            </div>
          )}
          <Button onClick={handleChangePassword} disabled={saving} className="bg-gradient-to-r from-[#d4a853] to-[#b8892e] text-[#0c1220] font-semibold hover:from-[#e8c468] hover:to-[#d4a853]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Guardando...' : 'Actualizar contraseña'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── RULE CARD (administrable) ──────────────────────────────────────────────

function RuleCard({
  regla,
  saving,
  onToggle,
  onUpdateParam,
  onSave,
  onDelete,
}: {
  regla: Regla;
  saving: boolean;
  onToggle: (id: number, habilitada: boolean) => void;
  onUpdateParam: (id: number, key: string, value: number | string[]) => void;
  onSave: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = getIcon(regla.icono);
  const paramsMeta = PARAMS_POR_MOTOR[regla.tipo_motor] || [];

  return (
    <Card className={`border transition-colors duration-200 ${
      regla.habilitada
        ? 'border-[#2a3a50] bg-[#162032]'
        : 'border-[#1e2a3a] bg-[#111a28] opacity-70'
    }`}>
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${regla.color}15`, border: `1px solid ${regla.color}30` }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: regla.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">{regla.nombre}</h3>
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  regla.habilitada
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-[#2a3a50]/50 text-[#4a5a6a] border-[#2a3a50]'
                }`}>
                  {regla.habilitada ? 'Activa' : 'Inactiva'}
                </Badge>
                {regla.es_sistema && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Sistema
                  </Badge>
                )}
                <Badge className="text-[10px] px-1.5 py-0 bg-[#2a3a50]/50 text-[#6a7a8a] border-[#2a3a50]">
                  {MOTOR_LABELS[regla.tipo_motor] || regla.tipo_motor}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!regla.es_sistema && (
              confirmDelete ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                    onClick={() => onDelete(regla.id)}
                    disabled={saving}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-[#4a5a6a] hover:text-[#7a8ea0]"
                    onClick={() => setConfirmDelete(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-[#3a4a5a] hover:text-red-400 transition p-1"
                  title="Eliminar regla"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => onToggle(regla.id, !regla.habilitada)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                regla.habilitada
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              } disabled:opacity-50`}
            >
              {regla.habilitada ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>

        {/* Explicación simple */}
        {regla.descripcion_simple && (
          <div className="mt-3 ml-12 rounded-lg bg-[#0a0f1a]/60 border border-[#1e2a3a] px-4 py-3">
            <p className="text-xs text-[#8a9ab0] leading-relaxed italic">
              {regla.descripcion_simple}
            </p>
          </div>
        )}
      </div>

      {/* Fórmula + detalles expandibles */}
      <div className="px-5 pt-4 pb-5">
        {(regla.formula || regla.severidad_reglas?.length > 0) && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#4a5a6a] hover:text-[#7a8ea0] transition font-semibold"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Fórmula y reglas de severidad
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-3">
            {regla.descripcion_tecnica && (
              <p className="text-xs text-[#7a8ea0] leading-relaxed">{regla.descripcion_tecnica}</p>
            )}

            {regla.formula && (
              <div className="rounded-lg bg-[#0a0f1a] border border-[#1e2a3a] p-4">
                <div className="text-center mb-3">
                  <code className="text-base font-mono font-bold" style={{ color: regla.color }}>
                    {regla.formula}
                  </code>
                </div>
                {regla.variables?.length > 0 && (
                  <div className="space-y-1">
                    {regla.variables.map((v) => (
                      <div key={v.symbol} className="flex items-baseline gap-2 text-xs">
                        <code className="font-mono text-white font-semibold min-w-[100px]">{v.symbol}</code>
                        <span className="text-[#5a6a7a]">=</span>
                        <span className="text-[#7a8ea0]">{v.meaning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {regla.severidad_reglas?.length > 0 && (
              <div className="rounded-lg bg-[#0a0f1a] border border-[#1e2a3a] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#4a5a6a] font-semibold mb-2">
                  Reglas de severidad
                </p>
                <div className="space-y-1.5">
                  {regla.severidad_reglas.map((sr, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`font-semibold min-w-[60px] ${sr.color}`}>{sr.level}</span>
                      <span className="text-[#5a6a7a]">cuando</span>
                      <code className="font-mono text-[#7a8ea0]">{sr.condition}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parámetros configurables */}
        {paramsMeta.length > 0 && (
          <div className={`${expanded ? 'mt-4' : 'mt-3'} pt-3 border-t border-[#1e2a3a]`}>
            <p className="text-[10px] uppercase tracking-widest text-[#4a5a6a] font-semibold mb-3">
              Parámetros configurables
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {paramsMeta.map((pm) => (
                <div key={pm.key} className="space-y-1.5">
                  <Label className="text-[10px] text-[#7a8ea0] uppercase tracking-wide">
                    {pm.label}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step={pm.step}
                      min={pm.min}
                      max={pm.max}
                      value={(regla.parametros[pm.key] as number | undefined) ?? ''}
                      onChange={(e) => onUpdateParam(regla.id, pm.key, Number(e.target.value))}
                      className="border-[#2a3a50] bg-[#0c1220] text-white h-9 text-sm pr-16"
                      disabled={saving}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#4a5a6a] font-mono">
                      {pm.suffix}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tipos de transacción aplicables */}
            <div className="mt-4 pt-3 border-t border-[#1e2a3a]">
              <p className="text-[10px] uppercase tracking-widest text-[#4a5a6a] font-semibold mb-2">
                Aplica a tipos de transacción
              </p>
              <p className="text-[11px] text-[#5a6a7a] mb-3 leading-relaxed">
                La regla evalúa sólo transacciones de los tipos marcados. Mínimo uno.
              </p>
              <div className="flex flex-wrap gap-3">
                {TIPOS_TRANSACCION.map(tipo => {
                  const seleccionados = getTiposAplicables(regla.parametros);
                  const checked = seleccionados.includes(tipo);
                  const esUltimo = checked && seleccionados.length === 1;
                  return (
                    <label
                      key={tipo}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs select-none transition ${
                        checked
                          ? 'border-[#d4a853]/40 bg-[#d4a853]/10 text-[#f0e6d0]'
                          : 'border-[#2a3a50] bg-[#0c1220] text-[#7a8ea0] hover:border-[#3a4a5a]'
                      } ${esUltimo ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={esUltimo ? 'Al menos un tipo debe quedar marcado' : undefined}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#d4a853] w-3.5 h-3.5"
                        checked={checked}
                        disabled={saving || esUltimo}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...seleccionados, tipo]))
                            : seleccionados.filter(t => t !== tipo);
                          if (next.length === 0) return;
                          onUpdateParam(regla.id, 'tipos_aplicables', next);
                        }}
                      />
                      {tipo}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a3a50] text-[#7a8ea0] hover:bg-[#1e2d42] hover:text-white text-xs h-8"
                onClick={() => onSave(regla.id)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                Guardar parámetros
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── NEW RULE FORM ──────────────────────────────────────────────────────────

function NewRuleForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [tipoMotor, setTipoMotor] = useState('zscore');
  const [descripcionSimple, setDescripcionSimple] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createRegla({
        nombre: nombre.trim(),
        tipo_motor: tipoMotor,
        habilitada: true,
        descripcion_simple: descripcionSimple.trim(),
        parametros: DEFAULTS_POR_MOTOR[tipoMotor] || {},
        severidad_reglas: [],
        variables: [],
        formula: '',
        icono: tipoMotor === 'zscore' ? 'Activity' : tipoMotor === 'conteo' ? 'Scissors' : 'Users',
        color: MOTOR_COLORS[tipoMotor] || '#f59e0b',
      });
      onCreated();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.fields
        ? Object.values(e.response.data.fields || {}).join(', ')
        : 'Error al crear la regla.';
      setError(typeof msg === 'string' ? msg : 'Error al crear la regla.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-[#d4a853]/30 bg-[#162032] p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-[#d4a853]" />
        Nueva regla de detección
      </h3>

      <div className="space-y-4 max-w-lg">
        <div className="space-y-1.5">
          <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Nombre de la regla</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Monto mayor a umbral fijo"
            className="border-[#2a3a50] bg-[#0c1220] text-white h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Tipo de motor</Label>
          <select
            value={tipoMotor}
            onChange={(e) => setTipoMotor(e.target.value)}
            className="w-full bg-[#0c1220] border border-[#2a3a50] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/50"
          >
            {Object.entries(MOTOR_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <p className="text-[10px] text-[#4a5a6a] mt-1">
            {tipoMotor === 'zscore' && 'Compara cada monto contra la media estadística de su grupo. Ideal para detectar montos anormalmente altos o bajos.'}
            {tipoMotor === 'conteo' && 'Cuenta transacciones por agrupación (cliente, día, etc.) y alerta si supera un umbral. Ideal para detectar fraccionamiento.'}
            {tipoMotor === 'ratio' && 'Compara el volumen de un individuo contra el promedio del grupo. Ideal para detectar concentración de actividad.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#7a8ea0] uppercase tracking-wide">Descripción (opcional)</Label>
          <textarea
            value={descripcionSimple}
            onChange={(e) => setDescripcionSimple(e.target.value)}
            placeholder="Explica en lenguaje sencillo qué detecta esta regla..."
            rows={3}
            className="w-full bg-[#0c1220] border border-[#2a3a50] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a853]/50 resize-none"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-gradient-to-r from-[#d4a853] to-[#b8892e] text-[#0c1220] font-semibold hover:from-[#e8c468] hover:to-[#d4a853]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {saving ? 'Creando...' : 'Crear regla'}
          </Button>
          <Button variant="outline" onClick={onCancel} className="border-[#2a3a50] text-[#7a8ea0] hover:bg-[#1e2d42]">
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── DETECTION PANEL (administrable) ────────────────────────────────────────

function DetectionPanel() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningDetection, setRunningDetection] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchReglas = async () => {
    try {
      const data = await getReglas();
      setReglas(Array.isArray(data) ? data : []);
    } catch {
      setError('No se pudieron cargar las reglas.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReglas(); }, []);

  const handleToggle = async (id: number, habilitada: boolean) => {
    setSuccess('');
    setError('');
    setSaving(true);
    try {
      await updateRegla(id, { habilitada });
      setReglas(prev => prev.map(r => r.id === id ? { ...r, habilitada } : r));
      setSuccess(
        habilitada
          ? 'Regla activada. Para que genere nuevas alertas, ejecute la detección.'
          : 'Regla desactivada. Las alertas ya generadas por esta regla permanecen visibles. Para eliminarlas, ejecute la detección con "limpiar".'
      );
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateParam = (id: number, key: string, value: number | string[]) => {
    setSuccess('');
    setReglas(prev => prev.map(r =>
      r.id === id ? { ...r, parametros: { ...r.parametros, [key]: value } } : r
    ));
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const regla = reglas.find(r => r.id === id);
      if (!regla) return;
      await updateRegla(id, { parametros: regla.parametros });
      setSuccess('Parámetros guardados. Ejecuta la detección para aplicar los cambios.');
    } catch (e: any) {
      const fields = e?.response?.data?.fields;
      if (fields) {
        setError('Errores: ' + Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(', '));
      } else {
        setError(e?.response?.data?.error ?? 'No se pudo guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteRegla(id);
      setReglas(prev => prev.filter(r => r.id !== id));
      setSuccess('Regla eliminada.');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'No se pudo eliminar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDetection = async () => {
    setRunningDetection(true);
    setError('');
    setSuccess('');
    try {
      await runDeteccion({ limpiar: true });
      setSuccess('Detección ejecutada en segundo plano. Las alertas se actualizarán en unos segundos con las reglas activas.');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'No se pudo ejecutar la detección.');
    } finally {
      setRunningDetection(false);
    }
  };

  const handleCreated = () => {
    setShowNewForm(false);
    setSuccess('Regla creada exitosamente.');
    fetchReglas();
  };

  if (loading) {
    return (
      <Card className="border-[#2a3a50] bg-[#162032] p-6">
        <div className="flex items-center gap-2 text-[#7a8ea0]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando reglas...
        </div>
      </Card>
    );
  }

  const activeCount = reglas.filter(r => r.habilitada).length;

  return (
    <div className="space-y-5">
      {/* Resumen + botón nueva regla */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-[#7a8ea0]">
            <span className="text-white font-semibold">{activeCount}</span> de {reglas.length} reglas activas
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10 text-xs h-8"
          onClick={() => { setShowNewForm(true); setSuccess(''); }}
          disabled={showNewForm}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nueva regla
        </Button>
      </div>

      {/* Formulario nueva regla */}
      {showNewForm && (
        <NewRuleForm onCreated={handleCreated} onCancel={() => setShowNewForm(false)} />
      )}

      {/* Lista de reglas */}
      {reglas.map((regla) => (
        <RuleCard
          key={regla.id}
          regla={regla}
          saving={saving}
          onToggle={handleToggle}
          onUpdateParam={handleUpdateParam}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ))}

      {reglas.length === 0 && !showNewForm && (
        <Card className="border-[#2a3a50] bg-[#162032] p-8 text-center">
          <p className="text-[#4a5a6a] text-sm">No hay reglas configuradas.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10"
            onClick={() => setShowNewForm(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Crear primera regla
          </Button>
        </Card>
      )}

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Acciones globales */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={handleRunDetection}
          disabled={runningDetection || saving}
        >
          {runningDetection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {runningDetection ? 'Ejecutando...' : 'Ejecutar detección ahora'}
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-[#7a8ea0] space-y-1">
        <p>
          <strong className="text-amber-400">Importante:</strong> Los cambios en reglas (activar/desactivar/modificar parámetros)
          <strong className="text-[#b8c5d4]"> no son retroactivos</strong>. Las alertas ya generadas permanecen sin cambios.
        </p>
        <p>
          <strong className="text-[#b8c5d4]">Flujo recomendado:</strong> Configura las reglas → Guarda los parámetros →
          Pulsa &quot;Ejecutar detección ahora&quot; para regenerar alertas basándose únicamente en las reglas activas.
          La detección limpia las alertas previas y genera nuevas.
        </p>
      </div>
    </div>
  );
}

// ── SETTINGS PAGE ──────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-semibold text-white">Configuración</h1>
        <p className="mt-1 text-[#7a8ea0]">Ajustes del sistema JOZ Monitoring</p>
      </div>

      <Tabs defaultValue="detection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 border border-[#2a3a50] bg-[#0c1220]">
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-[#1e2d42] data-[state=active]:text-[#d4a853]">
            <User className="h-4 w-4" />
            Usuario
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2 data-[state=active]:bg-[#1e2d42] data-[state=active]:text-[#d4a853]">
            <Shield className="h-4 w-4" />
            Reglas de detección
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>

        <TabsContent value="detection">
          <DetectionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
