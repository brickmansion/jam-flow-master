import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    console.log('=== Password Reset Email Function Started ===')
    console.log('Environment check:')
    console.log('- RESEND_API_KEY present:', !!Deno.env.get('RESEND_API_KEY'))
    console.log('- SEND_EMAIL_HOOK_SECRET present:', !!Deno.env.get('SEND_EMAIL_HOOK_SECRET'))
    
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    console.log('Request details:')
    console.log('- Payload length:', payload.length)
    console.log('- Headers keys:', Object.keys(headers))
    
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET is missing!')
      throw new Error('Missing webhook secret configuration')
    }
    
    const wh = new Webhook(hookSecret)
    
    console.log('Received webhook payload length:', payload.length)
    
    // Verify webhook and extract data
    let webhookData;
    try {
      webhookData = wh.verify(payload, headers) as any;
      console.log('Webhook data keys:', Object.keys(webhookData))
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError);
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Handle different webhook payload structures
    if (!webhookData.email_data) {
      console.log('No email_data in payload, likely not an email-related event');
      return new Response(JSON.stringify({ message: 'No email data in webhook payload' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { user, email_data } = webhookData;
    
    if (!user || !user.email) {
      console.error('Invalid user data in webhook');
      return new Response(JSON.stringify({ error: 'Invalid user data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { token_hash, redirect_to, email_action_type } = email_data;

    // Only handle password recovery emails
    if (email_action_type !== 'recovery') {
      console.log(`Ignoring email type: ${email_action_type} for user: ${user.email}`);
      return new Response(JSON.stringify({ message: `Email type ${email_action_type} not handled by this function` }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Build the reset URL with the correct parameters
    const reset_url = `${redirect_to}?access_token=${token_hash}&type=recovery`

    console.log('Sending password reset email to:', user.email)
    console.log('Reset URL:', reset_url)

    // Simple HTML email instead of React Email for now
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p>You recently requested to reset your password for your SeshPrep account. Click the button below to reset it.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reset_url}" style="background-color: #007cba; color: white; padding: 14px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">${reset_url}</p>
          <p style="color: #999; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. This link will expire in 24 hours.</p>
          <p>Best regards,<br/>The SeshPrep Team</p>
        </body>
      </html>
    `

    const { error } = await resend.emails.send({
      from: 'SeshPrep <noreply@seshprep.com>',
      to: [user.email],
      subject: 'Reset your SeshPrep password',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Password reset email sent successfully')

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })

  } catch (error) {
    console.error('Error in send-password-reset-email function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})