import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    console.log('Sending invitation email to:', email, 'for project:', projectTitle);

    const emailResponse = await resend.emails.send({
      from: "SeshPrep <adam@sadbands.com>",
      to: [email],
      subject: `You've been invited to collaborate on "${projectTitle}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">You've been invited to SeshPrep!</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectTitle}"</strong> as a <strong>${role}</strong>.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Project: ${projectTitle}</h3>
            <p style="color: #666; margin: 10px 0;"><strong>Your role:</strong> ${role}</p>
            <p style="color: #666; margin: 10px 0;"><strong>Invited by:</strong> ${inviterName}</p>
          </div>
          
          <a href="https://6c1fe617-e800-45c7-84f0-6ca73e3e21c2.lovableproject.com/auth" 
             style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0;">
            Accept Invitation & Sign In
          </a>
          
          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            If you don't have an account yet, you'll be prompted to create one. Once you sign in with this email address, you'll automatically have access to the project.
          </p>
          
          <p style="color: #888; font-size: 14px; margin-top: 20px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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