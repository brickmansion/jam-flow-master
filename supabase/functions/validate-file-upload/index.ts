import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PHASE 3: File Validation & Rate-Limiting
const ALLOWED_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav', 
  'audio/flac',
  'audio/aiff',
  'video/quicktime',
  'application/zip',
  'audio/mpeg',
  'audio/mp3',
  'audio/aac',
  'audio/ogg'
];

const MAX_FILE_SIZE_REGULAR = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_FILE_SIZE_SESSIONS = 60 * 1024 * 1024 * 1024; // 60 GB

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const { fileName, fileSize, mimeType, category } = await req.json();

    console.log(`Validating file upload: ${fileName}, ${fileSize} bytes, ${mimeType}, category: ${category}`);

    // 1. Validate MIME type against whitelist
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // 2. Reject double-extension filenames (e.g., ".wav.exe")
    const fileExtensions = fileName.split('.').slice(1);
    if (fileExtensions.length > 1) {
      const potentialExecutableExtensions = ['exe', 'bat', 'cmd', 'scr', 'com', 'pif', 'vbs', 'js'];
      const hasExecutableExtension = fileExtensions.some(ext => 
        potentialExecutableExtensions.includes(ext.toLowerCase())
      );
      if (hasExecutableExtension) {
        throw new Error("Files with executable extensions are not allowed");
      }
    }

    // 3. Enforce file size limits
    const maxSize = category === 'sessions' ? MAX_FILE_SIZE_SESSIONS : MAX_FILE_SIZE_REGULAR;
    if (fileSize > maxSize) {
      const maxSizeGB = maxSize / (1024 * 1024 * 1024);
      throw new Error(`File size ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB exceeds ${maxSizeGB}GB limit for ${category} files`);
    }

    // If all validations pass, return success
    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: "File validation passed",
        sanitizedFileName: fileName.replace(/[^a-zA-Z0-9.-]/g, '_') // Sanitize filename
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("File validation error:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});