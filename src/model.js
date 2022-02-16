import * as db from "./db_connection.js";
import * as constants from "./constants.js";

db.poolStart();

const transactionTypeToId = new Map();

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

export async function singleAccountTransaction(
  accountNo,
  amount,
  transactionType
) {
  const client = await db.pool.connect();

  try {
    const transactionId = await findTransactionId(client, transactionType);
    if (!(await confirmAccount(client, accountNo))) {
      return constants.errorMessages.incorrectAccount + accountNo;
    }
    if (!(await confirmTransactionLimit(client, transactionId, accountNo))) {
      if (transactionType === "deposit") {
        return constants.errorMessages.maxDeposit + accountNo;
        // return `Error: Exceeded the total number of permissible deposits for the day`;
      }
      return constants.errorMessages.maxWithdraw + accountNo;
      //   return `Error: Exceeded the total number of permissible withdrawals for the day`;
    }

    await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ`);
    const res = await client.query(getSingleTransactionQuery(transactionType), [
      amount,
      accountNo,
    ]);
    if (res.rows.length === 0) {
      //! Investigate errors here (optional)
      await client.query(`ROLLBACK`);
      if (transactionType === "deposit") {
        return constants.errorMessages.maxBalance + accountNo;
        //return `Transaction Unsucessful. The resultant balance will exceed INR 1000`;
      }
      return constants.errorMessages.minBalance + accountNo;
      // return `Transaction Unsucessful. The resultant balance will reduce INR 0`;
    }
    await client.query(
      "INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)",
      [transactionId, accountNo, amount]
    );
    await client.query("COMMIT");
    if (transactionType === "deposit") {
      return (
        constants.successMessages.deposit +
        `INR ${amount} deposited in ${accountNo}`
      );
      //  return `Transaction successful. INR ${amount} deposited in ${accountNo}`;
    }
    return (
      constants.successMessages.withdraw +
      `INR ${amount} withdrawn from ${accountNo}`
    );
    // return `Transaction successful. INR ${amount} withdrawn from ${accountNo}`;
  } catch (e) {
    console.log(e);
    return `Unexpected error.`;
  } finally {
    await client.release();
  }
}

export async function transfer(account1, account2, amount) {
  const client = await db.pool.connect();

  try {
    const account1TransactionId = await findTransactionId(client, "withdraw");
    const account2TransactionId = await findTransactionId(client, "deposit");

    if (!(await confirmAccount(client, account1))) {
      return constants.errorMessages.incorrectAccount + account1;
      // return `Error: Account does not exist: ${account1}`;
    }
    if (!(await confirmAccount(client, account2))) {
      return constants.errorMessages.incorrectAccount + account2;
      //return `Error: Account does not exist: ${account2}`;
    }
    if (
      !(await confirmTransactionLimit(client, account1TransactionId, account1))
    ) {
      return constants.errorMessages.maxWithdraw + account1;
      //return `Error: Exceeded the total number of permissible withdrawals for the day for account ${account1}`;
    }

    if (
      !(await confirmTransactionLimit(client, account2TransactionId, account2))
    ) {
      return constants.errorMessages.maxDeposit + account2;
      // return `Error: Exceeded the total number of permissible deposits for the day for account ${account2}`;
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
      //return `Transaction Unsucessful. The resultant balance of account ${account1} will reduce below INR 0`;
    }

    //deposit
    const depositRes = await client.query(
      getSingleTransactionQuery("deposit"),
      [amount, account2]
    );
    if (depositRes.rows.length === 0) {
      await client.query(`ROLLBACK`);
      return constants.errorMessages.maxBalance + account2;
      //return `Transaction Unsucessful. The resultant balance of account ${account2} will exceed INR 100000`;
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
    //return `Successfully transferred ${amount} from account ${account1} to account ${account2}`;
  } catch (e) {
    console.log(e);
    return `Unexpected error.`;
  } finally {
    await client.release();
  }
}

function getSingleTransactionQuery(transactionType) {
  switch (transactionType) {
    case "deposit":
      return "UPDATE account SET balance = balance + $1 WHERE id = $2 AND (balance + $1) < 100000 RETURNING balance";
    case "withdraw":
      return "UPDATE account SET balance = balance - $1 WHERE id = $2 and (balance - $1) > 0 RETURNING balance";
    default:
      return null;
  }
}

async function confirmAccount(client, accountNo) {
  const res = await client.query("SELECT * FROM account WHERE id = $1", [
    accountNo,
  ]);
  return res.rows.length > 0;
}

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

async function confirmTransactionLimit(client, transactionId, accountNo) {
  const currentTime = new Date();
  const lastMidnight = currentTime.setUTCHours(0, 0, 0, 0) / 1000;

  const res = await client.query(
    "SELECT * FROM ledger WHERE operation = $1 AND account = $2 AND created_at > to_timestamp($3)",
    [transactionId, accountNo, lastMidnight]
  );
  return res.rows.length < 3;
}

function test() {
  console.log(getSingleTransactionQuery("deposit"));
  console.log(getSingleTransactionQuery("withdraw"));
  console.log(getSingleTransactionQuery("www"));
}
