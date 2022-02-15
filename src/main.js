import * as model from "./model.js";
import * as constants from "./constants.js";

async function createAccount(name) {
  return await model.createAccount(name);
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
    let accountCreationResponse = await createAccount(holder1);
    const account1 = parseInt(accountCreationResponse.substring(constants.successMessages.create.length))
    
    accountCreationResponse = await createAccount(holder2)
    const account2 = parseInt(accountCreationResponse.substring(constants.successMessages.create.length));
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
    accountCreationResponse = await createAccount(holder3);
    const account3 = parseInt(accountCreationResponse.substring(constants.successMessages.create.length));
    accountCreationResponse = await createAccount(holder4);
    const account4 = parseInt(accountCreationResponse.substring(constants.successMessages.create.length));

  await deposit(account3, 30000);
  await deposit(account4, 30000);

  console.log(await transfer(account3, account4, 2000));
  console.log(await transfer(account3, account4, 2000));
  console.log(await transfer(account3, account4, 2000));
}

test();
