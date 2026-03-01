# Checklist

- [ ] AzamPay Removed
  - [ ] `supabase/functions/azampay-payment` deleted
  - [ ] `src/utils/supabase/api.ts` cleaned
  - [ ] `src/components/VirtualTicketPurchaseModal.tsx` cleaned
  - [ ] `src/components/TierTicketModal.tsx` cleaned
  - [ ] `src/components/EventDetails.tsx` cleaned
  - [ ] `src/components/OrganizerProfile.tsx` cleaned

- [ ] Snippe Implemented
  - [ ] `supabase/functions/snippe-payment/index.ts` created
  - [ ] `supabase/functions/snippe-webhook/index.ts` created
  - [ ] `initiateSnippePayment` function added to `src/utils/supabase/api.ts`
  - [ ] `VirtualTicketPurchaseModal.tsx` uses Snippe
  - [ ] `TierTicketModal.tsx` uses Snippe
  - [ ] `EventDetails.tsx` uses Snippe
  - [ ] `OrganizerProfile.tsx` uses Snippe

- [ ] Verification
  - [ ] Edge Function calls Snippe API (Mocked if necessary)
  - [ ] `transactions` table is updated correctly
  - [ ] Frontend handles pending/success/failure states
