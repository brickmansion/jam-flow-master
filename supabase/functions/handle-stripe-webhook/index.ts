import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Update workspace to Pro plan and clear trial
        const { error } = await supabaseClient
          .from("workspaces")
          .update({
            plan: "pro",
            trial_expires_at: null,
          })
          .eq("owner_id", userId);

        if (error) {
          console.error("Error updating workspace to Pro:", error);
        } else {
          console.log("Successfully upgraded workspace to Pro for user:", userId);
        }
        break;
      }

      case "invoice.payment_failed":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer to find user email
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted || !customer.email) {
          console.error("Could not find customer email");
          break;
        }

        // Find workspace by user email and downgrade to free
        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === customer.email);

        if (!user) {
          console.error("Could not find user for customer email:", customer.email);
          break;
        }

        const { error } = await supabaseClient
          .from("workspaces")
          .update({ plan: "free" })
          .eq("owner_id", user.id);

        if (error) {
          console.error("Error downgrading workspace:", error);
        } else {
          console.log("Successfully downgraded workspace for user:", user.id);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});