import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PayScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoB}>B</Text>
          <Text style={styles.logoG}>G</Text>
        </View>
        <Text style={styles.headerTitle}>Pay</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹500</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="arrow-up-circle-outline" size={32} color="#333333" />
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="arrow-down-circle-outline" size={32} color="#333333" />
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="scan-outline" size={32} color="#333333" />
            <Text style={styles.actionText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <Text style={styles.infoText}>Payment features coming soon</Text>
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
    color: '#333333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  balanceCard: {
    backgroundColor: '#FFF4CC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#FFF4CC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 90,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});
