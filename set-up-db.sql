CREATE DATABASE bank_accounts;
\connect bank_accounts;

DROP TABLE IF EXISTS ledger;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS transaction_type;
DROP SEQUENCE IF EXISTS account_number_seq CASCADE;

CREATE SEQUENCE IF NOT EXISTS account_number_seq START 1001;

CREATE TABLE IF NOT EXISTS account (
    id integer PRIMARY KEY DEFAULT nextval('account_number_seq'),
    holder TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_type (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger (
    operation INTEGER REFERENCES transaction_type(id),
    account INTEGER REFERENCES account(id),
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ledger_account_idx ON ledger(account);
CREATE INDEX IF NOT EXISTS ledger_created_at_idx ON ledger(created_at);
INSERT INTO transaction_type (name) VALUES ('deposit'), ('withdraw');

-- Example queries

INSERT INTO account (holder) VALUES ('OT') RETURNING id; 
INSERT INTO account (holder) VALUES ('OT1') RETURNING id; 
INSERT INTO account (holder) VALUES ('OT2') RETURNING id; 

INSERT INTO ledger (operation, account, amount) VALUES (1, 1001, 1000);

SELECT * from account;



