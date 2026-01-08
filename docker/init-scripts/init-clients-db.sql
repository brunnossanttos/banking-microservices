CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE account_type AS ENUM ('checking', 'savings');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'blocked', 'pending_verification');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip_code VARCHAR(8),
    
    banking_agency VARCHAR(10) NOT NULL,
    banking_account VARCHAR(20) NOT NULL,
    banking_account_type account_type DEFAULT 'checking',
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    
    profile_picture_url TEXT,
    
    status user_status DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_banking_details UNIQUE (banking_agency, banking_account)
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_cpf ON users(cpf) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_banking ON users(banking_agency, banking_account);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO users (
    email, password_hash, name, cpf,
    address_street, address_number, address_city, address_state, address_zip_code,
    banking_agency, banking_account, banking_account_type, balance,
    status, email_verified
) VALUES 
(
    'joao.silva@email.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMye/IIy.5/iGkXB2l0VJlQTU9WZPYi6mJq', -- password: 123456
    'João Silva',
    '12345678901',
    'Rua das Flores',
    '123',
    'São Paulo',
    'SP',
    '01234567',
    '0001',
    '123456-7',
    'checking',
    5000.00,
    'active',
    true
),
(
    'maria.santos@email.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Zh4dO8KIV/e7vMYvBppHu', -- password: 123456
    'Maria Santos',
    '98765432109',
    'Av. Paulista',
    '1000',
    'São Paulo',
    'SP',
    '01310100',
    '0001',
    '654321-0',
    'checking',
    10000.00,
    'active',
    true
);