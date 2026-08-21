import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

import ExploreScreen from "../screens/ExploreScreen";
import ClubDetailScreen from "../screens/ClubDetailScreen";
import MatchesScreen from "../screens/MatchesScreen";
import TournamentsScreen from "../screens/TournamentsScreen";
import TournamentDetailScreen from "../screens/TournamentDetailScreen";
import CategoryDetailScreen from "../screens/CategoryDetailScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ClubAdminScreen from "../screens/ClubAdminScreen";
import AdminScreen from "../screens/AdminScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SponsorsScreen from "../screens/SponsorsScreen";

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();
const TournamentsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ExploreStackScreen() {
  return (
    <ExploreStack.Navigator screenOptions={{ headerTintColor: colors.blue }}>
      <ExploreStack.Screen name="Explorar" component={ExploreScreen} />
      <ExploreStack.Screen name="ClubDetail" component={ClubDetailScreen} options={{ title: "Club" }} />
    </ExploreStack.Navigator>
  );
}

function TournamentsStackScreen() {
  return (
    <TournamentsStack.Navigator screenOptions={{ headerTintColor: colors.blue }}>
      <TournamentsStack.Screen name="TournamentsList" component={TournamentsScreen} options={{ title: "Torneos" }} />
      <TournamentsStack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ title: "Torneo" }} />
      <TournamentsStack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ title: "Categoría" }} />
    </TournamentsStack.Navigator>
  );
}

function ProfileStackScreen() {
  const { user } = useAuth();
  return (
    <ProfileStack.Navigator screenOptions={{ headerTintColor: colors.blue }}>
      {user ? (
        <>
          <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: "Mi perfil" }} />
          <ProfileStack.Screen name="ClubAdmin" component={ClubAdminScreen} options={{ title: "Mi club" }} />
          <ProfileStack.Screen name="Admin" component={AdminScreen} options={{ title: "Administración" }} />
          <ProfileStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notificaciones" }} />
          <ProfileStack.Screen name="Sponsors" component={SponsorsScreen} options={{ title: "Patrocinadores" }} />
        </>
      ) : (
        <>
          <ProfileStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <ProfileStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <ProfileStack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <ProfileStack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </ProfileStack.Navigator>
  );
}

function icon(label: string) {
  return ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blue,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { borderTopColor: colors.line },
        }}
      >
        <Tab.Screen name="Explorar" component={ExploreStackScreen} options={{ tabBarIcon: icon("🎾") }} />
        <Tab.Screen name="Partidas" component={MatchesScreen} options={{ tabBarIcon: icon("🤝") }} />
        <Tab.Screen name="Torneos" component={TournamentsStackScreen} options={{ tabBarIcon: icon("🏆") }} />
        <Tab.Screen name="Perfil" component={ProfileStackScreen} options={{ tabBarIcon: icon("👤") }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
