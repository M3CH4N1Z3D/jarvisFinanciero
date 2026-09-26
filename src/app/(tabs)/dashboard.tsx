import { View, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { getTransactionsCurrentMonth } from '../../services/transactionService';
import { PieChart, LineChart } from 'react-native-chart-kit';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getTransactionsCurrentMonth();
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Cargando dashboard...</Text>
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
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold mb-6 text-gray-800">Resumen del Mes</Text>

      {/* Tarjetas de Resumen */}
      <View className="flex-row justify-between mb-6">
        <View className="bg-white p-4 rounded-2xl shadow-sm flex-1 mr-2 border border-gray-100">
          <Text className="text-gray-500 text-xs mb-1 font-medium">Ingresos</Text>
          <Text className="text-green-500 font-bold text-lg">${totalIngresos.toLocaleString()}</Text>
        </View>
        <View className="bg-white p-4 rounded-2xl shadow-sm flex-1 mx-1 border border-gray-100">
          <Text className="text-gray-500 text-xs mb-1 font-medium">Gastos</Text>
          <Text className="text-red-500 font-bold text-lg">${totalGastos.toLocaleString()}</Text>
        </View>
        <View className="bg-white p-4 rounded-2xl shadow-sm flex-1 ml-2 border border-gray-100">
          <Text className="text-gray-500 text-xs mb-1 font-medium">Balance</Text>
          <Text className={`font-bold text-lg ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            ${balance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Gráfico Circular - Gastos por Categoría */}
      <View className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <Text className="text-lg font-semibold mb-4 text-gray-800">Gastos por Categoría</Text>
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
          <Text className="text-gray-500 text-center py-8">No hay gastos registrados este mes</Text>
        )}
      </View>

      {/* Gráfico de Líneas - Flujo de Caja */}
      <View className="bg-white p-4 rounded-2xl shadow-sm mb-8 border border-gray-100">
        <Text className="text-lg font-semibold mb-4 text-gray-800">Flujo de Caja (Últimos días)</Text>
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
          <Text className="text-gray-500 text-center py-8">No hay transacciones recientes</Text>
        )}
      </View>
    </ScrollView>
  );
}
