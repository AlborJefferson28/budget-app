import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Wallet, Target, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallets } from '../hooks/useWallets';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';

const PendingActions = ({ onBack }) => {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const activeAccountId = accounts?.[0]?.id;
  const { wallets } = useWallets(activeAccountId);
  const { budgets } = useBudgets(activeAccountId);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const resolveWalletName = (id) => wallets.find(w => w.id === id)?.name || 'Billetera Desconocida';
  const resolveBudgetName = (id) => budgets.find(b => b.id === id)?.name || 'Presupuesto Desconocido';

  useEffect(() => {
    fetchPendingActions();
  }, []);

  const fetchPendingActions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pending_actions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setActions(data);
    setLoading(false);
  };

  const sanitizePayload = (payload, type) => {
    const sanitized = { ...payload };
    
    // Enforce Constraints and Defaults
    if (type === 'transaction') {
      const defaultWalletId = wallets?.[0]?.id;
      
      if (sanitized.type === 'expense') {
        if (!sanitized.from_wallet) sanitized.from_wallet = sanitized.wallet_id || defaultWalletId;
        sanitized.to_wallet = null; // Enforce constraint: to_wallet must be null
      } else if (sanitized.type === 'income') {
        if (!sanitized.to_wallet) sanitized.to_wallet = sanitized.wallet_id || defaultWalletId;
        sanitized.from_wallet = null; // Enforce constraint: from_wallet must be null
      } else if (sanitized.type === 'transfer') {
        if (!sanitized.from_wallet) sanitized.from_wallet = sanitized.wallet_id || defaultWalletId;
        if (!sanitized.to_wallet) sanitized.to_wallet = wallets.find(w => w.id !== sanitized.from_wallet)?.id;
      }
      
      delete sanitized.wallet_id;
      
      // Remove other non-db fields if any
      const validFields = ['account_id', 'from_wallet', 'to_wallet', 'amount', 'type', 'category', 'note', 'occurred_at', 'created_by'];
      Object.keys(sanitized).forEach(key => {
        if (!validFields.includes(key)) delete sanitized[key];
      });
      
      if (!sanitized.created_by) sanitized.created_by = user.id;
    } else if (type === 'allocation') {
      const validFields = ['account_id', 'wallet_id', 'budget_id', 'amount', 'created_by'];
      Object.keys(sanitized).forEach(key => {
        if (!validFields.includes(key)) delete sanitized[key];
      });
      if (!sanitized.created_by) sanitized.created_by = user.id;
    }
    
    return sanitized;
  };

  const handleAction = async (id, status, payload, type) => {
    try {
      // 1. Update status in pending_actions
      const { error: updateError } = await supabase
        .from('pending_actions')
        .update({ status })
        .eq('id', id);
      
      if (updateError) throw updateError;

      // 2. If confirmed, execute the actually movement
      if (status === 'confirmed') {
        const cleanPayload = sanitizePayload(payload, type);
        
        if (type === 'transaction') {
          const { error: trxError } = await supabase
            .from('transactions')
            .insert(cleanPayload);
          if (trxError) throw trxError;
        } else if (type === 'allocation') {
          const { error: allocError } = await supabase
            .from('allocations')
            .insert(cleanPayload);
          if (allocError) throw allocError;
        }
      }

      fetchPendingActions();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acciones Pendientes</h1>
          <p className="text-sm text-muted-foreground italic">Movimientos agendados por la IA para tu revisión.</p>
        </div>
        <button onClick={onBack} className="p-2 border border-border rounded-lg hover:bg-accent">
          Volver
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Clock className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-border rounded-2xl bg-card/50">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-lg font-semibold">No hay acciones pendientes</h2>
          <p className="text-sm text-muted-foreground">Todo está al día.</p>
        </div>
      ) : (
        <div className="grid gap-4 max-w-2xl mx-auto">
          <AnimatePresence>
            {actions.map((action) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={action.id}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${action.type === 'transaction' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                      {action.type === 'transaction' ? <Wallet className="h-5 w-5 text-blue-500" /> : <Target className="h-5 w-5 text-green-500" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-base capitalize">{action.type === 'transaction' ? 'Gasto' : 'Asignación'}</h3>
                      <p className="text-xs text-muted-foreground">Agendado {new Date(action.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {action.payload.amount?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || '0'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-accent/30 rounded-2xl border border-border/40 text-sm">
                   <div className="flex flex-col gap-3">
                      {action.type === 'transaction' ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Origen:</span>
                            <span className="font-semibold flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5 text-blue-500" />
                              {resolveWalletName(action.payload.from_wallet || action.payload.wallet_id)}
                            </span>
                          </div>
                          {action.payload.to_wallet && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Destino:</span>
                              <span className="font-semibold flex items-center gap-1.5">
                                <Wallet className="h-3.5 w-3.5 text-green-500" />
                                {resolveWalletName(action.payload.to_wallet)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-t border-border/20 pt-2">
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="px-2 py-0.5 bg-primary/10 rounded-md text-[10px] font-bold uppercase tracking-wider text-primary">
                              {action.payload.category || 'Sin categoría'}
                            </span>
                          </div>
                          {action.payload.note && (
                            <div className="flex flex-col gap-1 mt-1 border-t border-border/20 pt-2">
                              <span className="text-muted-foreground">Nota:</span>
                              <span className="italic text-foreground/80">{action.payload.note}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">De Billetera:</span>
                            <span className="font-semibold flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5 text-blue-500" />
                              {resolveWalletName(action.payload.wallet_id)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Hacia Presupuesto:</span>
                            <span className="font-semibold flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-green-500" />
                              {resolveBudgetName(action.payload.budget_id)}
                            </span>
                          </div>
                        </>
                      )}
                   </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleAction(action.id, 'rejected')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" /> Descartar
                  </button>
                  <button 
                    onClick={() => handleAction(action.id, 'confirmed', action.payload, action.type)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <Check className="h-4 w-4" /> Aceptar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PendingActions;
