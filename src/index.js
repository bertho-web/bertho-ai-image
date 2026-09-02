/**
 * bertho-ai-image/src/index.js
 * Microservice Studio Graphique Multi-Modèles (FLUX.2-Dev Multipart, Phoenix, FLUX.1 - 0 Émoji).
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
    
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        service: "bertho-ai-image",
        models: Object.keys(IMAGE_MODELS),
        status: "online"
      });
    }
    
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt || body.message;
        
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
          return json({ success: false, error: "prompt_required" }, 400);
        }
        
        const selectedKey = (body.model || "flux2").toLowerCase();
        const targetModel = IMAGE_MODELS[selectedKey] || IMAGE_MODELS.flux2;
        
        let response = null;
        
      // A. FLUX.2 [dev] (Nécessite FormData / Multipart)
if (selectedKey === "flux2" || targetModel.includes("flux-2-dev")) {
  const form = new FormData();
  form.append("prompt", prompt.trim());
  form.append("width", "1024");
  form.append("height", "1024");
  
  const formResponse = new Response(form);
  const formStream = formResponse.body;
  const formContentType = formResponse.headers.get("content-type") || "multipart/form-data";
  
  response = await env.AI.run(targetModel, {
    multipart: {
      body: formStream,
      contentType: formContentType
    }
  });
}
// B. Phoenix 1.0 de Leonardo.Ai (Spécialiste Typographie & Affiches)
else if (selectedKey === "phoenix" || targetModel.includes("phoenix")) {
  response = await env.AI.run(targetModel, {
    prompt: prompt.trim(),
    num_steps: 25,
    guidance: 3
  });
}
// C. FLUX.1-Schnell (Ultra Rapide)
else {
  response = await env.AI.run(targetModel, {
    prompt: prompt.trim(),
    steps: parseInt(body.steps, 10) || 4
  });
}
        
        // Conversion du flux binaire en Base64 Data URI
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