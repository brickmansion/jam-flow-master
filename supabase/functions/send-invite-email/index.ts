import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    },
  }
);

interface InviteEmailRequest {
  email: string;
  projectTitle: string;
  role: string;
  inviterName: string;
  projectId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, projectTitle, role, inviterName, projectId }: InviteEmailRequest = await req.json();

    // Get authentication header to identify current user
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract JWT token and decode to get user ID (simplified)
    const token = authorization.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_invitation_rate_limit', {
      p_user_id: user.id,
      p_project_id: projectId,
      p_email: email
    });

    if (!rateLimitCheck) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Maximum 10 invitations per hour.' }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize inputs to prevent XSS
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedProjectTitle = projectTitle.replace(/[<>]/g, '').trim();
    const sanitizedInviterName = inviterName.replace(/[<>]/g, '').trim();
    const sanitizedRole = role.replace(/[<>]/g, '').trim();

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID();

    // Store invitation token in database
    const { error: tokenError } = await supabase.from('invitation_tokens').insert({
      project_id: projectId,
      email: sanitizedEmail,
      token: invitationToken,
      created_by: user.id
    });

    if (tokenError) {
      console.error('Token storage error:', tokenError);
      return new Response(JSON.stringify({ error: 'Failed to generate invitation token' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Record invitation attempt for rate limiting
    await supabase.from('invitation_rate_limit').insert({
      user_id: user.id,
      project_id: projectId,
      invited_email: sanitizedEmail
    });

    console.log('Sending invitation email to:', sanitizedEmail, 'for project:', sanitizedProjectTitle);

    const emailResponse = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [sanitizedEmail],
      subject: `You've been invited to collaborate on "${sanitizedProjectTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">You've been invited to SeshPrep!</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            <strong>${sanitizedInviterName}</strong> has invited you to collaborate on the project <strong>"${sanitizedProjectTitle}"</strong> as a <strong>${sanitizedRole}</strong>.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Project: ${sanitizedProjectTitle}</h3>
            <p style="color: #666; margin: 10px 0;"><strong>Your role:</strong> ${sanitizedRole}</p>
            <p style="color: #666; margin: 10px 0;"><strong>Invited by:</strong> ${sanitizedInviterName}</p>
          </div>
          
          <a href="https://6c1fe617-e800-45c7-84f0-6ca73e3e21c2.lovableproject.com/auth?token=${invitationToken}" 
             style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0;">
            Accept Invitation & Sign In
          </a>
          
          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            If you don't have an account yet, you'll be prompted to create one. Once you sign in with this email address, you'll automatically have access to the project.
          </p>
          
          <p style="color: #888; font-size: 14px; margin-top: 20px;">
            This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invitation sent successfully',
      token: invitationToken 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});