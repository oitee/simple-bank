import assert from "assert";
import * as db from "../src/db_connection.js";
import * as constants from "../src/constants.js";
import * as main from "../src/main.js";

const username1 = "Alice";
let account1;

const username2 = "Bob";
let account2;

const username3 = "Claire";
let account3;

const username4 = "Dave";
let account4;

const username5 = "Earl";
let account5;

const username6 = "Fig";
let account6;

async function createAccounts() {
  let accountCreationResponse = await main.createAccount(username1);
  assert.ok(accountCreationResponse.includes(constants.successMessages.create));
  account1 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(typeof account1, "number", "Account No.s should be numbers");

  accountCreationResponse = await main.createAccount(username2);
  assert.ok(accountCreationResponse.includes(constants.successMessages.create));
  const accountNo2 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(typeof accountNo2, "number", "Account No.s should be numbers");
}

async function depositTransactions() {
  //test for successful deposit transaction
  assert.equal(
    (await main.deposit(account1, 20000)).includes(
      constants.successMessages.deposit
    ),
    true
  );

  // test for transaction with non-existent account
  assert.equal(
    (await main.deposit(111, 30000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true
  );

  // test for transaction with out-of-bound deposit amount
  assert.equal(
    (await main.deposit(account1, 100)).includes(
      constants.errorMessages.depositAmount
    ),
    true
  );
  assert.equal(
    (await main.deposit(account1, 60000)).includes(
      constants.errorMessages.depositAmount
    ),
    true
  );

  // test for exceeding the resultant balance of the account
  await main.deposit(account1, 40000);
  assert.equal(
    (await main.deposit(account1, 40000)).includes(
      constants.errorMessages.maxBalance
    ),
    true
  );

  // test for 3+ deposit transactions
  let accountCreationResponse = await main.createAccount(username2);
  account2 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );

  await main.deposit(account2, 2000);
  await main.deposit(account2, 3000);
  assert.equal(
    (await main.deposit(account2, 3000)).includes(
      constants.successMessages.deposit
    ),
    true
  );
  assert.equal(
    (await main.deposit(account2, 3000)).includes(
      constants.errorMessages.maxDeposit
    ),
    true
  );
}

async function withdrawTransactions() {
  let accountCreationResponse = await main.createAccount(username3);
  account3 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  await main.deposit(account3, 20000);

  //test for successful withdrawal transaction
  assert.equal(
    (await main.withdraw(account3, 15000)).includes(
      constants.successMessages.withdraw
    ),
    true
  );

    // test for transaction with non-existent account
    assert.equal(
      (await main.withdraw(111, 15000)).includes(
        constants.errorMessages.incorrectAccount
      ),
      true
    );

    // test for transaction with out-of-bound withdrawal amount
    assert.equal(
      (await main.withdraw(account3, 600)).includes(
        constants.errorMessages.withdrawAmount
      ),
      true
    );
    assert.equal(
      (await main.withdraw(account3, 30000)).includes(
        constants.errorMessages.withdrawAmount
      ),
      true
    );

    // test for reducing the resultant balance of the account below 0
    assert.equal(
      (await main.withdraw(account3, 20000)).includes(
        constants.errorMessages.minBalance
      ),
      true
    );

    // test for 3 and more deposit transactions
    accountCreationResponse = await main.createAccount(username3);
    account3 = parseInt(
      accountCreationResponse.substring(constants.successMessages.create.length)
    );
    
    await main.deposit(account3, 20000);// this is required as the opening balance is 0 for a new account
    await main.withdraw(account3, 3000);
    assert.equal(
      (await main.withdraw(account3, 3000)).includes(
        constants.successMessages.withdraw
      ),
      true
    );
    assert.equal(
      (await main.withdraw(account3, 3000)).includes(
        constants.errorMessages.maxWithdraw
      ),
      true
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

