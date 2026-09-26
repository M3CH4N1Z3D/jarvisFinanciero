CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  tipo TEXT CHECK (tipo IN ('Gasto', 'Ingreso')) NOT NULL
);
