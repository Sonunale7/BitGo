import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CallsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoB}>B</Text>
          <Text style={styles.logoG}>G</Text>
        </View>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      {/* Coming Soon */}
      <View style={styles.content}>
        <Ionicons name="call-outline" size={64} color="#CCCCCC" />
        <Text style={styles.comingSoonText}>Coming Soon</Text>
        <Text style={styles.descriptionText}>Call feature is under development</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logoContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  logoB: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  logoG: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#CCCCCC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999999',
    marginTop: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginTop: 8,
  },
});
