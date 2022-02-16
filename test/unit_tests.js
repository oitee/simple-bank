import assert from "assert";
import * as db from "../src/db_connection.js";
import * as constants from "../src/constants.js";
import * as commands from "../src/commands.js";

const username1 = "Alice";
const username2 = "Bob";

function testInputParser() {
  assert.deepEqual(commands.parseCommand("CREATE, Jones, 1123,"), [
    "CREATE",
    "Jones",
    "1123",
  ]);
  assert.deepEqual(commands.parseCommand("DEPOSIT, 1123,  1100"), [
    "DEPOSIT",
    "1123",
    "1100",
  ]);
  assert.deepEqual(commands.parseCommand("TRANSFER, 1011, 1123, 1000 "), [
    "TRANSFER",
    "1011",
    "1123",
    "1000",
  ]);
  assert.deepEqual(commands.parseCommand("CREATE, 1211, , , "), [
    "CREATE",
    "1211",
  ]);

  assert.deepEqual(commands.parseCommand(123), null);
  assert.deepEqual(commands.parseCommand(["CREATE, Jones"]), null);
}

/**
 * Tests the creation of new accounts
 */
async function testCreateAccounts() {
  //test for successful creation of two accounts
  let accountCreationResponse = await commands.createAccount(username1);
  assert.ok(
    accountCreationResponse.includes(constants.successMessages.create),
    "Test for successful account creation with username1"
  );
  const account1 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(
    typeof account1,
    "number",
    "Test for successful account creation with username1"
  );

  accountCreationResponse = await commands.createAccount(username2);
  assert.ok(
    accountCreationResponse.includes(constants.successMessages.create),
    "Test for successful account creation with username2"
  );
  const account2 = parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
  assert.equal(
    typeof account2,
    "number",
    "Test for successful account creation with username2"
  );
}

/**
 * Tests the creation of valid deposit transactions and
 * the failure of invalid deposit transactions
 */

async function testDepositTransactions() {
  //test for successful deposit transaction

  let account1 = await newAccount();
  await withChangedBalance([account1], 20000, ["deposit"], async () => {
    assert.equal(
      (await commands.deposit(account1, 20000)).includes(
        constants.successMessages.deposit
      ),
      true,
      "Test for successful deposit transaction"
    );
  });

  // test for transaction with non-existent account
  await withBalanceUnchanged([account1], async () => {
    assert.equal(
      (await commands.deposit(111, 30000)).includes(
        constants.errorMessages.incorrectAccount
      ),
      true,
      "Test for deposit transaction with non-existent account"
    );

    // test for transaction with out-of-bound deposit amount
    assert.equal(
      (
        await commands.deposit(
          account1,
          generateRandom(0, constants.minDepositAmount - 1)
        )
      ).includes(constants.errorMessages.depositAmount),
      true,
      "Test for deposit transaction with less than lower-bound deposit amount"
    );
    assert.equal(
      (
        await commands.deposit(
          account1,
          generateRandom(constants.maxDepositAmount + 1, 99999999)
        )
      ).includes(constants.errorMessages.depositAmount),
      true,
      "Test for deposit transaction with greater than upper-bound deposit amount"
    );
  });

  // test for exceeding the resultant balance of the account
  await commands.deposit(account1, 40000);

  await withBalanceUnchanged([account1], async () => {
    assert.equal(
      (await commands.deposit(account1, 40000)).includes(
        constants.errorMessages.maxBalance
      ),
      true,
      "Test for deposit transaction where the resultant account balance exceeds INR 1,00,000"
    );
  });

  // test for 3+ deposit transactions
  let account2 = await newAccount();
  await commands.deposit(account2, 3000);
  await commands.deposit(account2, 3000);

  await withChangedBalance([account2], 3000, ["deposit"], async () => {
    assert.equal(
      (await commands.deposit(account2, 3000)).includes(
        constants.successMessages.deposit
      ),
      true,
      "Test for third consecutive deposit transaction (successful)"
    );
  });

  await withBalanceUnchanged([account2], async () => {
    assert.equal(
      (await commands.deposit(account2, 3000)).includes(
        constants.errorMessages.maxDeposit
      ),
      true,
      "Test for 3+ deposit transactions (unsuccessful)"
    );
  });
}

/**
 * Tests the creation of valid withdrawal transactions and
 * the failure of invalid withdrawal transactions
 */
