nTZS Developer Documentation
Add digital TZS payments to your app with a single SDK. This guide walks you through installation, user creation, deposits, transfers, and withdrawals.

Get your API Key
Open Dashboard
Step 1
Install the SDK
Install @ntzs/sdk from npm. Works with any Node.js or TypeScript project.

Terminal
npm install @ntzs/sdk
Step 2
Initialize the client
Create an NtzsClient instance with your API key. You'll get this key from your partner dashboard.

app.ts
import { NtzsClient } from '@ntzs/sdk'

const ntzs = new NtzsClient({
  apiKey: process.env.NTZS_API_KEY!,
  baseUrl: 'https://api.ntzs.co'
})
Security: Never expose your API key in client-side code. Always call the nTZS API from your backend.
Step 3
Create users
Register a user and instantly provision an on-chain wallet. Each user gets a unique Base wallet address.

create-user.ts
const user = await ntzs.users.create({
  externalId: 'your-internal-user-id',
  email: 'user@example.com',
  phone: '255712345678'  // optional
})

console.log(user.walletAddress)
// → 0xFfD2dF4aA86978A8971493B20287F5632bC0Fb5d
Idempotent: Calling create with the same externalId returns the existing user. Safe to retry.
Step 4
Accept deposits (On-Ramp)
Initiate an M-Pesa deposit. The user receives an STK push on their phone, pays, and nTZS tokens are minted to their wallet.

deposit.ts
const deposit = await ntzs.deposits.create({
  userId: user.id,
  amountTzs: 10000,
  phone: '255712345678'
})

// Check status later
const status = await ntzs.deposits.get(deposit.id)
console.log(status.status) // → 'minted'
Flow
M-Pesa STK Push → Payment confirmed → nTZS minted
Provider
Snippe (Vodacom M-Pesa, Tigo Pesa, Airtel Money)
Settlement
Real-time on Base. Tokens appear in balanceOf.
Step 5
Transfer between users
Move nTZS between any two users on your platform. Executed as a real ERC-20 transfer on Base.

transfer.ts
const transfer = await ntzs.transfers.create({
  fromUserId: senderUser.id,
  toUserId: recipientUser.id,
  amountTzs: 5000,
})

console.log(transfer.txHash)
// → 0x3a7b...real on-chain tx hash
Step 6
Cash out to M-Pesa (Off-Ramp)
Burn nTZS tokens and send TZS to the user's M-Pesa number. Fully automated.

withdraw.ts
const withdrawal = await ntzs.withdrawals.create({
  userId: user.id,
  amountTzs: 3000,
  phone: '255712345678'
})

// Tokens burned on-chain, TZS sent to M-Pesa
Read
Check balance
Read a user's on-chain nTZS balance at any time.

balance.ts
const { balanceTzs } = await ntzs.users.getBalance(user.id)
console.log(`Balance: ${balanceTzs} TZS`)

// Or get full user profile with balance
const profile = await ntzs.users.get(user.id)
console.log(profile.walletAddress, profile.balanceTzs)
Events
Webhooks
Receive real-time notifications when deposits complete, transfers settle, or withdrawals finish.

webhook-handler.ts
// Set your webhook URL in the partner dashboard
// nTZS will POST events to your endpoint

app.post('/webhooks/ntzs', (req, res) => {
  const event = req.body
  
  switch (event.type) {
    case 'deposit.completed':
      // nTZS minted to user's wallet
      break
    case 'transfer.completed':
      // On-chain transfer confirmed
      break
    case 'withdrawal.completed':
      // M-Pesa payout sent
      break
  }
  
  res.status(200).json({ received: true })
})
Webhook secret: Configure your webhook URL and secret in the partner dashboard. Events are signed with HMAC-SHA256 for verification.
Reference
Error handling
All API errors return a consistent JSON shape with an error message and HTTP status code.

error-handling.ts
import { NtzsClient, NtzsApiError } from '@ntzs/sdk'

try {
  await ntzs.deposits.create({ ... })
} catch (err) {
  if (err instanceof NtzsApiError) {
    console.log(err.status)  // 400, 401, 404, etc.
    console.log(err.message) // Human-readable error
  }
}
Reference
Authentication
All API requests require a Bearer token in the Authorization header.

curl
curl -X POST https://api.ntzs.co/api/v1/users \
  -H "Authorization: Bearer ntzs_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"externalId": "user_1", "email": "user@example.com"}'
API keys start with ntzs_test_ for testnet and ntzs_live_ for production. Get yours from the partner signup.