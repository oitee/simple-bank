import * as db from "./db_connection.js";
import * as constants from "./constants.js";

const transactionTypeToId = new Map();
/**
 * Interacts with the DB and adds a new account and returns the a response message containing the account no.
 */
export async function createAccount(name) {
  const client = await db.pool.connect();
  try {
    const res = await client.query(
      "INSERT INTO account (holder) VALUES ($1) RETURNING id",
      [name]
    );
    return constants.successMessages.create + res.rows[0].id;
  } catch (e) {
    console.log(e);
    return `Unexpected Error`;
  } finally {
    await client.release();
  }
}

/**
 * Interacts with the DB to make changes for single-party transactions (deposit and withdrawal)
 * Checks existence of account, daily transaction limit, and resultant balance being within max limit
 */
export async function singleAccountTransaction(
  account,
  amount,
  transactionType
) {
  const client = await db.pool.connect();

  try {
    const transactionId = await findTransactionId(client, transactionType);
    if (!(await confirmAccount(client, account))) {
      return constants.errorMessages.incorrectAccount + account;
    }
    if (!(await confirmTransactionLimit(client, transactionId, account))) {
      if (transactionType === "deposit") {
        return constants.errorMessages.maxDeposit + account;
      }
      return constants.errorMessages.maxWithdraw + account;
    }
    //! ADD: why repeatable read
    await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ`);
    const res = await client.query(getSingleTransactionQuery(transactionType), [
      amount,
      account,
    ]);
    if (res.rows.length === 0) {
      await client.query(`ROLLBACK`);
      if (transactionType === "deposit") {
        return constants.errorMessages.maxBalance + account;
      }
      return constants.errorMessages.minBalance + account;
    }
    await client.query(
      "INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)",
      [transactionId, account, amount]
    );
    await client.query("COMMIT");
    if (transactionType === "deposit") {
      return (
        constants.successMessages.deposit +
        `INR ${amount} deposited in ${account}`
      );
    }
    return (
      constants.successMessages.withdraw +
      `INR ${amount} withdrawn from ${account}`
    );
  } catch (e) {
    console.log(e);
    return `Unexpected error.`;
  } finally {
    await client.release();
  }
}

/**
 * Interacts with the DB to make changes for two-party transactions (i.e., transfers)
 * Checks existence of accounts, daily transaction limits, and resultant balances being within max limit
 */
export async function transfer(account1, account2, amount) {
  const client = await db.pool.connect();

  try {
    const account1TransactionId = await findTransactionId(client, "withdraw");
    const account2TransactionId = await findTransactionId(client, "deposit");

    if (!(await confirmAccount(client, account1))) {
      return constants.errorMessages.incorrectAccount + account1;
    }
    if (!(await confirmAccount(client, account2))) {
      return constants.errorMessages.incorrectAccount + account2;
    }
    if (
      !(await confirmTransactionLimit(client, account1TransactionId, account1))
    ) {
      return constants.errorMessages.maxWithdraw + account1;
    }

    if (
      !(await confirmTransactionLimit(client, account2TransactionId, account2))
    ) {
      return constants.errorMessages.maxDeposit + account2;
    }

    await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ`);
    //withdrawal
    const withdrawRes = await client.query(
      getSingleTransactionQuery("withdraw"),
      [amount, account1]
    );
    if (withdrawRes.rows.length === 0) {
      await client.query(`ROLLBACK`);
      return constants.errorMessages.minBalance + account1;
    }

    //deposit
    const depositRes = await client.query(
      getSingleTransactionQuery("deposit"),
      [amount, account2]
    );
    if (depositRes.rows.length === 0) {
      await client.query(`ROLLBACK`);
      return constants.errorMessages.maxBalance + account2;
    }

    await client.query(
      "INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)",
      [account1TransactionId, account1, amount]
    );
    await client.query(
      "INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)",
      [account2TransactionId, account2, amount]
    );

    await client.query("COMMIT");
    return (
      constants.successMessages.transfer +
      `INR ${amount} transferred from account ${account1} to account ${account2}`
    );
  } catch (e) {
    console.log(e);
    return `Unexpected error.`;
  } finally {
    await client.release();
  }
}

/**
 * Generates the DB query for updating the balance of an account
 */
function getSingleTransactionQuery(transactionType) {
  switch (transactionType) {
    case "deposit":
      return `UPDATE account SET balance = balance + $1 WHERE id = $2 AND (balance + $1) < ${constants.maxAccountBalance} RETURNING balance`;
    case "withdraw":
      return `UPDATE account SET balance = balance - $1 WHERE id = $2 and (balance - $1) > ${constants.minAccountBalance} RETURNING balance`;
    default:
      return null;
  }
}

/**
 * Interacts with the DB to confirm existence of a given account number
 */
async function confirmAccount(client, accountNo) {
  const res = await client.query("SELECT * FROM account WHERE id = $1", [
    accountNo,
  ]);
  return res.rows.length > 0;
}

/**
 * Interacts with the DB and returns the transaction id of a given type of transaction (deposit, withdrawal and transfer)
 */
async function findTransactionId(client, transactionType) {
  if (transactionTypeToId.has(transactionType)) {
    return transactionTypeToId.get(transactionType);
  }

  const res = await client.query(
    "SELECT * FROM transaction_type WHERE name=$1",
    [transactionType]
  );
  transactionTypeToId.set(transactionType, res.rows[0].id);
  return res.rows[0].id;
}

/**
 * Interacts with the DB to confirm whether a given account has reached
 * the daily limit of a given type of transaction
 */
async function confirmTransactionLimit(client, transactionId, accountNo) {
  const res = await client.query(
    "SELECT * FROM ledger WHERE operation = $1 AND account = $2 AND created_at >= current_date at time zone 'UTC';",
    [transactionId, accountNo]
  );
  return res.rows.length < 3;
}
