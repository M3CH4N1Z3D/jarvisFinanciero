import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

export interface MensajeHistorial {
  role: 'user' | 'assistant';
  content: string;
}

export async function parsearMensajeFinanciero(historial: MensajeHistorial[], cuentasContexto: string = "", transaccionesContexto: string = ""): Promise<string> {
  const fechaActual = new Date().toISOString().split('T')[0];
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    systemInstruction: `Eres Sami, un asistente financiero experto y estricto. Tu tarea es analizar el historial de mensajes y extraer la información financiera del último mensaje del usuario.
Debes devolver ÚNICAMENTE un string en formato JSON válido, sin ningún otro texto, ni comentarios, ni bloques de código markdown.

Fecha actual: ${fechaActual} (Úsala para calcular fechas relativas como "ayer", "el lunes pasado", etc. Devuelve siempre la fecha en formato YYYY-MM-DD).

Cuentas del usuario (contexto):
${cuentasContexto}

Transacciones recientes (contexto para inferir categorías):
${transaccionesContexto}

REGLAS DE ORO:
1. Si el usuario tiene más de una cuenta y NO especifica de cuál pagó o a cuál ingresó el dinero, NO puedes registrar la transacción. DEBES devolver la acción "preguntar" para que el usuario aclare la cuenta.
2. El monto es OBLIGATORIO. Si no se especifica, usa la acción "preguntar".
3. Infiere la fecha exacta basándote en la fecha actual.
4. Infiere la categoría basándote en el concepto y en las transacciones recientes. Si no estás seguro, usa la acción "preguntar".
5. Infiere el tipo (Gasto, Ingreso, Transferencia) según el contexto de la frase.
6. Calcula los impuestos (tax_amount) si el usuario los menciona explícitamente (ej. "19% de iva", "4x1000") o si las reglas de la cuenta lo exigen.

La IA debe poder devolver 5 tipos de acciones en JSON:
1. Registrar transacción:
{"accion": "registrar_transaccion", "fecha": "2023-10-25", "concepto": "...", "categoria": "...", "monto": 0, "tipo": "Gasto", "cuenta_nombre": "Nequi", "impuesto": 20}
- "fecha" debe ser YYYY-MM-DD.
- "categoria" debe ser inferida o creada lógicamente.
- "monto" debe ser un número positivo.
- "tipo" debe ser "Gasto" o "Ingreso". (Para transferencias, puedes registrar un Gasto en la cuenta origen y luego un Ingreso en la cuenta destino, o preguntar cómo manejarlo).
- "cuenta_nombre" es obligatorio. Si falta, usa "preguntar".
- "impuesto" es el valor calculado del impuesto. Si no hay, pon 0.

2. Preguntar información faltante:
{"accion": "preguntar", "mensaje": "¿De qué cuenta pagaste el postre?"}
- Usa esta acción si falta información vital (cuenta, monto, categoría incierta).

3. Configurar cuenta:
{"accion": "configurar_cuenta", "nombre": "Nequi", "saldo_inicial": 100000, "reglas": "cobra 4x1000"}

4. Actualizar transacción:
{"accion": "actualizar_transaccion", "concepto_busqueda": "tinto", "nuevos_datos": {"categoria": "Ocio", "monto": 5000, "concepto": "tinto grande", "tipo": "Gasto"}}

5. Eliminar transacción:
{"accion": "eliminar_transaccion", "concepto_busqueda": "tinto"}`
  });

  const history: { role: "user" | "model", parts: { text: string }[] }[] = [];
  
  // Ignoramos el último mensaje porque se enviará con sendMessage
  const historialPrevio = historial.slice(0, -1);
  
  // Encontrar el primer mensaje de usuario
  const startIndex = historialPrevio.findIndex(msg => msg.role === 'user');
  
  if (startIndex !== -1) {
    let expectedRole = 'user';
    for (let i = startIndex; i < historialPrevio.length; i++) {
      const msg = historialPrevio[i];
      const mappedRole = msg.role === 'assistant' ? 'model' : 'user';
      
      if (mappedRole === expectedRole) {
        history.push({
          role: mappedRole as "user" | "model",
          parts: [{ text: msg.content }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }
    
    // Si el historial termina en 'user', eliminamos ese último mensaje
    // porque el nuevo mensaje que vamos a enviar también es 'user'
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop();
    }
  }

  const chat = model.startChat({
    history: history
  });

  const ultimoMensaje = historial[historial.length - 1].content;
  const result = await chat.sendMessage(ultimoMensaje);
  const response = result.response;
  return response.text().trim();
}
