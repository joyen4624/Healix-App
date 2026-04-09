import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
// Import thêm màn hình mới
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import HealthProfileSetupScreen from '../screens/auth/HealthProfileSetupScreen';
import GoalSetupScreen from '../screens/auth/GoalSetupScreen';
import MainNavigator from './MainNavigator';
import ScanResultScreen from '../screens/main/ScanResultScreen';
import ExerciseDetailScreen from '../screens/main/ExerciseDetailScreen';
import WorkoutCameraScreen from '../screens/main/WorkoutCameraScreen';
import ExerciseListScreen from '../screens/main/ExerciseListScreen';
import NutritionScreen from '../screens/main/NutritionScreen';
import BadgesScreen from '../screens/main/BadgesScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import RankUpScreen from '../screens/main/RankUpScreen';
import ChallengesScreen from '../screens/main/ChallengesScreen';
import AICoachScreen from '../screens/main/AICoachScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      // 1. Đổi dòng này thành "Splash" để màn hình chờ hiện lên đầu tiên
      initialRouteName="Splash"
      screenOptions={{headerShown: false}}>
      {/* 2. Khai báo màn hình Splash vào danh sách */}
      <Stack.Screen name="Splash" component={SplashScreen} />

      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

      {/* Khai báo màn hình Profile Setup */}
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen
        name="HealthProfileSetup"
        component={HealthProfileSetupScreen}
      />
      <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />

      <Stack.Screen name="MainApp" component={MainNavigator} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="ExerciseList" component={ExerciseListScreen} />
      <Stack.Screen
        name="WorkoutCamera"
        component={WorkoutCameraScreen}
        options={{gestureEnabled: false}} // Chặn vuốt để thoát khi đang tập
      />

      <Stack.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{headerShown: false}} // Ẩn header mặc định để dùng header custom
      />

      <Stack.Screen
        name="Badges"
        component={BadgesScreen}
        options={{headerShown: false}}
      />

      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="RankUp"
        component={RankUpScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
      <Stack.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
      <Stack.Screen
        name="AICoach"
        component={AICoachScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
