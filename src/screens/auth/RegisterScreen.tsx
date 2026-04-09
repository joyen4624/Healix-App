import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// --- THÊM 3 DÒNG IMPORT NÀY ĐỂ GỌI API & LƯU TOKEN ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import axiosClient from '../../api/axiosClient';
// -----------------------------------------------------

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  inputBg: '#F7F9FC',
  inputBorder: '#EDEFF2',
  white: '#ffffff',
};

const RegisterScreen = ({navigation}: any) => {
  // Chỉ giữ lại Email và Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Thêm xác nhận mật khẩu cho chuẩn đăng ký

  const [isSecureTextEntry, setIsSecureTextEntry] = useState(true);
  const [isConfirmSecureTextEntry, setIsConfirmSecureTextEntry] =
    useState(true);

  // States quản lý hiệu ứng viền xanh (focus)
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // --- HÀM XỬ LÝ ĐĂNG KÝ ĐÃ ĐƯỢC TÍCH HỢP API ---
  const handleRegister = async () => {
    // 1. Kiểm tra rỗng
    if (!email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    // 2. Kiểm tra mật khẩu khớp nhau
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      // 3. Gọi API POST tới backend
      const response = await axiosClient.post('/auth/register', {
        email: email,
        password: password,
        confirm_password: confirmPassword,
      });

      // 4. Xử lý khi Backend trả về thành công (201)
      if (response.data.success) {
        const {token, data} = response.data;

        // Lưu Token và userId vào bộ nhớ đệm điện thoại
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userId', data.id);

        Alert.alert(
          'Thành công',
          'Đăng ký thành công! Chuyển sang bước thiết lập...',
        );

        // Chuyển hướng sang trang Thiết lập sau khi có token
        navigation.navigate('ProfileSetup');
      }
    } catch (error: any) {
      // 5. Xử lý lỗi từ Backend (ví dụ: Trùng email, mật khẩu không khớp)
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.';
        Alert.alert('Đăng ký thất bại', errorMsg);
      } else {
        Alert.alert(
          'Lỗi',
          'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!',
        );
      }
    }
  };
  // ----------------------------------------------

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: COLORS.white}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Enter your email and password to get started.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* EMAIL */}
          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'email' && styles.inputWrapperFocused,
            ]}>
            <Icon
              name="mail"
              size={20}
              color={
                focusedInput === 'email' ? COLORS.primary : COLORS.textGray
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputField}
              placeholder="example@domain.com"
              placeholderTextColor={COLORS.textGray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'password' && styles.inputWrapperFocused,
            ]}>
            <Icon
              name="lock"
              size={20}
              color={
                focusedInput === 'password' ? COLORS.primary : COLORS.textGray
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputField}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textGray}
              secureTextEntry={isSecureTextEntry}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity
              onPress={() => setIsSecureTextEntry(!isSecureTextEntry)}
              style={styles.eyeIconBtn}>
              <Icon
                name={isSecureTextEntry ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textGray}
              />
            </TouchableOpacity>
          </View>

          {/* CONFIRM PASSWORD */}
          <Text style={styles.label}>Confirm Password</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'confirm' && styles.inputWrapperFocused,
            ]}>
            <Icon
              name="check-circle"
              size={20}
              color={
                focusedInput === 'confirm' ? COLORS.primary : COLORS.textGray
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputField}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textGray}
              secureTextEntry={isConfirmSecureTextEntry}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedInput('confirm')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity
              onPress={() =>
                setIsConfirmSecureTextEntry(!isConfirmSecureTextEntry)
              }
              style={styles.eyeIconBtn}>
              <Icon
                name={isConfirmSecureTextEntry ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textGray}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </Text>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            activeOpacity={0.8}>
            <Text style={styles.registerButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: 'center', // Canh giữa form khi ít dữ liệu
  },
  headerContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textGray,
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  eyeIconBtn: {
    padding: 8,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  loginText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
});

export default RegisterScreen;
