CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  tipo TEXT CHECK (tipo IN ('Gasto', 'Ingreso')) NOT NULL,
  user_id UUID DEFAULT auth.uid() NOT NULL
);

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para transacciones
CREATE POLICY "Usuarios pueden ver sus propias transacciones" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propias transacciones" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propias transacciones" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propias transacciones" 
ON transactions FOR DELETE 
USING (auth.uid() = user_id);
