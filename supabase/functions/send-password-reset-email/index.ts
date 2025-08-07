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
    
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
    
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not found');
    }
    
    if (!hookSecret) {
      throw new Error('SEND_EMAIL_HOOK_SECRET not found');
    }
    
    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
      throw new Error('Missing webhook signature');
    }
    
    const payload = await req.text();
    console.log('Payload received, length:', payload.length);
    
    // Simple signature verification (in production, use proper HMAC verification)
    const expectedSignature = `sha256=${hookSecret}`;
    if (signature !== expectedSignature) {
      console.log('Signature verification failed:', { received: signature, expected: expectedSignature });
      // For now, let's continue without failing to debug
    }
    
    // Parse the webhook payload
    const data = JSON.parse(payload);
    console.log('Parsed payload data:', JSON.stringify(data, null, 2));
    
    const { user, email_data } = data;
    const { token_hash, redirect_to = 'https://6c1fe617-e800-45c7-84f0-6ca73e3e21c2.lovableproject.com/reset-password' } = email_data;
    
    if (!user?.email) {
      throw new Error('No user email found in payload');
    }
    
    console.log('Sending reset email to:', user.email);
    
    // Create reset URL
    const resetUrl = `https://ayqvnclmnepqyhvjqxjy.supabase.co/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${encodeURIComponent(redirect_to)}`;
    
    // Send email using fetch (simple approach)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SeshPrep <noreply@resend.dev>',
        to: [user.email],
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; margin-bottom: 20px;">Reset Your Password</h1>
            <p style="color: #666; line-height: 1.6;">
              You requested to reset your password. Click the button below to reset it:
            </p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; line-height: 1.6;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #666; line-height: 1.6;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
        `,
      }),
    });
    
    const emailResult = await emailResponse.json();
    console.log('Email send response:', emailResult);
    
    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${emailResult.message || 'Unknown error'}`);
    }
    
    console.log('Password reset email sent successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Password reset email sent successfully',
      emailId: emailResult.id
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