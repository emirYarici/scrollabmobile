import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthStart?: () => void;
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
}

export function AuthScreen({ onAuthStart, onAuthSuccess, onAuthError }: AuthScreenProps) {
  const insets = useSafeAreaInsets();

  // Apple Sign-In state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email/Password state
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Bottom sheet ref & snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['60%', '85%'];

  const openEmailSheet = useCallback(() => {
    Keyboard.dismiss();
    setEmailError(null);
    setEmailSuccess(null);
    setEmail('');
    setPassword('');
    setEmailMode('signin');
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const closeEmailSheet = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.close();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // ── Apple Sign-In ──────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      setErrorMsg(null);
      setLoading(true);
      setStatusMessage('Contacting Apple secure nodes...');
      if (onAuthStart) onAuthStart();

      if (Platform.OS !== 'ios') {
        throw new Error('Native Apple Authentication is only supported on iOS in this build.');
      }

      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState !== appleAuth.State.AUTHORIZED) {
        throw new Error('Apple Sign-In authorization was not approved.');
      }

      const { identityToken, nonce } = appleAuthRequestResponse;

      if (!identityToken) {
        throw new Error('Apple Secure token was not returned.');
      }

      setStatusMessage('Validating session keys with Supabase...');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: nonce || undefined,
      });

      if (error) throw error;

      setStatusMessage('Welcome to Scrollab!');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      if (err?.code === '1001' || err?.message?.includes('canceled') || err?.message?.includes('1001')) {
        console.log('Apple Sign-In cancelled by user.');
        setErrorMsg('Authentication cancelled. Tap below to try again.');
      } else {
        const message = err?.message || 'An unexpected error occurred during Apple Sign-In.';
        console.error('Apple Sign-In Error:', err);
        setErrorMsg(message);
        if (onAuthError) onAuthError(message);
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // ── Email / Password ───────────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setEmailError('Please enter both your email and password.');
      return;
    }

    try {
      setEmailError(null);
      setEmailSuccess(null);
      setEmailLoading(true);
      Keyboard.dismiss();

      if (emailMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        closeEmailSheet();
        if (onAuthSuccess) onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setEmailSuccess('Account created! Check your inbox to confirm your email before signing in.');
      }
    } catch (err: any) {
      const message = err?.message || 'Authentication failed. Please try again.';
      setEmailError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + theme.spacing.xxl, paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
      >
        {/* ── Editorial Header ── */}
        <View style={styles.header}>
          <View style={styles.eyebrowContainer}>
            <Text style={styles.eyebrow}>Scrollab Mobile Studio</Text>
          </View>
          <Text style={styles.brandTitle}>SCROLLAB</Text>
          <Text style={styles.brandSubtitle}>Narrative AI Video Scriptwriter</Text>
        </View>

        {/* ── Narrative Card ── */}
        <View style={[styles.card, theme.shadows.raised]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardEyebrow}>PROLOGUE</Text>
            <View style={styles.decorativeRule} />
          </View>

          <Text style={styles.cardTitle}>Unlock Your Visual Story</Text>
          <Text style={styles.cardDescription}>
            Connect with Scrollab's core generator to compose viral hooks, chaptered scene directions, and refine them via natural chat.
          </Text>

          <View style={styles.featureList}>
            {[
              {
                title: 'Editorial Hook Pacing',
                text: 'Evaluate strategic hook lines designed to stop the scroll.',
              },
              {
                title: 'Full Storyboard Direction',
                text: 'Structured visual directions, exact overlays, and custom audio vibes.',
              },
              {
                title: 'Live Streaming Engine',
                text: 'Observe the generator write scene structures word-by-word with SSE.',
              },
            ].map((f) => (
              <View key={f.title} style={styles.featureRow}>
                <View style={styles.featureDotOuter}>
                  <View style={styles.featureDot} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsContainer}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} style={styles.spinner} />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : (
            <>
              {/* Apple Sign In */}
              <TouchableOpacity
                style={[styles.appleButton, theme.shadows.ring]}
                onPress={handleAppleSignIn}
                activeOpacity={0.9}
              >
                <Text style={styles.appleIconSymbol}></Text>
                <Text style={styles.appleButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email / Password trigger */}
              <TouchableOpacity
                style={[styles.emailButton, theme.shadows.ring]}
                onPress={openEmailSheet}
                activeOpacity={0.85}
              >
                <Text style={styles.emailButtonIcon}>✉️</Text>
                <Text style={styles.emailButtonText}>Continue with Email</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.footerText}>
            Chaptered user accounts secured securely via Apple ID &amp; Supabase credentials.{'\n'}
            Read our Terms of Use and Privacy Guidelines.
          </Text>
        </View>
      </View>

      {/* ── Gorhom Bottom Sheet ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
          {/* Sheet Header */}
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>
                {emailMode === 'signin' ? 'Sign in to Scrollab' : 'Create your account'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {emailMode === 'signin'
                  ? 'Enter your credentials to access your studio.'
                  : 'Pick a strong password for your new account.'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeEmailSheet} style={styles.sheetCloseBtn} activeOpacity={0.7}>
              <Text style={styles.sheetCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Toggle Pills */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, emailMode === 'signin' && styles.modeToggleBtnActive]}
              onPress={() => { setEmailError(null); setEmailSuccess(null); setEmailMode('signin'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeToggleText, emailMode === 'signin' && styles.modeToggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, emailMode === 'signup' && styles.modeToggleBtnActive]}
              onPress={() => { setEmailError(null); setEmailSuccess(null); setEmailMode('signup'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeToggleText, emailMode === 'signup' && styles.modeToggleTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <BottomSheetTextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <BottomSheetTextInput
                style={styles.textInput}
                placeholder={emailMode === 'signup' ? 'Choose a password' : 'Your password'}
                placeholderTextColor={theme.colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleEmailAuth}
              />
            </View>
          </View>

          {/* Error / Success Feedback */}
          {emailError && (
            <View style={styles.sheetErrorBox}>
              <Text style={styles.sheetErrorText}>{emailError}</Text>
            </View>
          )}
          {emailSuccess && (
            <View style={styles.sheetSuccessBox}>
              <Text style={styles.sheetSuccessText}>{emailSuccess}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, emailLoading && styles.submitBtnDisabled]}
            onPress={handleEmailAuth}
            disabled={emailLoading}
            activeOpacity={0.85}
          >
            {emailLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {emailMode === 'signin' ? 'Sign In →' : 'Create Account →'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.sheetFooter}>
            Your data is stored securely via Supabase and never shared.
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  eyebrowContainer: {
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  eyebrow: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.fg,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.fg2,
    marginTop: theme.spacing.xs,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardEyebrow: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.5,
  },
  decorativeRule: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderSoft,
  },
  cardTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
    marginBottom: theme.spacing.sm,
  },
  cardDescription: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.base,
    lineHeight: 25,
    color: theme.colors.fg2,
    marginBottom: theme.spacing.xxl,
  },
  featureList: {
    gap: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  featureDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.surfaceWarm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  featureText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Actions ─────────────────────────────────────────────────────────────────
  actionsContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  errorBox: {
    backgroundColor: 'rgba(179, 58, 58, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fg,
    height: 52,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xxl,
  },
  appleIconSymbol: {
    fontSize: 22,
    color: theme.colors.accentOn,
    marginRight: theme.spacing.sm,
    marginBottom: 4,
  },
  appleButtonText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentOn,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    height: 52,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xxl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  emailButtonIcon: {
    fontSize: 18,
  },
  emailButtonText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: theme.spacing.xs,
  },
  spinner: {
    marginBottom: 4,
  },
  statusText: {
    fontFamily: theme.typography.fonts.mono,
    color: theme.colors.accent,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  footerText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.muted,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
    lineHeight: 17,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────────
  sheetBackground: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    backgroundColor: theme.colors.border,
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  sheetTitle: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.fg,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.fg2,
    maxWidth: 240,
    lineHeight: 17,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  sheetCloseBtnText: {
    fontSize: 13,
    color: theme.colors.fg2,
    fontWeight: theme.typography.weights.bold,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
    marginBottom: theme.spacing.xl,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.sm - 2,
    alignItems: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.fg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  modeToggleText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.muted,
  },
  modeToggleTextActive: {
    color: theme.colors.fg,
    fontWeight: theme.typography.weights.bold,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontFamily: theme.typography.fonts.mono,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.muted,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  inputWrapper: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    height: 50,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.fg,
    height: '100%',
  },
  sheetErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sheetErrorText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 17,
    fontWeight: theme.typography.weights.medium,
  },
  sheetSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sheetSuccessText: {
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.success,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 17,
    fontWeight: theme.typography.weights.medium,
  },
  submitBtn: {
    backgroundColor: theme.colors.accent,
    height: 52,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: theme.typography.fonts.display,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  sheetFooter: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
