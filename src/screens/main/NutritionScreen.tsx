import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import axiosClient from '../../api/axiosClient';
import {useTranslation} from 'react-i18next';

// IMPORT COMPONENT POPUP HUY HIỆU VÀ THANH XP
import BadgePopup from '../../components/BadgePopup';
import XpGainModal from '../../components/XpGainModal';

const COLORS = {
  primary: '#2c65e8',
  secondaryDeep: '#0A235C',
  accentGold: '#FF9F0A',
  textGray: '#8A94A6',
  textLight: '#A0ABC0',
  white: '#ffffff',
  bg: '#F4F7FC',
  card: '#ffffff',
  border: '#EDEFF2',
  success: '#34C759',
  danger: '#FF3B30',
  protein: '#FF3B30',
  carbs: '#FF9F0A',
  fat: '#34C759',
};

const {width} = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// COMPONENT HIỆU ỨNG: FADE + SLIDE (TRƯỢT LÊN VÀ HIỆN DẦN)
// ─────────────────────────────────────────────────────────────
const FadeSlideCard = ({
  children,
  delay = 0,
  style,
  from = 'bottom',
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
  from?: 'bottom' | 'left' | 'right';
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(
    new Animated.Value(from === 'bottom' ? 30 : 0),
  ).current;
  const translateX = useRef(
    new Animated.Value(from === 'left' ? -40 : from === 'right' ? 40 : 0),
  ).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {opacity, transform: [{translateY}, {translateX}, {scale}]},
      ]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT HIỆU ỨNG: THANH TIẾN TRÌNH CHẠY (ANIMATED PROGRESS BAR)
// ─────────────────────────────────────────────────────────────
const AnimatedProgressBar = ({
  progressPercent,
  color,
  height = 10,
  delay = 0,
}: any) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(widthAnim, {
        toValue: progressPercent,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [progressPercent]);

  return (
    <View
      style={{
        height,
        backgroundColor: COLORS.bg,
        borderRadius: 100,
        overflow: 'hidden',
        width: '100%',
      }}>
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: 100,
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT GỐC: NUTRITION PROGRESS BAR (ĐƯỢC GẮN ANIMATION)
// ─────────────────────────────────────────────────────────────
const NutritionProgressBar = ({
  label,
  value,
  target,
  color,
  delay = 0,
}: any) => {
  const percentage = target > 0 ? (value / target) * 100 : 0;
  return (
    <FadeSlideCard
      delay={delay}
      from="left"
      style={styles.macroProgressContainer}>
      <View style={styles.macroTextRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          <Text style={{color: color, fontWeight: '800'}}>
            {Math.round(value)}g
          </Text>
          <Text style={{color: COLORS.textLight, fontSize: 11}}>
            {' '}
            / {Math.round(target)}g
          </Text>
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        {/* Đổi thành AnimatedProgressBar để chạy mượt */}
        <AnimatedProgressBar
          progressPercent={Math.min(100, percentage)}
          color={color}
          height={10}
          delay={delay + 200}
        />
      </View>
    </FadeSlideCard>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT HIỆU ỨNG: NHẢY SỐ (CALORIES)
// ─────────────────────────────────────────────────────────────
const AnimatedNumber = ({value, style, delay = 0, duration = 1000}: any) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    const t = setTimeout(() => {
      Animated.timing(animVal, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    const id = animVal.addListener(({value: v}) => setDisplay(Math.round(v)));
    return () => {
      clearTimeout(t);
      animVal.removeListener(id);
    };
  }, [value]);

  return <Text style={style}>{display.toLocaleString()}</Text>;
};

const NutritionScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // STATE QUẢN LÝ MODAL XP
  const [xpModalConfig, setXpModalConfig] = useState({
    visible: false,
    xpEarned: 0,
    currentXp: 0,
    nextLevelXp: 200,
    level: 1,
    isLevelUp: false,
  });

  // STATE CHO BADGE POPUP (Pháo hoa)
  const [isBadgePopupVisible, setIsBadgePopupVisible] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<any>(null);

  // DATA STATES
  const [dailyTDEE, setDailyTDEE] = useState(0);
  const [mealPlan, setMealPlan] = useState<any>({
    breakfast: null,
    lunch: null,
    dinner: null,
  });
  const [eatenTotals, setEatenTotals] = useState({
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [loggedMeals, setLoggedMeals] = useState<any>({});

  // ANIMATION HEADER
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  const fetchSuggestedMeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/meals/suggest', {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.data.success) {
        const {meals, user_real_tdee} = response.data.data;

        setDailyTDEE(user_real_tdee);
        setMealPlan(meals);

        const newLoggedState: any = {};
        const newEatenTotals = {kcal: 0, protein: 0, carbs: 0, fat: 0};

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
          const mealData = meals[mealType];
          if (mealData && mealData.is_logged) {
            newLoggedState[mealType] = true;
            newEatenTotals.kcal += mealData.calories || 0;
            newEatenTotals.protein += mealData.protein || 0;
            newEatenTotals.carbs += mealData.carbs || 0;
            newEatenTotals.fat += mealData.fat || 0;
          }
        });

        setLoggedMeals(newLoggedState);
        setEatenTotals(newEatenTotals);
      }
    } catch (error: any) {
      console.error('Lỗi lấy thực đơn:', error.response?.data);
      if (error.response?.status === 400) {
        Alert.alert(t('nutritionScreen.alerts.info_title'), error.response.data.message, [
          {
            text: t('nutritionScreen.alerts.update_now'),
            onPress: () => navigation.navigate('Profile'),
          },
          {text: t('nutritionScreen.alerts.later')},
        ]);
      } else {
        Alert.alert(
          t('nutritionScreen.alerts.error_title'),
          t('nutritionScreen.alerts.fetch_failed'),
        );
      }
    } finally {
      setIsLoading(false);
      // Bật Animation cho Header sau khi load xong
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchSuggestedMeals();
    }, [fetchSuggestedMeals]),
  );

  const handleSwapMeal = async (mealType: string, currentMeal: any) => {
    if (loggedMeals[mealType]) {
      Alert.alert(
        t('nutritionScreen.alerts.info_title'),
        t('nutritionScreen.alerts.meal_already_logged'),
      );
      return;
    }

    setIsActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.post(
        '/meals/swap',
        {
          target_calories: currentMeal.calories,
          current_food_id: currentMeal.food_id,
          meal_type: mealType,
        },
        {headers: {Authorization: `Bearer ${token}`}},
      );

      if (response.data.success) {
        setMealPlan((prev: any) => ({...prev, [mealType]: response.data.data}));
      }
    } catch (error) {
      Alert.alert(
        t('nutritionScreen.alerts.error_title'),
        t('nutritionScreen.alerts.swap_failed'),
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogMeal = async (mealType: string, meal: any) => {
    if (loggedMeals[mealType]) return;

    setIsActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const today = new Date().toISOString().split('T')[0];

      const payload = {
        food_id: meal.food_id,
        meal_type: mealType,
        serving_quantity: 1,
        total_calories: meal.calories,
        total_carbs: meal.carbs,
        total_protein: meal.protein,
        total_fat: meal.fat,
        log_date: today,
      };

      const response = await axiosClient.post('/meals/log', payload, {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.data.success) {
        const d = response.data.data;

        // 1. Cập nhật State số liệu ăn uống trên UI
        setEatenTotals(prev => ({
          kcal: prev.kcal + meal.calories,
          protein: prev.protein + meal.protein,
          carbs: prev.carbs + meal.carbs,
          fat: prev.fat + meal.fat,
        }));
        setLoggedMeals((prev: any) => ({...prev, [mealType]: true}));

        // 2. Lưu Huy hiệu lại (chưa bung ngay)
        const newBadges = d.new_badges || [];
        if (newBadges.length > 0) {
          setEarnedBadge(newBadges[0]);
        } else {
          setEarnedBadge(null);
        }

        // 3. Bật Modal XP ngay lập tức thay cho thông báo thành công bình thường
        setXpModalConfig({
          visible: true,
          xpEarned: d.xp_earned || 10,
          currentXp: d.current_xp || 0,
          nextLevelXp: d.next_level_xp || 200,
          level: d.new_level || 1,
          isLevelUp: d.leveled_up || false,
        });
      }
    } catch (error) {
      Alert.alert(
        t('nutritionScreen.alerts.error_title'),
        t('nutritionScreen.alerts.log_failed'),
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // HÀM XỬ LÝ KHI NGƯỜI DÙNG TẮT MODAL XP
  const handleCloseXpModal = () => {
    setXpModalConfig({...xpModalConfig, visible: false});

    // Nếu có Huy hiệu được lưu lại ở bước trước -> Bật Pháo hoa Huy hiệu lên
    if (earnedBadge) {
      setTimeout(() => {
        setIsBadgePopupVisible(true);
      }, 500);
    }
  };

  const renderMealCard = (type: string, meal: any, index: number) => {
    if (!meal) return null;

    const isLogged = loggedMeals[type];
    const mealNameKey =
      type === 'breakfast'
        ? 'nutritionScreen.meal_types.breakfast'
        : type === 'lunch'
        ? 'nutritionScreen.meal_types.lunch'
        : 'nutritionScreen.meal_types.dinner';
    const mealNameLabel = t(mealNameKey);
    const mealIcon =
      type === 'breakfast' ? 'sunrise' : type === 'lunch' ? 'sun' : 'moon';

    return (
      <FadeSlideCard
        delay={500 + index * 100}
        style={[styles.mealCard, isLogged && styles.mealCardCompleted]}>
        <View style={styles.mealCardHeader}>
          <View style={styles.mealTypeBadge}>
            <Icon
              name={mealIcon}
              size={14}
              color={isLogged ? COLORS.success : COLORS.primary}
            />
            <Text
              style={[
                styles.mealTypeName,
                isLogged && {color: COLORS.success},
              ]}>
              {mealNameLabel}
            </Text>
          </View>
          <Text
            style={[styles.mealCalCount, isLogged && {color: COLORS.textGray}]}>
            {meal.calories} kcal
          </Text>
        </View>

        <View style={styles.mealCardBody}>
          <Image
            source={{
              uri:
                meal.image_url ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            }}
            style={[styles.mealImg, isLogged && {opacity: 0.7}]}
          />
          <View style={styles.mealInfo}>
            <Text
              style={[styles.mealName, isLogged && {color: COLORS.textGray}]}
              numberOfLines={2}>
              {meal.name}
            </Text>
            <Text style={styles.mealCategory}>{meal.category}</Text>

            <View style={styles.exTags}>
              <View
                style={[
                  styles.tag,
                  {backgroundColor: 'rgba(255, 59, 48, 0.1)'},
                ]}>
                <Text style={[styles.tagText, {color: COLORS.protein}]}>
                  P: {meal.protein}g
                </Text>
              </View>
              <View
                style={[
                  styles.tag,
                  {backgroundColor: 'rgba(255, 159, 10, 0.1)'},
                ]}>
                <Text style={[styles.tagText, {color: COLORS.carbs}]}>
                  C: {meal.carbs}g
                </Text>
              </View>
              <View
                style={[
                  styles.tag,
                  {backgroundColor: 'rgba(52, 199, 89, 0.1)'},
                ]}>
                <Text style={[styles.tagText, {color: COLORS.fat}]}>
                  F: {meal.fat}g
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.mealActionRow}>
          {!isLogged && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.swapBtn]}
              onPress={() => handleSwapMeal(type, meal)}
              disabled={isActionLoading}>
              <Icon name="refresh-cw" size={16} color={COLORS.primary} />
              <Text style={styles.swapBtnText}>
                {t('nutritionScreen.meal_actions.swap')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              isLogged ? styles.loggedBtn : styles.logBtn,
              !isLogged && {flex: 2}, // Cho nút xác nhận to hơn nếu chưa ăn
            ]}
            onPress={() => handleLogMeal(type, meal)}
            disabled={isLogged || isActionLoading}
            activeOpacity={0.8}>
            <Icon
              name={isLogged ? 'check-circle' : 'check'}
              size={16}
              color={isLogged ? COLORS.success : COLORS.white}
            />
            <Text
              style={[styles.logBtnText, isLogged && {color: COLORS.success}]}>
              {isLogged
                ? t('nutritionScreen.meal_actions.logged')
                : t('nutritionScreen.meal_actions.log')}
            </Text>
          </TouchableOpacity>
        </View>
      </FadeSlideCard>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER CÓ ANIMATION */}
      <Animated.View
        style={[
          styles.headerCal,
          {opacity: headerOpacity, transform: [{translateY: headerTranslateY}]},
        ]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.secondaryDeep} />
          </TouchableOpacity>
          <Text style={styles.headerTitleCompact}>
            {t('nutritionScreen.header.title')}
          </Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={fetchSuggestedMeals}>
          <Icon name="rotate-cw" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </Animated.View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 100}}>
          {/* HERO DASHBOARD CÓ ANIMATION */}
          <FadeSlideCard delay={100} style={styles.nutritionReportCard}>
            <View style={styles.kcalSummaryRow}>
              <View style={styles.kcalTextCol}>
                <Text style={styles.reportTitle}>
                  {t('nutritionScreen.report.title')}
                </Text>
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText}>
                    {t('nutritionScreen.report.goal_badge', {
                      kcal: dailyTDEE,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.kcalCircleWrapper}>
                <View style={styles.kcalCircle}>
                  <AnimatedNumber
                    value={eatenTotals.kcal}
                    style={styles.kcalEatenNum}
                    delay={200}
                  />
                  <Text style={styles.kcalUnit}>
                    {t('nutritionScreen.report.kcal_unit')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.macroProgressList}>
              <NutritionProgressBar
                label={t('nutritionScreen.macros.protein')}
                value={eatenTotals.protein}
                target={(dailyTDEE * 0.3) / 4}
                color={COLORS.protein}
                delay={200}
              />
              <NutritionProgressBar
                label={t('nutritionScreen.macros.carbs')}
                value={eatenTotals.carbs}
                target={(dailyTDEE * 0.5) / 4}
                color={COLORS.carbs}
                delay={300}
              />
              <NutritionProgressBar
                label={t('nutritionScreen.macros.fat')}
                value={eatenTotals.fat}
                target={(dailyTDEE * 0.2) / 9}
                color={COLORS.fat}
                delay={400}
              />
            </View>
          </FadeSlideCard>

          {/* MEAL PLAN LIST CÓ ANIMATION */}
          <View style={styles.mealsSection}>
            <FadeSlideCard delay={400} style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>
                  {t('nutritionScreen.meals.title')}
                </Text>
                <Text style={styles.listSubtitle}>
                  {t('nutritionScreen.meals.subtitle')}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {t('nutritionScreen.meals.count_meals', {count: 3})}
                </Text>
              </View>
            </FadeSlideCard>

            {renderMealCard('breakfast', mealPlan.breakfast, 0)}
            {renderMealCard('lunch', mealPlan.lunch, 1)}
            {renderMealCard('dinner', mealPlan.dinner, 2)}
          </View>
        </ScrollView>
      )}

      {/* OVERLAY LOADING CHO ACTION */}
      {isActionLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingOverlayText}>
              {t('nutritionScreen.loading.overlay_action')}
            </Text>
          </View>
        </View>
      )}

      {/* NHÚNG THẺ MODAL XP RPG */}
      <XpGainModal
        visible={xpModalConfig.visible}
        xpEarned={xpModalConfig.xpEarned}
        currentXp={xpModalConfig.currentXp}
        nextLevelXp={xpModalConfig.nextLevelXp}
        level={xpModalConfig.level}
        isLevelUp={xpModalConfig.isLevelUp}
        onClose={handleCloseXpModal}
      />

      {/* BADGE POPUP (Pháo hoa chúc mừng - Hiện ra nếu có) */}
      <BadgePopup
        visible={isBadgePopupVisible}
        badge={earnedBadge}
        onClose={() => {
          setIsBadgePopupVisible(false);
          setEarnedBadge(null);
        }}
      />
    </View>
  );
};

