/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  Users, 
  DollarSign, 
  ChevronRight,
  ArrowRight,
  Calculator,
  Download,
  ShieldCheck,
  Search,
  MoreVertical,
  CheckCircle2,
  Bell,
  X
} from 'lucide-react';
import { Loan, Payment, INITIAL_DATA, STORAGE_KEY, PaymentStatus } from './types';
import { format, isAfter, startOfDay, parseISO, addMonths, isBefore } from 'date-fns';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export default function App() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const addNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type, timestamp: new Date() }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // New Loan Form State
  const [newLoan, setNewLoan] = useState({
    clientName: '',
    amount: '',
    interestRate: '15',
    totalTerm: '3'
  });

  const [calcBase, setCalcBase] = useState(1000);
  const [calcRate, setCalcRate] = useState(15);
  const calcResult = useMemo(() => (calcBase * (calcRate / 100)), [calcBase, calcRate]);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let currentLoans: Loan[] = [];
    if (saved) {
      try {
        currentLoans = JSON.parse(saved);
        setLoans(currentLoans);
      } catch (e) {
        currentLoans = INITIAL_DATA;
        setLoans(INITIAL_DATA);
      }
    } else {
      currentLoans = INITIAL_DATA;
      setLoans(INITIAL_DATA);
    }

    // Startup risk check
    const overdue = currentLoans.filter(l => l.status === 'overdue');
    if (overdue.length > 0) {
      setTimeout(() => {
        addNotification(
          'Alerta de Risco', 
          `Existem ${overdue.length} contratos com pagamentos em atraso.`, 
          'error'
        );
      }, 1000);
    }

    const today = startOfDay(new Date());
    const collectionsToday = currentLoans.flatMap(l => 
      l.payments.filter(p => p.status === 'pending' && startOfDay(parseISO(p.dueDate)).getTime() === today.getTime())
    );
    if (collectionsToday.length > 0) {
      setTimeout(() => {
        addNotification(
          'Agenda do Dia', 
          `Você tem ${collectionsToday.length} recebimentos previstos para hoje.`, 
          'info'
        );
      }, 2500);
    }

    const totalLent = currentLoans.reduce((acc, l) => acc + l.amount, 0);
    const overdueAmt = overdue.reduce((acc, l) => acc + l.amount, 0);
    if (totalLent > 0 && (overdueAmt / totalLent) > 0.2) {
      setTimeout(() => {
        addNotification(
          'ALERTA CRÍTICO', 
          'O índice de inadimplência ultrapassou 20%. Risco operacional elevado.', 
          'error'
        );
      }, 4000);
    }
  }, []);

  // Save data
  useEffect(() => {
    if (loans.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
    }
  }, [loans]);

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.clientName || !newLoan.amount) return;

    const amount = Number(newLoan.amount);
    const rate = Number(newLoan.interestRate);
    const term = Number(newLoan.totalTerm);
    const monthlyPayment = (amount * (1 + (rate / 100))) / term;

    const payments: Payment[] = Array.from({ length: term }).map((_, i) => ({
      id: Math.random().toString(36).substring(7),
      amount: Number(monthlyPayment.toFixed(2)),
      dueDate: format(addMonths(new Date(), i + 1), 'yyyy-MM-dd'),
      status: 'pending'
    }));

    const loan: Loan = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      clientName: newLoan.clientName,
      amount: amount,
      interestRate: rate,
      totalTerm: term,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      payments
    };

    setLoans([loan, ...loans]);
    setIsNewLoanModalOpen(false);
    setNewLoan({ clientName: '', amount: '', interestRate: '15', totalTerm: '3' });
    addNotification('Novo Contrato', `Empréstimo de R$ ${amount} para ${loan.clientName} registrado.`, 'success');
  };

  const handleDeleteLoan = (loanId: string) => {
    setLoanToDelete(loanId);
    setIsAuthModalOpen(true);
    setAuthPassword('');
  };

  const confirmDeleteLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === '184421') {
      setLoans(prev => prev.filter(l => l.id !== loanToDelete));
      setSelectedLoan(null);
      setIsAuthModalOpen(false);
      setLoanToDelete(null);
      addNotification('Contrato Encerrado', 'Os registros do cliente foram removidos permanentemente.', 'warning');
    } else {
      addNotification('Acesso Negado', 'Senha operacional incorreta.', 'error');
    }
  };

  const handleTogglePayment = (loanId: string, paymentId: string) => {
    setLoans(loans.map(l => {
      if (l.id !== loanId) return l;
      const updatedPayments = l.payments.map(p => {
        if (p.id !== paymentId) return p;
        const isPaid = p.status === 'paid';
        return {
          ...p,
          status: (isPaid ? 'pending' : 'paid') as PaymentStatus,
          paidAt: isPaid ? undefined : format(new Date(), 'yyyy-MM-dd')
        };
      });
      
      // Update loan status based on payments
      const hasOverdue = updatedPayments.some(p => p.status === 'overdue');
      const allPaid = updatedPayments.every(p => p.status === 'paid');
      let status = l.status;
      if (allPaid) status = 'completed';
      else if (hasOverdue) status = 'overdue';
      else status = 'active';

      const isBecomingPaid = updatedPayments.find(p => p.id === paymentId)?.status === 'paid';
      if (isBecomingPaid) {
        addNotification('Pagamento Confirmado', `Recebimento de parcela registrado para ${l.clientName}.`, 'success');
      }

      return { ...l, payments: updatedPayments, status };
    }));
  };

  // Derived stats
  const stats = useMemo(() => {
    const totalLent = loans.reduce((acc, l) => acc + l.amount, 0);
    const activeContracts = loans.filter(l => l.status === 'active' || l.status === 'overdue').length;
    
    // Total amount that will be collected (Principal + Interest)
    const totalExpected = loans.reduce((acc, l) => {
        return acc + l.payments.reduce((sum, p) => sum + p.amount, 0);
    }, 0);

    const totalReceived = loans.reduce((acc, l) => {
        return acc + l.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    }, 0);

    const totalPending = totalExpected - totalReceived;

    // Profit = Total Interest Expected
    const totalInterestExpected = loans.reduce((acc, l) => {
        const totalLoanAmount = l.payments.reduce((sum, p) => sum + p.amount, 0);
        return acc + (totalLoanAmount - l.amount);
    }, 0);

    // Interest realized (proportional per payment)
    const interestRealized = loans.reduce((acc, l) => {
        const principalPerPayment = l.amount / l.totalTerm;
        const realizedInterest = l.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount - principalPerPayment), 0);
        return acc + realizedInterest;
    }, 0);

    const profitMargin = totalLent > 0 ? (totalInterestExpected / totalLent) * 100 : 0;
    
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const defaultPercentage = totalLent > 0 ? (overdueLoans.reduce((acc, l) => acc + l.amount, 0) / totalLent) * 100 : 0;

    const today = startOfDay(new Date());
    const collectionsToday = loans.flatMap(l => 
      l.payments
        .filter(p => startOfDay(parseISO(p.dueDate)).getTime() === today.getTime())
        .map(p => ({ ...p, clientName: l.clientName, loanId: l.id }))
    );

    return {
      totalLent,
      activeContracts,
      totalReceived,
      totalPending,
      totalInterestExpected,
      interestRealized,
      profitMargin,
      defaultPercentage,
      collectionsToday,
      overdueCount: overdueLoans.length
    };
  }, [loans]);

  const filteredLoans = loans.filter(l => 
    l.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Finanças<span className="text-emerald-500 underline decoration-2 underline-offset-4">Operacionais</span>
            </h1>
            <p className="text-slate-500 text-sm font-mono mt-1">SISTEMA DE GESTÃO DE ATIVOS E RISCO • v2.4.2</p>
          </div>
            <div className="text-left md:text-right">
            <div className="text-slate-400 text-xs uppercase tracking-widest mb-1 font-bold">Total em Recebíveis (Principal + Juros)</div>
            <div className="text-3xl font-mono text-emerald-400 font-bold">
              R$ {stats.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 flex-1">
          
          {/* Main Metrics: Total Lent */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 md:row-span-1 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl flex flex-col justify-between group hover:border-emerald-500/30 transition-all duration-500"
          >
            <div className="flex justify-between items-start">
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-tighter">
                Empréstimos Ativos
              </span>
              <div className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                <TrendingUp size={12} className="text-emerald-500" />
                <span>+12.4% vs Mês Ant.</span>
              </div>
            </div>
            <div className="my-4">
              <div className="text-5xl font-black tracking-tighter text-white">
                R$ {stats.totalLent.toLocaleString('pt-BR')}
              </div>
              <div className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                Total alocado em {stats.activeContracts} contratos vigentes
              </div>
            </div>
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ duration: 1, delay: 0.2 }}
                className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              ></motion.div>
            </div>
          </motion.div>

          {/* Profit Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="md:col-span-1 md:row-span-1 bg-slate-900 border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between group hover:border-emerald-500/40 transition-all shadow-inner"
          >
            <div className="text-emerald-500 font-black flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
              <TrendingUp size={14} /> Lucro Realizado
            </div>
            <div>
              <div className="text-3xl font-mono text-white font-bold">
                R$ {stats.interestRealized.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-500 font-mono">MARGEM ATUAL</span>
                <span className="text-[10px] text-emerald-400 font-bold">{stats.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-slate-600 text-[9px] uppercase tracking-tighter leading-none mt-2">
              Projeção total de lucro: <span className="text-slate-400 font-bold">R$ {stats.totalInterestExpected.toLocaleString('pt-BR')}</span>
            </div>
          </motion.div>

          {/* Upcoming Collections */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1 md:row-span-2 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl flex flex-col"
          >
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={14} /> Recebimentos Previstos
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {stats.collectionsToday.length > 0 ? (
                stats.collectionsToday.map((p, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-800/40 pb-3 group">
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors cursor-default">
                        {p.clientName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono italic">
                        {p.status === 'paid' ? 'CONCLUÍDO' : `VENCIMENTO HOJE • R$ ${p.amount}`}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTogglePayment(p.loanId, p.id)}
                      className={`transition-colors p-1 ${p.status === 'paid' ? 'text-emerald-500' : 'text-slate-700 hover:text-emerald-500'}`}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-20 flex flex-col items-center gap-2">
                  <Calendar size={32} />
                  <span className="text-xs font-mono lowercase">Sem agenda hoje</span>
                </div>
              )}
            </div>
            <button className="mt-auto w-full py-3 rounded-2xl bg-slate-800/50 text-[10px] font-black tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase">
              Ver Agenda Completa
            </button>
          </motion.div>

          {/* Critical List / Table */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2 md:row-span-2 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Controle de Fluxo</h3>
               <div className="relative">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                 <input 
                  type="text" 
                  placeholder="BUSCAR CLIENTE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-full py-1 pl-9 pr-4 text-[10px] font-mono focus:outline-none focus:border-emerald-500/50 transition-colors w-40 md:w-64"
                 />
               </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono underline cursor-pointer hover:text-white">ORDENAR POR RISCO</span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-slate-600 uppercase border-b border-slate-800/80 font-black">
                    <th className="pb-3 px-2">Cliente</th>
                    <th className="pb-3 px-2">Valor Total</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {filteredLoans.map((loan) => (
                    <motion.tr 
                      layout
                      key={loan.id} 
                      className="border-b border-slate-800/40 hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-2">
                        <div className="font-bold text-slate-200">{loan.clientName}</div>
                        <div className="text-[10px] text-slate-600 uppercase italic">ID: {loan.id}</div>
                      </td>
                      <td className="py-4 px-2 text-slate-300">
                        R$ {loan.amount.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                          loan.status === 'overdue' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {loan.status === 'overdue' ? 'Cobrança Forte' : 'Operando'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button 
                          onClick={() => setSelectedLoan(loan)}
                          className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl transition-all"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Quick Interest Calculator */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-1 md:row-span-1 bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-all"></div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calculator size={14} /> Simulador de Juros
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 mb-1 font-bold">VALOR BASE</label>
                <input 
                  type="number"
                  value={calcBase}
                  onChange={e => setCalcBase(Number(e.target.value))}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors w-full"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 mb-1 font-bold">TAXA SEMANAL (%)</label>
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs group-hover:border-slate-700 transition-colors">
                  <input 
                    type="number"
                    value={calcRate}
                    onChange={e => setCalcRate(Number(e.target.value))}
                    className="bg-transparent text-white focus:outline-none w-16"
                  />
                  <span className="text-emerald-500 font-black">+ R$ {calcResult.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Overdue Warning */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="md:col-span-1 md:row-span-1 bg-rose-950/20 border border-rose-900/30 p-6 rounded-3xl flex flex-col justify-between group hover:border-rose-500/40 transition-all shadow-lg"
          >
            <div className="text-rose-400 font-bold flex items-center gap-2 text-[10px] uppercase tracking-widest font-black">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              Risco Crítico
            </div>
            <div>
              <div className="text-3xl font-mono text-rose-500 font-bold leading-tight">
                {stats.defaultPercentage.toFixed(1)}%
              </div>
              <p className="text-rose-300/20 text-[9px] mt-1 font-mono uppercase">Inadimplência Real</p>
            </div>
            <div className="text-rose-400/80 text-[10px] uppercase tracking-tighter font-black mt-2">
              {stats.overdueCount} Alvos de Cobrança
            </div>
          </motion.div>

        </div>

        {/* Bottom Toolbar */}
        <footer className="mt-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-800/80 pt-6 gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsNewLoanModalOpen(true)}
              className="flex-1 md:flex-none px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={16} strokeWidth={3} />
              Novo Empréstimo
            </button>
            <button className="flex-1 md:flex-none px-8 py-3 border border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-slate-100 transition-all flex items-center justify-center gap-2">
              <Download size={16} />
              Exportar
            </button>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2 text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Status: <span className="text-emerald-400 underline underline-offset-4">Sistema Blindado</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Backup Local: {format(new Date(), 'HH:mm')}</span>
            </div>
            <div className="opacity-40">UUID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
          </div>
        </footer>
      </div>

      {/* Simple Modal Backdrop Placeholder */}
      <AnimatePresence>
        {isNewLoanModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsNewLoanModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0D10] border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16"></div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Iniciar <span className="text-emerald-500">Novo Contrato</span></h2>
                <p className="text-slate-500 font-mono text-[10px] mt-1 shadow-sm">PREENCHA OS TERMOS DO ACORDO OPERACIONAL</p>
              </div>

              <form className="space-y-6" onSubmit={handleAddLoan}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome do Cliente / Identificador</label>
                    <input 
                      type="text" 
                      required
                      value={newLoan.clientName}
                      onChange={e => setNewLoan({...newLoan, clientName: e.target.value})}
                      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-colors" 
                      placeholder="Ex: Roberto do Gás" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Valor Principal (R$)</label>
                      <input 
                        type="number" 
                        required
                        value={newLoan.amount}
                        onChange={e => setNewLoan({...newLoan, amount: e.target.value})}
                        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-colors" 
                        placeholder="1000" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Juros Mensais (%)</label>
                      <input 
                        type="number" 
                        required
                        value={newLoan.interestRate}
                        onChange={e => setNewLoan({...newLoan, interestRate: e.target.value})}
                        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-colors" 
                        placeholder="15" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Prazo (Meses)</label>
                    <input 
                      type="number" 
                      required
                      value={newLoan.totalTerm}
                      onChange={e => setNewLoan({...newLoan, totalTerm: e.target.value})}
                      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-colors" 
                      placeholder="3" 
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsNewLoanModalOpen(false)} className="flex-1 py-4 border border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">Finalizar Contrato</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loan Details Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLoan(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 50 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0D10] border border-slate-800 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -mr-32 -mt-32"></div>
              
              <header className="flex justify-between items-start mb-8 relative">
                <div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{selectedLoan.clientName}</h2>
                  <div className="flex gap-4 items-center mt-2">
                    <span className="text-slate-500 font-mono text-[10px]">CONTRATO: {selectedLoan.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedLoan.status === 'overdue' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {selectedLoan.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="text-slate-500 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </header>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Principal</div>
                  <div className="text-xl font-mono text-white">R$ {selectedLoan.amount}</div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Juros</div>
                  <div className="text-xl font-mono text-emerald-400">{selectedLoan.interestRate}% <span className="text-[10px] align-middle opacity-50">/mês</span></div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Total de Parcelas</div>
                  <div className="text-xl font-mono text-white">{selectedLoan.payments.filter(p => p.status === 'paid').length} <span className="text-[10px] opacity-30">/ {selectedLoan.totalTerm}</span></div>
                </div>
              </div>

              <div className="bg-slate-900/30 border border-slate-800/60 rounded-[2rem] p-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Cronograma de Pagamentos</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedLoan.payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/40 group hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs ${
                          p.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${p.status === 'paid' ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                            R$ {p.amount.toLocaleString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            VENCIMENTO: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleTogglePayment(selectedLoan.id, p.id)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          p.status === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {p.status === 'paid' ? 'PAGO' : 'BAIXAR'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/60 flex justify-between items-center">
                <button 
                  onClick={() => handleDeleteLoan(selectedLoan.id)}
                  className="px-6 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                >
                  <AlertTriangle size={14} />
                  Encerrar Contrato (Excluir)
                </button>
                <div className="text-[9px] text-slate-700 font-mono italic">
                  Ação protegida por autenticação nível 2
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Layer */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <NotificationToast 
                notification={n} 
                onDismiss={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} 
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Auth Password Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0D0D10] border border-rose-500/20 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl -mr-16 -mt-16"></div>
              
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                  <ShieldCheck size={24} className="text-rose-500" />
                </div>
                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Autenticação <span className="text-rose-500">Nível 2</span></h2>
                <p className="text-slate-500 font-mono text-[9px] mt-1 uppercase">AUTORIZAÇÃO REQUERIDA PARA EXCLUSÃO DE DADOS</p>
              </div>

              <form className="space-y-4" onSubmit={confirmDeleteLoan}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Senha do Administrador</label>
                  <input 
                    type="password" 
                    autoFocus
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:border-rose-500/50 transition-colors text-white" 
                    placeholder="******" 
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20">Confirmar Destruição</button>
                  <button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full py-3 border border-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Abortar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  );
}

function NotificationToast({ notification, onDismiss }: { notification: Notification, onDismiss: () => void }) {
  const icons = {
    info: <Bell className="text-blue-400" size={18} />,
    success: <CheckCircle2 className="text-emerald-400" size={18} />,
    warning: <AlertTriangle className="text-amber-400" size={18} />,
    error: <AlertTriangle className="text-rose-400" size={18} />
  };

  const colors = {
    info: 'border-blue-500/20 bg-blue-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    error: 'border-rose-500/20 bg-rose-500/5'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`w-72 md:w-80 p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex gap-4 relative group ${colors[notification.type]}`}
    >
      <div className="mt-0.5">{icons[notification.type]}</div>
      <div className="flex-1">
        <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1 italic">
          {notification.title}
        </h4>
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
          {notification.message}
        </p>
      </div>
      <button 
        onClick={onDismiss}
        className="absolute top-2 right-2 text-slate-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
