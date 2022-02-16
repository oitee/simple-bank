import * as constants from "./constants.js";
import pkg from "pg";

const { Pool } = pkg;

export let pool;

export function poolStart() {
  const poolConfig = {
    user: constants.PG_USER,
    database: constants.PG_DATABASE,
    port: constants.PG_PORT,
    connectionTimeoutMillis: 60000,
    max: 5,
  };

  if (!pool || pool.ended) {
    pool = new Pool(poolConfig);
  }
}
