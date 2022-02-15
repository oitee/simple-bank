import pkg from "pg";
import * as constants from "./constants.js";

const { Pool } = pkg;

const poolConfig = {
  user: constants.PG_USER,
  database: constants.PG_DATABASE,
  port: constants.PG_PORT,
  connectionTimeoutMillis: 60000,
  max: 5,
};

export let pool;

export function poolStart() {
  if (!pool || pool.ended) {
    pool = new Pool(poolConfig);
  }
}