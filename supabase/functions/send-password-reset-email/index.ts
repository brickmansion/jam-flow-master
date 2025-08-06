import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    // Verify webhook and extract data
    let user, email_data;
    try {
      const webhookData = wh.verify(payload, headers) as {
        user: {
          email: string
        }
        email_data: {
          token_hash: string
          redirect_to: string
          email_action_type: string
          site_url: string
        }
      };
      user = webhookData.user;
      email_data = webhookData.email_data;
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError);
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { token_hash, redirect_to, email_action_type } = email_data;

    // Only handle password recovery emails
    if (email_action_type !== 'recovery') {
      console.log(`Ignoring email type: ${email_action_type}`);
      return new Response(JSON.stringify({ message: `Email type ${email_action_type} not handled by this function` }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Build the reset URL with the correct parameters
    const reset_url = `${redirect_to}?access_token=${token_hash}&type=recovery`

    console.log('Sending password reset email to:', user.email)
    console.log('Reset URL:', reset_url)

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        reset_url,
      })
    )

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