import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.53.0";
import { corsHeaders, getOrigin } from "../_shared/cors.ts";

// Create a Supabase client using anon key. We will obtain a user session by verifying
// the recovery token (token_hash or OTP) server-side when needed.
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/password-reset")[1] || "/";
  const headers = { ...corsHeaders, "Content-Type": "application/json" } as Record<string, string>;

  try {
    // POST /password-reset/request -> send recovery email
    if (path === "/request" && req.method === "POST") {
      const { email } = await req.json().catch(() => ({}));
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers });
      }

      const origin = getOrigin(req);
      const redirectTo = `${origin}/reset-password`;
      console.log("password-reset/request", { email, origin, redirectTo });

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        console.error("Password reset email error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }
      console.log("Password reset email sent OK for", email);

      return new Response(JSON.stringify({ message: "Password reset email sent", redirectTo }), { status: 200, headers });
    }

    // GET /password-reset/session?token_hash=... OR ?token=...&email=...
    if (path === "/session" && req.method === "GET") {
      const token_hash = url.searchParams.get("token_hash");
      const token = url.searchParams.get("token");
      const email = url.searchParams.get("email");

      if (!token_hash && !(token && email)) {
        return new Response(JSON.stringify({ error: "token_hash or token+email is required" }), { status: 400, headers });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const verifyArgs: any = { type: "recovery" as const };
      if (token_hash) verifyArgs.token_hash = token_hash;
      if (token && email) {
        verifyArgs.token = token;
        verifyArgs.email = email;
      }

      const { data, error } = await supabase.auth.verifyOtp(verifyArgs);
      if (error) {
        console.error("verifyOtp error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(
        JSON.stringify({
          message: "Valid recovery token",
          session: data?.session ?? null,
          user: data?.user ?? null,
          access_token: data?.session?.access_token ?? null,
          refresh_token: data?.session?.refresh_token ?? null,
        }),
        { status: 200, headers }
      );
    }

    // POST /password-reset/update -> { password, token_hash? | (token,email)? | (access_token,refresh_token)? }
    if (path === "/update" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { password, token_hash, token, email, access_token, refresh_token } = body as {
        password?: string;
        token_hash?: string;
        token?: string;
        email?: string;
        access_token?: string;
        refresh_token?: string;
      };

      if (!password) {
        return new Response(JSON.stringify({ error: "New password is required" }), { status: 400, headers });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Ensure we have a session bound to this server-side client
      let haveSession = false;

      try {
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          haveSession = !!data.session;
        } else if (token_hash) {
          const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash });
          if (error) throw error;
          if (data?.session) {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            haveSession = true;
          }
        } else if (token && email) {
          const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token, email });
          if (error) throw error;
          if (data?.session) {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            haveSession = true;
          }
        }
      } catch (e: any) {
        console.error("Failed to establish session for update:", e);
        return new Response(JSON.stringify({ error: e?.message || "Invalid or expired recovery token" }), { status: 400, headers });
      }

      if (!haveSession) {
        return new Response(JSON.stringify({ error: "Missing or invalid recovery credentials" }), { status: 400, headers });
      }

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("Password update error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(
        JSON.stringify({ message: "Password updated successfully", user: data.user }),
        { status: 200, headers }
      );
    }

    // Not found
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
  } catch (err: any) {
    console.error("password-reset function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err?.message }), { status: 500, headers });
  }
});
