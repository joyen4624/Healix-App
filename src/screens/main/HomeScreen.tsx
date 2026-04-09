import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ImageBackground,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import NotificationService from '../../services/NotificationService';
import SettingLevelNotification from '../../components/SettingLevelNotification';
import GoalAchievedScreen from '../../components/GoalAchievedScreen';
// 🔴 IMPORT HOOK ĐA NGÔN NGỮ
import {useTranslation} from 'react-i18next';

const {width: WINDOW_WIDTH} = Dimensions.get('window');

// 🟢 HÀM XỬ LÝ MÚI GIỜ CHUẨN BẤT CHẤP ĐIỆN THOẠI LỖI
const getVietnamDateString = () => {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = vnTime.getUTCFullYear();
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Buổi trong ngày theo giờ máy: 5–12 sáng, 12–14 trưa, 14–18 chiều, còn lại tối */
type GreetingPeriod = 'morning' | 'noon' | 'afternoon' | 'evening';

const getGreetingPeriod = (): GreetingPeriod => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) {
    return 'morning';
  }
  if (h >= 12 && h < 14) {
    return 'noon';
  }
  if (h >= 14 && h < 18) {
    return 'afternoon';
  }
  return 'evening';
};

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  secondaryDeep: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#F4F7FC',
  cardBg: '#ffffff',
  border: '#EDEFF2',
  success: '#34C759',
  warning: '#FF9500',
  carbs: '#FF9F0A',
  protein: '#FF453A',
  fat: '#32ADE6',
  fire: '#FF3B30',
  accentGold: '#FF9F0A',
  gold: '#FFD700',
  skeletonBg: '#E2E8F0',
  purple: '#AF52DE',
};

