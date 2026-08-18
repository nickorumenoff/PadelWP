import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "@padel-ve/shared";

// En un dispositivo/emulador real, reemplaza por la URL pública del backend
// (localhost no es accesible desde un emulador/dispositivo físico).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

const TOKEN_KEY = "padelve_token";

let cachedToken: string | null | undefined;

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => cachedToken,
});

export async function loadToken() {
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function saveToken(token: string) {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}