async function testWithdrawTransactions() {
  let account1 = await newAccount();
  await commands.deposit(account1, 20000);

  //test for successful withdrawal transaction
  await withChangedBalance([account1], 15000, ["withdraw"], async () => {
    assert.equal(
      (await commands.withdraw(account1, 15000)).includes(
        constants.successMessages.withdraw
      ),
      true,
      "Test for successful withdrawal transaction"
    );
  });

  // test for transaction with non-existent account
  assert.equal(
    (await commands.withdraw(111, 15000)).includes(
      constants.errorMessages.incorrectAccount
    ),
    true,
    "Test for Withdrawal transaction with non-existent account"
  );

  // test for transaction with out-of-bound withdrawal amount
  await withBalanceUnchanged([account1], async () => {
    assert.equal(
      (
        await commands.withdraw(
          account1,
          generateRandom(0, constants.minWithdrawalAmount - 1)
        )
      ).includes(constants.errorMessages.withdrawAmount),
      true,
      "Test for withdrawal transaction with less than lower-bound withdrawal amount"
    );
    assert.equal(
      (
        await commands.withdraw(
          account1,
          generateRandom(constants.maxWithdrawalAmount + 1, 99999999)
        )
      ).includes(constants.errorMessages.withdrawAmount),
      true,
      "Test for withdrawal transaction with greater than upper-bound withdrawal amount"
    );

    // test for reducing the resultant balance of the account below 0
    assert.equal(
      (await commands.withdraw(account1, 20000)).includes(
        constants.errorMessages.minBalance
      ),
      true,
      "Test for withdrawl transaction where the resultant account balance falls below INR 0"
    );
  });

  // test for 3 and more deposit transactions
  let account2 = await newAccount();

  await commands.deposit(account2, 20000); // this is required as the opening balance is 0 for a new account
  await commands.withdraw(account2, 3000);
  await commands.withdraw(account2, 3000);

  await withChangedBalance([account2], 3000, ["withdraw"], async () => {
    assert.equal(
      (await commands.withdraw(account2, 3000)).includes(
        constants.successMessages.withdraw
      ),
      true,
      "Test for third consecutive withdrawal transaction (successful)"
    );
  });
  assert.equal(
    (await commands.withdraw(account2, 3000)).includes(
      constants.errorMessages.maxWithdraw
    ),
    true,
    "Test for 3+ withdrawal transactions (unsuccessful)"
  );
}

/**
 * Tests the creation of valid transfers and
 * the failure of invalid transfers
 */
async function testTransfers() {
  let account1 = await newAccount();
  let account2 = await newAccount();

  // setting up opening balances:
  await commands.deposit(account1, 30000);
  await commands.deposit(account2, 30000);

  // test for transfers with correct details
  await withChangedBalance(
    [account1, account2],
    2000,
    ["withdraw", "deposit"],
    async () => {
      assert.equal(
        (await commands.transfer(account1, account2, 2000)).includes(
          constants.successMessages.transfer
        ),
        true,
        "Test for a successful transfer"
      );
    }
  );

  // test for transfers with one non-existing account
  await withBalanceUnchanged([account1, account2], async () => {
    assert.equal(
      (await commands.transfer(account1, 123, 4000)).includes(
        constants.errorMessages.incorrectAccount
      ),
      true,
      "Test for transfer with one non-existing account"
    );

    assert.equal(
      (await commands.transfer(999, account2, 4000)).includes(
        constants.errorMessages.incorrectAccount
      ),
      true,
      "Test for transfer with one non-existing account"
    );

    // test for transfers with both non-existing account
    assert.equal(
      (await commands.transfer(123, 456, 4000)).includes(
        constants.errorMessages.incorrectAccount
      ),
      true,
      "Test for transfer with two non-existing accounts"
    );

    //test for transfers with out-of-bound amounts
    // (i) out-of-bound amount for withdrawal in a transfer:
    assert.equal(
      (
        await commands.transfer(
          account1,
          account2,
          generateRandom(
            constants.minDepositAmount,
            constants.minWithdrawalAmount - 1
          )
        )
      ).includes(constants.errorMessages.withdrawAmount),
      true,
      "Test for transfer where the amount is less than the lower-bound amount for a withdrawal transaction but within bounds of a deposit transaction"
    );
    assert.equal(
      (
        await commands.transfer(
          account1,
          account2,
          generateRandom(
            constants.maxWithdrawalAmount + 1,
            constants.maxDepositAmount
          )
        )
      ).includes(constants.errorMessages.withdrawAmount),
      true,
      "Test for transfer where the amount is greater than the upper-bound amount for a withdrawal transaction but within bounds of a deposit transaction"
    );

    //(ii) out-of-bound amount for deposit in a transfer:
    assert.equal(
      (
        await commands.transfer(
          account1,
          account2,
          generateRandom(constants.minDepositAmount - 1, 0)
        )
      ).includes(constants.errorMessages.depositAmount),
      true,
      "Test for transfer where the amount is less than the lower-bound amount for a deposit transaction"
    );
    assert.equal(
      (
        await commands.transfer(
          account1,
          account2,
          generateRandom(constants.maxDepositAmount + 1, 99999999)
        )
      ).includes(constants.errorMessages.depositAmount),
      true,
      "Test for transfer where the amount is greater than the upper-bound amount for a deposit transaction"
    );
  });

  //test for transfers which reduce balance of one account below zero
  account1 = await newAccount();
  account2 = await newAccount();

  await commands.deposit(account1, 4000);

  await withBalanceUnchanged([account1, account2], async () => {
    assert.equal(
      (await commands.transfer(account1, account2, 20000)).includes(
        constants.errorMessages.minBalance
      ),
      true,
      "Test for transfer where the resultant account balance falls below INR 0"
    );
  });

  //test for transfers which increase balance of one account beyond INR 1,00,000
  await commands.deposit(account1, 40000);
  await commands.deposit(account2, 40000);
  await commands.deposit(account2, 40000);

  await withBalanceUnchanged([account1, account2], async () => {
    assert.equal(
      (await commands.transfer(account1, account2, 25000)).includes(
        constants.errorMessages.maxBalance
      ),
      true,
      "Test for transfer where the resultant account balance exceeds INR 1,00,000"
    );
  });

  // test for 3+ transfers
  account1 = await newAccount();
  account2 = await newAccount();

  await commands.deposit(account1, 40000);
  await commands.deposit(account2, 40000);
  await commands.transfer(account1, account2, 4000);

  await withChangedBalance(
    [account1, account2],
    4000,
    ["withdraw", "deposit"],
    async () => {
      assert.equal(
        (await commands.transfer(account1, account2, 4000)).includes(
          constants.successMessages.transfer
        ),
        true,
        "Test for transfer between accounts that have not hit the 3-transaction-per-day limit (successful)"
      );
    }
  );
  await withBalanceUnchanged([account1, account2], async () => {
    let exceededTransferResponse = await commands.transfer(
      account1,
      account2,
      4000
    );
    assert.equal(
      exceededTransferResponse.includes(constants.errorMessages.maxDeposit) ||
        exceededTransferResponse.includes(constants.errorMessages.maxWithdraw),
      true,
      "Test for transfer between accounts that have hit the 3-transaction-per-day limit (unsuccessful)"
    );
  });
}

