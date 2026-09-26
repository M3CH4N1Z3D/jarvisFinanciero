import { supabase } from './supabaseClient';

export interface AccountInsert {
  name: string;
  balance: number;
  rules?: string;
}

export async function createAccount(name: string, balance: number, rules: string = '') {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const { data, error } = await supabase
    .from('accounts')
    .insert([{ 
      user_id: userData.user.id,
      name, 
      balance, 
      rules 
    }])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getUserAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export interface TransactionInsert {
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  tipo: 'Gasto' | 'Ingreso';
  account_id?: string;
  tax_amount?: number;
  cuenta_nombre?: string;
}

export async function insertTransaction(transaction: TransactionInsert) {
  let finalAccountId = transaction.account_id;

  if (transaction.cuenta_nombre && !finalAccountId) {
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name');
      
    if (accountsError) throw new Error(accountsError.message);
    
    const account = accounts.find(acc => acc.name.toLowerCase() === transaction.cuenta_nombre!.toLowerCase());
    if (!account) {
      throw new Error(`No se encontró la cuenta "${transaction.cuenta_nombre}". Por favor verifica el nombre o pídele a Jarvis que la cree.`);
    }
    finalAccountId = account.id;
  }

  if (!finalAccountId) {
    throw new Error("No se puede registrar la transacción sin una cuenta válida. Por favor especifica de qué cuenta.");
  }

  const { cuenta_nombre, ...dbTransaction } = transaction;
  dbTransaction.account_id = finalAccountId;

  const { data, error } = await supabase
    .from('transactions')
    .insert([dbTransaction])
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

export async function updateTransaction(conceptoBusqueda: string, nuevosDatos: any) {
  // Buscar la transacción más reciente que coincida con el concepto
  const { data: searchData, error: searchError } = await supabase
    .from('transactions')
    .select('*')
    .ilike('concepto', `%${conceptoBusqueda}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (searchError) {
    throw new Error(searchError.message);
  }

  if (!searchData || searchData.length === 0) {
    throw new Error(`No encontré ninguna transacción que coincida con "${conceptoBusqueda}"`);
  }

  const transactionId = searchData[0].id;

  // Actualizar la transacción
  const { data: updateData, error: updateError } = await supabase
    .from('transactions')
    .update(nuevosDatos)
    .eq('id', transactionId)
    .select();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updateData;
}

export async function deleteTransaction(conceptoBusqueda: string) {
  // Buscar la transacción más reciente que coincida con el concepto
  const { data: searchData, error: searchError } = await supabase
    .from('transactions')
    .select('*')
    .ilike('concepto', `%${conceptoBusqueda}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (searchError) {
    throw new Error(searchError.message);
  }

  if (!searchData || searchData.length === 0) {
    throw new Error(`No encontré ninguna transacción que coincida con "${conceptoBusqueda}"`);
  }

  const transactionId = searchData[0].id;
  const transactionConcept = searchData[0].concepto;

  // Eliminar la transacción
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return transactionConcept;
}
