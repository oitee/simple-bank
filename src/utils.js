import * as db from "./db_connection.js";

export async function initialiseDb() {
  try {
    await db.pool.query(`
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
        `);
    return `Database initialised`;
  } catch (e) {
    return `Failed to initialise database`;
  }
}

export function parseCommand(str) {
  if (str && typeof str === "string") {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return null;
}

/**
 * Call the commandFn within try-catch block
 * Owing to repeatable-read isolation,
 * if the function-call throws an error, the system will
 * attempt one retry
 */
export async function callWithRetries(fn, args, maxRetries = 1, retry = 0) {
  try {
    return fn(...args);
  } catch (e) {
    if (retry < maxRetries) {
      return callWithRetries(fn, args, 1, retry + 1);
    }
    console.log(`Unexpected Error`);
    console.log(e);
    return null;
  }
}
