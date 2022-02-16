import { URL } from "url";

export const PG_USER = process.env.PG_USER || "postgres";
export const PG_DATABASE = process.env.PG_DATABASE || "bank_accounts";
export const PG_PORT = process.env.PG_PORT || "5432";
export const maxWithdrawalAmount = parseInt(process.env.MAX_WITHDRAWAL_AMOUNT || '25000');
export const minWithdrawalAmount = parseInt(process.env.MIN_WITHDRAWAL_AMOUNT || '1000');
export const maxDepositAmount = parseInt(process.env.MAX_DEPOSIT_AMOUNT || '50000');
export const minDepositAmount = parseInt(process.env.MIN_DEPOSIT_AMOUNT || '500');
export const minAccountBalance = parseInt(process.env.MIN_ACCOUNT_BALANCE || '0');
export const maxAccountBalance = parseInt(process.env.MAX_ACCOUNT_BALANCE || '100000');
export const filePath =
  process.env.FILE_PATH || new URL("../commands.csv", import.meta.url).pathname;

export const errorMessages = {
  depositAmount:
    "Error: Deposit amount needs to between INR 500 and INR 50,000 per transaction for the account: ",
  withdrawAmount:
    "Error: Withdrawal amount needs to be between INR 1,000 and INR 25,000 per transaction for the account: ",
  incorrectAccount: "Error: Account does not exist: ",
  maxDeposit:
    "Error: Exceeded the total number of permissible deposits for the day for account: ",
  maxWithdraw:
    "Error: Exceeded the total number of permissible withdrawals for the day for account: ",
  maxBalance:
    "Transaction Unsucessful. The resultant balance will exceed INR 1,00,000 for account :",
  minBalance:
    "Transaction Unsucessful. The resultant balance will reduce INR 0 for account: ",
};

export const successMessages = {
  create: "Account creation successful. Account No: ",
  deposit: "Deposit successful. ",
  withdraw: "Withdrawl successful. ",
  transfer: "Transfer successful. ",
};
