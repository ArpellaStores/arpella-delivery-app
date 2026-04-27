import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { useSendOtpMutation, useResetPasswordMutation } from '../redux/api/authApi';

export default function ForgotPasswordModal({ visible, onClose }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('254');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

  const handleClose = () => {
    setStep(1);
    setPhone('254');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handlePhoneChange = (text) => {
    let cleaned = text.replace(/\D/g, '');
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned.replace(/^254/, '').replace(/^0+/, '');
    }
    if (cleaned.length > 12) {
      cleaned = cleaned.slice(0, 12);
    }
    setPhone(cleaned);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 12) {
      toast.show('Please enter a valid 12-digit phone number (e.g. 254712345678)', { type: 'danger' });
      return;
    }
    try {
      await sendOtp({ username: phone }).unwrap();
      toast.show('OTP sent to your phone', { type: 'success' });
      setStep(2);
    } catch (err) {
      toast.show(err?.data?.message || err?.message || 'Failed to send OTP', { type: 'danger' });
    }
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length < 4) {
      toast.show('Please enter a valid OTP', { type: 'danger' });
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast.show('Passwords do not match', { type: 'danger' });
      return;
    }
    const pwdRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!pwdRegex.test(password)) {
      toast.show('Password must be at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character.', { type: 'danger', duration: 4000 });
      return;
    }

    try {
      await resetPassword({ otp, phoneNumber: phone, password }).unwrap();
      toast.show('Password reset successful!', { type: 'success' });
      handleClose();
    } catch (err) {
      toast.show(err?.data?.message || err?.message || 'Failed to reset password', { type: 'danger' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Reset Password</Text>

          {step === 1 && (
            <>
              <Text style={styles.modalSubtitle}>Enter your phone number to receive an OTP.</Text>
              <TextInput
                style={styles.input}
                placeholder="2547XXXXXXXX"
                keyboardType="numeric"
                value={phone}
                onChangeText={handlePhoneChange}
                editable={!isSendingOtp}
              />
              <TouchableOpacity
                style={[styles.button, isSendingOtp && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isSendingOtp}
              >
                {isSendingOtp ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.modalSubtitle}>Enter the OTP sent to {phone}.</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                keyboardType="numeric"
                value={otp}
                onChangeText={setOtp}
              />
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                <Text style={styles.buttonText}>Verify OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resendButton} onPress={handleSendOtp}>
                <Text style={styles.resendButtonText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.modalSubtitle}>Create a new password.</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isResettingPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8B7355" />
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm New Password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isResettingPassword}
                />
              </View>
              <TouchableOpacity
                style={[styles.button, isResettingPassword && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B2C20',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#4B2C20',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#8B7355',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 15,
  },
  resendButtonText: {
    color: '#4B2C20',
    fontSize: 14,
    fontWeight: '600',
  },
});
