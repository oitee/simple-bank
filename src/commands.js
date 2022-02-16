import { readFileSync } from "fs";
import * as constants from "./constants.js";
import * as db from "./db_connection.js";
import * as utils from "./utils.js";
import * as model from "./model.js";

const supportedCommands = new Map();

supportedCommands.set("INIT_DB", initialisedb);
supportedCommands.set("CREATE_ACCOUNT", createAccount);
supportedCommands.set("DEPOSIT", deposit);
supportedCommands.set("WITHDRAW", withdraw);
supportedCommands.set("TRANSFER", transfer);

export async function launch() {
  db.poolStart();
  const fileContents = readFileSync(constants.filePath, "utf8");
  const commands = fileContents.split("\n");
  try {
    for (let i = 0; i < commands.length; i++) {
      console.log(`INPUT: ${commands[i]}`);
      let parsedCommand = await utils.parseCommand(commands[i]);
      if (!parsedCommand) {
        console.log(`OUTPUT: Invalid Input`);
      } else {
        let commandFn = supportedCommands.get(parsedCommand[0]);
        if (commandFn) {
          parsedCommand.shift();
          const result = await utils.callWithRetries(commandFn, parsedCommand);

          console.log(`OUTPUT: ${result}`);
          console.log();
        } else {
          console.log(`OUTPUT: Unsupported Command`);
        }
      }
    }
  } catch (e) {
    console.log(`Unexpected Error`);
    console.log(e);
  } finally {
    await db.pool.end();
  }
}

async function initialisedb() {
  return utils.initialiseDb();
}

/**
 * Interacts with the Model module, to create a new account.
 * Returns the message generated by the Model
 */
export async function createAccount(name) {
  return model.createAccount(name);
}

/**
 * Interacts with the Model module, to create a new deposit transaction
 * for a given account number.
 * Returns the message generated by the Model.
 */
export async function deposit(account, amount) {
  if (confirmDepositAmount(amount)) {
    return model.singleAccountTransaction(account, amount, "deposit");
  }
  return constants.errorMessages.depositAmount + account;
}

/**
 * Interacts with the Model module, to create a new withdrawal transaction
 * for a given account number.
 * Returns the message generated by the Model.
 */
export async function withdraw(account, amount) {
  if (confirmWithdrawalAmount(amount)) {
    return model.singleAccountTransaction(account, amount, "withdraw");
  }
  return constants.errorMessages.withdrawAmount + account;
}

/**
 * Interacts with the Model module, to create a new transfer transaction
 * for a given account number.
 * Returns the message generated by the Model.
 */
export async function transfer(account1, account2, amount) {
  if (confirmDepositAmount(amount)) {
    if (confirmWithdrawalAmount(amount)) {
      return model.transfer(account1, account2, amount);
    }
    return constants.errorMessages.withdrawAmount + account1;
  }
  return constants.errorMessages.depositAmount + account2;
}

/**
 * Confirms whether a given amount is within the bounds of a deposit transaction
 */
function confirmDepositAmount(amount) {
  return (
    amount >= constants.minDepositAmount && amount <= constants.maxDepositAmount
  );
}

/**
 * Confirms whether a given amount is within the bounds of a withdrawal transaction
 */
function confirmWithdrawalAmount(amount) {
  return (
    amount >= constants.minWithdrawalAmount &&
    amount <= constants.maxWithdrawalAmount
  );
}
