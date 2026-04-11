import { getSystemPrompt } from "../prompt.ts";

export interface AIResponse {
  reply: string;
  action: {
    type: "transaction" | "allocation";
    data: any;
    mode: "agendar" | "guardar";
  } | null;
}

export async function processWithOpenRouter(
  message: string,
  image: string | undefined,
  context: any,
  apiKey: string,
  history: { role: "user" | "assistant", content: string }[] = []
): Promise<AIResponse> {
  const visionModels = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-3-27b-it:free",
    "google/gemma-3-4b-it:free",
    "google/gemma-3-12b-it:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
  ];

  const textModels = [
    "minimax/minimax-m2.5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "mistralai/mistral-nemo:free",
    "qwen/qwen2.5-72b-instruct:free",
    "microsoft/phi-4-reasoning-plus:free",
    "google/gemma-3-27b-it:free",
  ];

  const models = image ? visionModels : textModels;
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  const systemText = getSystemPrompt(context);

  let userContent: any = message;
  
  if (image) {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    userContent = [
      { type: "text", text: message + "\n\nPor favor, analiza esta imagen y extrae los datos requeridos. Recuerda: RESPONDE SOLO CON JSON." },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64," + base64Data } }
    ];
  } else {
    // Para texto simple, también reforzamos al final
    userContent = message + "\n\n(Recuerda: Responde ÚNICAMENTE con JSON válido según el schema)";
  }

  let lastError = null;

  for (const model of models) {
    console.log("Trying model: " + model);
    try {
      const requestBody = {
        model: model,
        messages: [
          { role: "system", content: systemText },
          ...history,
          { role: "user", content: userContent }
        ],
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://localhost:5173",
          "X-Title": "Budget App AI",
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error with model " + model + " (Status: " + response.status + "):", errorText);
        
        if (response.status === 401) {
          throw new Error("OpenRouter API Key inválida o expirada.");
        }

        // Para cualquier otro error (404, 429, 503, 400 del proveedor), saltamos al siguiente
        console.warn("Model " + model + " failed with " + response.status + ". Trying next fallback...");
        lastError = new Error("OpenRouter error on " + model + " (" + response.status + "): " + errorText);
        continue;
      }

      const result = await response.json();
      let textResponse = result.choices?.[0]?.message?.content || "{}";
      
      const firstBrace = textResponse.indexOf("{");
      const lastBrace = textResponse.lastIndexOf("}");
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        let cleanedResponse = textResponse.substring(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(cleanedResponse);
          // If parsed action is a primitive (e.g., string) instead of an object, convert it to null to prevent errors downstream
          if (parsed.action && typeof parsed.action !== 'object') {
             parsed.action = null;
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse AI response from " + model + ":", cleanedResponse);
          lastError = e;
          continue;
        }
      } else {
        console.warn("Model " + model + " did not return JSON format. Output:", textResponse);
        lastError = new Error("Model " + model + " returned plain text, expected JSON.");
        continue; // Try next model
      }
    } catch (err) {
      console.error("Fetch error with model " + model + ":", err);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All AI models failed to respond.");

}
