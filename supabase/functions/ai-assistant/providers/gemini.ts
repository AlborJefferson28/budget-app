import { getSystemPrompt } from "../prompt.ts";
import { AIResponse } from "./openrouter.ts";

export async function processWithGemini(
  message: string,
  image: string | undefined, // base64
  context: any,
  apiKey: string,
  history: { role: "user" | "assistant", content: string }[] = []
): Promise<AIResponse> {
  const model = "gemini-1.5-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

  const systemText = getSystemPrompt(context);

  // Map history to Gemini format
  const contents = history.map(h => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }]
  }));

  // Add current prompt
  const userParts: any[] = [{ text: message + "\n\n(Recuerda: Responde ÚNICAMENTE con JSON válido según el schema)" }];

  if (image) {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    userParts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: base64Data
      }
    });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      system_instruction: {
        parts: [{ text: systemText }]
      },
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("Gemini API Error: " + errText);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    const parsed = JSON.parse(textResponse);
    if (parsed.action && typeof parsed.action !== 'object') {
      parsed.action = null;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", textResponse);
    throw new Error("Invalid JSON format from Gemini");
  }
}
