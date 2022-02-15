import * as db from "./db_connection.js";

db.poolStart();

const transactionTypeToId = new Map();

export async function createAccount(name) {
  const client = await db.pool.connect();
  try {
    const res = await client.query(
      "INSERT INTO account (holder) VALUES ($1) RETURNING id",
      [name]
    );
    return res.rows[0].id;
  } catch (e) {
    return null;
  } finally {
    await client.release();
  }
}


export async function singleAccountTransaction(accountNo, amount, transactionType) {
  const client = await db.pool.connect();
  const dbQuery = getSingleTransactionQuery(transactionType);
  if(!dbQuery){
      return `For single account transactions, please use 'deposit' or 'withdraw'`
  }
  try {
    const transactionId = await findTransactionId(client, transactionType);
    if (await confirmAccount(client, accountNo)) {
      if (await confirmTransactionLimit(client, transactionId, accountNo)) {
        await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ`);
        const res = await client.query(
          dbQuery,
          [amount, accountNo]
        );
        if (res.rows.length === 0) {
          //! Investigate errors here (optional)
          client.query(`ROLLBACK`);
        if(transactionType === "deposit"){
            return `Transaction Unsucessful. The resultant balance will exceed INR 1000`;
        }
        return `Transaction Unsucessful. The resultant balance will reduce INR 0`;
        }
        await client.query(
          "INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)",
          [transactionId, accountNo, amount]
        );
        await client.query("COMMIT");
        if(transactionType === "deposit"){
            return `Transaction successful. INR ${amount} deposited in ${accountNo}`;
        }
        return `Transaction successful. INR ${amount} withdrawn from ${accountNo}`;
        
      } else {
          if(transactionType === "deposit"){
            return `Error: Exceeded the total number of permissible deposits for the day`;
          }
          return `Error: Exceeded the total number of permissible withdrawals for the day`;
        
      }
    } else {
      return `Error: Account does not exist: ${accountNo}`;
    }
  } catch (e) {
    console.log(e);
    return `Unexpected error.`;
  } finally {
    await client.release();
  }
}

function getSingleTransactionQuery(transactionType){
    switch(transactionType){
        case "deposit":
            return   "UPDATE account SET balance = balance + $1 WHERE id = $2 AND (balance + $1) < 100000 RETURNING balance"
        case "withdraw":
            return "UPDATE account SET balance = balance - $1 WHERE id = $2 and (balance - $1) > 0 RETURNING balance"
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



function test(){

console.log(getSingleTransactionQuery("deposit"))
console.log(getSingleTransactionQuery("withdraw"))
console.log(getSingleTransactionQuery("www"));
}