// --- STYLES GIỮ NGUYÊN 100% NHƯ BẠN YÊU CẦU ---
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  headerCal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'ios' ? 55 : 30,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  backButton: {marginRight: 10, padding: 4},
  headerTitleCompact: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    letterSpacing: 0.5,
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainScroll: {flex: 1},

  // HERO CARD
  nutritionReportCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    shadowColor: COLORS.secondaryDeep,
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  kcalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  kcalTextCol: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 8,
  },
  goalBadge: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  goalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  kcalCircleWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 5,
  },
  kcalCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kcalEatenNum: {fontSize: 22, fontWeight: '900', color: COLORS.secondaryDeep},
  kcalUnit: {
    fontSize: 11,
    color: COLORS.textGray,
    marginTop: -2,
    fontWeight: '500',
  },

  // PROGRESS BARS
  macroProgressList: {gap: 16},
  macroProgressContainer: {},
  macroTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  macroLabel: {fontSize: 13, fontWeight: '700', color: COLORS.secondaryDeep},
  macroValue: {fontSize: 13},
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 100, // Fully rounded
    overflow: 'hidden',
  },
  progressBarFill: {height: '100%', borderRadius: 100},

  // LIST HEADER
  mealsSection: {paddingHorizontal: 16, marginTop: 24},
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listTitle: {fontSize: 18, fontWeight: '800', color: COLORS.secondaryDeep},
  listSubtitle: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 4,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: '#E6F9EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countBadgeText: {fontSize: 12, color: COLORS.success, fontWeight: '800'},

  // MEAL CARDS
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.secondaryDeep,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealCardCompleted: {
    backgroundColor: '#FAFAFA',
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },

  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  mealTypeName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealCalCount: {fontSize: 16, fontWeight: '800', color: COLORS.secondaryDeep},

  mealCardBody: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  mealImg: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    marginRight: 16,
  },
  mealInfo: {flex: 1},
  mealName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 6,
    lineHeight: 22,
  },
  mealCategory: {
    fontSize: 13,
    color: COLORS.textGray,
    textTransform: 'capitalize',
    marginBottom: 10,
    fontWeight: '500',
  },

  exTags: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tag: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100},
  tagText: {fontSize: 11, fontWeight: '800'},

  // ACTION BUTTONS
  mealActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46, // Cao hơn để dễ bấm
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  swapBtn: {backgroundColor: '#F0F4FF'},
  swapBtnText: {color: COLORS.primary, fontSize: 14, fontWeight: '700'},

  logBtn: {backgroundColor: COLORS.primary},
  logBtnText: {color: COLORS.white, fontSize: 14, fontWeight: '700'},

  loggedBtn: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },

  // OVERLAY LOADING
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 35, 92, 0.4)', // Nền tối xanh mờ
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondaryDeep,
  },
});

export default NutritionScreen;