/**
 * Creates and returns a new account
 */
async function newAccount() {
  let accountCreationResponse = await commands.createAccount(
    username1 + Math.floor(Math.random() * 1000)
  );
  return parseInt(
    accountCreationResponse.substring(constants.successMessages.create.length)
  );
}

/**
 * Genrates a random integer from a given range
 */
function generateRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Tests whether for failed transactions, the balances of the relevant accounts
 * on the DB, remain unchanged
 */
async function withBalanceUnchanged(accounts, assertionFn) {
  const balancesBefore = await Promise.all(
    accounts.map(async (account) => {
      return db.pool
        .query("SELECT balance  FROM account WHERE id=$1", [account])
        .then((res) => res.rows[0].balance);
    })
  );
  await assertionFn();
  const balancesAfter = await Promise.all(
    accounts.map(async (account) => {
      return db.pool
        .query("SELECT balance  FROM account WHERE id=$1", [account])
        .then((res) => res.rows[0].balance);
    })
  );

  assert.deepEqual(
    balancesBefore,
    balancesAfter,
    "Account Balances should remain unchanged"
  );
}

/**
 * Tests whether for successful transactions, the balances of the relevant accounts
 * on the DB, reflect expected changes.
 */
async function withChangedBalance(accounts, amount, transactions, assertionFn) {
  const balancesBefore = await Promise.all(
    accounts.map(async (account) => {
      return db.pool
        .query("SELECT balance  FROM account WHERE id=$1", [account])
        .then((res) => res.rows[0].balance);
    })
  );

  await assertionFn();

  const balancesAfter = await Promise.all(
    accounts.map(async (account) => {
      return db.pool
        .query("SELECT balance  FROM account WHERE id=$1", [account])
        .then((res) => res.rows[0].balance);
    })
  );

  const adjustedBalancesAfter = [];

  for (let i = 0; i < accounts.length; i++) {
    if (transactions[i] === "deposit") {
      adjustedBalancesAfter[i] = balancesAfter[i] - amount;
    } else {
      adjustedBalancesAfter[i] = balancesAfter[i] + amount;
    }
  }
  assert.deepEqual(balancesBefore, adjustedBalancesAfter);
}

beforeAll(async () => {
  db.poolStart();
  await db.pool.query(`     
    DROP TABLE IF EXISTS ledger;
    DROP TABLE IF EXISTS account;
    DROP TABLE IF EXISTS transaction_type;
    DROP SEQUENCE IF EXISTS account_number_seq;

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
    INSERT INTO transaction_type (name) VALUES ('deposit'), ('withdraw');`);
});
afterAll(async () => {
  await db.pool.end();
});

test("Validation of input string", testInputParser);
test("Creation of new accounts", testCreateAccounts);
test("Deposit transactions", testDepositTransactions);
test("Withdrawal transactions", testWithdrawTransactions);
test("Transfers", testTransfers);
