import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import axiosClient from '../../api/axiosClient';
import axios from 'axios';

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  inputBg: '#F7F9FC',
  inputBorder: '#EDEFF2',
  white: '#ffffff',
  error: '#FF453A',
  success: '#34C759',
};

const ForgotPasswordScreen = ({navigation}: any) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- STATE VÀ REF CHO OTP 6 Ô ---
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef<Array<TextInput | null>>([]);

  const [isSecure, setIsSecure] = useState(true);
  const [isConfirmSecure, setIsConfirmSecure] = useState(true);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // ==========================================
  // HÀM BƯỚC 1: GỬI EMAIL LẤY MÃ OTP
  // ==========================================
  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post('/auth/forgot-password', {email});
      if (response.data.success) {
        Alert.alert(
          'Thành công',
          'Mã xác nhận 6 số đã được gửi vào Email của bạn!',
        );
        setStep(2);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message || 'Không tìm thấy tài khoản.';
        Alert.alert('Lỗi', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // XỬ LÝ NHẬP OTP 6 Ô (Gõ, Xóa, Paste)
  // ==========================================
  const handleOtpChange = (value: string, index: number) => {
    // 1. Nếu dán (paste) 6 số cùng lúc vào 1 ô
    if (value.length > 1) {
      const pastedOTP = value.substring(0, 6).split('');
      const newOtpArray = [...otpArray];
      pastedOTP.forEach((char, i) => {
        if (index + i < 6) newOtpArray[index + i] = char;
      });
      setOtpArray(newOtpArray);

      // Focus vào ô cuối cùng vừa dán
      const lastFilledIndex = Math.min(index + pastedOTP.length - 1, 5);
      otpInputs.current[lastFilledIndex]?.focus();
      return;
    }

    // 2. Nhập từng số bình thường
    const newOtpArray = [...otpArray];
    newOtpArray[index] = value;
    setOtpArray(newOtpArray);

    // Tự động nhảy sang ô tiếp theo nếu có nhập
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    // Tự động lùi về ô trước nếu nhấn nút xóa (Backspace) ở ô rỗng
    if (e.nativeEvent.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();

      // Xóa luôn dữ liệu ở ô trước đó cho mượt
      const newOtpArray = [...otpArray];
      newOtpArray[index - 1] = '';
      setOtpArray(newOtpArray);
    }
  };

  const handleVerifyCode = () => {
    const fullOtp = otpArray.join('');
    if (fullOtp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 số OTP.');
      return;
    }
    setStep(3);
  };

  // ==========================================
  // HÀM BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI
  // ==========================================
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsLoading(true);
    const fullOtp = otpArray.join('');
    try {
      const response = await axiosClient.post('/auth/reset-password', {
        email: email,
        code: fullOtp,
        newPassword: newPassword,
      });

      if (response.data.success) {
        Alert.alert(
          'Tuyệt vời!',
          'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
          [
            {
              text: 'Đăng nhập ngay',
              onPress: () => navigation.replace('Login'),
            },
          ],
        );
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message ||
          'Lỗi đổi mật khẩu. OTP có thể đã hết hạn.';
        Alert.alert('Lỗi', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.white}}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        {/* HEADER CÓ NÚT BACK */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {step === 1
              ? 'Khôi phục mật khẩu'
              : step === 2
              ? 'Xác thực OTP'
              : 'Tạo mật khẩu mới'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Nhập email bạn đã dùng để đăng ký tài khoản. Chúng tôi sẽ gửi mã khôi phục cho bạn.'
              : step === 2
              ? `Vui lòng kiểm tra hộp thư đến. Nhập mã 6 số chúng tôi vừa gửi đến ${email}`
              : 'Mật khẩu mới phải dài ít nhất 6 ký tự và khác với mật khẩu cũ của bạn.'}
          </Text>

          <View style={styles.formContainer}>
            {/* ================= BƯỚC 1: EMAIL ================= */}
            {step === 1 && (
              <View>
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
                      focusedInput === 'email'
                        ? COLORS.primary
                        : COLORS.textGray
                    }
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
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSendCode}
                  disabled={isLoading}
                  activeOpacity={0.8}>
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Gửi Mã Xác Nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= BƯỚC 2: MÃ OTP 6 Ô ================= */}
            {step === 2 && (
              <View>
                <Text style={styles.label}>Mã OTP (6 số)</Text>

                {/* VÙNG NHẬP 6 Ô */}
                <View style={styles.otpContainer}>
                  {otpArray.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => (otpInputs.current[index] = ref)}
                      style={[
                        styles.otpBox,
                        focusedInput === `otp${index}` && styles.otpBoxFocused,
                        digit !== '' && styles.otpBoxFilled, // Đổi màu khi có chữ
                      ]}
                      keyboardType="number-pad"
                      maxLength={6} // Cho phép paste dài
                      value={digit}
                      onChangeText={val => handleOtpChange(val, index)}
                      onKeyPress={e => handleOtpKeyPress(e, index)}
                      onFocus={() => setFocusedInput(`otp${index}`)}
                      onBlur={() => setFocusedInput(null)}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleVerifyCode}
                  activeOpacity={0.8}>
                  <Text style={styles.buttonText}>Tiếp tục</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleSendCode}
                  disabled={isLoading}>
                  <Text style={styles.resendText}>
                    Bạn chưa nhận được mã?{' '}
                    <Text style={styles.resendTextHighlight}>Gửi lại</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= BƯỚC 3: MẬT KHẨU MỚI ================= */}
            {step === 3 && (
              <View>
                <Text style={styles.label}>Mật khẩu mới</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'newPass' && styles.inputWrapperFocused,
                  ]}>
                  <Icon
                    name="lock"
                    size={20}
                    color={
                      focusedInput === 'newPass'
                        ? COLORS.primary
                        : COLORS.textGray
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textGray}
                    secureTextEntry={isSecure}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedInput('newPass')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setIsSecure(!isSecure)}
                    style={styles.eyeBtn}>
                    <Icon
                      name={isSecure ? 'eye-off' : 'eye'}
                      size={20}
                      color={COLORS.textGray}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Xác nhận mật khẩu</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'confirmPass' &&
                      styles.inputWrapperFocused,
                  ]}>
                  <Icon
                    name="check-circle"
                    size={20}
                    color={
                      focusedInput === 'confirmPass'
                        ? COLORS.primary
                        : COLORS.textGray
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textGray}
                    secureTextEntry={isConfirmSecure}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedInput('confirmPass')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setIsConfirmSecure(!isConfirmSecure)}
                    style={styles.eyeBtn}>
                    <Icon
                      name={isConfirmSecure ? 'eye-off' : 'eye'}
                      size={20}
                      color={COLORS.textGray}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.8}>
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textGray,
    lineHeight: 22,
    marginBottom: 35,
  },
  formContainer: {
    marginTop: 10,
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
  eyeBtn: {
    padding: 8,
  },

  // --- CSS CHO 6 Ô OTP ---
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 10,
  },
  otpBox: {
    width: 48,
    height: 58,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  otpBoxFilled: {
    backgroundColor: COLORS.white,
    borderColor: '#d0daf5', // Đổi màu nhẹ khi đã nhập chữ
  },
  // ------------------------

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  resendBtn: {
    marginTop: 25,
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  resendTextHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
