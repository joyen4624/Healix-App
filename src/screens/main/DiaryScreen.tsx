import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {Calendar} from 'react-native-calendars';
import axiosClient from '../../api/axiosClient';
import BadgePopup from '../../components/BadgePopup';

// 🔴 IMPORT HOOK ĐA NGÔN NGỮ
import {useTranslation} from 'react-i18next';

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#F4F7FC',
  border: '#EDEFF2',
  success: '#34C759',
  food: '#FF9F0A',
  exercise: '#32ADE6',
  disabled: '#E0E5ED',
};

// ─── FADE + SLIDE CARD ────────────────────────────────────────
const FadeSlideIn = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 480,
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
      style={[style, {opacity, transform: [{translateY}, {scale}]}]}>
      {children}
    </Animated.View>
  );
};

// ─── ANIMATED PROGRESS BAR ───────────────────────────────────
const AnimatedBar = ({
  percent,
  color,
  delay = 0,
}: {
  percent: number;
  color: string;
  delay?: number;
}) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(percent, 100),
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);
  return (
    <View style={styles.progressBg}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

// ─── ANIMATED NUMBER ─────────────────────────────────────────
const AnimatedNumber = ({
  value,
  style,
  delay = 0,
}: {
  value: number;
  style?: any;
  delay?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: value,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    const id = anim.addListener(({value: v}) => setDisplay(Math.round(v)));
    return () => {
      clearTimeout(t);
      anim.removeListener(id);
    };
  }, [value]);
  return <Text style={style}>{display.toLocaleString()}</Text>;
};

