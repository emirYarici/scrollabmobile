/**
 * Scrollab Mobile Application Entry Point
 * 
 * Manages Supabase Auth session routing and integrates
 * the official Storytelling Design System theme parameters.
 */

import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/components/AuthScreen';
import { DashboardScreen } from './src/components/DashboardScreen';
import { theme } from './src/lib/theme';

function App(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 1. Fetch the active persistent session on startup
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setInitializing(false);
    }).catch((err) => {
      console.error('Error fetching persistent session:', err);
      setInitializing(false);
    });

    // 2. Subscribe to Supabase Authentication state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content" // Dark icons and text work beautifully over the clean premium slate bg
        backgroundColor={theme.colors.bg}
        translucent
      />
      <View style={styles.container}>
        {initializing ? (
          <View style={styles.splashContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </View>
        ) : session ? (
          <DashboardScreen userEmail={session.user.email} userId={session.user.id} />
        ) : (
          <AuthScreen />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
});

export default App;
