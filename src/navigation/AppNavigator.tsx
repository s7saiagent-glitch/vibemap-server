import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LiveAuctionScreen from '../screens/LiveAuctionScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LiveAuction" component={LiveAuctionScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
