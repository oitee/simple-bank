import * as model from "./model.js";

function createAccount(name) {
  const accountId = model.createAccount(name);
  if (accountId) {
    return accountId;
  }
  return `Error: Could not create a new account with the name: ${name}`;
}

async function deposit(accountNo, amount) {
  if (confirmDepositAmount(amount)) {
    return await model.deposit(accountNo, amount);
  } else {
    return `Error: Deposit amount needs to between INR 500 and INR 50,000: ${amount}`;
  }
}

function confirmDepositAmount(amount){
    return amount >= 500 && amount <= 50000; 
}

const holder1 = "Alice" + Math.random();
const holder2 = "Bob" + Math.random();

async function test(){
    const accountNo1 = await createAccount(holder1);
    const accountNo2 = await createAccount(holder2); 
    console.log(accountNo1);
    console.log(typeof accountNo1 === "number");
    console.log(accountNo2);
    console.log(typeof accountNo2 === "number");

    console.log(`Account1 deposit with 10000`)
     console.log(await deposit(accountNo1, 10000));
    console.log(`Account2 deposit with 10000`)
    console.log(await deposit(accountNo2, 10000));

    
}

test()



