import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "../types";

const apiKey = (window as any).process?.env?.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const parseExpenseWithAI = async (text: string): Promise<{
  description: string;
  amount: number;
  category: string;
} | null> => {
  if (!apiKey) {
    console.error("API Key mancante");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analizza il seguente testo di spesa e estrai i dati. Testo: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Una descrizione breve e chiara della spesa" },
            amount: { type: Type.NUMBER, description: "L'importo numerico della spesa. Se non specificato, metti 0." },
            category: {
              type: Type.STRING,
              enum: Object.values(ExpenseCategory),
              description: "La categoria esatta tra quelle disponibili."
            }
          },
          required: ["description", "amount", "category"]
        }
      }
    });

    let resultText = response.text;
    if (!resultText) return null;

    resultText = resultText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const getTripAdvice = async (destination: string, budget: number, spent: number): Promise<string> => {
  if (!apiKey) return "Chiave API non configurata.";

  try {
    const remaining = budget - spent;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Sono in viaggio a ${destination}. Budget totale: ${budget}€, speso: ${spent}€, rimanente: ${remaining}€. Dammi un consiglio brevissimo (max 2 frasi) su come gestire i soldi rimanenti.`,
    });
    return response.text || "Nessun consiglio disponibile al momento.";
  } catch (error) {
    return "Impossibile recuperare consigli al momento.";
  }
};