// ─── MAIN ─────────────────────────────────────────────────────
const DiaryScreen = ({navigation, route}: any) => {
  const {t} = useTranslation(); // 🔴 Khởi tạo hook đa ngôn ngữ

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingWater, setIsAddingWater] = useState(false);
  const [isBadgePopupVisible, setIsBadgePopupVisible] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<any>(null);
  const [diaryData, setDiaryData] = useState({
    summary: {goal: 2200, food: 0, exercise: 0},
    meals: [],
    exercise: {totalCal: 0, items: []},
    water: {consumed: 0, goal: 2000},
  });

  // Header entrance animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (route.params?.newBadges && route.params.newBadges.length > 0) {
      setEarnedBadge(route.params.newBadges[0]);
      setIsBadgePopupVisible(true);
      navigation.setParams({newBadges: undefined});
    }
  }, [route.params?.newBadges, navigation]);

  // Trigger header animation when data loads
  useEffect(() => {
    if (!isLoading) {
      headerAnim.setValue(0);
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  const getApiDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const getUIDateString = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString())
      return t('diary.date.today');
    if (date.toDateString() === yesterday.toDateString())
      return t('diary.date.yesterday');
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const todayStr = getApiDateString(new Date());

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate > new Date()) return;
    setSelectedDate(newDate);
  };

  const onDayPress = (day: any) => {
    setSelectedDate(new Date(day.timestamp));
    setShowDatePicker(false);
  };

  const checkMealAccess = (mealId: string) => {
    if (!isToday) return {allowed: true, message: ''};
    const currentHour = new Date().getHours();
    if (mealId === 'lunch' && currentHour < 11)
      return {allowed: false, message: t('diary.meal_access.lunch_locked')};
    if (mealId === 'dinner' && currentHour < 17)
      return {allowed: false, message: t('diary.meal_access.dinner_locked')};
    return {allowed: true, message: ''};
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchDiaryData = async () => {
        setIsLoading(true);
        try {
          const token = await AsyncStorage.getItem('userToken');
          const dateStr = getApiDateString(selectedDate);
          const response = await axiosClient.get(`/diary/${dateStr}`, {
            headers: {Authorization: `Bearer ${token}`},
          });
          if (isActive && response.data.success) {
            setDiaryData(response.data.data);
          }
        } catch (error) {
          console.error('Lỗi tải nhật ký:', error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      fetchDiaryData();
      return () => {
        isActive = false;
      };
    }, [selectedDate]),
  );

  const handleAddWater = async () => {
    setIsAddingWater(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const dateStr = getApiDateString(selectedDate);
      const response = await axiosClient.post(
        '/diary/add-water',
        {date: dateStr, amount_ml: 250},
        {headers: {Authorization: `Bearer ${token}`}},
      );
      if (response.data.success) {
        setDiaryData(prev => ({
          ...prev,
          water: {...prev.water, consumed: response.data.new_total},
        }));
      }
    } catch (error) {
      Alert.alert(t('diary.alerts.error_title'), t('diary.alerts.water_error'));
    } finally {
      setIsAddingWater(false);
    }
  };

  const {goal, food, exercise} = diaryData.summary;
  const remaining = goal - food + exercise;
  const isDeficit = remaining < 0;
  const foodPercent = goal > 0 ? (food / goal) * 100 : 0;
  const waterPercent =
    diaryData.water.goal > 0
      ? (diaryData.water.consumed / diaryData.water.goal) * 100
      : 0;

  // ─── MEAL CARD ───────────────────────────────────────────────
  const MealCard = ({meal, index}: {meal: any; index: number}) => {
    const access = checkMealAccess(meal.id);
    const mealTitleKey = meal?.id ? `diary.meal_titles.${meal.id}` : '';
    const translatedMealTitle =
      mealTitleKey !== '' ? t(mealTitleKey) : undefined;
    const mealTitle =
      mealTitleKey !== '' && translatedMealTitle !== mealTitleKey
        ? translatedMealTitle
        : meal?.title;
    return (
      <FadeSlideIn delay={200 + index * 80} style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <View style={styles.iconContainer}>
              <Icon name={meal.icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.mealTitle}>{mealTitle}</Text>
          </View>
          <Text style={styles.mealTotalCal}>
            {meal.totalCal} {t('diary.summary.unit_kcal')}
          </Text>
        </View>

        {meal.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyMealText}>
              {t('diary.meals.empty_food')}
            </Text>
          </View>
        ) : (
          <View style={styles.foodList}>
            {meal.items.map((item: any, i: number) => (
              <View
                key={item.id}
                style={[
                  styles.foodItem,
                  i !== meal.items.length - 1 && styles.foodItemBorder,
                ]}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodAmount}>{item.amount}</Text>
                </View>
                <Text style={styles.foodCal}>
                  {item.cal} {t('diary.summary.unit_kcal')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {access.allowed ? (
          <TouchableOpacity
            style={styles.addFoodBtn}
            activeOpacity={0.7}
            onPress={() =>
              // `mealType` không được dùng trực tiếp trong `CameraScreen`,
              // nhưng dùng `meal.id` để tránh phụ thuộc chuỗi tiếng Anh.
              navigation.navigate('Camera', {mealType: meal.id})
            }>
            <Icon name="plus" size={18} color={COLORS.primary} />
            <Text style={styles.addFoodText}>{t('diary.meals.add_food')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addFoodBtnLocked}>
            <Icon name="lock" size={16} color={COLORS.textGray} />
            <Text style={styles.addFoodTextLocked}>{access.message}</Text>
          </View>
        )}
      </FadeSlideIn>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('diary.title')}</Text>
        <View style={styles.dateSelector}>
          <TouchableOpacity
            style={styles.dateNavBtn}
            onPress={() => changeDate(-1)}>
            <Icon name="chevron-left" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateBadge}
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}>
            <Icon
              name="calendar"
              size={15}
              color={COLORS.primary}
              style={{marginRight: 7}}
            />
            <Text style={styles.dateText}>{getUIDateString(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateNavBtn}
            onPress={() => changeDate(1)}
            disabled={isToday}>
            <Icon
              name="chevron-right"
              size={22}
              color={isToday ? COLORS.disabled : COLORS.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* CALENDAR MODAL */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <Calendar
              current={getApiDateString(selectedDate)}
              maxDate={todayStr}
              onDayPress={onDayPress}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: COLORS.textGray,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.secondary,
                textDisabledColor: COLORS.disabled,
                dotColor: COLORS.primary,
                selectedDotColor: '#ffffff',
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.secondary,
                indicatorColor: COLORS.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 15,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              markedDates={{
                [getApiDateString(selectedDate)]: {
                  selected: true,
                  disableTouchEvent: true,
                },
              }}
            />
            <TouchableOpacity
              style={styles.closeCalendarBtn}
              onPress={() => setShowDatePicker(false)}>
              <Text style={styles.closeCalendarText}>
                {t('diary.calendar.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LOADING */}
      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('diary.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* ── CALORIES SUMMARY CARD — compact redesign ── */}
          <FadeSlideIn delay={60} style={styles.summaryCard}>
            {/* Top row: label + remaining value */}
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.summaryLabel}>
                  {t('diary.summary.calories_remaining')}
                </Text>
                <View style={styles.remainingRow}>
                  <AnimatedNumber
                    value={remaining}
                    style={[
                      styles.remainingValue,
                      {color: isDeficit ? '#FF453A' : COLORS.success},
                    ]}
                    delay={120}
                  />
                  <Text
                    style={[
                      styles.remainingUnit,
                      {color: isDeficit ? '#FF453A' : COLORS.success},
                    ]}>
                    {t('diary.summary.unit_kcal')}
                  </Text>
                </View>
              </View>

              {/* Mini donut-style ring indicator */}
              <View
                style={[
                  styles.remainingBadge,
                  {
                    backgroundColor: isDeficit
                      ? 'rgba(255,69,58,0.1)'
                      : 'rgba(52,199,89,0.1)',
                    borderColor: isDeficit
                      ? 'rgba(255,69,58,0.25)'
                      : 'rgba(52,199,89,0.25)',
                  },
                ]}>
                <Icon
                  name={isDeficit ? 'alert-circle' : 'check-circle'}
                  size={22}
                  color={isDeficit ? '#FF453A' : COLORS.success}
                />
              </View>
            </View>

            {/* Food progress bar */}
            <AnimatedBar
              percent={foodPercent}
              color={foodPercent > 100 ? '#FF453A' : COLORS.primary}
              delay={200}
            />

            {/* Bottom stats: Goal / Food / Exercise */}
            <View style={styles.summaryStatsRow}>
              <View style={styles.statItem}>
                <Icon name="target" size={16} color={COLORS.textGray} />
                <Text style={styles.statLabel}>{t('diary.summary.goal')}</Text>
                <AnimatedNumber
                  value={goal}
                  style={styles.statValue}
                  delay={180}
                />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="pie-chart" size={16} color={COLORS.food} />
                <Text style={styles.statLabel}>{t('diary.summary.food')}</Text>
                <AnimatedNumber
                  value={food}
                  style={[styles.statValue, {color: COLORS.food}]}
                  delay={220}
                />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="activity" size={16} color={COLORS.exercise} />
                <Text style={styles.statLabel}>
                  {t('diary.summary.exercise')}
                </Text>
                <AnimatedNumber
                  value={exercise}
                  style={[styles.statValue, {color: COLORS.exercise}]}
                  delay={260}
                />
              </View>
            </View>
          </FadeSlideIn>

          {/* MEAL CARDS */}
          {diaryData.meals.map((meal: any, index: number) => (
            <MealCard key={meal.id} meal={meal} index={index} />
          ))}

          {/* EXERCISE */}
          <FadeSlideIn
            delay={200 + (diaryData.meals.length + 1) * 80}
            style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <View
                  style={[
                    styles.iconContainer,
                    {backgroundColor: 'rgba(50,173,230,0.1)'},
                  ]}>
                  <Icon name="activity" size={20} color={COLORS.exercise} />
                </View>
                <Text style={styles.mealTitle}>
                  {t('diary.exercise.title')}
                </Text>
              </View>
              <Text style={[styles.mealTotalCal, {color: COLORS.exercise}]}>
                {diaryData.exercise.totalCal} {t('diary.summary.unit_kcal')}
              </Text>
            </View>

            {diaryData.exercise.items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyMealText}>
                  {t('diary.exercise.empty_exercise')}
                </Text>
              </View>
            ) : (
              <View style={styles.foodList}>
                {diaryData.exercise.items.map((item: any, i: number) => (
                  <View
                    key={item.id}
                    style={[
                      styles.foodItem,
                      i !== diaryData.exercise.items.length - 1 &&
                        styles.foodItemBorder,
                    ]}>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <Text style={styles.foodAmount}>{item.amount}</Text>
                    </View>
                    <Text style={[styles.foodCal, {color: COLORS.exercise}]}>
                      {item.cal} {t('diary.summary.unit_kcal')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.addFoodBtn,
                {backgroundColor: 'rgba(50,173,230,0.08)'},
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ExerciseList')}>
              <Icon name="plus" size={18} color={COLORS.exercise} />
              <Text style={[styles.addFoodText, {color: COLORS.exercise}]}>
                {t('diary.exercise.add_exercise')}
              </Text>
            </TouchableOpacity>
          </FadeSlideIn>

          {/* WATER TRACKER */}
          <FadeSlideIn
            delay={200 + (diaryData.meals.length + 2) * 80}
            style={[styles.mealCard, {marginBottom: 30}]}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <View style={styles.iconContainer}>
                  <Icon name="droplet" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.mealTitle}>{t('diary.water.title')}</Text>
              </View>
              <Text style={styles.mealTotalCal}>
                {diaryData.water.consumed} / {diaryData.water.goal}{' '}
                {t('diary.water.unit_ml')}
              </Text>
            </View>

            <AnimatedBar
              percent={waterPercent}
              color={COLORS.primary}
              delay={400}
            />

            <View style={[styles.waterQuickAdd, {marginTop: 14}]}>
              <Text style={styles.waterSubText}>
                {t('diary.water.subtitle')}
              </Text>
              <TouchableOpacity
                style={[styles.addWaterBtn, isAddingWater && {opacity: 0.7}]}
                onPress={handleAddWater}
                disabled={isAddingWater}>
                {isAddingWater ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="plus" size={16} color={COLORS.white} />
                    <Text style={styles.addWaterText}>
                      {t('diary.water.add_amount')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </FadeSlideIn>
        </ScrollView>
      )}

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

// ─── STYLES ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  loadingWrapper: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {
    marginTop: 12,
    color: COLORS.textGray,
    fontSize: 15,
    fontWeight: '500',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 30,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  dateSelector: {flexDirection: 'row', alignItems: 'center', gap: 4},
  dateNavBtn: {padding: 6, backgroundColor: COLORS.bg, borderRadius: 20},
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateText: {fontSize: 14, fontWeight: '700', color: COLORS.primary},

  scrollContent: {paddingHorizontal: 16, paddingTop: 20, paddingBottom: 80},

  // ── SUMMARY CARD — compact ──
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  remainingRow: {flexDirection: 'row', alignItems: 'baseline', gap: 4},
  remainingValue: {fontSize: 32, fontWeight: '900'},
  remainingUnit: {fontSize: 14, fontWeight: '600'},
  remainingBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress bar
  progressBg: {
    height: 7,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {height: '100%', borderRadius: 4},

  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  statItem: {flex: 1, alignItems: 'center', gap: 3},
  statDivider: {width: 1, height: 28, backgroundColor: COLORS.border},
  statLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '500',
    marginTop: 1,
  },
  statValue: {fontSize: 15, fontWeight: '800', color: COLORS.secondary},

  // ── MEAL CARDS ──
  mealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(44,101,232,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTitle: {fontSize: 17, fontWeight: '700', color: COLORS.secondary},
  mealTotalCal: {fontSize: 15, fontWeight: '800', color: COLORS.primary},

  emptyContainer: {
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyMealText: {color: COLORS.textGray, fontSize: 14, fontWeight: '500'},

  foodList: {marginBottom: 16},
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodItemBorder: {borderBottomWidth: 1, borderColor: COLORS.border},
  foodInfo: {flex: 1},
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 3,
  },
  foodAmount: {fontSize: 13, color: COLORS.textGray, fontWeight: '500'},
  foodCal: {fontSize: 14, fontWeight: '700', color: COLORS.secondary},

  addFoodBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: '#F0F4FF',
    gap: 8,
  },
  addFoodText: {fontSize: 15, fontWeight: '700', color: COLORS.primary},
  addFoodBtnLocked: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  addFoodTextLocked: {fontSize: 15, fontWeight: '700', color: COLORS.textGray},

  // ── WATER ──
  waterQuickAdd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterSubText: {fontSize: 14, color: COLORS.textGray, fontWeight: '500'},
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addWaterText: {color: COLORS.white, fontWeight: '700', fontSize: 14},

  // ── MODAL ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,35,92,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: '92%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  closeCalendarBtn: {
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 4,
    marginHorizontal: 8,
  },
  closeCalendarText: {color: COLORS.secondary, fontWeight: '700', fontSize: 16},
});

export default DiaryScreen;
