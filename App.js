import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { migrateDbIfNeeded } from './src/database';
import DashboardScreen from './src/screens/DashboardScreen';
import AddContractScreen from './src/screens/AddContractScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="contracts.db" onInit={migrateDbIfNeeded}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerStyle: { backgroundColor: '#ffffff' },
              headerTintColor: '#1f2937',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: '#f3f4f6' },
            }}
          >
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Event Contracts' }}
            />
            <Stack.Screen
              name="AddContract"
              component={AddContractScreen}
              options={{ title: 'Add Contract' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
