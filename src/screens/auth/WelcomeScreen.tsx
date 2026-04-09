import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const COLORS = {
  primary: '#2c65e8', // Màu xanh dương đậm (nút Log In)
  secondary: '#dce5fc', // Màu xanh dương nhạt (nút Sign Up)
  textGray: '#8A94A6',
  white: '#ffffff',
};

const WelcomeScreen = ({navigation}: any) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* PHẦN TRÊN: Logo và Text giới thiệu */}
      <View style={styles.logoContainer}>
        {/* Thay đường dẫn ảnh của bạn vào đây */}
        <Image
          source={require('../../../assets/images/healix-logo.png')}
          style={styles.logo}
        />

        <Text style={styles.description}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </Text>
      </View>

      {/* PHẦN DƯỚI: 2 Nút bấm */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => {
            console.log('Đã nhận lệnh bấm nút Login!'); // Thêm dòng này
            navigation.navigate('Login');
          }}
          activeOpacity={0.8}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  logoContainer: {
    flex: 1, // Chiếm toàn bộ khoảng trống phía trên để đẩy nút xuống dưới
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  description: {
    textAlign: 'center',
    color: COLORS.textGray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40, // Cách cạnh dưới màn hình một khoảng
    gap: 15, // Tạo khoảng cách giữa 2 nút (Dùng tốt trên React Native mới)
  },
  button: {
    width: '100%',
    height: 55,
    borderRadius: 30, // Bo góc tròn hoàn toàn (Pill shape)
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    // Hiệu ứng đổ bóng nhẹ cho nút Log In
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpButton: {
    backgroundColor: COLORS.secondary,
  },
  signUpButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
