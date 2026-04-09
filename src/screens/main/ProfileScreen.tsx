import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import axiosClient from '../../api/axiosClient';
import i18n from '../../i18n/i18n';
import {useTranslation} from 'react-i18next';

const COLORS = {
  primary: '#2c65e8',
  primaryLight: '#EEF2FF', // Thêm màu nền nhạt
  secondary: '#0a235c',
  textGray: '#8A94A6',
  textLight: '#94A3B8', // Thêm màu text nhạt
  white: '#ffffff',
  bg: '#F4F7FC',
  border: '#EDEFF2',
  error: '#FF453A',
  warning: '#FF9F0A',
  success: '#34C759',
};

// ==========================================
// COMPONENT HIỆU ỨNG TRƯỢT MỜ (REUSABLE)
// ==========================================
const AnimatedFadeSlide = ({children, delay = 0, style}: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
      ]}>
      {children}
    </Animated.View>
  );
};

// ==========================================
// COMPONENT HIỆU ỨNG NẢY (SPRING)
// ==========================================
const AnimatedSpring = ({children, delay = 0}: any) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{scale: scaleAnim}],
        width: '31%',
      }}>
      {children}
    </Animated.View>
  );
};

const ProfileScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [lang, setLang] = useState<string>(i18n.language || 'vi');

  // Animation values cho Scroll Parallax
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });

  const avatarOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ==========================================
  // 1. GỌI API LẤY DỮ LIỆU KHI VÀO MÀN HÌNH
  // ==========================================
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, []),
  );

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        return;
      }

      const response = await axiosClient.get('/profile/me');

      if (response.data.success) {
        setUserData(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi tải Profile:', error);
      Alert.alert(
        t('profileScreen.alerts.load_error_title'),
        t('profileScreen.alerts.load_error_message'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatarToServer = async (asset: {
    uri?: string;
    type?: string;
    fileName?: string | null;
  }) => {
    if (!asset.uri) {
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
      } as any);

      const res = await axiosClient.post('/profile/avatar', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });

      if (res.data.success && res.data.data?.avatar_url) {
        setUserData((prev: any) => ({
          ...prev,
          profile: {
            ...(prev?.profile || {}),
            avatar_url: res.data.data.avatar_url,
          },
        }));
        Alert.alert(
          t('profileScreen.alerts.avatar_success_title'),
          t('profileScreen.alerts.avatar_success_message'),
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('profileScreen.alerts.avatar_upload_error_fallback');
      Alert.alert(t('profileScreen.alerts.load_error_title'), String(msg));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleEditAvatar = () => {
    Alert.alert(
      t('profileScreen.alerts.avatar_picker_title'),
      t('profileScreen.alerts.avatar_picker_message'),
      [
      {text: t('profileScreen.alerts.cancel'), style: 'cancel'},
      {
        text: t('profileScreen.alerts.choose_photo'),
        onPress: async () => {
          const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 1600,
            maxHeight: 1600,
            selectionLimit: 1,
          });
          if (result.didCancel || result.errorCode || !result.assets?.[0]) {
            return;
          }
          await uploadAvatarToServer(result.assets[0]);
        },
      },
    ],
    );
  };

  useEffect(() => {
    const syncFromI18n = (lng?: string) => {
      setLang(lng === 'en' || lng === 'vi' ? lng : 'vi');
    };

    // Sync ngay lúc mount (trường hợp i18n init đọc từ storage chậm)
    syncFromI18n(i18n.language);

    const handler = (lng: string) => syncFromI18n(lng);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  const toggleLanguage = async () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    try {
      await AsyncStorage.setItem('appLanguage', nextLang);
    } catch (e) {
      // Nếu storage lỗi thì vẫn chuyển ngôn ngữ theo phiên hiện tại
    }
    i18n.changeLanguage(nextLang);
    setLang(nextLang);
  };

  // ==========================================
  // 2. HÀM ĐĂNG XUẤT
  // ==========================================
  const handleLogout = () => {
    Alert.alert(
      t('profileScreen.alerts.logout_title'),
      t('profileScreen.alerts.logout_message'),
      [
      {text: t('profileScreen.alerts.cancel'), style: 'cancel'},
      {
        text: t('profileScreen.alerts.logout_confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userId');
            navigation.replace('Welcome');
          } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
          }
        },
      },
    ],
    );
  };

  // ==========================================
  // 3. CÁC HÀM FORMAT DỮ LIỆU
  // ==========================================
  const getBMIStatusText = (bmi: number) => {
    if (!bmi) {
      return t('profileScreen.bmi.na');
    }
    if (bmi < 18.5) {
      return t('profileScreen.bmi.underweight');
    }
    if (bmi >= 18.5 && bmi <= 24.9) {
      return t('profileScreen.bmi.normal');
    }
    if (bmi >= 25 && bmi <= 29.9) {
      return t('profileScreen.bmi.overweight');
    }
    return t('profileScreen.bmi.obese');
  };

  const getBMIStatusColor = (bmi: number) => {
    if (!bmi) return COLORS.textGray;
    if (bmi >= 18.5 && bmi <= 24.9) return COLORS.success;
    if (bmi < 18.5 || (bmi >= 25 && bmi <= 29.9)) return COLORS.warning;
    return COLORS.error;
  };

  const formatGoalText = (goalType: string) => {
    if (!goalType) {
      return t('profileScreen.goals.not_set');
    }
    const key = `profileScreen.goals.${goalType}`;
    const translated = t(key);
    return translated === key ? t('profileScreen.goals.not_set') : translated;
  };

  // Component Menu Item
  const MenuItem = ({
    icon,
    title,
    value,
    color = COLORS.secondary,
    onPress,
  }: any) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.menuLeft}>
        <View style={[styles.iconBg, {backgroundColor: color + '15'}]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text
          style={[
            styles.menuTitle,
            color === COLORS.error && {color: COLORS.error},
          ]}>
          {title}
        </Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Icon
          name="chevron-right"
          size={20}
          color={COLORS.border}
          style={{marginLeft: 4}}
        />
      </View>
    </TouchableOpacity>
  );

  // GIAO DIỆN LOADING
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{marginTop: 10, color: COLORS.textGray, fontWeight: '600'}}>
          {t('profileScreen.loading')}
        </Text>
      </View>
    );
  }

  const profile = userData?.profile || {};
  const health = userData?.health || {};
  const goal = userData?.goal || {};

  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${
      profile.full_name || t('profileScreen.user_fallback')
    }&background=2c65e8&color=fff`;
  const bmiNumber = health.bmi || 0;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* NICKNAME HEADER CHÌM (Hiện lên khi cuộn) */}
      <Animated.View style={[styles.stickyHeader, {opacity: headerOpacity}]}>
        <View style={styles.stickyHeaderRow}>
          <Text style={styles.stickyHeaderTitle}>
            {profile.full_name || t('profileScreen.sticky_title_fallback')}
          </Text>
          <TouchableOpacity
            style={styles.langToggleBtn}
            onPress={toggleLanguage}
            activeOpacity={0.85}>
            <Text style={styles.langToggleText}>
              {lang === 'vi' ? 'VI' : 'EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {
            useNativeDriver: true,
          },
        )}
        scrollEventThrottle={16}>
        {/* AVATAR & INFO (Có hiệu ứng Parallax) */}
        <View style={styles.profileHeader}>
          <Animated.View
            style={[
              styles.avatarWrapper,
              {transform: [{scale: avatarScale}], opacity: avatarOpacity},
            ]}>
            <Image source={{uri: avatarUrl}} style={styles.avatar} />
            <TouchableOpacity
              style={styles.editAvatarBtn}
              activeOpacity={0.9}
              onPress={handleEditAvatar}
              disabled={avatarUploading}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Icon name="edit-2" size={14} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{alignItems: 'center', opacity: avatarOpacity}}>
            <Text style={styles.userName}>
              {profile.full_name || t('profileScreen.user_fallback')}
            </Text>
            <Text style={styles.userEmail}>
              {profile.email || t('profileScreen.email_fallback')}
            </Text>
          </Animated.View>
        </View>

        {/* HEALTH CARDS (Hiệu ứng Nảy lên) */}
        <View style={styles.statsRow}>
          <AnimatedSpring delay={100}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {t('profileScreen.bmi.label')}
              </Text>
              <Text style={styles.statValue}>
                {bmiNumber ? bmiNumber : '--'}
              </Text>
              <Text
                style={[
                  styles.statStatus,
                  {color: getBMIStatusColor(bmiNumber)},
                ]}>
                {getBMIStatusText(bmiNumber)}
              </Text>
            </View>
          </AnimatedSpring>

          <AnimatedSpring delay={200}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {t('profileScreen.stats.height')}
              </Text>
              <Text style={styles.statValue}>
                {health.height_cm ? `${health.height_cm} ` : '--'}
                {health.height_cm && (
                  <Text style={styles.unitText}>
                    {t('profileScreen.stats.unit_cm')}
                  </Text>
                )}
              </Text>
              <Text style={styles.statStatusNormal}>
                {t('profileScreen.stats.current')}
              </Text>
            </View>
          </AnimatedSpring>

          <AnimatedSpring delay={300}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {t('profileScreen.stats.weight')}
              </Text>
              <Text style={styles.statValue}>
                {health.weight_kg ? `${health.weight_kg} ` : '--'}
                {health.weight_kg && (
                  <Text style={styles.unitText}>
                    {t('profileScreen.stats.unit_kg')}
                  </Text>
                )}
              </Text>
              <Text style={styles.statStatusNormal}>
                {t('profileScreen.stats.current')}
              </Text>
            </View>
          </AnimatedSpring>
        </View>

        {/* ACCOUNT SETTINGS */}
        <View style={styles.section}>
          <AnimatedFadeSlide delay={400}>
            <Text style={styles.sectionTitle}>
              {t('profileScreen.sections.account')}
            </Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="award"
                title={t('profileScreen.menu.badges')}
                color={COLORS.warning}
                onPress={() => navigation.navigate('Badges')}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="user"
                title={t('profileScreen.menu.personal_data')}
                onPress={() => navigation.navigate('PersonalData')}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="target"
                title={t('profileScreen.menu.my_goal')}
                value={formatGoalText(goal.goal_type)}
                onPress={() => navigation.navigate('EditGoal')}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="activity"
                title={t('profileScreen.menu.health_metrics')}
                onPress={() => navigation.navigate('HealthMetrics')}
              />
            </View>
          </AnimatedFadeSlide>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <AnimatedFadeSlide delay={500}>
            <Text style={styles.sectionTitle}>
              {t('profileScreen.sections.preferences')}
            </Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="bell"
                title={t('profileScreen.menu.notifications')}
                onPress={() => {}}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="shield"
                title={t('profileScreen.menu.privacy')}
                onPress={() => {}}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="help-circle"
                title={t('profileScreen.menu.help')}
                onPress={() => {}}
              />
            </View>
          </AnimatedFadeSlide>
        </View>

        {/* LOGOUT */}
        <View style={styles.section}>
          <AnimatedFadeSlide delay={600}>
            <View style={[styles.menuCard, {marginTop: 10}]}>
              <MenuItem
                icon="log-out"
                title={t('profileScreen.menu.sign_out')}
                color={COLORS.error}
                onPress={handleLogout}
              />
            </View>
          </AnimatedFadeSlide>
        </View>

        <Text style={styles.versionText}>{t('profileScreen.version')}</Text>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},

  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop:
      Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 100,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  stickyHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  stickyHeaderRow: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langToggleBtn: {
    backgroundColor: 'rgba(44, 101, 232, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(44, 101, 232, 0.35)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.secondary,
  },

  scrollContent: {paddingBottom: 100},

  profileHeader: {
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'ios' ? 70 : (StatusBar.currentHeight || 0) + 30,
    paddingBottom: 50,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {position: 'relative', marginBottom: 16},
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {fontSize: 22, fontWeight: '800', color: COLORS.secondary},
  userEmail: {
    fontSize: 14,
    color: COLORS.textGray,
    marginTop: 4,
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -30,
    zIndex: 10,
  },
  statCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.04,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {fontSize: 18, fontWeight: '900', color: COLORS.secondary},
  unitText: {fontSize: 12, color: COLORS.textGray, fontWeight: '700'},
  statStatus: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  statStatusNormal: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    color: COLORS.textGray,
  },

  section: {marginTop: 32, paddingHorizontal: 20},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textGray,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuLeft: {flexDirection: 'row', alignItems: 'center', gap: 16},
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {fontSize: 15, fontWeight: '700', color: COLORS.secondary},
  menuRight: {flexDirection: 'row', alignItems: 'center'},
  menuValue: {fontSize: 14, color: COLORS.textGray, fontWeight: '600'},

  divider: {
    height: 1,
    backgroundColor: COLORS.bg,
    marginHorizontal: 24,
  },

  versionText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 40,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default ProfileScreen;
