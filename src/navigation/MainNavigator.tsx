import React from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

// Import các màn hình chính
import HomeScreen from '../screens/main/HomeScreen';
import DiaryScreen from '../screens/main/DiaryScreen';
import CameraScreen from '../screens/main/CameraScreen';
import StatsScreen from '../screens/main/StatsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Import các màn hình con
import PersonalDataScreen from '../screens/main/PersonalDataScreen';
import HealthMetricsScreen from '../screens/main/HealthMetricsScreen';
import EditGoalScreen from '../screens/main/EditGoalScreen';

// 🔴 IMPORT MÀN HÌNH SCHEDULE (Lịch tập - Khảo sát)
import ScheduleScreen from '../screens/main/ScheduleScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Hàm hỗ trợ xác định khi nào cần ẩn thanh Tab Bar
 */
const getTabBarVisibility = (
  route: any,
  hideOnScreens: string[],
  defaultRoute: string,
) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? defaultRoute;

  if (hideOnScreens.includes(routeName)) {
    return 'none';
  }
  return 'flex';
};

/**
 * 🔴 CẤU HÌNH HOME STACK: Chứa Home và Schedule
 */
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
    </Stack.Navigator>
  );
}

/**
 * Cấu hình Stack cho các trang thuộc Profile
 */
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="PersonalData" component={PersonalDataScreen} />
      <Stack.Screen name="HealthMetrics" component={HealthMetricsScreen} />
      <Stack.Screen name="EditGoal" component={EditGoalScreen} />
    </Stack.Navigator>
  );
}

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#2c65e8',
        tabBarInactiveTintColor: '#8A94A6',
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({focused, color}) => {
          let iconName = '';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Diary') iconName = 'book-open';
          else if (route.name === 'Camera') iconName = 'aperture';
          else if (route.name === 'Stats') iconName = 'pie-chart';
          else if (route.name === 'Profile') iconName = 'user';

          if (route.name === 'Camera') {
            return (
              <View style={styles.cameraTabContainer}>
                <View style={styles.cameraIconBg}>
                  <Icon name={iconName} size={26} color="#ffffff" />
                </View>
              </View>
            );
          }
          return <Icon name={iconName} size={24} color={color} />;
        },
      })}>
      {/* 🔴 SỬ DỤNG HOMESTACK THAY VÌ HOMESCREEN VÀ ẨN TAB BAR KHI VÀO LỊCH TẬP */}
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({route}) => ({
          tabBarStyle: {
            ...styles.tabBar,
            display: getTabBarVisibility(route, ['Schedule'], 'HomeMain') as
              | 'flex'
              | 'none',
          },
        })}
      />

      <Tab.Screen name="Diary" component={DiaryScreen} />

      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarStyle: {display: 'none'}, // Luôn ẩn khi ở màn hình Camera
        }}
      />

      <Tab.Screen name="Stats" component={StatsScreen} />

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={({route}) => ({
          // Logic quan trọng: Tự động ẩn Tab Bar khi vào trang con của Profile
          tabBarStyle: {
            ...styles.tabBar,
            display: getTabBarVisibility(
              route,
              ['PersonalData', 'HealthMetrics', 'EditGoal'],
              'ProfileMain',
            ) as 'flex' | 'none',
          },
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: Platform.OS === 'ios' ? 88 : 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  cameraTabContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2c65e8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2c65e8',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
});

export default MainNavigator;
