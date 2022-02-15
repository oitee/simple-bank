import * as db from "./db_connection.js";

db.poolStart()

export async function insertAccount(name){
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
