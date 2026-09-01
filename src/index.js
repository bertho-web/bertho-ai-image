/**
 * bertho-ai-image/src/index.js
 * Microservice de Génération Graphique Haute Définition FLUX.1-Schnell (0 Émoji).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. CORS PREFLIGHT
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // 2. HEALTH CHECK
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        service: "bertho-ai-image",
        model: "@cf/black-forest-labs/flux-1-schnell",
        status: "online"
      });
    }
    
    // 3. ROUTE DE GÉNÉRATION D'IMAGE (POST / ou POST /generate)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt || body.message;
        
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
          return json({ success: false, error: "prompt_required" }, 400);
        }
        
        const steps = Math.min(Math.max(parseInt(body.steps, 10) || 4, 1), 8);
        
        // Appel du modèle de frontière FLUX.1-Schnell
        const response = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt: prompt.trim(),
          num_steps: steps
        });
        
        // Conversion sécurisée du flux binaire en Base64 Data URI en mémoire
        let base64Image = "";
        
        if (response && typeof response.image === "string") {
          base64Image = response.image.startsWith("data:") ?
            response.image :
            `data:image/jpeg;base64,${response.image}`;
        } else {
          const buffer = response instanceof ArrayBuffer ?
            response :
            (response instanceof Uint8Array ? response.buffer : await new Response(response).arrayBuffer());
          
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64Image = `data:image/jpeg;base64,${btoa(binary)}`;
        }
        
        return json({
          success: true,
          prompt: prompt.trim(),
          image: base64Image,
          format: "jpeg",
          steps: steps
        });
        
      } catch (error) {
        console.error("[FLUX Image Generation Error]:", error);
        return json({
          success: false,
          error: error.message || "image_generation_failed"
        }, 500);
      }
    }
    
    return json({ success: false, error: "route_not_found" }, 404);
  }
};