import { ref, set, onDisconnect } from 'firebase/database';
import { database } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = '@bitgo_user';

export interface User {
  name: string;
  phone: string;
}

// Save user to local storage
export const saveUserLocally = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    throw error;
  }
};

// Get user from local storage
export const getUserFromLocal = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};

// Save user to Firebase Realtime Database
export const saveUserToFirebase = async (user: User): Promise<void> => {
  try {
    const userRef = ref(database, `users/${user.phone}`);
    await set(userRef, {
      name: user.name,
      online: true
    });
    
    // Set up onDisconnect to mark user as offline when connection is lost
    const onlineRef = ref(database, `users/${user.phone}/online`);
    await onDisconnect(onlineRef).set(false);
  } catch (error) {
    throw error;
  }
};

// Update user online status
export const setUserOnlineStatus = async (phone: string, online: boolean): Promise<void> => {
  try {
    const onlineRef = ref(database, `users/${phone}/online`);
    await set(onlineRef, online);
  } catch (error) {
    throw error;
  }
};

// Clear local user data (for logout)
export const clearLocalUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    throw error;
  }
};
