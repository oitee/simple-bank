import * as db from "./db_connection.js";

db.poolStart()

const transactionTypeToId = new Map();

export async function createAccount(name){
    const client = await db.pool.connect();
    try{
        const res = await client.query("INSERT INTO account (holder) VALUES ($1) RETURNING id", [name]);
        return res.rows[0].id;
    }
    catch(e){
        return null;
    }
    finally{
        await client.release();
    }
}


export async function deposit(accountNo, amount){
    const client = await db.pool.connect();
    try{
        const transactionId = await findTransactionId(client, "deposit");
        if(await confirmAccount(client, accountNo)){//! make client the first arg
            await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ`);
            const res1 = await client.query("UPDATE account SET balance = balance + $1::int WHERE id = $2 AND (balance + $1::int) < 100000 RETURNING balance", [amount, accountNo]);
            if(res1.rows.length === 0){
                //! Investigate errors here (optional)
                client.query(`ROLLBACK`);
                return `Transaction Unsucessful. The resultant balance will exceed INR 1000`;
            }
            await client.query("INSERT INTO ledger (operation, account, amount) VALUES ($1, $2, $3)", [transactionId, accountNo, amount]);
            await client.query("COMMIT");
            return `Transaction successful. INR ${amount} deposited in ${accountNo}`;    
        }
        else{
            return `Error: Account does not exist: ${accountNo}`
        }
    }
    catch(e){
        console.log(e);
        return `Unexpected error.`
    }
    finally{
        await client.release()
    }
    
}

async function confirmAccount(client, accountNo){
    const res = await client.query("SELECT * FROM account WHERE id = $1", [accountNo]);
    return res.rows.length > 0;
}

async function findTransactionId(client, transactionType){
    if(transactionTypeToId.has(transactionType)){
        return transactionTypeToId.get(transactionType);
    }
    
    const res = await client.query("SELECT * FROM transaction_type WHERE name=$1", [transactionType]);
    transactionTypeToId.set(transactionType, res.rows[0].id)
    return res.rows[0].id;

}