import { supabase } from './supabaseClient';

export interface TransactionInsert {
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  tipo: 'Gasto' | 'Ingreso';
}

export async function insertTransaction(transaction: TransactionInsert) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getTransactionsCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const firstDay = `${year}-${month}-01`;
  
  const nextMonthDate = new Date(year, now.getMonth() + 1, 0);
  const lastDay = `${year}-${month}-${String(nextMonthDate.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('fecha', firstDay)
    .lte('fecha', lastDay)
    .order('fecha', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
