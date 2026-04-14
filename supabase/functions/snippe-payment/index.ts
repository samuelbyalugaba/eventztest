import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SNIPPE_API_URL = "https://api.snippe.sh/v1/payments";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Exchange Rates (Static for now, can be replaced with an API later)
    // 1 [CURRENCY] = X TZS
    const EXCHANGE_RATES: Record<string, number> = {
      'TZS': 1,
      'USD': 2600,
      'EUR': 2800,
      'GBP': 3300,
      'KES': 20,
      'UGX': 0.7,
      'RWF': 2,
      'ZAR': 140,
      'NGN': 3, // Very volatile
      'GHS': 180,
    };

    const { amount, currency = "TZS", phoneNumber, provider, eventId, userId, metadata } = await req.json();

    // Basic Validation
    if (!amount || !phoneNumber) {
      throw new Error("Amount and Phone Number are required");
    }
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    // Initialize Supabase Admin Client (moved up to validate price server-side)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SERVER-SIDE PRICE VALIDATION: Fetch the real price from the database
    // Never trust client-supplied amounts for payment processing
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('streaming, price_range, ticket_tiers')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error("Event not found or could not be verified");
    }

    // Determine the authoritative price from the database
    let serverPrice = amount; // fallback to client amount only if we can't determine
    const ticketType = metadata?.ticket_type;
    
    if (ticketType === 'Virtual' && eventData.streaming?.virtualPrice) {
      // Extract numeric price from virtualPrice string (e.g., "TSh 5,000" -> 5000)
      serverPrice = parseFloat(String(eventData.streaming.virtualPrice).replace(/[^0-9.]/g, '')) || 0;
    } else if (ticketType && eventData.ticket_tiers && Array.isArray(eventData.ticket_tiers)) {
      // Find matching tier
      const tier = eventData.ticket_tiers.find((t: any) => t.name === ticketType);
      if (tier) {
        serverPrice = tier.priceNumeric || parseFloat(String(tier.price).replace(/[^0-9.]/g, '')) || 0;
      }
    } else if (eventData.price_range) {
      serverPrice = parseFloat(String(eventData.price_range).replace(/[^0-9.]/g, '')) || 0;
    }

    console.log(`Server price: ${serverPrice}, Client amount: ${amount}, Ticket type: ${ticketType}`);

    // Use server-determined price (prevents client-side price manipulation)
    const trustedAmount = serverPrice;

    // Currency Conversion Logic
    let finalAmount = trustedAmount;
    const originalCurrency = currency.toUpperCase();
    
    if (originalCurrency !== 'TZS') {
      let rate = EXCHANGE_RATES[originalCurrency];

      // If rate not found in static list, try fetching from free API
      if (!rate) {
        try {
          console.log(`Fetching live rate for ${originalCurrency}...`);
          const rateResponse = await fetch(`https://open.er-api.com/v6/latest/${originalCurrency}`);
          const rateData = await rateResponse.json();
          
          if (rateData && rateData.rates && rateData.rates.TZS) {
            rate = rateData.rates.TZS;
            console.log(`Live rate fetched: 1 ${originalCurrency} = ${rate} TZS`);
          } else {
            console.warn(`Could not fetch live rate for ${originalCurrency}. Using default fallback.`);
          }
        } catch (err) {
          console.error(`Error fetching live rate: ${err}`);
        }
      }

      // Final fallback if both static and API fail
      rate = rate || 2600; 

      finalAmount = Math.ceil(trustedAmount * rate);
      console.log(`Converting ${trustedAmount} ${originalCurrency} to ${finalAmount} TZS (Rate: ${rate})`);
    } else {
      finalAmount = Math.ceil(trustedAmount); // Ensure integer for TZS
    }

    // Enforce Snippe minimum amount (500 TZS)
    const SNIPPE_MINIMUM_TZS = 500;
    if (finalAmount < SNIPPE_MINIMUM_TZS) {
      throw new Error(`Payment amount (${finalAmount} TZS) is below the minimum of ${SNIPPE_MINIMUM_TZS} TZS. Please check the event pricing.`);
    }

    const apiKey = Deno.env.get("SNIPPE_API_KEY") || "snp_0af9b516c248f7b62a1d82d130d174f0ddacd92b7241870b06251fb200a4d2bf";
    if (!apiKey) {
      console.warn("SNIPPE_API_KEY is not set. Using mock mode if configured or failing.");
      // throw new Error("Server configuration error: Missing Snippe API Key"); 
      // For development, if key is missing, maybe we simulate success? 
      // Or just fail. Let's fail for now to enforce proper setup, or return a specific error.
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Format phone number to 255xxxxxxxxx
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '255' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('6')) {
      formattedPhone = '255' + formattedPhone;
    }
    // If it already starts with 255, we leave it (assuming length is correct)

    // Prepare Snippe Payload
    const payload = {
      phone_number: formattedPhone,
      details: {
        amount: finalAmount, // Converted TZS Amount
        currency: "TZS",
        description: `Ticket purchase for event ${eventId}`
      },
      customer: {
        firstname: metadata?.customer_name?.split(' ')[0] || "Guest",
        lastname: metadata?.customer_name?.split(' ').slice(1).join(' ') || "User",
        email: metadata?.customer_email || "no-email@example.com"
      },
      webhook_url: `${supabaseUrl}/functions/v1/snippe-webhook`,
      metadata: {
        transaction_id: metadata?.transactionId,
        user_id: userId,
        event_id: eventId,
        original_amount: amount, // Store original amount
        original_currency: currency // Store original currency
      }
    };

    console.log("Calling Snippe API with payload:", JSON.stringify(payload, null, 2));

    let result;
    if (apiKey) {
        console.log(`Using API Key: ${apiKey.substring(0, 4)}...`);
        const response = await fetch(SNIPPE_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Raw Snippe Response:", text);
        
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Snippe response:", e);
            throw new Error(`Invalid JSON response from Snippe: ${text}`);
        }

        if (!response.ok) {
            console.error("Snippe API Error:", result);
            throw new Error(result.message || `Snippe API request failed with status ${response.status}: ${JSON.stringify(result)}`);
        }
    } else {
        // Mock Response for Development without API Key
        console.log("Simulating Snippe API Success (No API Key provided)");
        result = {
            reference: `SIM-${Date.now()}`,
            status: "pending",
            message: "Simulation: Payment initiated"
        };
        
        // Simulate Webhook trigger after 5 seconds (for dev)
        // Note: This is a hack for local dev without real webhooks
        // In production, real webhooks will fire.
    }

    // Update Transaction in DB with Provider Reference
    if (metadata?.transactionId && result.reference) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
            provider_transaction_id: result.reference,
            provider: 'Snippe', // Ensure it says Snippe
            metadata: { ...metadata, snippe_response: result }
        })
        .eq('id', metadata.transactionId);

      if (updateError) {
        console.error("Failed to update transaction with reference:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: "Payment initiated successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
