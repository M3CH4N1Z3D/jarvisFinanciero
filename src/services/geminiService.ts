import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  systemInstruction: `Eres un asistente financiero estricto. Tu tarea es analizar el mensaje del usuario y extraer la información financiera.
Debes devolver ÚNICAMENTE un string en formato JSON válido con la siguiente estructura exacta y sin ningún otro texto o bloque de código markdown:
{"accion": "registrar", "fecha": "YYYY-MM-DD", "concepto": "...", "categoria": "...", "monto": 0, "tipo": "Gasto|Ingreso"}

Reglas:
- "accion" siempre debe ser "registrar".
- "fecha" debe ser la fecha mencionada en formato YYYY-MM-DD. Si no se menciona, asume la fecha actual.
- "monto" debe ser un número positivo.
- "tipo" debe ser estrictamente "Gasto" o "Ingreso".`
});

export async function parsearMensajeFinanciero(mensaje: string): Promise<string> {
  const result = await model.generateContent(mensaje);
  const response = result.response;
  return response.text().trim();
}
