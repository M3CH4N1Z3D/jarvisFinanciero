import { View, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getTransactionsCurrentMonth, getUserAccounts } from '../../services/transactionService';
import { PieChart, LineChart } from 'react-native-chart-kit';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [transactionsData, accountsData] = await Promise.all([
        getTransactionsCurrentMonth(),
        getUserAccounts()
      ]);
      setTransactions(transactionsData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Cargando dashboard...</Text>
      </View>
    );
  }

  // Cálculos
  const totalIngresos = transactions
    .filter(t => t.tipo === 'Ingreso')
    .reduce((acc, curr) => acc + curr.monto, 0);
    
  const totalGastos = transactions
    .filter(t => t.tipo === 'Gasto')
    .reduce((acc, curr) => acc + curr.monto, 0);
    
  const balance = totalIngresos - totalGastos;

  // Datos para Pie Chart (Gastos por categoría)
  const gastosPorCategoria = transactions
    .filter(t => t.tipo === 'Gasto')
    .reduce((acc: Record<string, number>, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.monto;
      return acc;
    }, {});

  const chartColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#22c55e'];
  
  const pieChartData = Object.keys(gastosPorCategoria).map((key, index) => ({
    name: key,
    population: gastosPorCategoria[key],
    color: chartColors[index % chartColors.length],
    legendFontColor: '#4b5563',
    legendFontSize: 12,
  }));

  // Datos para Line Chart (Flujo de caja)
  const transaccionesPorFecha = transactions.reduce((acc: Record<string, number>, curr) => {
    // Asumimos formato YYYY-MM-DD
    const fecha = curr.fecha.split('T')[0];
    if (curr.tipo === 'Ingreso') {
      acc[fecha] = (acc[fecha] || 0) + curr.monto;
    } else {
      acc[fecha] = (acc[fecha] || 0) - curr.monto;
    }
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(transaccionesPorFecha).sort();
  
  // Limitar a los últimos 7 días con transacciones para no saturar el gráfico
  const ultimasFechas = fechasOrdenadas.slice(-7);

  const lineChartData = {
    labels: ultimasFechas.length > 0 ? ultimasFechas.map(f => f.slice(-2)) : ['-'],
    datasets: [
      {
        data: ultimasFechas.length > 0 ? ultimasFechas.map(f => transaccionesPorFecha[f]) : [0],
      }
    ]
  };

  const screenWidth = Dimensions.get('window').width;
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
      <Text className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Resumen del Mes</Text>

      {/* Tarjetas de Resumen */}
      <View className="flex-row justify-between mb-6">
        <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm flex-1 mr-2 border border-gray-100 dark:border-gray-700">
          <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1 font-medium">Ingresos</Text>
          <Text className="text-green-500 dark:text-green-400 font-bold text-lg">${totalIngresos.toLocaleString()}</Text>
        </View>
        <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm flex-1 mx-1 border border-gray-100 dark:border-gray-700">
          <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1 font-medium">Gastos</Text>
          <Text className="text-red-500 dark:text-red-400 font-bold text-lg">${totalGastos.toLocaleString()}</Text>
        </View>
        <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm flex-1 ml-2 border border-gray-100 dark:border-gray-700">
          <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1 font-medium">Balance</Text>
          <Text className={`font-bold text-lg ${balance >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
            ${balance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Mis Cuentas */}
      <View className="mb-6">
        <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Mis Cuentas</Text>
        {accounts.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {accounts.map((account) => (
              <View key={account.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm mb-3 border border-gray-100 dark:border-gray-700 w-[48%]">
                <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1 font-medium truncate" numberOfLines={1}>{account.name}</Text>
                <Text className="text-gray-800 dark:text-white font-bold text-lg">${(account.balance || 0).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Text className="text-gray-500 dark:text-gray-400 text-center">No hay cuentas configuradas aún.</Text>
          </View>
        )}
      </View>

      {/* Gráfico Circular - Gastos por Categoría */}
      <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
        <Text className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Gastos por Categoría</Text>
        {pieChartData.length > 0 ? (
          <PieChart
            data={pieChartData}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"0"}
            center={[10, 0]}
            absolute
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 text-center py-8">No hay gastos registrados este mes</Text>
        )}
      </View>

      {/* Gráfico de Líneas - Flujo de Caja */}
      <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm mb-8 border border-gray-100 dark:border-gray-700">
        <Text className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Flujo de Caja (Últimos días)</Text>
        {ultimasFechas.length > 0 ? (
          <LineChart
            data={lineChartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 text-center py-8">No hay transacciones recientes</Text>
        )}
      </View>
    </ScrollView>
  );
}
