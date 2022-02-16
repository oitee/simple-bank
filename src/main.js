import * as model from "./model.js";
import * as constants from "./constants.js";

export async function createAccount(name) {
  return await model.createAccount(name);
}

export async function deposit(account, amount) {
  if (confirmDepositAmount(amount)) {
    return await model.singleAccountTransaction(account, amount, "deposit");
  } 
  return constants.errorMessages.depositAmount + account;
}

export async function withdraw(account, amount) {
  if (confirmWithdrawalAmount(amount)) {
    return await model.singleAccountTransaction(account, amount, "withdraw");
  } 
  return constants.errorMessages.withdrawAmount + account;
}

export async function transfer(account1, account2, amount) {
  if (confirmDepositAmount(amount)) {
    if (confirmWithdrawalAmount(amount)) {
      return await model.transfer(account1, account2, amount);
    }
    return constants.errorMessages.withdrawAmount + account1;
    
  } 
  return constants.errorMessages.depositAmount + account2;
}

function confirmDepositAmount(amount) {
  return amount >= constants.minDepositAmount && amount <= constants.maxDepositAmount;
}

function confirmWithdrawalAmount(amount) {
  return amount >= constants.minWithdrawalAmount && amount <= constants.maxWithdrawalAmount;
}

