-- alter_schema_v3.sql
-- Triggers para actualizar el saldo de la cuenta automáticamente

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es un DELETE, revertimos el impacto del registro OLD
    IF TG_OP = 'DELETE' THEN
        IF OLD.tipo = 'Gasto' THEN
            UPDATE accounts SET balance = balance + OLD.monto + COALESCE(OLD.tax_amount, 0) WHERE id = OLD.account_id;
        ELSIF OLD.tipo = 'Ingreso' THEN
            UPDATE accounts SET balance = balance - OLD.monto WHERE id = OLD.account_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Si es un UPDATE, primero revertimos el impacto del registro OLD
    IF TG_OP = 'UPDATE' THEN
        IF OLD.tipo = 'Gasto' THEN
            UPDATE accounts SET balance = balance + OLD.monto + COALESCE(OLD.tax_amount, 0) WHERE id = OLD.account_id;
        ELSIF OLD.tipo = 'Ingreso' THEN
            UPDATE accounts SET balance = balance - OLD.monto WHERE id = OLD.account_id;
        END IF;
    END IF;

    -- Si es INSERT o UPDATE, aplicamos el impacto del registro NEW
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.tipo = 'Gasto' THEN
            UPDATE accounts SET balance = balance - NEW.monto - COALESCE(NEW.tax_amount, 0) WHERE id = NEW.account_id;
        ELSIF NEW.tipo = 'Ingreso' THEN
            UPDATE accounts SET balance = balance + NEW.monto WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;

CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();
