// CORS utilities for edge functions
// Configure allowed origins
const allowedOrigins = [
  "https://seshprep.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

export function getOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (origin && allowedOrigins.includes(origin)) return origin;
  // Default to first allowed origin
  return allowedOrigins[0];
}

// Broad CORS headers; browsers will still enforce allowed origins when using credentials
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
