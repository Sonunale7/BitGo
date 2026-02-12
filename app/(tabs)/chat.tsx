import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../../src/config/firebase';
import { getUserFromLocal, setUserOnlineStatus, User } from '../../src/services/userService';
import { useAppState } from '../../src/hooks/useAppState';
import { getChatId } from '../../src/services/messageService';

interface ChatUser {
  id: string;
  name: string;
  phone: string;
  online: boolean;
  lastMessage?: string;
  lastTimestamp?: number;
}

interface ChatMeta {
  lastMessage: string;
  lastTimestamp: number;
}

export default function ChatScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Map<string, ChatUser>>(new Map());
  const [chatMetas, setChatMetas] = useState<Map<string, ChatMeta>>(new Map());

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const user = await getUserFromLocal();
      if (user) {
        setCurrentUser(user);
        try {
          await setUserOnlineStatus(user.phone, true);
        } catch (e) {
          // Silent fail
        }
      }
    };
    loadUser();
  }, []);

  // Real-time listener on users node - ONLY Firebase users, NO demo data
  useEffect(() => {
    const usersRef = ref(database, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersMap = new Map<string, ChatUser>();
        
        Object.keys(usersData).forEach((phone) => {
          const userData = usersData[phone];
          usersMap.set(phone, {
            id: phone,
            name: userData.name || 'Unknown',
            phone: phone,
            online: userData.online || false,
          });
        });
        
        setUsers(usersMap);
      } else {
        setUsers(new Map());
      }
    });

    return () => {
      off(usersRef);
    };
  }, []);

  // Real-time listener on chats node for meta (lastMessage, lastTimestamp)
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = ref(database, 'chats');
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatsData = snapshot.val();
        const metasMap = new Map<string, ChatMeta>();
        
        Object.keys(chatsData).forEach((chatId) => {
          // Only include chats that involve current user
          if (chatId.includes(currentUser.phone)) {
            const meta = chatsData[chatId]?.meta;
            if (meta) {
              metasMap.set(chatId, {
                lastMessage: meta.lastMessage || '',
                lastTimestamp: meta.lastTimestamp || 0,
              });
            }
          }
        });
        
        setChatMetas(metasMap);
      } else {
        setChatMetas(new Map());
      }
    });

    return () => {
      off(chatsRef);
    };
  }, [currentUser]);

  // Handle app state for online status
  const handleForeground = useCallback(async () => {
    if (currentUser) {
      try {
        await setUserOnlineStatus(currentUser.phone, true);
      } catch (e) {
        // Silent fail
      }
    }
  }, [currentUser]);

  const handleBackground = useCallback(async () => {
    if (currentUser) {
      try {
        await setUserOnlineStatus(currentUser.phone, false);
      } catch (e) {
        // Silent fail
      }
    }
  }, [currentUser]);

  useAppState(handleForeground, handleBackground);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleOpenChat = (user: ChatUser) => {
    router.push({
      pathname: '/conversation',
      params: { id: user.id, name: user.name, phone: user.phone }
    });
  };

  const renderUserItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      activeOpacity={0.7}
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        ) : (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, item.online ? styles.onlineDot : styles.offlineDot]} />
            <Text style={[styles.statusText, item.online ? styles.onlineText : styles.offlineText]}>
              {item.online ? 'online' : 'offline'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Build display list: exclude current user, add meta info, sort by lastTimestamp
  const displayUsers: ChatUser[] = React.useMemo(() => {
    if (!currentUser) return [];
    
    const usersList: ChatUser[] = [];
    
    users.forEach((user) => {
      // Exclude current user
      if (user.phone === currentUser.phone) return;
      
      // Get chat meta for this user
      const chatId = getChatId(currentUser.phone, user.phone);
      const meta = chatMetas.get(chatId);
      
      usersList.push({
        ...user,
        lastMessage: meta?.lastMessage,
        lastTimestamp: meta?.lastTimestamp || 0,
      });
    });
    
    // Sort by lastTimestamp descending (newest first)
    usersList.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    
    return usersList;
  }, [users, chatMetas, currentUser]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoB}>B</Text>
          <Text style={styles.logoG}>G</Text>
        </View>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {/* Chat List */}
      <FlatList
        data={displayUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    paddingTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF4CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: '#4CAF50',
  },
  offlineDot: {
    backgroundColor: '#999999',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  onlineText: {
    color: '#4CAF50',
  },
  offlineText: {
    color: '#999999',
  },
  lastMessage: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
});
