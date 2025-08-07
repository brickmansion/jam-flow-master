import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Function started - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing request...');
    
    // Check environment variables
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
    
    console.log('RESEND_API_KEY exists:', !!resendKey);
    console.log('SEND_EMAIL_HOOK_SECRET exists:', !!hookSecret);
    
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not found');
    }
    
    if (!hookSecret) {
      throw new Error('SEND_EMAIL_HOOK_SECRET not found');
    }
    
    const payload = await req.text();
    console.log('Payload received, length:', payload.length);
    
    // For now, just return success to test if the function can run
    console.log('Function completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Function is working',
      hasResendKey: !!resendKey,
      hasHookSecret: !!hookSecret
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});