import React, {useState, useEffect} from 'react';
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
  ActivityIndicator, // Thêm Loading
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// --- IMPORT CÁC THƯ VIỆN ĐỂ XỬ LÝ API VÀ GOOGLE ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import axiosClient from '../../api/axiosClient';
// ----------------------------------------

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  inputBg: '#F7F9FC',
  inputBorder: '#EDEFF2',
  white: '#ffffff',
  error: '#ff3b30',
};

const LoginScreen = ({navigation}: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSecureTextEntry, setIsSecureTextEntry] = useState(true);

  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Trạng thái loading để chặn bấm nhiều lần
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // 1. CẤU HÌNH GOOGLE SIGN-IN KHI MỞ MÀN HÌNH
  // ==========================================
  useEffect(() => {
    GoogleSignin.configure({
      // BẮT BUỘC THAY BẰNG WEB CLIENT ID CỦA BẠN (Không dùng iOS/Android Client ID)
      webClientId:
        '371613857876-ro6o3jb4luqkl75l0otf0hc0i0i19fdh.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  // ==========================================
  // 2. HÀM KIỂM TRA LUỒNG SETUP (Dùng chung)
  // ==========================================
  const checkProfileAndNavigate = async (token: string) => {
    try {
      const profileResponse = await axiosClient.get('/profile/me', {
        headers: {Authorization: `Bearer ${token}`},
      });

      const userProfile = profileResponse.data.data.profile;
      const userHealth = profileResponse.data.data.health;
      const userGoal = profileResponse.data.data.goal;

      if (!userProfile || !userProfile.full_name) {
        navigation.replace('ProfileSetup');
      } else if (!userHealth || !userHealth.height_cm) {
        navigation.replace('HealthProfileSetup');
      } else if (!userGoal || !userGoal.goal_type) {
        navigation.replace('GoalSetup');
      } else {
        navigation.replace('MainApp');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra profile:', error);
      Alert.alert(
        'Lỗi',
        'Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.',
      );
      // Xóa token nếu bị lỗi để bắt đăng nhập lại
      await AsyncStorage.removeItem('userToken');
    }
  };

  // ==========================================
  // 3. HÀM XỬ LÝ ĐĂNG NHẬP TRUYỀN THỐNG
  // ==========================================
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);
    try {
      const loginResponse = await axiosClient.post('/auth/login', {
        email: email,
        password: password,
      });

      if (loginResponse.data.success) {
        const {token, data} = loginResponse.data;
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userId', data.id);

        // Chạy hàm kiểm tra ngã ba đường
        await checkProfileAndNavigate(token);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message || 'Sai email hoặc mật khẩu';
        Alert.alert('Đăng nhập thất bại', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ. Kiểm tra lại mạng!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 4. HÀM XỬ LÝ ĐĂNG NHẬP BẰNG GOOGLE
  // ==========================================
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // 1. Kích hoạt cửa sổ chọn tài khoản Google của hệ điều hành
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        Alert.alert('Lỗi', 'Không lấy được Token từ Google. Vui lòng thử lại.');
        return;
      }

      // 2. Gửi idToken xuống Backend (Node.js) để xác thực và cấp phiên
      const response = await axiosClient.post('/auth/google', {idToken});

      if (response.data.success) {
        const {token, data} = response.data;

        // 3. Lưu JWT Token nội bộ
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userId', data.id.toString());

        // 4. Chạy hàm kiểm tra ngã ba đường (Tương tự đăng nhập thường)
        await checkProfileAndNavigate(token);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User hủy đăng nhập Google');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Đang xử lý đăng nhập Google...');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Lỗi',
          'Dịch vụ Google Play không khả dụng trên thiết bị này.',
        );
      } else {
        console.error('Lỗi Google Login:', error);
        Alert.alert(
          'Lỗi',
          'Xác thực Google thất bại. Hãy kiểm tra kết nối mạng.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: COLORS.white}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Sign in to continue taking care of your skin.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* EMAIL INPUT FIELD */}
          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputWrapper,
              isEmailFocused && styles.inputWrapperFocused,
            ]}>
            <Icon
              name="mail"
              size={20}
              color={isEmailFocused ? COLORS.primary : COLORS.textGray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputField}
              placeholder="example@domain.com"
              placeholderTextColor={COLORS.textGray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />
          </View>

          {/* PASSWORD INPUT FIELD */}
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.inputWrapper,
              isPasswordFocused && styles.inputWrapperFocused,
            ]}>
            <Icon
              name="lock"
              size={20}
              color={isPasswordFocused ? COLORS.primary : COLORS.textGray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.inputField}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textGray}
              secureTextEntry={isSecureTextEntry}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
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

          <TouchableOpacity
            style={styles.forgotPasswordBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={isLoading}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* --- PHẦN LOGIN GOOGLE --- */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.7}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#DB4437" />
            ) : (
              <FontAwesome name="google" size={24} color="#DB4437" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ... (Phần Styles của bạn giữ nguyên 100%) ...
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 10,
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
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  loginButton: {
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
  loginButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.inputBorder,
  },
  dividerText: {
    marginHorizontal: 15,
    color: COLORS.textGray,
    fontSize: 14,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  signUpText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
});

export default LoginScreen;
