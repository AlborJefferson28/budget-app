import { useState, useReducer, useCallback, useEffect } from "react";

// ── ICONS ─────────────────────────────────────────────────────────────────────
const ICONS = {
  plane: "✈️", laptop: "💻", book: "📚", home: "🏠", food: "🍽️",
  car: "🚗", health: "💊", savings: "🐷", salary: "💼", emergency: "🛡️",
  shopping: "🛍️", fun: "🎮", wallet: "👛", chart: "📊", gift: "🎁",
  music: "🎵", sport: "⚽", pet: "🐾", baby: "🍼", travel: "🌍",
};

// ── LOCALSTORAGE ───────────────────────────────────────────────────────────────
const LS_KEY = "budgetapp_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { categories: [], budgets: [], allocations: [] };
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (_) {}
}

// ── REDUCER ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  let next;
  switch (action.type) {
    case "ADD_CATEGORY":
      next = { ...state, categories: [...state.categories, action.payload] }; break;
    case "EDIT_CATEGORY":
      next = { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) }; break;
    case "DELETE_CATEGORY":
      next = {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
        allocations: state.allocations.filter(a => a.categoryId !== action.payload),
      }; break;
    case "ADD_BUDGET":
      next = { ...state, budgets: [...state.budgets, action.payload] }; break;
    case "EDIT_BUDGET":
      next = { ...state, budgets: state.budgets.map(b => b.id === action.payload.id ? action.payload : b) }; break;
    case "DELETE_BUDGET":
      next = {
        ...state,
        budgets: state.budgets.filter(b => b.id !== action.payload),
        allocations: state.allocations.filter(a => a.budgetId !== action.payload),
      }; break;
    case "ADD_ALLOCATION":
      next = { ...state, allocations: [...state.allocations, action.payload] }; break;
    case "DELETE_ALLOCATION":
      next = { ...state, allocations: state.allocations.filter(a => a.id !== action.payload) }; break;
    default: return state;
  }
  saveState(next);
  return next;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => `$${Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function useDerived(state) {
  const getAllocatedForBudget = (budgetId) =>
    state.allocations.filter(a => a.budgetId === budgetId).reduce((s, a) => s + a.amount, 0);
  const getAllocatedForCategory = (categoryId) =>
    state.allocations.filter(a => a.categoryId === categoryId).reduce((s, a) => s + a.amount, 0);
  const totalBalance = state.categories.reduce((s, c) => s + c.amount, 0);
  const totalAssigned = state.allocations.reduce((s, a) => s + a.amount, 0);
  const availableToSpend = totalBalance - totalAssigned;
  return { getAllocatedForBudget, getAllocatedForCategory, totalBalance, totalAssigned, availableToSpend };
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: "#e8f5f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "#10b981", borderRadius: 99, transition: "width .4s ease" }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "24px 24px 0 0", padding: "28px 24px 44px",
        width: "100%", maxWidth: 430, boxShadow: "0 -8px 40px rgba(0,0,0,.12)",
        maxHeight: "90vh", overflowY: "auto"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f1f16" }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "none", background: "#f0f7f4", borderRadius: 99, width: 34, height: 34,
            cursor: "pointer", fontSize: 20, color: "#6b7c75", display: "flex", alignItems: "center", justifyContent: "center"
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #d5e8df",
  fontSize: 15, color: "#0f1f16", outline: "none", boxSizing: "border-box",
  background: "#f8fdfb", transition: "border .2s",
};

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374843" }}>{label}</label>}
      <input {...props} style={{ ...inputStyle, ...props.style }}
        onFocus={e => e.target.style.borderColor = "#10b981"}
        onBlur={e => e.target.style.borderColor = "#d5e8df"} />
    </div>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374843" }}>{label}</label>}
      <select {...props} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>{children}</select>
    </div>
  );
}

function IconPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#374843" }}>Ícono</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(ICONS).map(([k, v]) => (
          <button key={k} type="button" onClick={() => onChange(k)} style={{
            width: 44, height: 44, borderRadius: 12,
            border: value === k ? "2.5px solid #10b981" : "2px solid #e8f5f0",
            background: value === k ? "#f0fdf7" : "#fff",
            fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s"
          }}>{v}</button>
        ))}
      </div>
    </div>
  );
}

function Btn({ children, variant = "primary", ...props }) {
  const styles = {
    primary: { background: "#10b981", color: "#fff" },
    ghost: { background: "#f0f7f4", color: "#10b981" },
    danger: { background: "#fee2e2", color: "#dc2626" },
  };
  return (
    <button {...props} style={{
      padding: "13px 20px", borderRadius: 14, fontSize: 15, fontWeight: 700,
      cursor: "pointer", border: "none", transition: "opacity .15s, transform .1s",
      ...styles[variant], ...props.style
    }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >{children}</button>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "#fee2e2", borderRadius: 10 }}>{msg}</div>;
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#0f1f16", marginBottom: 8 }}>{title}</div>
      <div style={{ color: "#9fb5ad", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{desc}</div>
      {action}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ state, derived, setPage }) {
  const { totalBalance, totalAssigned, availableToSpend } = derived;
  const recent = [...state.allocations].sort((a, b) => b.date - a.date).slice(0, 5);
  const isEmpty = state.categories.length === 0 && state.budgets.length === 0;

  return (
    <div>
      <div style={{ padding: "52px 20px 24px", background: "linear-gradient(135deg,#0d9e6b,#059669)", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 4, fontWeight: 500 }}>Resumen</div>
        <div style={{ fontSize: 26, fontWeight: 900 }}>Financial Overview</div>
      </div>

      <div style={{ padding: "0 16px 100px", marginTop: -20 }}>
        {isEmpty ? (
          <div style={{ background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
            <EmptyState
              icon="🚀"
              title="¡Bienvenido!"
              desc="Empieza agregando tus fuentes de dinero en Categorías, luego crea tus metas en Presupuestos."
              action={
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Btn onClick={() => setPage("categories")} style={{ fontSize: 14, padding: "11px 20px" }}>+ Nueva Categoría</Btn>
                  <Btn variant="ghost" onClick={() => setPage("budgets")} style={{ fontSize: 14, padding: "11px 20px" }}>+ Presupuesto</Btn>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {[
              { label: "Balance Total", value: totalBalance, icon: "💵", sub: `${state.categories.length} fuente${state.categories.length !== 1 ? "s" : ""} de dinero` },
              { label: "Dinero Asignado", value: totalAssigned, icon: "✅", sub: `${state.allocations.length} asignación${state.allocations.length !== 1 ? "es" : ""}` },
              { label: "Disponible", value: availableToSpend, icon: "🐷", sub: availableToSpend >= 0 ? "Listo para asignar" : "⚠️ Sobreasignado" },
            ].map((c, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", marginBottom: 12, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: "#6b7c75", fontWeight: 500 }}>{c.label}</div>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: i === 2 && availableToSpend < 0 ? "#dc2626" : "#0f1f16", margin: "8px 0 4px" }}>{fmt(c.value)}</div>
                <div style={{ fontSize: 12, color: "#9fb5ad" }}>{c.sub}</div>
              </div>
            ))}

            {state.budgets.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 20, marginBottom: 12, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f1f16", marginBottom: 16 }}>Progreso de Metas</div>
                {state.budgets.map(b => {
                  const assigned = derived.getAllocatedForBudget(b.id);
                  const pct = b.target ? Math.round((assigned / b.target) * 100) : 0;
                  return (
                    <div key={b.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 14 }}>
                        <span style={{ fontWeight: 600, color: "#1a2e24" }}>{ICONS[b.icon]} {b.name}</span>
                        <span style={{ color: "#10b981", fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <ProgressBar value={assigned} max={b.target || 1} />
                    </div>
                  );
                })}
              </div>
            )}

            {recent.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f1f16", marginBottom: 16 }}>Actividad Reciente</div>
                {recent.map(a => {
                  const budget = state.budgets.find(b => b.id === a.budgetId);
                  const category = state.categories.find(c => c.id === a.categoryId);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f0f7f4" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 14, background: "#f0fdf7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {ICONS[budget?.icon] || "💰"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1f16" }}>{budget?.name || "—"}</div>
                        <div style={{ fontSize: 12, color: "#9fb5ad" }}>De {category?.name || "—"}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#10b981", fontSize: 15 }}>+{fmt(a.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
function Categories({ state, dispatch, derived }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", icon: "wallet" });
  const [err, setErr] = useState("");

  const openAdd = () => { setForm({ name: "", amount: "", icon: "wallet" }); setErr(""); setModal("add"); };
  const openEdit = (cat) => { setForm({ name: cat.name, amount: String(cat.amount), icon: cat.icon }); setErr(""); setModal(cat); };

  const submit = () => {
    if (!form.name.trim()) return setErr("Ingresa un nombre para la categoría");
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setErr("Ingresa un monto válido mayor a 0");
    if (modal === "add") {
      dispatch({ type: "ADD_CATEGORY", payload: { id: uid(), name: form.name.trim(), amount: amt, icon: form.icon } });
    } else {
      dispatch({ type: "EDIT_CATEGORY", payload: { ...modal, name: form.name.trim(), amount: amt, icon: form.icon } });
    }
    setModal(null); setErr("");
  };

  return (
    <div>
      <div style={{ padding: "52px 20px 24px", background: "linear-gradient(135deg,#0d9e6b,#059669)", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 4, fontWeight: 500 }}>Gestión</div>
        <div style={{ fontSize: 26, fontWeight: 900 }}>Dinero Disponible</div>
      </div>

      <div style={{ padding: "12px 16px 100px", marginTop: -16 }}>
        {state.categories.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[{ label: "Total", value: derived.totalBalance }, { label: "Disponible", value: derived.availableToSpend }].map((c, i) => (
              <div key={i} style={{ flex: 1, background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize: 11, color: "#9fb5ad", textTransform: "uppercase", letterSpacing: .5 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#0f1f16", marginTop: 4 }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>
        )}

        {state.categories.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
            <EmptyState icon="💰" title="Sin categorías aún"
              desc="Agrega tus fuentes de dinero: sueldo, ahorros, bonos, emergencias..."
              action={<Btn onClick={openAdd}>+ Nueva Categoría</Btn>} />
          </div>
        ) : (
          <>
            {state.categories.map(cat => {
              const allocated = derived.getAllocatedForCategory(cat.id);
              const available = cat.amount - allocated;
              return (
                <div key={cat.id} style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: "#f0fdf7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        {ICONS[cat.icon]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f1f16" }}>{cat.name}</div>
                        <div style={{ fontSize: 12, color: "#9fb5ad", marginTop: 2 }}>
                          Disp: <span style={{ color: "#10b981", fontWeight: 600 }}>{fmt(available)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: 18, color: "#0f1f16" }}>{fmt(cat.amount)}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => openEdit(cat)} style={{ background: "#f0f7f4", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#10b981", fontWeight: 600, cursor: "pointer" }}>Editar</button>
                        <button onClick={() => dispatch({ type: "DELETE_CATEGORY", payload: cat.id })} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#dc2626", fontWeight: 600, cursor: "pointer" }}>Borrar</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <ProgressBar value={allocated} max={cat.amount} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#9fb5ad" }}>
                      <span>Asignado: {fmt(allocated)}</span>
                      <span>{cat.amount > 0 ? Math.round((allocated / cat.amount) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <Btn onClick={openAdd} style={{ width: "100%", marginTop: 4 }}>+ Nueva Categoría</Btn>
          </>
        )}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Nueva Categoría" : "Editar Categoría"} onClose={() => setModal(null)}>
          <Input label="Nombre" placeholder="Ej: Sueldo, Ahorros..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Monto ($)" type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <IconPicker value={form.icon} onChange={icon => setForm({ ...form, icon })} />
          <ErrMsg msg={err} />
          <Btn onClick={submit} style={{ width: "100%" }}>{modal === "add" ? "Agregar Categoría" : "Guardar Cambios"}</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── BUDGETS ───────────────────────────────────────────────────────────────────
function Budgets({ state, dispatch, derived, onOpenBudget }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", icon: "wallet" });
  const [err, setErr] = useState("");

  const openAdd = () => { setForm({ name: "", target: "", icon: "wallet" }); setErr(""); setModal("add"); };

  const submit = () => {
    if (!form.name.trim()) return setErr("Ingresa un nombre para la meta");
    const target = Number(form.target);
    if (!form.target || isNaN(target) || target <= 0) return setErr("Ingresa una meta mayor a 0");
    dispatch({ type: "ADD_BUDGET", payload: { id: uid(), name: form.name.trim(), target, icon: form.icon, createdAt: Date.now() } });
    setModal(null); setErr("");
  };

  const totalAssigned = state.budgets.reduce((s, b) => s + derived.getAllocatedForBudget(b.id), 0);
  const totalTarget = state.budgets.reduce((s, b) => s + (b.target || 0), 0);

  return (
    <div>
      <div style={{ padding: "52px 20px 24px", background: "linear-gradient(135deg,#0d9e6b,#059669)", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 4, fontWeight: 500 }}>Metas</div>
        <div style={{ fontSize: 26, fontWeight: 900 }}>Mis Presupuestos</div>
      </div>

      <div style={{ padding: "12px 16px 100px", marginTop: -16 }}>
        {state.budgets.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total Asignado", value: totalAssigned, accent: true },
              { label: "Meta Total", value: totalTarget, accent: false },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c.accent ? "linear-gradient(135deg,#f0fdf7,#d1fae5)" : "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize: 11, color: "#6b7c75", textTransform: "uppercase", letterSpacing: .5 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f1f16", marginTop: 4 }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>
        )}

        {state.budgets.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
            <EmptyState icon="🎯" title="Sin presupuestos aún"
              desc="Crea tus metas de ahorro: viaje, laptop, fondo de emergencia..."
              action={<Btn onClick={openAdd}>+ Crear Presupuesto</Btn>} />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f1f16" }}>Metas Activas</div>
              <button onClick={openAdd} style={{ background: "none", border: "none", color: "#10b981", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>⊕ Crear</button>
            </div>
            {state.budgets.map(b => {
              const assigned = derived.getAllocatedForBudget(b.id);
              const pct = b.target ? Math.round((assigned / b.target) * 100) : 0;
              return (
                <div key={b.id} onClick={() => onOpenBudget(b.id)}
                  style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,.06)", cursor: "pointer", userSelect: "none", transition: "transform .15s" }}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(.98)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f0fdf7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                        {ICONS[b.icon]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f1f16" }}>{b.name}</div>
                        <div style={{ fontSize: 13, color: "#9fb5ad", marginTop: 2 }}>{fmt(assigned)} de {fmt(b.target)}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 20, color: "#10b981" }}>{pct}%</div>
                  </div>
                  <ProgressBar value={assigned} max={b.target || 1} />
                </div>
              );
            })}
          </>
        )}
      </div>

      {modal && (
        <Modal title="Nuevo Presupuesto" onClose={() => setModal(null)}>
          <Input label="Nombre" placeholder="Ej: Viaje Japón, Laptop Pro..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Meta ($)" type="number" min="0" placeholder="0.00" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} />
          <IconPicker value={form.icon} onChange={icon => setForm({ ...form, icon })} />
          <ErrMsg msg={err} />
          <Btn onClick={submit} style={{ width: "100%" }}>Crear Presupuesto</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── BUDGET DETAIL ─────────────────────────────────────────────────────────────
function BudgetDetail({ budget, state, dispatch, derived, onBack }) {
  const [showAllocate, setShowAllocate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ categoryId: "", amount: "" });
  const [editForm, setEditForm] = useState({ name: budget.name, target: String(budget.target), icon: budget.icon });
  const [err, setErr] = useState("");
  const [editErr, setEditErr] = useState("");

  const assigned = derived.getAllocatedForBudget(budget.id);
  const pct = budget.target ? Math.round((assigned / budget.target) * 100) : 0;
  const remaining = (budget.target || 0) - assigned;
  const allocations = state.allocations.filter(a => a.budgetId === budget.id).sort((a, b) => b.date - a.date);
  const availableCategories = state.categories.filter(c => (c.amount - derived.getAllocatedForCategory(c.id)) > 0);

  const submitAlloc = () => {
    const cat = state.categories.find(c => c.id === form.categoryId);
    if (!cat) return setErr("Selecciona una categoría");
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return setErr("Ingresa un monto válido");
    const catAvailable = cat.amount - derived.getAllocatedForCategory(cat.id);
    if (amt > catAvailable) return setErr(`Solo hay ${fmt(catAvailable)} disponible en "${cat.name}"`);
    dispatch({ type: "ADD_ALLOCATION", payload: { id: uid(), budgetId: budget.id, categoryId: form.categoryId, amount: amt, date: Date.now() } });
    setForm({ categoryId: "", amount: "" }); setErr(""); setShowAllocate(false);
  };

  const submitEdit = () => {
    if (!editForm.name.trim()) return setEditErr("Ingresa un nombre");
    const t = Number(editForm.target);
    if (!editForm.target || isNaN(t) || t <= 0) return setEditErr("Meta inválida");
    dispatch({ type: "EDIT_BUDGET", payload: { ...budget, name: editForm.name.trim(), target: t, icon: editForm.icon } });
    setShowEdit(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px", background: "#fff", borderBottom: "1px solid #f0f7f4" }}>
        <button onClick={onBack} style={{ background: "#f0f7f4", border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div style={{ flex: 1, fontWeight: 900, fontSize: 20, color: "#0f1f16" }}>{ICONS[budget.icon]} {budget.name}</div>
        <button onClick={() => setShowEdit(true)} style={{ background: "#f0f7f4", border: "none", borderRadius: 10, padding: "8px 14px", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Editar</button>
        <button onClick={() => { dispatch({ type: "DELETE_BUDGET", payload: budget.id }); onBack(); }}
          style={{ background: "#fee2e2", border: "none", borderRadius: 10, padding: "8px 14px", color: "#dc2626", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Borrar</button>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 22, marginBottom: 12, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
          <div style={{ fontSize: 13, color: "#9fb5ad", fontWeight: 500 }}>Progreso total</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0" }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: "#10b981" }}>{fmt(assigned)}</span>
            <span style={{ fontSize: 16, color: "#9fb5ad" }}>/ {fmt(budget.target)}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginLeft: "auto" }}>{pct}%</span>
          </div>
          <ProgressBar value={assigned} max={budget.target || 1} />
          <div style={{ fontSize: 13, color: "#9fb5ad", marginTop: 8 }}>
            {remaining > 0 ? `Faltan ${fmt(remaining)} para completar` : "🎉 ¡Meta completada!"}
          </div>
        </div>

        {availableCategories.length > 0 ? (
          <Btn onClick={() => { setForm({ categoryId: availableCategories[0].id, amount: "" }); setErr(""); setShowAllocate(true); }}
            style={{ width: "100%", marginBottom: 16, padding: "16px", fontSize: 16, borderRadius: 18 }}>
            ⊕ Asignar Dinero
          </Btn>
        ) : (
          <div style={{ background: "#fff8ed", border: "1.5px solid #fde68a", borderRadius: 14, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
            {state.categories.length === 0
              ? "⚠️ Primero agrega categorías de dinero en la pestaña Categorías."
              : "⚠️ No hay dinero disponible en ninguna categoría."}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#0f1f16", marginBottom: 16 }}>💵 Asignaciones Actuales</div>
          {allocations.length === 0 ? (
            <div style={{ color: "#9fb5ad", fontSize: 14, textAlign: "center", padding: "16px 0" }}>Aún no has asignado dinero a esta meta</div>
          ) : allocations.map(a => {
            const cat = state.categories.find(c => c.id === a.categoryId);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f0f7f4" }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: "#f0fdf7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {ICONS[cat?.icon] || "💰"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1f16" }}>{cat?.name || "Categoría eliminada"}</div>
                  <div style={{ fontSize: 11, color: "#9fb5ad" }}>{new Date(a.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#047857" }}>{fmt(a.amount)}</span>
                <button onClick={() => dispatch({ type: "DELETE_ALLOCATION", payload: a.id })}
                  style={{ background: "#fee2e2", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            );
          })}
        </div>
      </div>

      {showAllocate && (
        <Modal title="Asignar Dinero" onClose={() => setShowAllocate(false)}>
          <SelectField label="Categoría" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
            {availableCategories.map(c => {
              const avail = c.amount - derived.getAllocatedForCategory(c.id);
              return <option key={c.id} value={c.id}>{ICONS[c.icon]} {c.name} — {fmt(avail)} disponible</option>;
            })}
          </SelectField>
          <Input label="Monto ($)" type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <ErrMsg msg={err} />
          <Btn onClick={submitAlloc} style={{ width: "100%" }}>Asignar</Btn>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Editar Presupuesto" onClose={() => setShowEdit(false)}>
          <Input label="Nombre" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Meta ($)" type="number" value={editForm.target} onChange={e => setEditForm({ ...editForm, target: e.target.value })} />
          <IconPicker value={editForm.icon} onChange={icon => setEditForm({ ...editForm, icon })} />
          <ErrMsg msg={editErr} />
          <Btn onClick={submitEdit} style={{ width: "100%" }}>Guardar Cambios</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function Transactions({ state }) {
  const [search, setSearch] = useState("");

  const allocs = [...state.allocations]
    .sort((a, b) => b.date - a.date)
    .filter(a => {
      if (!search) return true;
      const b = state.budgets.find(x => x.id === a.budgetId)?.name || "";
      const c = state.categories.find(x => x.id === a.categoryId)?.name || "";
      return b.toLowerCase().includes(search.toLowerCase()) || c.toLowerCase().includes(search.toLowerCase());
    });

  const groups = {};
  allocs.forEach(a => {
    const d = new Date(a.date);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const label = isToday ? "Hoy" : isYesterday ? "Ayer"
      : d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(a);
  });

  return (
    <div>
      <div style={{ padding: "52px 20px 16px", background: "#fff", borderBottom: "1px solid #f0f7f4" }}>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#0f1f16", marginBottom: 16 }}>Historial</div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por presupuesto o categoría..."
            style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: 14, border: "none", background: "#f0fdf7", fontSize: 14, color: "#0f1f16", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      <div style={{ padding: "12px 16px 100px" }}>
        {allocs.length === 0 ? (
          <EmptyState icon="📋" title="Sin transacciones"
            desc={search ? "No se encontraron resultados." : "Aquí aparecerán todas tus asignaciones de dinero."} />
        ) : Object.entries(groups).map(([label, items]) => (
          <div key={label}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 10px" }}>{label}</div>
            {items.map(a => {
              const budget = state.budgets.find(b => b.id === a.budgetId);
              const category = state.categories.find(c => c.id === a.categoryId);
              return (
                <div key={a.id} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,.05)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "#f0fdf7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {ICONS[budget?.icon] || "💰"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f1f16" }}>{budget?.name || "Presupuesto eliminado"}</div>
                    <div style={{ fontSize: 12, color: "#9fb5ad" }}>De <span style={{ color: "#10b981", fontWeight: 600 }}>{category?.name || "—"}</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#10b981", fontSize: 15 }}>+{fmt(a.amount)}</div>
                    <div style={{ fontSize: 11, color: "#b0c4bb" }}>{new Date(a.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NAV + APP ─────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Inicio", emoji: "⊞" },
  { key: "categories", label: "Categorías", emoji: "💰" },
  { key: "budgets", label: "Presupuestos", emoji: "🎯" },
  { key: "transactions", label: "Historial", emoji: "↻" },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const [page, setPage] = useState("dashboard");
  const [activeBudgetId, setActiveBudgetId] = useState(null);
  const derived = useDerived(state);

  const openBudget = useCallback((id) => { setActiveBudgetId(id); setPage("budgetDetail"); }, []);
  const closeBudget = useCallback(() => { setActiveBudgetId(null); setPage("budgets"); }, []);

  const activeBudget = activeBudgetId ? state.budgets.find(b => b.id === activeBudgetId) : null;
  useEffect(() => { if (page === "budgetDetail" && !activeBudget) closeBudget(); }, [state.budgets]);

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f4faf7", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div style={{ overflowY: "auto", height: "100vh" }}>
        {page === "dashboard" && <Dashboard state={state} derived={derived} setPage={setPage} />}
        {page === "categories" && <Categories state={state} dispatch={dispatch} derived={derived} />}
        {page === "budgets" && <Budgets state={state} dispatch={dispatch} derived={derived} onOpenBudget={openBudget} />}
        {page === "budgetDetail" && activeBudget && (
          <BudgetDetail budget={activeBudget} state={state} dispatch={dispatch} derived={derived} onBack={closeBudget} />
        )}
        {page === "transactions" && <Transactions state={state} derived={derived} />}
      </div>

      {page !== "budgetDetail" && (
        <nav style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #e8f5f0",
          display: "flex", justifyContent: "space-around", padding: "10px 0 20px",
          boxShadow: "0 -4px 20px rgba(0,0,0,.07)", zIndex: 100
        }}>
          {NAV.map(n => {
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)} style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 14px"
              }}>
                <div style={{
                  width: 44, height: 30, borderRadius: 14, background: active ? "#10b981" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "background .2s"
                }}>
                  <span style={{ filter: active ? "brightness(10)" : "none" }}>{n.emoji}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#10b981" : "#9fb5ad", letterSpacing: .3, textTransform: "uppercase" }}>
                  {n.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
