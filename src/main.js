import * as model from "./model.js";

function createAccount(name) {
  //! Add initial deposit amount
  const accountId = model.createAccount(name);
  if (accountId) {
    return accountId;
  }
  return `Error: Could not create a new account with the name: ${name}`;
}

async function deposit(accountNo, amount) {
  if (confirmDepositAmount(amount)) {
    return await model.singleAccountTransaction(accountNo, amount, "deposit");
  } else {
    return `Error: Deposit amount needs to between INR 500 and INR 50,000 per transaction`;
  }
}

async function withdraw(accountNo, amount) {
  if (confirmWithdrawalAmount(amount)) {
    return await model.singleAccountTransaction(accountNo, amount, "withdraw");
  } else {
    `Error: Withdrawal amount needs to be INR 1,000 and INR 25,000 per transaction`;
  }
}

function confirmDepositAmount(amount) {
  return amount >= 500 && amount <= 50000;
}

function confirmWithdrawalAmount(amount) {
  return amount >= 1000 && amount <= 25000;
}

const holder1 = "Alice" + Math.random();
const holder2 = "Bob" + Math.random();

async function test() {
  const accountNo1 = await createAccount(holder1);
  const accountNo2 = await createAccount(holder2);
  console.log(accountNo1);
  console.log(typeof accountNo1 === "number");
  console.log(accountNo2);
  console.log(typeof accountNo2 === "number");

  console.log(`Account1 deposit with 10000`);
  console.log(await deposit(accountNo1, 10000));
  console.log(`Account2 deposit with 10000`);
  console.log(await deposit(accountNo2, 10000));
  console.log("More than 3 deposit transactions in a day");
  console.log(await deposit(accountNo1, 10000));
  console.log(await deposit(accountNo1, 10000));
  console.log(await deposit(accountNo1, 10000));

  console.log(`--- Withdrawals`);
  console.log(`Account1 withdraws 1000`);
  console.log(await withdraw(accountNo1, 1000))
  console.log(`Account2 withdraws 1000`);
  console.log(await withdraw(accountNo2, 1000))
  console.log("More than 3 withdrawl transactions in a day");
  console.log(await withdraw(accountNo1, 1000));
  console.log(await withdraw(accountNo1, 1000));
  console.log(await withdraw(accountNo1, 1000));

  
}

test();
