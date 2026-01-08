CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE transaction_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'reversed',
    'cancelled'
);

CREATE TYPE transaction_type AS ENUM (
    'transfer',
    'deposit',
    'withdrawal',
    'payment',
    'refund'
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    sender_user_id UUID NOT NULL,
    receiver_user_id UUID NOT NULL,
    
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(15, 2) DEFAULT 0.00 CHECK (fee >= 0),
    
    description VARCHAR(255),
    type transaction_type DEFAULT 'transfer',
    status transaction_status DEFAULT 'pending',
    
    idempotency_key VARCHAR(255) UNIQUE,
    reference_id VARCHAR(100),
    
    metadata JSONB DEFAULT '{}',
    
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    reversed_at TIMESTAMP,
    
    CONSTRAINT check_different_users CHECK (sender_user_id != receiver_user_id)
);

CREATE INDEX idx_transactions_sender ON transactions(sender_user_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_transactions_reference ON transactions(reference_id) WHERE reference_id IS NOT NULL;

CREATE INDEX idx_transactions_user_history ON transactions(sender_user_id, created_at DESC);
CREATE INDEX idx_transactions_receiver_history ON transactions(receiver_user_id, created_at DESC);

CREATE TABLE transaction_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    previous_status transaction_status,
    new_status transaction_status,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_events_transaction ON transaction_events(transaction_id);
CREATE INDEX idx_transaction_events_type ON transaction_events(event_type);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION log_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO transaction_events (
            transaction_id,
            event_type,
            previous_status,
            new_status,
            event_data
        ) VALUES (
            NEW.id,
            'status_changed',
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'changed_at', CURRENT_TIMESTAMP,
                'amount', NEW.amount
            )
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_transaction_status
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_transaction_status_change();