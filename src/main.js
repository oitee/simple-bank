import * as model from "./model.js";
import * as constants from "./constants.js";

function createAccount(name) {
  const accountId = model.createAccount(name);
  if (accountId) {
    return accountId;
  }
  return `Error: Could not create a new account with the name: ${name}`;
}

async function deposit(account, amount) {
  if (confirmDepositAmount(amount)) {
    return await model.singleAccountTransaction(account, amount, "deposit");
  } 
  return constants.errorMessages.depositAmount + account;
}

async function withdraw(account, amount) {
  if (confirmWithdrawalAmount(amount)) {
    return await model.singleAccountTransaction(account, amount, "withdraw");
  } 
  return constants.errorMessages.withdrawAmount + account;
}

async function transfer(account1, account2, amount) {
  if (confirmWithdrawalAmount(amount)) {
    if (confirmDepositAmount(amount)) {
      return await model.transfer(account1, account2, amount);
    }
    return constants.errorMessages.depositAmount + account2;
  } 
  return constants.errorMessages.withdrawAmount + account1;
}

function confirmDepositAmount(amount) {
  return amount >= 500 && amount <= 50000;
}

function confirmWithdrawalAmount(amount) {
  return amount >= 1000 && amount <= 25000;
}

const holder1 = "Alice" + Math.random();
const holder2 = "Bob" + Math.random();
const holder3 = "Cat" + Math.random();
const holder4 = "Dog" + Math.random();

async function test() {
    const account1 = await createAccount(holder1);
    const account2 = await createAccount(holder2);
    console.log(account1);
    console.log(typeof account1 === "number");
    console.log(account2);
    console.log(typeof account2 === "number");

    console.log(`Account1 deposit with 10000`);
    console.log(await deposit(account1, 10000));
    console.log(`Account2 deposit with 10000`);
    console.log(await deposit(account2, 10000));
    console.log("More than 3 deposit transactions in a day");
    console.log(await deposit(account1, 10000));
    console.log(await deposit(account1, 10000));
    console.log(await deposit(account1, 10000));
    console.log(await deposit(account1, 10000));

    console.log(`--- Withdrawals`);
    console.log(`Account1 withdraws 1000`);
    console.log(await withdraw(account1, 1000))
    console.log(`Account2 withdraws 1000`);
    console.log(await withdraw(account2, 1000))
    console.log("More than 3 withdrawl transactions in a day");
    console.log(await withdraw(account1, 1000));
    console.log(await withdraw(account1, 1000));
    console.log(await withdraw(account1, 1000));

  console.log(`----Transfers`);
  const account3 = await createAccount(holder3);
  const account4 = await createAccount(holder4);

  await deposit(account3, 30000);
  await deposit(account4, 30000);

  console.log(await transfer(account3, account4, 2000));
  console.log(await transfer(account3, account4, 2000));
  console.log(await transfer(account3, account4, 2000));
}

test();
