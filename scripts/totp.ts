// Print the current TOTP code for the demo logins.
//
//   make totp                     every documented account
//   make totp EMAIL=bob@demo.fr   just that one
//
// Codes are derived from scripts/seed/roster.ts, which is what the seed writes
// into the database. Reading the secret anywhere else lets the printed code
// drift from the account it claims to unlock.
import { ROSTER } from "./seed/roster";
import { totp } from "./seed/client";

const DOCUMENTED = ["alice@demo.fr", "bob@demo.fr", "admin@demo.fr"];

function secondsLeft(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

function main(): void {
  const wanted = process.env.EMAIL?.trim();
  const accounts = wanted
    ? ROSTER.filter((a) => a.email === wanted)
    : ROSTER.filter((a) => DOCUMENTED.includes(a.email));

  if (accounts.length === 0) {
    console.error(`No account "${wanted}" in the roster.`);
    console.error(`Documented logins: ${DOCUMENTED.join(", ")}`);
    process.exit(1);
  }

  console.log("");
  console.log(`  TOTP codes (valid ${secondsLeft()}s)`);
  for (const account of accounts) {
    console.log(`  ${account.email.padEnd(18)} ${totp(account.totpSecret)}`);
  }
  console.log("");
}

main();
