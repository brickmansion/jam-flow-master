import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PHASE 5: Data Retention Cleanup
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for cleanup operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting data retention cleanup...");

    // Delete session files older than 730 days (2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);

    const { data: oldFiles, error: selectError } = await supabaseService
      .from('file_uploads')
      .select('id, file_path')
      .lt('created_at', twoYearsAgo.toISOString())
      .eq('category', 'sessions');

    if (selectError) {
      throw new Error(`Failed to query old files: ${selectError.message}`);
    }

    console.log(`Found ${oldFiles?.length || 0} old session files to delete`);

    if (oldFiles && oldFiles.length > 0) {
      // Delete files from storage
      const filePaths = oldFiles.map(file => file.file_path);
      const { error: storageError } = await supabaseService.storage
        .from('project-files')
        .remove(filePaths);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue with database cleanup even if storage fails
      }

      // Delete database records
      const { error: deleteError } = await supabaseService
        .from('file_uploads')
        .delete()
        .in('id', oldFiles.map(file => file.id));

      if (deleteError) {
        throw new Error(`Failed to delete file records: ${deleteError.message}`);
      }

      console.log(`Successfully cleaned up ${oldFiles.length} old session files`);
    }

    // Additional cleanup: Remove orphaned project members (users who no longer exist)
    const { error: orphanCleanupError } = await supabaseService
      .from('project_members')
      .delete()
      .is('user_id', null)
      .lt('created_at', twoYearsAgo.toISOString());

    if (orphanCleanupError) {
      console.error("Orphan cleanup error:", orphanCleanupError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleanup completed. Removed ${oldFiles?.length || 0} old files.`,
        cleanupDate: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Data retention cleanup error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});