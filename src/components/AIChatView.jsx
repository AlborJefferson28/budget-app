import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, Image as ImageIcon, Loader2, Sparkles, X, Check, ArrowLeft, Trash2, Paperclip, User as UserIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useWallets } from '../hooks/useWallets';
import { motion, AnimatePresence } from 'framer-motion';

const AIChatView = ({ onBack, aiMode = 'agendar' }) => {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const activeAccountId = accounts?.[0]?.id;
  const { wallets } = useWallets(activeAccountId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [localAiMode, setLocalAiMode] = useState(aiMode); 
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    // Load draft
    const savedDraft = localStorage.getItem('ai_chat_draft');
    if (savedDraft) setInput(savedDraft);

    // Initial history fetch
    fetchHistory();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('chat_realtime_' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_chat_messages',
        filter: 'user_id=eq.' + user.id
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;
          setMessages(prev => {
            // 1. Check if the message already exists by ID
            const existingById = prev.find(pm => pm.id === m.id);
            if (existingById) return prev;

            // 2. Check if this is a "confirmation" of an optimistic message
            // (Same role and content, but optimistic one has no ID or a temporary one)
            // Note: Optimistic messages now use UUIDs, so this is a secondary safety net.
            const optimisticIndex = prev.findIndex(pm => 
              pm.role === m.role && 
              pm.text === m.content && 
              (!pm.id || String(pm.id).length < 10) // Simple check for temp/empty ID
            );

            if (optimisticIndex !== -1) {
              const newMessages = [...prev];
              newMessages[optimisticIndex] = {
                ...newMessages[optimisticIndex],
                id: m.id,
                action: m.action_json,
                isAutoProcessed: m.processed
              };
              return newMessages;
            }
            
            return [...prev, {
              id: m.id,
              role: m.role,
              text: m.content,
              action: m.action_json,
              image: m.image_url ? 'placeholder' : null,
              isAutoProcessed: m.processed
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          setMessages(prev => prev.map(pm => pm.id === m.id ? {
            ...pm,
            text: m.content,
            action: m.action_json,
            isAutoProcessed: m.processed
          } : pm));
        } else if (payload.eventType === 'DELETE') {
          fetchHistory();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchHistory = async () => {
    if (!user?.id) return;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchHistory] Error:', error);
      return;
    }

    if (data && data.length > 0) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role,
        text: m.content,
        action: m.action_json,
        image: m.image_url ? 'placeholder' : null,
        isAutoProcessed: m.processed
      })));
    } else {
      setMessages([
        { role: 'assistant', text: '¡Hola! Soy tu asistente inteligente. Puedes escribirme algo como "Gasté 50 mil en el supermercado" o subir una foto de tu factura.' }
      ]);
    }
  };

  const WELCOME_MSG = [{ role: 'assistant', text: '¡Hola! Soy tu asistente inteligente. Puedes escribirme algo como "Gasté 50 mil en el supermercado" o subir una foto de tu factura.' }];

  const clearHistory = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const { error } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        alert('Error: ' + error.message);
      } else {
        // Reset local state immediately — don't rely on Realtime DELETE event
        setMessages(WELCOME_MSG);
        localStorage.removeItem('ai_chat_draft');
        setShowClearConfirm(false);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    localStorage.setItem('ai_chat_draft', val);
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;

    setLoading(true);
    const currentInput = input;
    const currentAttachment = attachment?.base64;
    const currentPreview = attachment ? 'placeholder' : null;

    // 1. Generate a client-side UUID to prevent duplication via Realtime
    // Fallback for environments where crypto.randomUUID is not available
    const clientSideId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 2. Optimistic Update (UI reacts instantly)
    setMessages(prev => [...prev, { 
      id: clientSideId, 
      role: 'user', 
      text: currentInput, 
      image: currentPreview 
    }]);
    
    setInput('');
    setAttachment(null);
    localStorage.removeItem('ai_chat_draft');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      // 3. Save user msg with the SAME UUID
      await supabase.from('ai_chat_messages').insert({
        id: clientSideId,
        user_id: user.id,
        role: 'user',
        content: currentInput,
        image_url: currentPreview
      });

      // 4. Insert Assistant Placeholder (PHASE 3)
      const assistantId = crypto.randomUUID();
      const placeholderText = 'Analizando...';
      
      await supabase.from('ai_chat_messages').insert({
        id: assistantId,
        user_id: user.id,
        role: 'assistant',
        content: placeholderText,
        processed: false
      });

      // 5. Context
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: (m.role === 'user' && m.image) ? `${m.text}\n[Imagen adjunta]` : m.text
      }));
      const context = { accounts, wallets, budgets: [], ai_mode: localAiMode };

      // 6. Invoke AI (Fire and forget from the UI's perspective)
      // We still await the invocation to catch initial connection errors, 
      // but we set loading(false) immediately after.
      setLoading(false); 

      supabase.functions.invoke('ai-assistant', {
        body: { 
          message: currentInput, 
          message_id: assistantId, 
          image: currentAttachment, 
          context, 
          history: chatHistory 
        }
      }).catch(err => {
        console.error("Async AI Error:", err);
        // The Edge Function has its own error handling to update the message, 
        // this is just for critical failures.
      });

    } catch (err) {
      console.error(err);
      setLoading(false);
      let errorMsg = 'Error al iniciar procesamiento.';
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          preview: URL.createObjectURL(file),
          base64: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmAction = async (action, silent = false, messageId = null) => {
    try {
      if (action.mode === 'agendar') {
        const accId = action.data.account_id || activeAccountId || accounts?.[0]?.id;
        await supabase.from('pending_actions').insert({
          user_id: user.id,
          account_id: accId,
          type: action.type,
          payload: { ...action.data, account_id: accId, created_by: user.id },
          status: 'pending'
        });
        if (!silent) alert('Agendado.');
      } else {
        let raw = { ...action.data, created_by: user.id };
        if (!raw.account_id) raw.account_id = activeAccountId || accounts?.[0]?.id;

        if (action.type === 'transaction') {
          const defaultWalletId = wallets?.[0]?.id;

          // Map common AI aliases
          if (raw.description && !raw.note) raw.note = raw.description;
          if (raw.date && !raw.occurred_at) raw.occurred_at = raw.date;
          // The AI sometimes uses wallet_id generically — map it per type
          if (raw.wallet_id && !raw.from_wallet && !raw.to_wallet) {
            if (raw.type === 'income') raw.to_wallet = raw.wallet_id;
            else raw.from_wallet = raw.wallet_id;
          }

          // Resolve wallet names → UUIDs (AI may return names like "Ahorro" instead of UUIDs)
          const resolveWalletId = (val) => {
            if (!val) return val;
            // Check if already a valid UUID (8-4-4-4-12 pattern)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(val)) return val;
            // Try to find wallet by name (case-insensitive)
            const found = wallets?.find(w => w.name?.toLowerCase() === val.toLowerCase());
            return found?.id || defaultWalletId;
          };
          raw.from_wallet = resolveWalletId(raw.from_wallet);
          raw.to_wallet = resolveWalletId(raw.to_wallet);

          // Enforce DB constraints — wallets MUST be null/set per type
          if (raw.type === 'expense') {
            if (!raw.from_wallet) raw.from_wallet = defaultWalletId;
            raw.to_wallet = null; // DB constraint: to_wallet IS NULL for expense
          } else if (raw.type === 'income') {
            if (!raw.to_wallet) raw.to_wallet = defaultWalletId;
            raw.from_wallet = null; // DB constraint: from_wallet IS NULL for income
          } else if (raw.type === 'transfer') {
            if (!raw.from_wallet) raw.from_wallet = defaultWalletId;
            if (!raw.to_wallet) raw.to_wallet = wallets?.find(w => w.id !== raw.from_wallet)?.id;
          }

          // Whitelist only valid DB columns
          const validFields = ['account_id', 'from_wallet', 'to_wallet', 'amount', 'type', 'category', 'note', 'occurred_at', 'created_by'];
          const sanitized = {};
          validFields.forEach(f => { if (raw[f] !== undefined) sanitized[f] = raw[f]; });

          console.log('[confirmAction] Inserting transaction:', sanitized);
          const { error: trxError } = await supabase.from('transactions').insert(sanitized);
          if (trxError) throw trxError;

        } else if (action.type === 'allocation') {
          const validFields = ['amount', 'wallet_id', 'budget_id', 'created_by'];
          const sanitized = {};
          validFields.forEach(f => { if (raw[f] !== undefined) sanitized[f] = raw[f]; });

          const { error: allocError } = await supabase.from('allocations').insert(sanitized);
          if (allocError) throw allocError;
        }
        if (!silent) alert('Guardado correctamente.');
      }

      if (messageId) {
        await supabase.from('ai_chat_messages').update({ processed: true }).eq('id', messageId);
      }
    } catch (err) {
      console.error('[confirmAction] Error:', err);
      if (!silent) alert('Error al guardar: ' + (err.message || JSON.stringify(err)));
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-10 h-16">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-accent/50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm uppercase tracking-tight">Asistente IA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1 h-1 rounded-full bg-green-500" />
            <span className="text-[8px] font-black text-green-500 uppercase">EN LÍNEA</span>
          </div>
          <button onClick={() => setShowClearConfirm(true)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Clear Confirm */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center">
              <h3 className="text-xl font-bold mb-4">¿Limpiar historial?</h3>
              <div className="flex gap-3">
                <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-2xl bg-white/5">Cancelar</button>
                <button onClick={clearHistory} className="flex-1 py-3 rounded-2xl bg-destructive font-bold">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide bg-[#0a0a0a]">
        {messages.map((msg, i) => (
          <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-4`}>
            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-lg bg-[#d9ff3b]/10 border border-[#d9ff3b]/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-[#d9ff3b]" /></div>}
            <div className={`relative max-w-[70%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#d9ff3b] text-black rounded-tr-none' : 'bg-[#1a1a1a] border border-white/5 rounded-tl-none text-foreground'}`}>
                {msg.image && (
                  <div className="mb-2 p-1 bg-black/10 rounded-lg flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Imagen procesada</span>
                  </div>
                )}
                {msg.text === 'Analizando...' ? (
                  <div className="flex items-center gap-2 py-1">
                    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }} className="w-1.5 h-1.5 rounded-full bg-[#d9ff3b]" />
                    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: "reverse", delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-[#d9ff3b]" />
                    <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: "reverse", delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-[#d9ff3b]" />
                    <span className="text-[10px] font-bold text-[#d9ff3b]/60 ml-1 uppercase tracking-widest">Pensando</span>
                  </div>
                ) : (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}
                {msg.action && (
                  <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase">{msg.action.type}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d9ff3b] text-black font-black uppercase">{msg.action.mode}</span>
                    </div>
                    <p className="text-xs opacity-60 mb-3">$ {msg.action.data?.amount?.toLocaleString()}</p>
                    {!msg.isAutoProcessed && (
                      <button onClick={() => confirmAction(msg.action, false, msg.id)} className="w-full py-2 bg-[#d9ff3b] text-black rounded-lg text-[10px] font-black uppercase">Confirmar</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && <div className="flex justify-start gap-4"><Loader2 className="h-5 w-5 animate-spin text-[#d9ff3b]" /></div>}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input bar redesigned for mobile ergonomics */}
      <div className="p-4 bg-[#0a0a0a] border-t border-white/5 pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          
          {/* Development Warning */}
          <div className="flex justify-center -mb-2 mt-[-8px]">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-[10px] text-orange-500 font-medium">
                Versión en desarrollo. El asistente puede cometer errores.
              </span>
            </div>
          </div>

          {attachment && (
            <div className="relative w-20">
              <img src={attachment.preview} className="h-20 w-20 object-cover rounded-xl border border-white/10 shadow-lg" />
              <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 p-1.5 bg-destructive rounded-full shadow-lg"><X className="h-3 w-3 text-white" /></button>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
             {/* Main Input Row */}
             <div className="flex items-center gap-2 bg-[#1a1a1a] shadow-2xl shadow-white/5 border border-white/10 rounded-3xl p-2 pl-4">
                {/* Desktop Camera Toggle */}
                <button 
                   onClick={() => fileInputRef.current?.click()} 
                   className="hidden md:flex p-2 text-white/20 hover:text-[#d9ff3b] transition-colors"
                >
                  <Camera className="h-5 w-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  placeholder="Escribe un movimiento..."
                  className="flex-1 bg-transparent border-none outline-none text-[16px] md:text-sm py-4 md:py-2 text-white placeholder-white/20 resize-none max-h-40"
                  rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                />

                {/* Desktop Mode Toggle */}
                <button
                  onClick={() => setLocalAiMode(prev => prev === 'agendar' ? 'guardar' : 'agendar')}
                  className={`hidden md:flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${localAiMode === 'agendar' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-[#d9ff3b] bg-[#d9ff3b]/10 border-[#d9ff3b]/20'}`}
                >
                  {localAiMode}
                </button>

                <button onClick={handleSend} disabled={loading} className="w-12 h-12 md:w-10 md:h-10 bg-[#d9ff3b] text-black shadow-xl shadow-[#d9ff3b]/20 active:scale-95 rounded-2xl md:rounded-xl flex items-center justify-center disabled:opacity-30 transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
             </div>

             {/* Mobile-only Ergonomic Buttons (Camera + Mode) */}
             <div className="flex md:hidden items-center justify-between px-1">
                <button 
                   onClick={() => fileInputRef.current?.click()} 
                   className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white/40 active:bg-white/10 transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">CÁMARA</span>
                </button>

                <button
                  onClick={() => setLocalAiMode(prev => prev === 'agendar' ? 'guardar' : 'agendar')}
                  className={`flex items-center gap-2 px-6 py-4 rounded-2xl active:scale-95 transition-all border ${localAiMode === 'agendar' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-[#d9ff3b] bg-[#d9ff3b]/10 border-[#d9ff3b]/20'}`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse ${localAiMode === 'agendar' ? 'bg-blue-400' : 'bg-[#d9ff3b]'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{localAiMode}</span>
                </button>
             </div>
          </div>
        </div>
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
};

export default AIChatView;
