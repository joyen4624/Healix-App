import React, {useEffect} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

const COLORS = {
  primary: '#2c65e8',
  white: '#ffffff',
};

const SplashScreen = ({navigation}: any) => {
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // 1. Lấy token
        const token = await AsyncStorage.getItem('userToken');

        // NẾU KHÔNG CÓ TOKEN (Đã đăng xuất hoặc chưa từng đăng nhập) -> VÀO WELCOME
        if (!token) {
          navigation.replace('Welcome');
          return;
        }

        // 2. NẾU CÓ TOKEN -> Gọi API check xem user này đã Setup profile xong chưa
        const response = await axiosClient.get('/profile/me', {
          headers: {Authorization: `Bearer ${token}`},
        });

        const userProfile = response.data.data.profile;
        const userHealth = response.data.data.health;
        const userGoal = response.data.data.goal;

        // 3. Phân luồng: Thiếu bước nào bắt làm bước đó, đủ hết thì VÀO MAIN
        if (!userProfile || !userProfile.full_name) {
          navigation.replace('ProfileSetup');
        } else if (!userHealth || !userHealth.height_cm) {
          navigation.replace('HealthProfileSetup');
        } else if (!userGoal || !userGoal.goal_type) {
          navigation.replace('GoalSetup');
        } else {
          // XONG HẾT -> VÀO MAINAPP
          navigation.replace('MainApp');
        }
      } catch (error) {
        console.error('Lỗi hoặc token hết hạn:', error);
        // Lỗi (như đổi pass, token hết hạn) -> Xóa token cũ và cho về Welcome
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        navigation.replace('Welcome');
      }
    };

    // Đợi 1 giây để user kịp nhìn thấy Logo App (Trải nghiệm mượt mà hơn)
    setTimeout(() => {
      checkLoginStatus();
    }, 1000);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Text style={styles.logoText}>HEALIX</Text>
      <ActivityIndicator
        size="large"
        color={COLORS.white}
        style={{marginTop: 20}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
  },
});

export default SplashScreen;
