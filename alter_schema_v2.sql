-- Crear tabla accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Configurar RLS para accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propias cuentas" 
    ON accounts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias cuentas" 
    ON accounts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias cuentas" 
    ON accounts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias cuentas" 
    ON accounts FOR DELETE 
    USING (auth.uid() = user_id);

-- Modificar tabla transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
