import { format, addMonths, isAfter, isBefore, startOfDay } from 'date-fns';

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Payment {
  id: string;
  amount: number;
  dueDate: string; // ISO string
  status: PaymentStatus;
  paidAt?: string;
}

export type LoanStatus = 'active' | 'completed' | 'overdue' | 'defaulted';

export interface Loan {
  id: string;
  clientName: string;
  amount: number;
  interestRate: number; // monthly %
  totalTerm: number; // in months
  startDate: string;
  status: LoanStatus;
  payments: Payment[];
  description?: string;
}

export const STORAGE_KEY = 'financas_operacionais_data';

export const INITIAL_DATA: Loan[] = [
  {
    id: '8829-X',
    clientName: 'Anderson Mecânico',
    amount: 4500,
    interestRate: 15,
    totalTerm: 10,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'overdue',
    payments: [
      { id: '1', amount: 450, dueDate: format(addMonths(new Date(), -1), 'yyyy-MM-dd'), status: 'overdue' },
      { id: '2', amount: 450, dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'pending' },
    ]
  },
  {
    id: '1234-Y',
    clientName: 'Bruna (Estética)',
    amount: 2150,
    interestRate: 10,
    totalTerm: 5,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active',
    payments: [
      { id: '1', amount: 430, dueDate: format(addMonths(new Date(), -1), 'yyyy-MM-dd'), status: 'paid', paidAt: format(addMonths(new Date(), -1), 'yyyy-MM-dd') },
      { id: '2', amount: 430, dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'pending' },
    ]
  },
  {
    id: '5566-Z',
    clientName: 'Zé do Caminhão',
    amount: 12000,
    interestRate: 12,
    totalTerm: 24,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'active',
    payments: [
      { id: '1', amount: 500, dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'pending' },
    ]
  }
];