const FILTER_OPTIONS = [
  {id: 'all', label: 'home.filters.all', icon: 'grid'},
  {id: 'workout', label: 'home.filters.workout', icon: 'activity'},
  {id: 'weight', label: 'home.filters.weight', icon: 'trending-down'},
  {id: 'badge', label: 'home.filters.badge', icon: 'award'},
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type LevelInfo = {
  level: number;
  xp: number;
  next_level_xp: number;
};

type MacroStat = {
  current: number;
  max: number;
};

type WaterInfo = {
  current: number;
  goal: number;
};

type WeightInfo = {
  current: number;
  goal: number;
  unit: string;
};

type CalorieInfo = {
  goal: number;
  food: number;
  exercise: number;
};

type MealItem = {
  id: string;
  name: string;
  icon: string;
  cal: number;
};

type DashboardData = {
  name?: string;
  avatar?: string;
  current_streak?: number;
  level_info?: LevelInfo;
  calories?: CalorieInfo;
  macros?: {
    carbs: MacroStat;
    protein: MacroStat;
    fat: MacroStat;
  };
  water: WaterInfo;
  weight?: WeightInfo;
  meals?: MealItem[];
  [key: string]: any;
};

type RecommendationItem = Record<string, any>;
type JourneyTimelineItem = {
  type?: string;
  [key: string]: any;
};
type TodayExerciseItem = {
  is_completed?: boolean;
  [key: string]: any;
};
type WeeklyStreakItem = {
  day: string;
  active: boolean;
  today: boolean;
};
type CustomDialogState = {
  visible: boolean;
  title: string;
  message: string;
  type: string;
};

// ─────────────────────────────────────────────────────────────
// SKELETON — shimmer nhấp nháy
// ─────────────────────────────────────────────────────────────
const SkeletonPulse = ({style}: any) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[style, {opacity: anim, backgroundColor: COLORS.skeletonBg}]}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// FADE + SLIDE + SCALE
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
        duration: 520,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 520,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
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
// ANIMATED NUMBER
// ─────────────────────────────────────────────────────────────
const AnimatedNumber = ({
  value,
  style,
  delay = 0,
  duration = 1000,
  prefix = '',
  suffix = '',
}: {
  value: number;
  style?: any;
  delay?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) => {
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

  return (
    <Text style={style}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </Text>
  );
};

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
const AnimatedProgressBar = ({
  progressPercent,
  color,
  height = 8,
  delay = 0,
}: any) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(widthAnim, {
        toValue: progressPercent,
        duration: 1300,
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
        borderRadius: height / 2,
        overflow: 'hidden',
        width: '100%',
      }}>
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
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
// MACRO BAR
// ─────────────────────────────────────────────────────────────
const AnimatedMacroBar = ({label, current, max, color, delay = 0}: any) => {
  const safeMax = max > 0 ? max : 1;
  const progressPercent = Math.min((current / safeMax) * 100, 100);
  return (
    <View style={styles.macroContainer}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {current}/{max}g
        </Text>
      </View>
      <AnimatedProgressBar
        progressPercent={progressPercent}
        color={color}
        delay={delay}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// WATER DROP
// ─────────────────────────────────────────────────────────────
const WaterDrop = ({
  filled,
  onPress,
}: {
  filled: boolean;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.5,
        useNativeDriver: true,
        tension: 300,
        friction: 5,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 7,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={{transform: [{scale}]}}>
        <Icon
          name="droplet"
          size={24}
          color={filled ? COLORS.primary : '#E5EDFF'}
          style={filled ? styles.waterDropActive : undefined}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// STREAK CIRCLE
// ─────────────────────────────────────────────────────────────
const StreakCircle = ({
  item,
  idx,
  onPress,
}: {
  item: any;
  idx: number;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay: 80 + idx * 60,
        tension: 180,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay: 80 + idx * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [idx]);

  return (
    <TouchableOpacity style={styles.streakDay} onPress={onPress}>
      <Animated.Text
        style={[
          styles.streakDayText,
          item.today && styles.streakDayTextToday,
          {opacity},
        ]}>
        {item.day}
      </Animated.Text>
      <Animated.View
        style={[
          styles.streakCircle,
          item.active && styles.streakCircleActive,
          item.today && !item.active && styles.streakCircleToday,
          {transform: [{scale}], opacity},
        ]}>
        {!!item.active && <Icon name="check" size={14} color={COLORS.white} />}
        {item.today && !item.active && <View style={styles.todayDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// CALORIE RING
// ─────────────────────────────────────────────────────────────
const CalorieRing = ({
  remaining,
  isDeficit,
}: {
  remaining: number;
  isDeficit: boolean;
}) => {
  const {t} = useTranslation();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.spring(scaleIn, {
      toValue: 1,
      delay: 200,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const ringColor = isDeficit ? COLORS.fire : COLORS.primary;
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  return (
    <Animated.View
      style={[styles.mainCircleWrapper, {transform: [{scale: scaleIn}]}]}>
      <Animated.View
        style={[
          styles.mainCircleGlow,
          {backgroundColor: ringColor, opacity: shadowOpacity},
        ]}
      />
      <View style={[styles.mainCircle, {borderColor: ringColor}]}>
        <AnimatedNumber
          value={remaining}
          style={[
            styles.remainingValue,
            {color: isDeficit ? COLORS.fire : COLORS.secondary},
          ]}
          delay={350}
          duration={900}
        />
        <Text style={styles.remainingLabel}>{t('home.remaining')}</Text>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// TIMELINE ITEM
// ─────────────────────────────────────────────────────────────
const TimelineItem = ({item, idx}: {item: any; idx: number}) => {
  const {i18n} = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay: idx * 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 450,
        delay: idx * 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [idx]);

  const localizedDate =
    i18n.language === 'en' && item.date === 'HÔM NAY' ? 'TODAY' : item.date;
  const localizedTitle =
    i18n.language === 'en' && item.title === 'Cập nhật Cân nặng'
      ? 'Weight Check-in'
      : item.title;
  const localizedDesc =
    i18n.language === 'en'
      ? item.desc.replace('Ghi nhận mức cân nặng:', 'Recorded weight:')
      : item.desc;

  return (
    <Animated.View
      style={[styles.timelineRow, {opacity, transform: [{translateX}]}]}>
      <View
        style={[
          styles.timelineNode,
          {backgroundColor: item.bgColor, borderColor: item.color},
        ]}>
        <Icon name={item.icon} size={16} color={item.color} />
      </View>
      <View style={styles.timelineCard}>
        <Text style={styles.timelineDate}>{localizedDate}</Text>
        <Text style={[styles.timelineTitle, {color: COLORS.secondaryDeep}]}>
          {localizedTitle}
        </Text>
        <Text style={styles.timelineDesc}>{localizedDesc}</Text>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// MORNING CARD
// ─────────────────────────────────────────────────────────────
const MorningCard = ({
  firstName,
  onPress,
  period,
}: {
  firstName: string;
  onPress: () => void;
  period: GreetingPeriod;
}) => {
  const {t} = useTranslation();
  const shake = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(shake, {
            toValue: 6,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(shake, {
            toValue: -6,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(shake, {
            toValue: 5,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(shake, {
            toValue: -5,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(shake, {
            toValue: 0,
            duration: 70,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.morningCard,
        {opacity: appear, transform: [{translateX: shake}]},
      ]}>
      <View style={styles.morningCardIcon}>
        <Icon name="sun" size={24} color="#FF9500" />
      </View>
      <View style={styles.morningCardTextWrap}>
        <Text style={styles.morningCardTitle}>
          {t(`home.morning_card.greeting_${period}`, {name: firstName})}
        </Text>
        <Text style={styles.morningCardSub}>
          {t(`home.morning_card.subtitle_${period}`)}
        </Text>
      </View>
      <TouchableOpacity style={styles.morningCardBtn} onPress={onPress}>
        <Text style={styles.morningCardBtnText}>{t('home.morning_card.cta')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// CHALLENGE BANNER
// ─────────────────────────────────────────────────────────────
const ChallengeBanner = ({onPress}: {onPress: () => void}) => {
  const {t} = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.025,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Animated.View
        style={[styles.challengeBanner, {transform: [{scale: pulse}]}]}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
          }}
          style={styles.challengeBg}
          imageStyle={{borderRadius: 20}}>
          <View style={styles.challengeOverlay}>
            <View style={styles.challengeContent}>
              <View style={styles.challengeBadge}>
                <Icon name="award" size={14} color={COLORS.gold} />
                <Text style={styles.challengeBadgeText}>
                  {t('home.challenge.new_event')}
                </Text>
              </View>
              <Text style={styles.challengeTitle}>{t('home.challenge.title')}</Text>
              <Text style={styles.challengeSub}>
                {t('home.challenge.subtitle')}
              </Text>
            </View>
            <View style={styles.challengeBtn}>
              <Icon name="chevron-right" size={24} color={COLORS.secondary} />
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const HomeScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  const greetingPeriod = getGreetingPeriod();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    [],
  );
  const [journeyTimeline, setJourneyTimeline] = useState<JourneyTimelineItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isReminderOn, setIsReminderOn] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [hasSchedule, setHasSchedule] = useState(false);
  const [todayExercises, setTodayExercises] = useState<TodayExerciseItem[]>([]);
  const [weeklyStreak, setWeeklyStreak] = useState<WeeklyStreakItem[]>([]);
  const [showWeightCard, setShowWeightCard] = useState(false);
  const [isWeightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [customDialog, setCustomDialog] = useState<CustomDialogState>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });
  const [activeTab, setActiveTab] = useState(0);

  // State cho Goal Achieved Screen
  const [showGoalAchieved, setShowGoalAchieved] = useState(false);
  const [goalAchievedData, setGoalAchievedData] = useState({
    targetWeight: 0,
    startWeight: 0,
    weeksElapsed: 0,
    goalType: 'lose_weight' as 'lose_weight' | 'gain_weight' | 'build_muscle',
    xpEarned: 500,
  });

  // Modal gọn: giải thích chế độ giữ cân (chỉ sau khi đóng màn Goal Achieved)
  const [showMaintainModeTip, setShowMaintainModeTip] = useState(false);
  const [maintainTipWeightKg, setMaintainTipWeightKg] = useState<number | null>(
    null,
  );
  const shouldShowMaintainTipAfterGoalRef = useRef(false);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-24)).current;
  const xpWidthAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(32)).current;
  const aiPulse = useRef(new Animated.Value(1)).current;
  const currentDateRef = useRef(getVietnamDateString());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!isLoading && dashboardData) {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          delay: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(aiPulse, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(aiPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isLoading, dashboardData]);

  useEffect(() => {
    if (dashboardData?.level_info) {
      const progress = Math.min(
        ((dashboardData.level_info.xp || 0) /
          (dashboardData.level_info.next_level_xp || 200)) *
          100,
        100,
      );
      Animated.timing(xpWidthAnim, {
        toValue: progress,
        duration: 1500,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [dashboardData]);

  const showCustomAlert = (
    title: string,
    message: string,
    type: CustomDialogState['type'] = 'success',
  ) => setCustomDialog({visible: true, title, message, type});
  const hideCustomAlert = () =>
    setCustomDialog((prev: CustomDialogState) => ({...prev, visible: false}));

  const fetchReminderSettings = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/settings/me', {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (response.data.success) {
        const isEnabled = response.data.data.is_water_reminder_enabled;
        setIsReminderOn(isEnabled);
        if (isEnabled) {
          NotificationService.scheduleWaterReminder();
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const dismissGoalAchievedAndMaybeShowMaintainTip = useCallback(() => {
    setShowGoalAchieved(false);
    if (shouldShowMaintainTipAfterGoalRef.current) {
      shouldShowMaintainTipAfterGoalRef.current = false;
      setShowMaintainModeTip(true);
    }
  }, []);

  const syncDateSensitiveData = useCallback(async () => {
    await Promise.all([
      fetchDashboardData(),
      fetchScheduleStatus(),
      initializeWeeklyStreak(),
      checkMorningRoutine(),
      fetchJourneyData(),
    ]);
  }, []);

  const handleDateChangeIfNeeded = useCallback(async () => {
    const today = getVietnamDateString();
    if (currentDateRef.current === today) return;

    currentDateRef.current = today;

    setDashboardData((prev: DashboardData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        water: {...prev.water, current: 0},
      };
    });

    await syncDateSensitiveData();
  }, [syncDateSensitiveData]);

  const loadHomeData = useCallback(
    async (showLoader = false) => {
      currentDateRef.current = getVietnamDateString();

      if (showLoader) {
        setIsLoading(true);
      }

      await NotificationService.requestPermissions();
      await checkMorningRoutine();
      await initializeWeeklyStreak();
      await Promise.all([
        fetchDashboardData(),
        fetchExercisesData(),
        fetchScheduleStatus(),
        fetchJourneyData(),
      ]);
      await fetchReminderSettings();
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    },
    [fetchReminderSettings],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasInBackground =
        appStateRef.current === 'background' ||
        appStateRef.current === 'inactive';

      if (wasInBackground && nextAppState === 'active') {
        handleDateChangeIfNeeded();
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [handleDateChangeIfNeeded]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleDateChangeIfNeeded();
    }, 60000);

    return () => clearInterval(interval);
  }, [handleDateChangeIfNeeded]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData(!hasLoadedOnceRef.current);
    }, [loadHomeData]),
  );

  const checkMorningRoutine = async () => {
    const currentHour = new Date().getHours();
    const todayStr = getVietnamDateString(); // Dùng hàm an toàn
    const lastLogDate = await AsyncStorage.getItem('lastWeightLogDate');
    setShowWeightCard(
      currentHour >= 6 && currentHour <= 10 && lastLogDate !== todayStr,
    );
  };

  const initializeWeeklyStreak = async () => {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dayOfWeek = vnTime.getUTCDay();
    const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/home/weekly-weight-logs', {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.data.success) {
        const {logged_dates, week_start} = response.data.data;
        const [wy, wm, wd] = week_start.split('-').map(Number);

        // Dùng UTC để tính tịnh tiến ngày không bị lệch timezone local
        const data: WeeklyStreakItem[] = WEEK_DAYS.map((day, idx) => {
          const date = new Date(Date.UTC(wy, wm - 1, wd + idx));
          const yy = date.getUTCFullYear();
          const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(date.getUTCDate()).padStart(2, '0');
          const dateStr = `${yy}-${mm}-${dd}`;

          return {
            day,
            active: logged_dates.includes(dateStr),
            today: idx === todayIndex,
          };
        });

        setWeeklyStreak(data);
      }
    } catch (error) {
      console.error('Lỗi load weekly streak:', error);
      const data: WeeklyStreakItem[] = WEEK_DAYS.map((day, idx) => ({
        day,
        active: false,
        today: idx === todayIndex,
      }));
      setWeeklyStreak(data);
    }
  };

  const handleDayPress = (index: number) => {
    if (weeklyStreak[index].today && !weeklyStreak[index].active) {
      setSelectedDayIndex(index);
      setWeightModalVisible(true);
    }
  };

  const handleSaveWeight = async () => {
    if (!weightInput || isNaN(parseFloat(weightInput)))
      return showCustomAlert(
        t('home.dialog.error_title'),
        t('home.weight_modal.invalid_weight'),
        'error',
      );
    setIsSavingWeight(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const todayStr = getVietnamDateString(); // Dùng hàm an toàn
      const loggedWeight = parseFloat(weightInput);
      const goalBefore = Number(dashboardData?.weight?.goal || 0);
      const reachedGoalFallback =
        goalBefore > 0 && Math.abs(loggedWeight - goalBefore) < 0.05;

      const res = await axiosClient.post(
        '/weight/log',
        {weight: loggedWeight, date: todayStr},
        {headers: {Authorization: `Bearer ${token}`}},
      );
      if (res.data.success) {
        const maintenanceApplied = !!res.data?.maintenance?.applied;

        await AsyncStorage.setItem('lastWeightLogDate', todayStr);
        setShowWeightCard(false);
        setWeightModalVisible(false);
        setWeightInput('');
        await initializeWeeklyStreak();
        fetchDashboardData();
        fetchJourneyData();

        // Nếu đạt mục tiêu - Goal Achieved, sau đó modal gọn về chế độ giữ cân
        if (maintenanceApplied || reachedGoalFallback) {
          shouldShowMaintainTipAfterGoalRef.current = true;
          const w =
            maintenanceApplied && res.data?.maintenance?.target_weight != null
              ? Number(res.data.maintenance.target_weight)
              : loggedWeight;
          setMaintainTipWeightKg(Number.isFinite(w) ? w : loggedWeight);
           // Lấy XP + goalInfo từ API (fallback mock)
           const xp = typeof res.data?.xpEarned === 'number' ? res.data.xpEarned : 500;
           const oldGoalInfo = res.data?.oldGoalInfo;
           const validGoalTypes = ['lose_weight', 'gain_weight', 'build_muscle'];
           const goalType = oldGoalInfo?.goalType && validGoalTypes.includes(oldGoalInfo.goalType)
             ? (oldGoalInfo.goalType as 'lose_weight' | 'gain_weight' | 'build_muscle')
             : 'lose_weight';
           let weeksElapsed = 1;
           if (oldGoalInfo?.startDate) {
             const start = new Date(oldGoalInfo.startDate);
             const today = new Date();
             const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
             weeksElapsed = Math.max(1, Math.ceil(diffDays / 7));
           }
 
          setGoalAchievedData({
            targetWeight: loggedWeight,
            startWeight: dashboardData?.weight?.current || loggedWeight,
            xpEarned: xp,
            weeksElapsed,
            goalType,
          });
          setShowGoalAchieved(true);
        } else {
          showCustomAlert(
            t('home.dialog.success_title'),
            t('home.weight_modal.saved_success'),
            'success',
          );
        }
      }
    } catch (e) {
      showCustomAlert(
        t('home.dialog.error_title'),
        t('home.weight_modal.save_failed'),
        'error',
      );
    } finally {
      setIsSavingWeight(false);
      setSelectedDayIndex(null);
    }
  };

  const fetchJourneyData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/home/journey', {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (response.data.success)
        setJourneyTimeline((response.data.data || []) as JourneyTimelineItem[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchScheduleStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axiosClient.get('/schedule/weekly', {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (res.data.success && Object.keys(res.data.data).length > 0) {
        setHasSchedule(true);
        const today = getVietnamDateString(); // Dùng hàm an toàn
        setTodayExercises((res.data.data[today] || []) as TodayExerciseItem[]);
      } else {
        setHasSchedule(false);
      }
    } catch (e) {
      setHasSchedule(false);
    }
  };

  const fetchExercisesData = async () => {
    try {
      const res = await axiosClient.get('/exercises');
      setRecommendations((res?.data?.data || []) as RecommendationItem[]);
    } catch (e) {}
  };

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axiosClient.get('/home/dashboard', {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (res.data.success) setDashboardData(res.data.data as DashboardData);
    } catch (e) {}
  };

  const toggleWaterReminder = async (value: boolean) => {
    setIsReminderOn(value);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axiosClient.post(
        '/settings/update',
        {is_water_reminder_enabled: value},
        {headers: {Authorization: `Bearer ${token}`}},
      );
      value
        ? await NotificationService.scheduleWaterReminder()
        : await NotificationService.cancelWaterReminder();
    } catch (e) {}
  };

  const handleWaterPress = async (index: number) => {
    if (!dashboardData) return;

    await handleDateChangeIfNeeded();

    const latestToday = getVietnamDateString();
    const currentWater =
      currentDateRef.current === latestToday ? dashboardData.water.current : 0;

    let newGlasses = index + 1;
    if (newGlasses === currentWater) newGlasses = index;

    const prev: DashboardData = {...dashboardData};

    setDashboardData((current: DashboardData | null) => {
      if (!current) return current;
      return {
        ...current,
        water: {...current.water, current: newGlasses},
      };
    });

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axiosClient.post(
        '/home/water',
        {glasses: newGlasses, date: latestToday},
        {headers: {Authorization: `Bearer ${token}`}},
      );
      currentDateRef.current = latestToday;
    } catch (e) {
      setDashboardData(prev);
    }
  };

  const onTabPress = (index: number) => {
    setActiveTab(index);
    Animated.spring(tabAnim, {
      toValue: index,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const filteredTimeline =
    activeFilter === 'all'
      ? journeyTimeline
      : journeyTimeline.filter(
          (item: JourneyTimelineItem) => item.type === activeFilter,
        );

  // ── LOADING SKELETON ──
  if (isLoading || !dashboardData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <SkeletonPulse style={styles.avatar} />
            <View style={{flex: 1, gap: 6}}>
              <SkeletonPulse style={{width: 80, height: 12, borderRadius: 6}} />
              <SkeletonPulse
                style={{width: 140, height: 20, borderRadius: 6}}
              />
            </View>
            <SkeletonPulse style={styles.aiCoachBtn} />
          </View>
          <View style={styles.headerXpWrapper}>
            <SkeletonPulse style={styles.xpBarBgHeader} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonPulse
            style={{height: 48, borderRadius: 24, marginBottom: 20}}
          />
          <SkeletonPulse
            style={{height: 110, borderRadius: 20, marginBottom: 20}}
          />
          <View style={styles.summaryCard}>
            <SkeletonPulse
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                alignSelf: 'center',
                marginVertical: 20,
              }}
            />
            <View style={{flexDirection: 'row', gap: 15}}>
              <SkeletonPulse style={{flex: 1, height: 40, borderRadius: 8}} />
              <SkeletonPulse style={{flex: 1, height: 40, borderRadius: 8}} />
              <SkeletonPulse style={{flex: 1, height: 40, borderRadius: 8}} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── DATA ──
  const {goal, food, exercise} = dashboardData.calories || {
    goal: 0,
    food: 0,
    exercise: 0,
  };
  const remaining = goal - food + exercise;
  const isDeficit = remaining < 0;
  const firstName = dashboardData.name?.split(' ')[0] || 'Bạn';
  const tabWidth = (WINDOW_WIDTH - 48) / 2;
  const currentW = dashboardData.weight?.current || 0;
  const goalW = dashboardData.weight?.goal || 0;
  const startW = currentW > goalW ? goalW + 10 : goalW - 10;
  const journeyProgressPercent = Math.min(
    Math.max(
      (Math.abs(startW - currentW) / (Math.abs(startW - goalW) || 1)) * 100,
      0,
    ),
    100,
  );

  let bannerConfig = {
    title: t('home.schedule_banner.create_title'),
    sub: t('home.schedule_banner.create_sub'),
    btnText: t('home.schedule_banner.create_btn'),
    bg: '#EEF2FF',
    border: '#D0DCFE',
    color: COLORS.primary,
  };
  if (hasSchedule) {
    const incomplete = todayExercises.filter((ex: any) => !ex.is_completed);
    if (todayExercises.length > 0) {
      bannerConfig =
        incomplete.length > 0
          ? {
              title: t('home.schedule_banner.pending_title'),
              sub: t('home.schedule_banner.pending_sub', {
                count: incomplete.length,
              }),
              btnText: t('home.schedule_banner.pending_btn'),
              bg: '#FFF0E6',
              border: '#FFD8C2',
              color: COLORS.warning,
            }
          : {
              title: t('home.schedule_banner.done_title'),
              sub: t('home.schedule_banner.done_sub'),
              btnText: t('home.schedule_banner.done_btn'),
              bg: '#E6F9EC',
              border: '#C2F0D1',
              color: COLORS.success,
            };
    } else {
      bannerConfig = {
        title: t('home.schedule_banner.rest_title'),
        sub: t('home.schedule_banner.rest_sub'),
        btnText: t('home.schedule_banner.rest_btn'),
        bg: '#F4F7FC',
        border: '#EDEFF2',
        color: COLORS.textGray,
      };
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ══ HEADER ══ */}
      <Animated.View
        style={[
          styles.header,
          {opacity: headerOpacity, transform: [{translateY: headerTranslateY}]},
        ]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri:
                  dashboardData.avatar ||
                  `https://ui-avatars.com/api/?name=${
                    dashboardData.name || 'User'
                  }&background=2c65e8&color=fff`,
              }}
              style={styles.avatar}
            />
            <View style={{flex: 1}}>
              <Text style={styles.greeting}>
                {t(`home.greeting.${greetingPeriod}`)}
              </Text>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{firstName}</Text>
                <View style={styles.streakBadgeMini}>
                  <Icon name="zap" size={12} color={COLORS.white} />
                  <Text style={styles.streakTextMini}>
                    {dashboardData.current_streak || 0}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Badges')}
                  style={styles.levelBadgeMini}>
                  <Icon name="award" size={12} color={COLORS.white} />
                  <Text style={styles.levelTextMini}>
                    Lv.{dashboardData.level_info?.level || 1}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.aiCoachBtn}
            onPress={() => navigation.navigate('AICoach')}>
            <Animated.View style={{transform: [{scale: aiPulse}]}}>
              <Icon name="message-circle" size={20} color={COLORS.primary} />
            </Animated.View>
            <View style={styles.aiCoachBadge}>
              <Text style={styles.aiCoachBadgeText}>AI</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerXpWrapper}>
          <View style={styles.xpBarBgHeader}>
            <Animated.View
              style={[
                styles.xpBarFillHeader,
                {
                  width: xpWidthAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.xpTextHeader}>
            {dashboardData.level_info?.xp} /{' '}
            {dashboardData.level_info?.next_level_xp} XP
          </Text>
        </View>
      </Animated.View>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: contentOpacity,
          transform: [{translateY: contentTranslateY}],
        }}>
        <View style={styles.tabContainer}>
          <Animated.View
            style={[
              styles.tabPill,
              {
                width: tabWidth - 8,
                transform: [
                  {
                    translateX: tabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, tabWidth + 4],
                    }),
                  },
                ],
              },
            ]}
          />
          {[t('home.tabs.overview'), t('home.tabs.journey')].map((tab, idx) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => onTabPress(idx)}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === idx && styles.tabTextActive,
                ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ════════════ TAB TỔNG QUAN ════════════ */}
        {activeTab === 0 ? (
          <View>
            {!!showWeightCard && (
              <MorningCard
                firstName={firstName}
                period={greetingPeriod}
                onPress={() => setWeightModalVisible(true)}
              />
            )}

            <FadeSlideCard delay={60} style={styles.streakCard}>
              <View style={styles.streakHeader}>
                <Text style={styles.cardTitle}>{t('home.weight_checkin.title')}</Text>
                <Text style={styles.streakSub}>
                  {t('home.weight_checkin.subtitle')}
                </Text>
              </View>
              <View style={styles.streakCirclesRow}>
                {(weeklyStreak || []).map((item, idx) => (
                  <StreakCircle
                    key={idx}
                    item={item}
                    idx={idx}
                    onPress={() => handleDayPress(idx)}
                  />
                ))}
              </View>
            </FadeSlideCard>

            <FadeSlideCard delay={140} style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t('home.calories_summary')}</Text>
                <Icon name="pie-chart" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.calRow}>
                <FadeSlideCard delay={300} from="left" style={styles.calCol}>
                  <Icon name="flag" size={18} color={COLORS.textGray} />
                  <AnimatedNumber
                    value={goal}
                    style={styles.calValue}
                    delay={350}
                    duration={900}
                  />
                  <Text style={styles.calLabel}>{t('home.labels.goal')}</Text>
                </FadeSlideCard>

                <CalorieRing remaining={remaining} isDeficit={isDeficit} />

                <FadeSlideCard delay={300} from="right" style={styles.calCol}>
                  <Icon name="activity" size={18} color={COLORS.textGray} />
                  <AnimatedNumber
                    value={food}
                    style={styles.calValue}
                    delay={350}
                    duration={900}
                  />
                  <Text style={styles.calLabel}>{t('home.labels.food')}</Text>
                </FadeSlideCard>
              </View>

              <View style={styles.macrosRow}>
                <AnimatedMacroBar
                  label={t('home.labels.carbs')}
                  current={dashboardData.macros?.carbs?.current || 0}
                  max={dashboardData.macros?.carbs?.max || 1}
                  color={COLORS.carbs}
                  delay={450}
                />
                <AnimatedMacroBar
                  label={t('home.labels.protein')}
                  current={dashboardData.macros?.protein?.current || 0}
                  max={dashboardData.macros?.protein?.max || 1}
                  color={COLORS.protein}
                  delay={550}
                />
                <AnimatedMacroBar
                  label={t('home.labels.fat')}
                  current={dashboardData.macros?.fat?.current || 0}
                  max={dashboardData.macros?.fat?.max || 1}
                  color={COLORS.fat}
                  delay={650}
                />
              </View>
            </FadeSlideCard>

            <View style={styles.widgetsRow}>
              <FadeSlideCard delay={230} from="left" style={styles.halfCard}>
                <View style={styles.widgetHeader}>
                  <Text style={styles.widgetTitle}>{t('home.labels.burned')}</Text>
                  <Icon name="zap" size={16} color={COLORS.fire} />
                </View>
                <AnimatedNumber
                  value={exercise}
                  style={styles.widgetMainValue}
                  delay={300}
                />
                <Text style={styles.widgetUnitText}>{t('home.units.kcal')}</Text>
                <Text style={styles.widgetSubText}>
                  {t('home.widget.steps_text', {count: dashboardData.steps || 0})}
                </Text>
              </FadeSlideCard>

              <FadeSlideCard delay={280} from="right" style={styles.halfCard}>
                <View style={styles.widgetHeader}>
                  <Text style={styles.widgetTitle}>{t('home.labels.weight')}</Text>
                  <Icon name="trending-down" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.widgetMainValue}>
                  {dashboardData.weight?.current || 0}{' '}
                  <Text style={styles.widgetUnitText}>{t('home.units.kg')}</Text>
                </Text>
                <Text style={styles.widgetSubText}>
                  {t('home.widget.weight_goal', {
                    goal: dashboardData.weight?.goal || 0,
                  })}
                </Text>
              </FadeSlideCard>
            </View>

            <FadeSlideCard delay={330} style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: COLORS.secondary}]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Camera')}>
                <View style={styles.actionIconWrap}>
                  <Icon name="camera" size={22} color={COLORS.white} />
                </View>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.actionBtnTitle}>
                    {t('home.labels.ai_scan')}
                  </Text>
                  <Text style={styles.actionBtnSub}>
                    {t('home.quick_actions.ai_scan_sub')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, {backgroundColor: COLORS.white}]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Nutrition')}>
                <View
                  style={[styles.actionIconWrap, {backgroundColor: '#EEF2FF'}]}>
                  <Icon name="pie-chart" size={22} color={COLORS.primary} />
                </View>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text
                    style={[styles.actionBtnTitle, {color: COLORS.secondary}]}>
                    {t('home.quick_actions.nutrition_title')}
                  </Text>
                  <Text style={[styles.actionBtnSub, {color: COLORS.textGray}]}>
                    {t('home.quick_actions.nutrition_sub')}
                  </Text>
                </View>
              </TouchableOpacity>
            </FadeSlideCard>

            <FadeSlideCard delay={400}>
              <ChallengeBanner
                onPress={() => navigation.navigate('Challenges')}
              />
            </FadeSlideCard>

            <FadeSlideCard delay={460}>
              <TouchableOpacity
                style={[
                  styles.scheduleBanner,
                  {
                    backgroundColor: bannerConfig.bg,
                    borderColor: bannerConfig.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Schedule')}>
                <View style={styles.scheduleBannerContent}>
                  <Text
                    style={[
                      styles.scheduleBannerTitle,
                      {color: bannerConfig.color},
                    ]}>
                    {bannerConfig.title}
                  </Text>
                  <Text style={styles.scheduleBannerSub}>
                    {bannerConfig.sub}
                  </Text>
                </View>
                <View
                  style={[
                    styles.scheduleBannerBtn,
                    {backgroundColor: bannerConfig.color},
                  ]}>
                  <Text style={styles.scheduleBannerBtnText}>
                    {bannerConfig.btnText}
                  </Text>
                </View>
              </TouchableOpacity>
            </FadeSlideCard>

            <FadeSlideCard
              delay={520}
              style={[
                styles.waterCard,
                {flexDirection: 'column', alignItems: 'stretch'},
              ]}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 15,
                }}>
                <View style={{flex: 1}}>
                  <Text style={styles.cardTitle}>
                    {t('home.labels.water_tracker')}
                  </Text>
                  <Text style={styles.waterText}>
                    {t('home.water_tracker.water_amount', {
                      current: dashboardData.water?.current || 0,
                      goal: dashboardData.water?.goal || 8,
                    })}
                  </Text>
                </View>
                <View style={{alignItems: 'center'}}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.textGray,
                      marginBottom: 2,
                    }}>
                    {t('home.water_tracker.reminder')}
                  </Text>
                  <Switch
                    trackColor={{false: '#EDEFF2', true: COLORS.primary}}
                    thumbColor={COLORS.white}
                    onValueChange={toggleWaterReminder}
                    value={isReminderOn}
                    style={{transform: [{scaleX: 0.8}, {scaleY: 0.8}]}}
                  />
                </View>
              </View>
              <View style={styles.waterGlasses}>
                {[...Array(Math.max(8, dashboardData.water?.goal || 8))].map(
                  (_, index) => (
                    <WaterDrop
                      key={index}
                      filled={index < (dashboardData.water?.current || 0)}
                      onPress={() => handleWaterPress(index)}
                    />
                  ),
                )}
              </View>
            </FadeSlideCard>

            <FadeSlideCard delay={580} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {t('home.labels.for_your_goal')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendationScroll}>
                {(recommendations || []).map((item: any, rIdx: number) => {
                  const estCalories = Math.round(
                    (item.met_value || 5) * 65 * (5 / 60),
                  );
                  return (
                    <FadeSlideCard
                      key={item.id}
                      delay={620 + rIdx * 80}
                      from="right">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.recCard}
                        onPress={() =>
                          navigation.navigate('ExerciseDetail', {id: item.id})
                        }>
                        <ImageBackground
                          source={{
                            uri:
                              item.thumbnail_url ||
                              'https://images.unsplash.com/photo-1518611012118-696072aa579a',
                          }}
                          style={styles.recImage}
                          imageStyle={{borderRadius: 16}}>
                          <View style={styles.recOverlay}>
                            <View style={styles.recTag}>
                              <Icon
                                name="zap"
                                size={12}
                                color={COLORS.warning}
                              />
                              <Text style={styles.recTagText}>
                                ~{estCalories} kcal
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.recTitle}>{item.name}</Text>
                              <Text style={styles.recSub}>
                                {item.difficulty}
                              </Text>
                            </View>
                          </View>
                        </ImageBackground>
                      </TouchableOpacity>
                    </FadeSlideCard>
                  );
                })}
              </ScrollView>
            </FadeSlideCard>

            <FadeSlideCard delay={640} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {t('home.labels.today_diary')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Diary')}>
                  <Text style={styles.seeAll}>{t('home.labels.see_all')}</Text>
                </TouchableOpacity>
              </View>
              {(dashboardData.meals || []).map((meal: any, mIdx: number) => (
                <FadeSlideCard
                  key={meal.id}
                  delay={680 + mIdx * 70}
                  style={styles.mealCard}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Diary')}>
                    <View style={styles.mealIconBox}>
                      <Icon name={meal.icon} size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>
                        {(() => {
                          const mealTitleKey = meal?.id
                            ? `diary.meal_titles.${meal.id}`
                            : '';
                          if (!mealTitleKey) return meal.name;
                          const translated = t(mealTitleKey);
                          // i18next sẽ trả về nguyên key khi thiếu bản dịch,
                          // nên fallback về `meal.name`.
                          return translated === mealTitleKey
                            ? meal.name
                            : translated;
                        })()}
                      </Text>
                      <Text style={styles.mealCal}>
                        {meal.cal > 0
                          ? `${meal.cal} ${t('home.units.kcal')}`
                          : t('home.labels.no_food_added')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addFoodBtn}
                    onPress={() =>
                      navigation.navigate('Camera', {mealType: meal.title})
                    }>
                    <Icon name="plus" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </FadeSlideCard>
              ))}
            </FadeSlideCard>
          </View>
        ) : (
          /* ════════════ TAB HÀNH TRÌNH ════════════ */
          <View>
            <FadeSlideCard delay={60} style={styles.journeyGoalCard}>
              <View style={styles.journeyGoalHeader}>
                <View>
                  <Text style={styles.cardTitle}>{t('home.journey.goal_title')}</Text>
                  <Text style={styles.journeyGoalSub}>
                    {t('home.journey.progress_prefix')}{' '}
                    <Text style={{fontWeight: '800', color: COLORS.primary}}>
                      {Math.round(journeyProgressPercent)}%
                    </Text>
                  </Text>
                </View>
                <View style={styles.journeyGoalIconBox}>
                  <Icon name="target" size={24} color={COLORS.primary} />
                </View>
              </View>
              <View style={styles.journeyGoalProgressWrap}>
                <AnimatedProgressBar
                  progressPercent={journeyProgressPercent}
                  color={COLORS.primary}
                  height={12}
                  delay={200}
                />
                <View
                  style={[
                    styles.runningIconWrapper,
                    {left: `${journeyProgressPercent}%`},
                  ]}>
                  <Icon name="figma" size={16} color={COLORS.primary} />
                </View>
              </View>
              <View style={styles.journeyGoalRow}>
                <View>
                  <Text style={styles.journeyGoalLabel}>
                    {t('home.journey.start_label')}
                  </Text>
                  <Text style={styles.journeyGoalValue}>{startW} kg</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.journeyGoalLabel}>
                    {t('home.journey.goal_label')}
                  </Text>
                  <Text style={styles.journeyGoalValue}>{goalW} kg</Text>
                </View>
              </View>
            </FadeSlideCard>

            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, {marginBottom: 10}]}>
                {t('home.journey.milestones_title')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}>
                {FILTER_OPTIONS.map((filter, fIdx) => (
                  <FadeSlideCard
                    key={filter.id}
                    delay={100 + fIdx * 60}
                    from="left">
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        activeFilter === filter.id && styles.filterChipActive,
                      ]}
                      onPress={() => setActiveFilter(filter.id)}>
                      <Icon
                        name={filter.icon}
                        size={14}
                        color={
                          activeFilter === filter.id
                            ? COLORS.white
                            : COLORS.textGray
                        }
                      />
                      <Text
                        style={[
                          styles.filterLabel,
                          activeFilter === filter.id &&
                            styles.filterLabelActive,
                        ]}>
                        {t(filter.label)}
                      </Text>
                    </TouchableOpacity>
                  </FadeSlideCard>
                ))}
              </ScrollView>

              <View style={styles.timelineContainer}>
                {filteredTimeline.length > 0 && (
                  <View style={styles.timelineVerticalLine} />
                )}
                {filteredTimeline.map((item: any, idx: number) => (
                  <TimelineItem
                    key={item.id || idx.toString()}
                    item={item}
                    idx={idx}
                  />
                ))}
                {filteredTimeline.length === 0 && (
                  <Text style={styles.emptyText}>
                    {t('home.journey.empty_activities')}
                  </Text>
                )}
              </View>
            </View>

            <View style={{alignItems: 'center', marginTop: 40, opacity: 0.5}}>
              <Icon name="compass" size={30} color={COLORS.textGray} />
              <Text
                style={{
                  marginTop: 10,
                  color: COLORS.textGray,
                  fontSize: 13,
                  fontWeight: '500',
                }}>
                {t('home.journey.quote')}
              </Text>
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* ══ MODALS ══ */}
      <Modal visible={isWeightModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('home.weight_modal.title')}</Text>
            <Text style={styles.modalSub}>
              {t('home.weight_modal.subtitle')}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.weightInput}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
                autoFocus
              />
              <Text style={styles.unitText}>kg</Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWeightModalVisible(false)}>
                <Text style={styles.cancelText}>{t('home.weight_modal.later')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveWeight}
                disabled={isSavingWeight}>
                {isSavingWeight ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{t('home.weight_modal.save_now')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={customDialog.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <View
              style={[
                styles.dialogIconWrap,
                {
                  backgroundColor:
                    customDialog.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                },
              ]}>
              <Icon
                name={customDialog.type === 'success' ? 'check' : 'x'}
                size={30}
                color={
                  customDialog.type === 'success' ? COLORS.success : COLORS.fire
                }
              />
            </View>
            <Text style={styles.dialogTitle}>{customDialog.title}</Text>
            <Text style={styles.dialogMessage}>{customDialog.message}</Text>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                {
                  backgroundColor:
                    customDialog.type === 'success'
                      ? COLORS.primary
                      : COLORS.fire,
                },
              ]}
              onPress={hideCustomAlert}>
              <Text style={styles.dialogBtnText}>
                {t('home.dialog.ok_understood')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL GỌN: GIỮ CÂN / DUY TRÌ (sau Goal Achieved) ══ */}
      <SettingLevelNotification
        visible={showMaintainModeTip}
        maintainWeightKg={maintainTipWeightKg}
        onClose={() => setShowMaintainModeTip(false)}
        onGoToSettings={() => navigation.navigate('Profile')}
      />

      {/* ══ GOAL ACHIEVED SCREEN ══ */}
      <GoalAchievedScreen
        visible={showGoalAchieved}
        targetWeight={goalAchievedData.targetWeight}
        startWeight={goalAchievedData.startWeight}
        weeksElapsed={goalAchievedData.weeksElapsed}
        goalType={goalAchievedData.goalType}
        xpEarned={goalAchievedData.xpEarned}
        onNewGoal={() => {
          shouldShowMaintainTipAfterGoalRef.current = false;
          setShowGoalAchieved(false);
          navigation.navigate('EditGoal');
        }}
        onMaintain={dismissGoalAchievedAndMaybeShowMaintainTip}
        onClose={dismissGoalAchievedAndMaybeShowMaintainTip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},

  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginRight: 12,
  },
  greeting: {fontSize: 13, color: COLORS.textGray, fontWeight: '500'},
  nameRow: {flexDirection: 'row', alignItems: 'center', marginTop: 2},
  userName: {fontSize: 18, fontWeight: '800', color: COLORS.secondary},

  aiCoachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(44,101,232,0.15)',
  },
  aiCoachBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  aiCoachBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  streakBadgeMini: {
    backgroundColor: COLORS.fire,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  streakTextMini: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  levelBadgeMini: {
    backgroundColor: COLORS.accentGold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  levelTextMini: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  headerXpWrapper: {marginTop: 14},
  xpBarBgHeader: {
    height: 7,
    backgroundColor: '#E0E5ED',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFillHeader: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  xpTextHeader: {
    fontSize: 11,
    color: COLORS.textGray,
    marginTop: 6,
    textAlign: 'right',
    fontWeight: '600',
  },

  scrollContent: {paddingHorizontal: 24, paddingBottom: 120, paddingTop: 20},

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  tabPill: {
    position: 'absolute',
    height: '100%',
    top: 4,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {fontSize: 14, fontWeight: '700', color: COLORS.textGray},
  tabTextActive: {color: COLORS.primary, fontWeight: '800'},

  morningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  morningCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  morningCardTextWrap: {flex: 1},
  morningCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  morningCardSub: {fontSize: 12, color: '#B45309', fontWeight: '500'},
  morningCardBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  morningCardBtnText: {color: COLORS.white, fontSize: 12, fontWeight: '700'},

  streakCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  streakHeader: {marginBottom: 16},
  cardTitle: {fontSize: 17, fontWeight: '700', color: COLORS.secondary},
  streakSub: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 2,
    fontWeight: '500',
  },
  streakCirclesRow: {flexDirection: 'row', justifyContent: 'space-between'},
  streakDay: {alignItems: 'center', gap: 10},
  streakDayText: {fontSize: 13, fontWeight: '600', color: COLORS.textGray},
  streakDayTextToday: {color: COLORS.primary, fontWeight: '800'},
  streakCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCircleActive: {backgroundColor: COLORS.success},
  streakCircleToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  calCol: {alignItems: 'center', width: 62},
  calValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 8,
  },
  calLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 3,
    fontWeight: '500',
  },

  mainCircleWrapper: {alignItems: 'center', justifyContent: 'center'},
  mainCircleGlow: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: COLORS.primary,
  },
  mainCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 8,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  remainingValue: {fontSize: 30, fontWeight: '900', color: COLORS.secondary},
  remainingLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 3,
    fontWeight: '600',
  },

  macrosRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 14},
  macroContainer: {flex: 1},
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  macroLabel: {fontSize: 13, fontWeight: '700', color: COLORS.secondary},
  macroValue: {fontSize: 11, color: COLORS.textGray, fontWeight: '600'},

  widgetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 14,
  },
  halfCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetTitle: {fontSize: 14, fontWeight: '700', color: COLORS.textGray},
  widgetMainValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  widgetUnitText: {fontSize: 14, fontWeight: '600', color: COLORS.textGray},
  widgetSubText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 2,
  },

  quickActionsRow: {flexDirection: 'row', gap: 14, marginBottom: 0},
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  actionBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  challengeBanner: {
    marginTop: 16,
    height: 110,
    borderRadius: 20,
    shadowColor: COLORS.gold,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
  },
  challengeBg: {width: '100%', height: '100%', justifyContent: 'center'},
  challengeOverlay: {
    backgroundColor: 'rgba(10, 35, 92, 0.76)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...StyleSheet.absoluteFillObject,
  },
  challengeContent: {flex: 1},
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  challengeBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 1,
  },
  challengeTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  challengeSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  challengeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
  },
  scheduleBannerContent: {flex: 1},
  scheduleBannerTitle: {fontSize: 16, fontWeight: '800', marginBottom: 4},
  scheduleBannerSub: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500',
    opacity: 0.7,
  },
  scheduleBannerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scheduleBannerBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  waterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  waterText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
    marginTop: 4,
  },
  waterGlasses: {flexDirection: 'row', gap: 4},
  waterDropActive: {
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },

  sectionContainer: {marginTop: 24},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  seeAll: {fontSize: 14, fontWeight: '700', color: COLORS.primary},

  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  mealIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mealInfo: {flex: 1},
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  mealCal: {fontSize: 13, color: COLORS.textGray, fontWeight: '500'},
  addFoodBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  recommendationScroll: {paddingRight: 20, gap: 14},
  recCard: {
    width: 220,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  recImage: {width: '100%', height: '100%', justifyContent: 'flex-end'},
  recOverlay: {
    padding: 14,
    backgroundColor: 'rgba(10, 35, 92, 0.6)',
    borderRadius: 16,
    height: '100%',
    justifyContent: 'space-between',
  },
  recTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  recTagText: {color: COLORS.white, fontSize: 11, fontWeight: '700'},
  recTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  recSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },

  filterContainer: {marginBottom: 20, gap: 10, marginTop: 5},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterLabel: {fontSize: 13, fontWeight: '600', color: COLORS.textGray},
  filterLabelActive: {color: COLORS.white},

  journeyGoalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  journeyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  journeyGoalSub: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 4,
    fontWeight: '500',
  },
  journeyGoalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyGoalProgressWrap: {position: 'relative', marginBottom: 20},
  runningIconWrapper: {position: 'absolute', top: -24, marginLeft: -8},
  journeyGoalRow: {flexDirection: 'row', justifyContent: 'space-between'},
  journeyGoalLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    marginBottom: 4,
  },
  journeyGoalValue: {fontSize: 18, fontWeight: '800', color: COLORS.secondary},

  timelineContainer: {position: 'relative', paddingLeft: 10},
  timelineVerticalLine: {
    position: 'absolute',
    left: 26,
    top: 10,
    bottom: 0,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  timelineNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 2,
    marginRight: 16,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineDate: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timelineTitle: {fontSize: 15, fontWeight: '800', marginBottom: 4},
  timelineDesc: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textGray,
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 35, 92, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#F4F7FC',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 30,
    width: '100%',
  },
  weightInput: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.primary,
    padding: 0,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textGray,
    marginBottom: 5,
    marginLeft: 5,
  },
  modalBtnRow: {flexDirection: 'row', gap: 15, width: '100%'},
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#EDEFF2',
    alignItems: 'center',
  },
  cancelText: {color: COLORS.secondary, fontSize: 15, fontWeight: '700'},
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveText: {color: COLORS.white, fontSize: 15, fontWeight: '700'},

  dialogContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  dialogBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  dialogBtnText: {color: COLORS.white, fontSize: 15, fontWeight: '700'},
});

export default HomeScreen;
