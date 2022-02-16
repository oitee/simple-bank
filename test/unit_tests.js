import assert from "assert";
import * as db from "../src/db_connection.js";
import * as constants from "../src/constants.js";
import * as main from "../src/main.js";

const username1 = "Alice";
const username2 = "Bob";

async function createAccounts() {
  //test for successful creation of two accounts
  let accountCreationResponse = await main.createAccount(username1);
  assert.ok(accountCreationResponse.includes(constants.successMessages.create), "Test for successful account creation with username1");
  let account1 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(typeof account1, "number", "Test for successful account creation with username1");

  accountCreationResponse = await main.createAccount(username2);
  assert.ok(accountCreationResponse.includes(constants.successMessages.create), "Test for successful account creation with username2");
  let account2 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(typeof account2, "number", "Test for successful account creation with username2");
}

async function depositTransactions() {
  //test for successful deposit transaction
  let account1 = await newAccount();
  assert.equal(
    (await main.deposit(account1, 20000)).includes(
      constants.successMessages.deposit
    ),
    true,
    "Test for successful deposit transaction"
  );

  // test for transaction with non-existent account
  assert.equal(
    (await main.deposit(111, 30000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for deposit transaction with non-existent account"
  );

  // test for transaction with out-of-bound deposit amount
  assert.equal(
    (await main.deposit(account1, 100)).includes(
      constants.errorMessages.depositAmount
    ),
    true,
    "Test for deposit transaction with less than lower-bound deposit amount"
  );
  assert.equal(
    (await main.deposit(account1, 60000)).includes(
      constants.errorMessages.depositAmount
    ),
    true,
    "Test for deposit transaction with greater than upper-bound deposit amount"
  );

  // test for exceeding the resultant balance of the account
  await main.deposit(account1, 40000);
  assert.equal(
    (await main.deposit(account1, 40000)).includes(
      constants.errorMessages.maxBalance
    ),
    true,
    "Test for deposit transaction where the resultant account balance exceeds INR 1,00,000"
  );

  // test for 3+ deposit transactions

  let account2 = await newAccount();

  await main.deposit(account2, 2000);
  await main.deposit(account2, 3000);
  assert.equal(
    (await main.deposit(account2, 3000)).includes(
      constants.successMessages.deposit
    ),
    true,
    "Test for third consecutive deposit transaction (successful)"
  );
  assert.equal(
    (await main.deposit(account2, 3000)).includes(
      constants.errorMessages.maxDeposit
    ),
    true,
    "Test for 3+ deposit transactions (unsuccessful)"
  );
}

async function withdrawTransactions() {
  let account1 = await newAccount();
  await main.deposit(account1, 20000);

  //test for successful withdrawal transaction
  assert.equal(
    (await main.withdraw(account1, 15000)).includes(
      constants.successMessages.withdraw
    ),
    true,
    "Test for successful withdrawal transaction"
  );

  // test for transaction with non-existent account
  assert.equal(
    (await main.withdraw(111, 15000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for Withdrawal transaction with non-existent account"
  );

  // test for transaction with out-of-bound withdrawal amount
  assert.equal(
    (await main.withdraw(account1, 600)).includes(
      constants.errorMessages.withdrawAmount
    ),
    true,
    "Test for withdrawal transaction with less than lower-bound withdrawal amount"
  );
  assert.equal(
    (await main.withdraw(account1, 30000)).includes(
      constants.errorMessages.withdrawAmount
    ),
    true,
    "Test for withdrawal transaction with greater than upper-bound withdrawal amount"
  );

  // test for reducing the resultant balance of the account below 0
  assert.equal(
    (await main.withdraw(account1, 20000)).includes(
      constants.errorMessages.minBalance
    ),
    true,
    "Test for withdrawl transaction where the resultant account balance falls below INR 0"
  );

  // test for 3 and more deposit transactions

  let account2 = await newAccount();

  await main.deposit(account2, 20000); // this is required as the opening balance is 0 for a new account
  await main.withdraw(account2, 3000);
  await main.withdraw(account2, 3000);
  assert.equal(
    (await main.withdraw(account2, 3000)).includes(
      constants.successMessages.withdraw
    ),
    true,
    "Test for third consecutive withdrawal transaction (successful)"
  );
  assert.equal(
    (await main.withdraw(account2, 3000)).includes(
      constants.errorMessages.maxWithdraw
    ),
    true,
    "Test for 3+ withdrawal transactions (unsuccessful)"
  );
}

async function transfers() {
  let account1 = await newAccount();
  let account2 = await newAccount();

  // setting up opening balances:
  await main.deposit(account1, 30000);
  await main.deposit(account2, 30000);

  //   test for transfers with correct details
  assert.equal(
    (await main.transfer(account1, account2, 2000)).includes(
      constants.successMessages.transfer
    ),
    true,
    "Test for a successful transfer"
  );

  // test for transfers with one non-existing account
  assert.equal(
    (await main.transfer(account1, 123, 4000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for transfer with one non-existing account"
  );
  assert.equal(
    (await main.transfer(999, account2, 4000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for transfer with one non-existing account"
  );

  // test for transfers with both non-existing account
  assert.equal(
    (await main.transfer(123, 456, 4000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for transfer with two non-existing accounts"
  );

  //test for transfers with out-of-bound amounts
  // (i) out-of-bound amount for withdrawal in a transfer:
  assert.equal(
    (await main.transfer(account1, account2, 600)).includes(
      constants.errorMessages.withdrawAmount
    ),
    true,
    "Test for transfer where the amount is less than the lower-bound amount for a withdrawal transaction"
  );
  assert.equal(
    (await main.transfer(account1, account2, 30000)).includes(
      constants.errorMessages.withdrawAmount
    ),
    true,
    "Test for transfer where the amount is greater than the upper-bound amount for a withdrawal transaction"
  );

  //(ii) out-of-bound amount for deposit in a transfer:
  assert.equal(
    (await main.transfer(account1, account2, 100)).includes(
      constants.errorMessages.depositAmount
    ),
    true,
    "Test for transfer where the amount is less than the lower-bound amount for a deposit transaction"
  );
  assert.equal(
    (await main.transfer(account1, account2, 60000)).includes(
      constants.errorMessages.depositAmount
    ),
    true,
    "Test for transfer where the amount is greater than the upper-bound amount for a deposit transaction"
  );

  //test for transfers which reduce balance of one account below zero
  account1 = await newAccount();
  account2 = await newAccount();

  await main.deposit(account1, 4000);

  assert.equal(
    (await main.transfer(account1, account2, 20000)).includes(
      constants.errorMessages.minBalance
    ),
    true,
    "Test for transfer where the resultant account balance falls below INR 0"
  );

  //test for transfers which increase balance of one account beyond INR 1,00,000
  await main.deposit(account1, 40000);
  await main.deposit(account2, 40000);
  await main.deposit(account2, 40000);

  assert.equal(
    (await main.transfer(account1, account2, 25000)).includes(
      constants.errorMessages.maxBalance
    ),
    true,
    "Test for transfer where the resultant account balance exceeds INR 1,00,000"
  );

  // test for 3+ transfers
  account1 = await newAccount();
  account2 = await newAccount();

  await main.deposit(account1, 40000);
  await main.deposit(account2, 40000);

  await main.transfer(account1, account2, 4000);
  assert.equal(
    (await main.transfer(account1, account2, 4000)).includes(
      constants.successMessages.transfer
    ),
    true,
    "Test for transfer between accounts that have not hit the 3-transaction-per-day limit (successful)"
  );
  let exceededTransferResponse = await main.transfer(account1, account2, 4000);
  assert.equal(
    exceededTransferResponse.includes(constants.errorMessages.maxDeposit) ||
      exceededTransferResponse.includes(constants.errorMessages.maxWithdraw),
    true,
    "Test for transfer between accounts that have hit the 3-transaction-per-day limit (unsuccessful)"
  );
}

async function newAccount() {
  let accountCreationResponse = await main.createAccount(
    username1 + Math.floor(Math.random() * 1000)
  );
  return parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
}

beforeAll(async () => {
  db.poolStart();
  await db.pool.query(`    
    CREATE SEQUENCE IF NOT EXISTS account_number_seq START 1001;

    DROP TABLE IF EXISTS ledger;
    DROP TABLE IF EXISTS account;
    DROP TABLE IF EXISTS transaction_type;
    

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
    INSERT INTO transaction_type (name) VALUES ('deposit'), ('withdraw');`);
});
afterAll(async () => {
  await db.pool.end();
});

test("Creation of new accounts", createAccounts);
test("Deposit transactions", depositTransactions);
test("Withdrawal transactions", withdrawTransactions);
test("Transfers", transfers);
