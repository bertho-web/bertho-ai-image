/**
 * bertho-ai-image/src/index.js
 * Microservice Studio Graphique Multi-Modèles (FLUX.2-Dev, Phoenix 1.0, FLUX.1 - 0 Émoji).
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

const IMAGE_MODELS = {
  "flux2": "@cf/black-forest-labs/flux-2-dev",
  "phoenix": "@cf/leonardo/phoenix-1.0",
  "flux1": "@cf/black-forest-labs/flux-1-schnell"
};

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
        models: Object.keys(IMAGE_MODELS),
        status: "online"
      });
    }
    
    // 3. GÉNÉRATION GRAPHIQUE HAUT DE GAMME
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt || body.message;
        
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
          return json({ success: false, error: "prompt_required" }, 400);
        }
        
        // Sélection dynamique du modèle (FLUX.2 Dev par défaut, Phoenix ou FLUX.1)
        const selectedModelKey = body.model || "flux2";
        const targetModel = IMAGE_MODELS[selectedModelKey] || IMAGE_MODELS.flux2;
        
        let aiPayload = { prompt: prompt.trim() };
        if (body.steps && selectedModelKey === "flux1") {
          aiPayload.steps = parseInt(body.steps, 10);
        }
        
        // Inférence sur Cloudflare Workers AI
        const response = await env.AI.run(targetModel, aiPayload);
        
        // Conversion du flux binaire en Base64 Data URI en mémoire
        let base64Image = "";
        
        if (response && typeof response.image === "string") {
          base64Image = response.image.startsWith("data:") ?
            response.image :
            `data:image/png;base64,${response.image}`;
        } else {
          const buffer = response instanceof ArrayBuffer ?
            response :
            (response instanceof Uint8Array ? response.buffer : await new Response(response).arrayBuffer());
          
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64Image = `data:image/png;base64,${btoa(binary)}`;
        }
        
        return json({
          success: true,
          model: targetModel,
          prompt: prompt.trim(),
          image: base64Image
        });
        
      } catch (error) {
        console.error("[Image Generation Error]:", error);
        return json({
          success: false,
          error: error.message || "image_generation_failed"
        }, 500);
      }
    }
    
    return json({ success: false, error: "route_not_found" }, 404);
  }
};