import * as model from "./model.js";


function createAccount(name){
    const accountId = model.insertAccount(name);
    if(accountId){
        return accountId;
    }
    return `Error: Could not create a new account with the name: ${name}`;
}

const holder1 = "Alice" + Math.random();
const holder2 = "Bob" + Math.random();
console.log(await createAccount(holder1));
console.log(await createAccount(holder2));