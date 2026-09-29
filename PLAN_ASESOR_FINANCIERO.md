# Plan Estratégico: Evolución a Asesor Financiero Proactivo (Sami)

Este documento detalla la estrategia técnica y de producto para transformar la aplicación de un simple registrador de transacciones a un **Asesor Financiero Proactivo**, optimizando el uso de tokens de IA y mejorando la experiencia del usuario.

---

## 1. Arquitectura de Datos (Supabase)

Para evitar enviar cientos de transacciones a la IA (lo cual consumiría demasiados tokens y aumentaría la latencia/costos), delegaremos el procesamiento pesado a la base de datos mediante **Vistas SQL** y **Funciones RPC (Remote Procedure Calls)**.

### Nuevos Componentes en Base de Datos:
*   **RPC `get_monthly_summary(user_uuid, month, year)`**: Retorna el total de ingresos, total de gastos y el balance neto del mes solicitado.
*   **RPC `get_category_breakdown(user_uuid, start_date, end_date)`**: Agrupa y suma los gastos por categoría. Ideal para gráficos de torta y para que la IA sepa en qué se gasta más.
*   **RPC `get_frequent_small_expenses(user_uuid, threshold_amount)`**: Analiza "gastos hormiga". Busca transacciones recurrentes (ej. > 3 veces al mes) por debajo de cierto monto (ej. cafés, snacks, suscripciones pequeñas).
*   **Vista `debt_summary_view`**: Calcula la deuda acumulada sumando los balances negativos de las cuentas categorizadas como "Tarjeta de Crédito" o "Préstamo".

**Beneficio:** La base de datos hace las matemáticas gratis. La IA solo recibe los resultados.

---

## 2. Lógica de la App (TypeScript)

La aplicación actuará como un orquestador inteligente antes de hablar con Gemini.

### Flujo de Procesamiento Local:
1.  **Detección de Intención:** Si el usuario abre el chat o presiona un botón de "Analizar mes", la app llama a los servicios de Supabase (`transactionService.ts`).
2.  **Condensación de Contexto:** En lugar de enviar un array masivo de transacciones, TypeScript formateará un resumen compacto.
    *   *Ejemplo de contexto condensado:* `{"mes":"2023-10","ingresos":5000,"gastos":4200,"top_categoria":"Ocio (1200)","gastos_hormiga_est":300,"deuda_total":1500}`
3.  **Inyección en el Prompt:** Este resumen minificado se inyecta dinámicamente en el `systemInstruction` de Gemini, dándole a Sami una radiografía perfecta de las finanzas del usuario con una fracción de los tokens.

---

## 3. Evolución del Prompt de Sami

El rol de Sami en `geminiService.ts` debe actualizarse para reflejar su nueva inteligencia.

### Cambios en el System Instruction:
*   **Nuevo Rol:** "Eres Sami, tu Asesor Financiero Personal. Además de registrar transacciones, analizas la salud financiera del usuario basándote en el resumen proporcionado, identificas patrones negativos (como gastos hormiga o exceso de deuda) y provees consejos proactivos, empáticos y accionables."
*   **Nuevas Acciones JSON:**
    *   `{"accion": "dar_consejo", "mensaje": "He notado que tus gastos en 'Ocio' representan el 40% de tus ingresos. Te sugiero..."}`
    *   `{"accion": "sugerir_ahorro", "monto_sugerido": 200, "mensaje": "Si reduces tus compras de café, podrías ahorrar $200 este mes."}`
*   **Regla de Oro Adicional:** "Si el usuario pide un análisis o consejo, utiliza el 'Resumen Financiero' del contexto para responder. No inventes datos."

---

## 4. Mejoras de UI/UX

Para que el usuario perciba el valor del Asesor, la interfaz debe ser más proactiva.

### Dashboard:
*   **Sección "Sami Insights":** Un carrusel o tarjeta destacada en la parte superior del Dashboard. Mostrará mensajes diarios/semanales generados localmente o cacheados de la IA (ej. *"⚠️ Llevas gastado el 80% de tu presupuesto de comida y apenas es día 15"*).
*   **Visualización de Datos:** Gráficos (Pie/Bar charts) alimentados directamente por las RPCs de Supabase para una carga instantánea.

### Interfaz del Chat (Sami):
*   **Sugerencias Rápidas (Chips):** Botones encima del teclado con prompts predefinidos:
    *   *"📊 Analiza mi mes"*
    *   *"🐜 ¿Tengo gastos hormiga?"*
    *   *"💰 ¿Cómo puedo ahorrar más?"*
*   **Renderizado Especial:** Los mensajes de tipo `dar_consejo` deben tener un estilo visual distinto (ej. un borde dorado o un icono de bombillo) para diferenciarlos de los simples registros de transacciones.

---

## 5. Fases de Implementación (Roadmap)

Este plan se ejecutará de manera iterativa para asegurar estabilidad:

*   **Fase 1: Capa de Datos (Backend)**
    *   Crear migraciones SQL para las nuevas RPCs (`get_monthly_summary`, `get_category_breakdown`, `get_frequent_small_expenses`).
    *   Probar las consultas directamente en Supabase.
*   **Fase 2: Integración de Servicios (Frontend)**
    *   Actualizar `supabaseClient.ts` y `transactionService.ts` para consumir las nuevas RPCs.
    *   Crear funciones de utilidad para formatear el resumen financiero.
*   **Fase 3: Inteligencia Artificial (Sami 2.0)**
    *   Modificar `geminiService.ts` para inyectar el contexto condensado.
    *   Actualizar el prompt del sistema y agregar los nuevos tipos de respuesta (`dar_consejo`).
*   **Fase 4: Interfaz de Usuario (Dashboard)**
    *   Implementar gráficos en el Dashboard.
    *   Crear el componente UI para "Sami Insights".
*   **Fase 5: Interfaz de Usuario (Chat y Pulido)**
    *   Añadir botones de sugerencias rápidas en la pantalla de chat.
    *   Añadir estilos específicos para los consejos de Sami.
    *   Pruebas de usabilidad y optimización final de tokens.
*   **Fase 6: Lectura de Imágenes (Comprobantes y Facturas)**
    *   Integrar `expo-image-picker` para permitir al usuario tomar fotos o seleccionar imágenes de la galería.
    *   Implementar la capacidad multimodal de Gemini para procesar las imágenes de recibos o facturas, extraer los datos clave (monto, fecha, concepto) y registrar la transacción automáticamente.
*   **Fase 7: Lectura Automática de Notificaciones Bancarias (Android)**
    *   Integrar la librería `react-native-android-notification-listener` para crear un servicio en segundo plano.
    *   Escuchar notificaciones de aplicaciones bancarias, parsear el texto para identificar gastos o ingresos y registrarlos en la base de datos sin intervención manual del usuario.