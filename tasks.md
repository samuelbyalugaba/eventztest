# Tasks

- [x] Remove AzamPay Integration <!-- id: 0 -->
  - [x] Delete `supabase/functions/azampay-payment` folder <!-- id: 1 -->
  - [x] Remove AzamPay related code from `src/utils/supabase/api.ts` <!-- id: 2 -->
  - [x] Remove AzamPay related code from `src/components/VirtualTicketPurchaseModal.tsx` <!-- id: 3 -->
  - [x] Remove AzamPay related code from `src/components/TierTicketModal.tsx` <!-- id: 4 -->
  - [x] Remove AzamPay related code from `src/components/EventDetails.tsx` <!-- id: 5 -->
  - [x] Remove AzamPay related code from `src/components/OrganizerProfile.tsx` <!-- id: 18 -->

- [x] Implement Snippe Backend <!-- id: 6 -->
  - [x] Create `supabase/functions/snippe-payment/index.ts` <!-- id: 7 -->
  - [x] Create `supabase/functions/snippe-webhook/index.ts` <!-- id: 8 -->
  - [x] Define `SNIPPE_API_KEY` and `SNIPPE_WEBHOOK_SECRET` placeholders <!-- id: 9 -->

- [x] Implement Snippe Frontend <!-- id: 10 -->
  - [x] Add `initiateSnippePayment` to `src/utils/supabase/api.ts` <!-- id: 11 -->
  - [x] Update `VirtualTicketPurchaseModal.tsx` to use Snippe <!-- id: 12 -->
  - [x] Update `TierTicketModal.tsx` to use Snippe <!-- id: 13 -->
  - [x] Update `EventDetails.tsx` to use Snippe <!-- id: 14 -->
  - [x] Update `OrganizerProfile.tsx` to use Snippe <!-- id: 19 -->

- [ ] Verify Implementation <!-- id: 15 -->
  - [ ] Verify `transactions` table updates <!-- id: 16 -->
  - [ ] Verify frontend polling mechanism <!-- id: 17 -->
