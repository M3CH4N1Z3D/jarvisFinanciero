import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parsearMensajeFinanciero } from '../../services/geminiService';
import { insertTransaction, createAccount, getUserAccounts, updateTransaction, deleteTransaction, getTransactionsCurrentMonth } from '../../services/transactionService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'sami';
  status?: 'sending' | 'success' | 'error';
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: '¡Hola! Soy Sami. Dime, ¿qué gasto o ingreso quieres registrar hoy? También puedo crear cuentas para ti.', sender: 'sami' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Obtener cuentas del usuario para el contexto
      const accounts = await getUserAccounts();
      const cuentasContexto = accounts?.map(acc => `- ${acc.name} (Saldo: $${acc.balance}, Reglas: ${acc.rules || 'Ninguna'})`).join('\n') || 'No hay cuentas configuradas.';

      // Obtener transacciones recientes para el contexto
      const recentTransactions = await getTransactionsCurrentMonth();
      const transaccionesContexto = recentTransactions?.slice(0, 20).map(t => `- ${t.fecha}: ${t.concepto} -> ${t.categoria} (${t.tipo})`).join('\n') || 'No hay transacciones recientes.';

      // 2. Llamar a Gemini
      const historialGemini = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'sami' ? 'assistant' as const : 'user' as const,
        content: msg.text
      }));
      const jsonResponse = await parsearMensajeFinanciero(historialGemini, cuentasContexto, transaccionesContexto);
      
      // 3. Parsear JSON
      const cleanText = jsonResponse.replace(/```json\n?|```/g, '').trim();
      const data = JSON.parse(cleanText);
      
      let samiResponseText = '';
      const acciones = data.acciones || [data]; // Fallback por si no devuelve el arreglo

      for (const accionData of acciones) {
        if (accionData.accion === 'preguntar') {
          samiResponseText += (samiResponseText ? '\n' : '') + accionData.mensaje;
        } else if (accionData.accion === 'configurar_cuenta') {
          await createAccount(accionData.nombre, accionData.saldo_inicial, accionData.reglas);
          samiResponseText += (samiResponseText ? '\n' : '') + `Cuenta configurada: ${accionData.nombre} con saldo inicial de $${accionData.saldo_inicial}.`;
        } else if (accionData.accion === 'registrar_transaccion') {
          await insertTransaction({
            fecha: accionData.fecha || new Date().toISOString().split('T')[0],
            concepto: accionData.concepto,
            categoria: accionData.categoria,
            monto: accionData.monto,
            tipo: accionData.tipo,
            cuenta_nombre: accionData.cuenta_nombre,
            tax_amount: accionData.impuesto || 0
          });

          samiResponseText += (samiResponseText ? '\n' : '') + `¡Listo! Registré tu ${accionData.tipo.toLowerCase()} de $${accionData.monto} en ${accionData.categoria} (${accionData.concepto}).${accionData.impuesto ? ` Impuesto aplicado: $${accionData.impuesto}.` : ''}`;
        } else if (accionData.accion === 'actualizar_transaccion') {
          await updateTransaction(accionData.concepto_busqueda, accionData.nuevos_datos);
          samiResponseText += (samiResponseText ? '\n' : '') + `¡Listo! Actualicé la transacción relacionada con "${accionData.concepto_busqueda}".`;
        } else if (accionData.accion === 'eliminar_transaccion') {
          const conceptoEliminado = await deleteTransaction(accionData.concepto_busqueda);
          samiResponseText += (samiResponseText ? '\n' : '') + `¡Listo! Eliminé la transacción "${conceptoEliminado}".`;
        } else {
          throw new Error(`No entendí la acción a realizar: ${accionData.accion}`);
        }
      }

      // 4. Mensaje de éxito o respuesta
      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: samiResponseText,
        sender: 'sami',
      };
      
      setMessages(prev => [...prev, successMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Hubo un error: ${error.message || 'No pude procesar tu solicitud.'}`,
        sender: 'sami',
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View className={`flex-row w-full my-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <View 
          className={`max-w-[80%] p-3 rounded-2xl ${
            isUser 
              ? 'bg-blue-500 dark:bg-blue-600 rounded-tr-sm' 
              : 'bg-gray-200 dark:bg-gray-700 rounded-tl-sm'
          }`}
        >
          <Text className={`${isUser ? 'text-white' : 'text-gray-800 dark:text-white'} text-base`}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      className="bg-gray-50 dark:bg-gray-900" 
      behavior="padding"
      keyboardVerticalOffset={140}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      {isTyping && (
        <View className="px-4 py-2 flex-row items-center">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="ml-2 text-gray-500 dark:text-gray-400 text-sm">Sami está procesando...</Text>
        </View>
      )}

      <View className="flex-row items-center p-3 pb-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <TextInput
          className="flex-1 bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-full text-base dark:text-white mr-2"
          placeholder="Ej: Gasté $15000 en almuerzo"
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity 
          onPress={sendMessage}
          disabled={!inputText.trim() || isTyping}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            !inputText.trim() || isTyping ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-500 dark:bg-blue-600'
          }`}
        >
          <Ionicons name="send" size={20} color="white" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
