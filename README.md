# simple-bank

A simple NodeJs project that supports withdrawals, deposits and transfers among bank accounts.

## Scope

The system abides by the following constraints:

- Account balance cannot exceed ₹1,00,000
- Account balance cannot be less than ₹0
- The minimum deposit amount is ₹500 per transaction
- The maximum deposit amount is ₹50,000 per transaction
- The minimum withdrawal amount is ₹1,000 per transaction
- The maximum withdrawal amount is ₹25,000 per transaction
- No more than 3 deposits are allowed in a day
- No more than 3 withdrawals are allowed in a day
- Account number entered during deposit or withdrawal should be valid
- Account has sufficient balance during withdrawals


## Command Interface

This system assumes input to be provided from a CSV file. For example, the one in `./commands.csv` file:

```csv
INIT_DB
CREATE_ACCOUNT, Alice
CREATE_ACCOUNT, Bob
DEPOSIT, 1001, 10000
DEPOSIT, 1002, 20000
WITHDRAW, 1001, 1000
WITHDRAW, 1002, 2000
TRANSFER, 1001, 1002, 1000
```
The `INIT_DB` is the only non-bank transaction related command: it is used to set up the database schema and to drop existing tables. At least for the very first run of the system, `INIT_DB` is essential.

### Regarding Account Numbers

Note that account numbers are generated sequentially starting with `1001`. This will be reset everytime the `INIT_DB` command is called. We have used this to ensure that the account numbers generated by the system are somewhat predictable, in order to write the command interface.

## Running

To run this project, the database needs to be created. 

```
npm install
docker-compose up -d
docker exec -it simple_bank_pg psql -U postgres
CREATE DATABASE bank_accounts;
```
At this point, we can run the commands in the `commands.csv` file:

```
PG_USER=postgres PG_DATABASE=postgres PG_PORT=5432  npm start 
```
Additionally, if we want to provide another file (with commands), we can use:

```
PG_USER=postgres PG_DATABASE=postgres PG_PORT=5432  FILE_PATH=/tmp/another_file.csv npm start 
```

In order to allow further configurations, the following environment variables are provided:

- MAX_WITHDRAWAL_AMOUNT (defaulting to 25000)
- MIN_WITHDRAWAL_AMOUNT (defaulting to 1000 )
- MAX_DEPOSIT_AMOUNT (defaulting to 50000)
- MIN_DEPOSIT_AMOUNT (defaulting to 500)
- MIN_ACCOUNT_BALANCE (defaulting to 0)
- MAX_ACCOUNT_BALANCE (defaulting to 100000)


## Tests

Tests are provided for all of the above funtionalities and can be locally run using:

```
npm test
```
This assumes that the provided docker file was used. Otherwise, the same environment variables (as in the `npm start` command) can be passed as well:

```
PG_USER=postgres PG_DATABASE=postgres PG_PORT=5432  npm run test_without_env_vars 
```

Tests should run as per the GitHub workflow set up here [https://github.com/oitee/simple-bank/actions](https://github.com/oitee/simple-bank/actions)

## Database Schema

This project uses PostgreSQL for storing accounts and transaction ledger, using the following schema.

```sql
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

```

### Note about Transactions

In this project, we attempt to support concurrent operations on accounts. For example, two accounts might simultaneously have multiple transfers happening between themselves. In order to be correct we do all database account balance related operations, in a transaction, with isolation level `REPEATABLE READ`. This will ensure that one operation on one account does not lose any update (dirty write or lost update) during the course of the concurrently running transactions. 

To quote the [Postgres documentation](https://www.postgresql.org/docs/9.5/transaction-iso.html):

> **UPDATE**, DELETE, SELECT FOR UPDATE, and SELECT FOR SHARE commands behave the same as SELECT in terms of searching for target rows: they will only find target rows that were committed as of the transaction start time. However, such a target row might have already been updated (or deleted or locked) by another concurrent transaction by the time it is found. In this case, **the repeatable read transaction will wait for the first updating transaction to commit or roll back** (if it is still in progress). 
