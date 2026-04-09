import React, {useState, useEffect, useRef, useCallback} from 'react';
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
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import NotificationService from '../../services/NotificationService';
import {useTranslation} from 'react-i18next';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const COLORS = {
  primary: '#2c65e8',
  primaryLight: '#EEF4FF',
  secondaryDeep: '#0A235C',
  accentGold: '#FF9F0A',
  textGray: '#A1B1CC',
  textMid: '#64748B',
  white: '#ffffff',
  bg: '#F4F7FC',
  card: '#ffffff',
  border: '#EDEFF2',
  success: '#34C759',
  successLight: '#E8FBF0',
  danger: '#FF3B30',
  pastDay: '#E2E8F0',
};

const GOAL_OPTIONS = [
  {
    id: 'lose_weight',
    label: 'schedule.goals.lose_weight.label',
    icon: 'zap',
    desc: 'schedule.goals.lose_weight.desc',
  },
  {
    id: 'gain_weight',
    label: 'schedule.goals.gain_weight.label',
    icon: 'target',
    desc: 'schedule.goals.gain_weight.desc',
  },
  {
    id: 'maintain_weight',
    label: 'schedule.goals.maintain_weight.label',
    icon: 'activity',
    desc: 'schedule.goals.maintain_weight.desc',
  },
];

const DAY_OPTIONS = [
  {id: 1, label: 'schedule.days.1'},
  {id: 2, label: 'schedule.days.2'},
  {id: 3, label: 'schedule.days.3'},
  {id: 4, label: 'schedule.days.4'},
  {id: 5, label: 'schedule.days.5'},
  {id: 6, label: 'schedule.days.6'},
  {id: 7, label: 'schedule.days.7'},
];

const TIME_OPTIONS = [
  {id: 15, label: 'schedule.times.15.label', sub: 'schedule.times.15.sub', icon: 'clock'},
  {id: 30, label: 'schedule.times.30.label', sub: 'schedule.times.30.sub', icon: 'clock'},
  {id: 45, label: 'schedule.times.45.label', sub: 'schedule.times.45.sub', icon: 'clock'},
];

// ─── Reusable spring-press wrapper ──────────────────────────────────────────
const Pressable = ({
  onPress,
  style,
  children,
  disabled,
  activeOpacity = 1,
}: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 12,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}>
      <Animated.View style={[style, {transform: [{scale}]}]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Section fade-in stagger ─────────────────────────────────────────────────
const FadeInView = ({children, delay = 0, style}: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, {opacity, transform: [{translateY}]}]}>
      {children}
    </Animated.View>
  );
};

// ─── Goal card with animated selection ──────────────────────────────────────
const GoalCard = ({item, isActive, onPress}: any) => {
  const {t} = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1.04 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.timing(bgAnim, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 12,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: isActive ? 1.04 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();

  return (
    <TouchableOpacity
      style={{flex: 1}}
      activeOpacity={1}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.goalCard,
          isActive && styles.goalCardActive,
          {transform: [{scale}]},
        ]}>
        <View
          style={[
            styles.iconBox,
            isActive && {backgroundColor: COLORS.primary},
          ]}>
          <Icon
            name={item.icon}
            size={20}
            color={isActive ? COLORS.white : COLORS.primary}
          />
        </View>
        <Text style={[styles.goalLabel, isActive && {color: COLORS.white}]}>
          {typeof item.label === 'string' && item.label.startsWith('schedule.')
            ? t(item.label)
            : item.label}
        </Text>
        <Text
          style={[
            styles.goalDesc,
            isActive && {color: 'rgba(255,255,255,0.7)'},
          ]}>
          {typeof item.desc === 'string' && item.desc.startsWith('schedule.')
            ? t(item.desc)
            : item.desc}
        </Text>
        {isActive && (
          <View style={styles.goalCheck}>
            <Icon name="check" size={10} color={COLORS.white} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Day pill with animated selection ───────────────────────────────────────
const DayPill = ({item, isActive, onPress}: any) => {
  const {t} = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.1 : 1,
      useNativeDriver: true,
      tension: 260,
      friction: 8,
    }).start();
  }, [isActive]);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Animated.View
        style={[
          styles.dayCircle,
          isActive && styles.dayCircleActive,
          {transform: [{scale}]},
        ]}>
        <Text style={[styles.dayText, isActive && {color: COLORS.white}]}>
          {typeof item.label === 'string' && item.label.startsWith('schedule.')
            ? t(item.label)
            : item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Time card with animated selection ──────────────────────────────────────
const TimeCard = ({item, isActive, onPress}: any) => {
  const {t} = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.04 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [isActive]);

  return (
    <TouchableOpacity style={{flex: 1}} activeOpacity={0.8} onPress={onPress}>
      <Animated.View
        style={[
          styles.timeCard,
          isActive && styles.timeCardActive,
          {transform: [{scale}]},
        ]}>
        {isActive && <View style={styles.timeActiveBar} />}
        <Text style={[styles.timeLabel, isActive && {color: COLORS.primary}]}>
          {typeof item.label === 'string' && item.label.startsWith('schedule.')
            ? t(item.label)
            : item.label}
        </Text>
        <Text
          style={[
            styles.timeSub,
            isActive && {color: COLORS.primary, opacity: 0.7},
          ]}>
          {typeof item.sub === 'string' && item.sub.startsWith('schedule.')
            ? t(item.sub)
            : item.sub}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Generate CTA with idle pulse + bounce ───────────────────────────────────
const GenerateButton = ({onPress, isGenerating, disabled}: any) => {
  const {t} = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;
  const zapRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.02,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    if (!disabled) loop.start();
    return () => loop.stop();
  }, [disabled]);

  const pressIn = () =>
    Animated.spring(pulse, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  const pressOut = () =>
    Animated.spring(pulse, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 8,
    }).start();

  return (
    <Animated.View
      style={[{transform: [{scale: pulse}]}, disabled && {opacity: 0.5}]}>
      <TouchableOpacity
        style={styles.generateBtn}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || isGenerating}
        activeOpacity={1}>
        {isGenerating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.generateBtnText}>{t('schedule.generate_button')}</Text>
            <View style={styles.generateBtnIcon}>
              <Icon name="zap" size={16} color={COLORS.primary} />
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Exercise card in schedule view ─────────────────────────────────────────
const ExerciseCard = ({item, index, onStart, onEdit}: any) => {
  const {t} = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.exCard,
        item.is_completed && styles.exCardCompleted,
        {opacity, transform: [{translateX}]},
      ]}>
      <TouchableOpacity
        style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}
        onPress={onStart}
        disabled={item.is_completed}
        activeOpacity={0.85}>
        <View style={styles.exImgWrap}>
          <Image
            source={{
              uri:
                item.thumbnail_url ||
                'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
            }}
            style={styles.exImg}
          />
          {!item.is_completed && (
            <View style={styles.exPlayBadge}>
              <Icon
                name="play"
                size={10}
                color={COLORS.white}
                style={{marginLeft: 1}}
              />
            </View>
          )}
        </View>
        <View style={styles.exInfo}>
          <Text style={styles.exName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.exTarget}>
            {item.target_sets} {t('schedule.units.sets')} × {item.target_reps}{' '}
            {t('schedule.units.reps')}
          </Text>
          <View style={styles.exTags}>
            <View style={styles.tag}>
              <Icon name="clock" size={11} color={COLORS.textGray} />
              <Text style={styles.tagText}>
                {item.scheduled_time || '08:00'}
              </Text>
            </View>
            <View style={[styles.tag, {backgroundColor: '#FFF4E5'}]}>
              <Icon name="zap" size={11} color={COLORS.accentGold} />
              <Text style={[styles.tagText, {color: COLORS.accentGold}]}>
                {item.met_value * 1.5} {t('schedule.units.kcal')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {!item.is_completed && (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Icon name="more-vertical" size={20} color={COLORS.textGray} />
        </TouchableOpacity>
      )}

      {item.is_completed && (
        <View style={styles.actionCol}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={14} color={COLORS.white} />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// ─── FAB with entrance bounce ─────────────────────────────────────────────────
const FAB = ({onPress}: {onPress: () => void}) => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay: 400,
      tension: 160,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.fab, {transform: [{scale}]}]}>
      <TouchableOpacity
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onPress}
        activeOpacity={0.85}>
        <Icon name="plus" size={26} color={COLORS.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const ScheduleScreen = ({navigation}: any) => {
  const {t, i18n} = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [allExercises, setAllExercises] = useState<any[]>([]);

  const [goal, setGoal] = useState('lose_weight');
  const [availableDays, setAvailableDays] = useState<number[]>([1, 3, 5]);
  const [timePerSession, setTimePerSession] = useState(30);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('edit');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editSets, setEditSets] = useState(3);
  const [editReps, setEditReps] = useState(15);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editDateObj, setEditDateObj] = useState(new Date());
  const [selectedNewExercise, setSelectedNewExercise] = useState<any>(null);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const fetchWeeklySchedule = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/schedule/weekly', {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (response.data.success && Object.keys(response.data.data).length > 0) {
        const data = response.data.data;
        setScheduleData(data);
        setHasSchedule(true);
        const dates = Object.keys(data).sort();
        if (!selectedDate) {
          if (dates.includes(todayStr)) setSelectedDate(todayStr);
          else setSelectedDate(dates[0]);
        }
      } else {
        setHasSchedule(false);
      }
    } catch (error) {
      setHasSchedule(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllExercises = async () => {
    try {
      const response: any = await axiosClient.get('/exercises');
      const data = response?.data?.data || response?.data || response;
      if (Array.isArray(data)) setAllExercises(data);
    } catch (error) {
      console.log('Lỗi lấy danh sách bài tập', error);
    }
  };

  useEffect(() => {
    fetchWeeklySchedule();
    fetchAllExercises();
  }, []);

  const handleGeneratePlan = async () => {
    if (availableDays.length === 0)
      return Alert.alert(
        t('schedule.alerts.title_warning'),
        t('schedule.alerts.select_at_least_one_day'),
      );
    setIsGenerating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        goal,
        available_days: availableDays.sort(),
        time_per_session: timePerSession,
      };
      const response = await axiosClient.post('/schedule/generate', payload, {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (response.data.success) {
        Alert.alert(
          t('schedule.alerts.title_success'),
          t('schedule.alerts.plan_generated_success'),
        );
        await fetchWeeklySchedule();
      }
    } catch (error) {
      Alert.alert(
        t('schedule.alerts.title_error'),
        t('schedule.alerts.plan_generated_failed'),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDay = (dayId: number) => {
    if (availableDays.includes(dayId))
      setAvailableDays(availableDays.filter(d => d !== dayId));
    else setAvailableDays([...availableDays, dayId]);
  };

  const openEditModal = (item: any) => {
    setModalMode('edit');
    setEditingItem(item);
    setEditSets(item.target_sets);
    setEditReps(item.target_reps);
    const datePart = item.scheduled_date.split('T')[0];
    const timePart = item.scheduled_time || '08:00';
    setEditDateObj(new Date(`${datePart}T${timePart}:00`));
    setIsModalVisible(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingItem(null);
    setEditSets(3);
    setEditReps(15);
    setEditDateObj(new Date());
    setSelectedNewExercise(allExercises.length > 0 ? allExercises[0] : null);
    setIsModalVisible(true);
  };

  const showAndroidDatePicker = () => {
    DateTimePickerAndroid.open({
      value: editDateObj,
      onChange: (event, date) => {
        if (event.type === 'set' && date) setEditDateObj(date);
      },
      mode: 'date',
      display: 'calendar',
    });
  };

  const showAndroidTimePicker = () => {
    DateTimePickerAndroid.open({
      value: editDateObj,
      onChange: (event, time) => {
        if (event.type === 'set' && time) setEditDateObj(time);
      },
      mode: 'time',
      is24Hour: true,
    });
  };

  const handleSaveModal = async () => {
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const localDate = new Date(
        editDateObj.getTime() - editDateObj.getTimezoneOffset() * 60000,
      );
      const formattedDate = localDate.toISOString().split('T')[0];
      const formattedTime = `${editDateObj
        .getHours()
        .toString()
        .padStart(2, '0')}:${editDateObj
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      if (modalMode === 'edit') {
        if (!editingItem) return;
        const payload = {
          target_sets: editSets,
          target_reps: editReps,
          scheduled_date: formattedDate,
          scheduled_time: formattedTime,
        };
        const response = await axiosClient.put(
          `/schedule/update/${editingItem.schedule_id}`,
          payload,
          {
            headers: {Authorization: `Bearer ${token}`},
          },
        );
        if (response.data.success && editDateObj.getTime() > Date.now()) {
          await NotificationService.scheduleWorkoutReminder(
            editingItem.schedule_id.toString(),
            editingItem.name,
            editDateObj,
          );
        }
      } else {
        if (!selectedNewExercise)
          return Alert.alert(
            t('schedule.alerts.title_error'),
            t('schedule.alerts.select_exercise_message'),
          );
        const payload = {
          exercise_id: selectedNewExercise.id,
          scheduled_date: formattedDate,
          scheduled_time: formattedTime,
          target_sets: editSets,
          target_reps: editReps,
        };
        const response = await axiosClient.post('/schedule/add', payload, {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (response.data.success && editDateObj.getTime() > Date.now()) {
          const newScheduleId = response.data.data.id;
          await NotificationService.scheduleWorkoutReminder(
            newScheduleId.toString(),
            selectedNewExercise.name,
            editDateObj,
          );
        }
      }

      setIsModalVisible(false);
      setSelectedDate(formattedDate);
      await fetchWeeklySchedule();
    } catch (error) {
      Alert.alert(
        t('schedule.alerts.title_error'),
        t('schedule.alerts.save_failed_message'),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // ==============================================================
  // GIAO DIỆN 1: MÀN HÌNH KHẢO SÁT
  // ==============================================================
  if (!hasSchedule && !isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        {/* HEADER */}
        <FadeInView delay={0} style={styles.headerCompact}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={COLORS.secondaryDeep} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitleCompact}>
              {t('schedule.survey.header.title')}
            </Text>
            <Text style={styles.headerSubCompact}>
              {t('schedule.survey.header.subtitle')}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Icon name="cpu" size={13} color={COLORS.primary} />
            <Text style={styles.headerBadgeText}>{t('schedule.ai')}</Text>
          </View>
        </FadeInView>

        <ScrollView
          style={styles.surveyBody}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.surveyScrollContent}>
          {/* QUESTION 1 */}
          <FadeInView delay={80}>
            <View style={styles.questionRow}>
              <View style={styles.questionNum}>
                <Text style={styles.questionNumText}>1</Text>
              </View>
              <Text style={styles.questionTitle}>
                {t('schedule.survey.question.goal_weekly')}
              </Text>
            </View>
            <View style={styles.goalRow}>
              {GOAL_OPTIONS.map(item => (
                <GoalCard
                  key={item.id}
                  item={item}
                  isActive={goal === item.id}
                  onPress={() => setGoal(item.id)}
                />
              ))}
            </View>
          </FadeInView>

          {/* QUESTION 2 */}
          <FadeInView delay={160}>
            <View style={styles.questionRow}>
              <View style={styles.questionNum}>
                <Text style={styles.questionNumText}>2</Text>
              </View>
              <Text style={styles.questionTitle}>
                {t('schedule.survey.question.available_days')}
              </Text>
            </View>
            <View style={styles.daysRow}>
              {DAY_OPTIONS.map(item => (
                <DayPill
                  key={item.id}
                  item={item}
                  isActive={availableDays.includes(item.id)}
                  onPress={() => toggleDay(item.id)}
                />
              ))}
            </View>
            <Text style={styles.daysHint}>
              {t('schedule.survey.days_selected', {count: availableDays.length})}
            </Text>
          </FadeInView>

          {/* QUESTION 3 */}
          <FadeInView delay={240}>
            <View style={styles.questionRow}>
              <View style={styles.questionNum}>
                <Text style={styles.questionNumText}>3</Text>
              </View>
              <Text style={styles.questionTitle}>
                {t('schedule.survey.question.time_budget')}
              </Text>
            </View>
            <View style={styles.timeRow}>
              {TIME_OPTIONS.map(item => (
                <TimeCard
                  key={item.id}
                  item={item}
                  isActive={timePerSession === item.id}
                  onPress={() => setTimePerSession(item.id)}
                />
              ))}
            </View>
          </FadeInView>
        </ScrollView>

        <FadeInView delay={320} style={styles.footerFloat}>
          <GenerateButton
            onPress={handleGeneratePlan}
            isGenerating={isGenerating}
            disabled={availableDays.length === 0}
          />
        </FadeInView>
      </View>
    );
  }

  // ==============================================================
  // GIAO DIỆN 2: MÀN HÌNH LỊCH TẬP
  // ==============================================================
  const dates = Object.keys(scheduleData).sort();
  const currentExercises = scheduleData[selectedDate] || [];
  const completedCount = currentExercises.filter(
    (e: any) => e.is_completed,
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER CAL */}
      <View style={styles.headerCal}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtnRound}>
            <Icon name="arrow-left" size={20} color={COLORS.secondaryDeep} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitleCompact}>
              {t('schedule.plan_header.title')}
            </Text>
            <Text style={styles.headerSubCompact}>
              {t('schedule.plan_header.subtitle', {count: dates.length})}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setHasSchedule(false)}>
          <Icon name="refresh-ccw" size={15} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('schedule.loading')}</Text>
        </View>
      ) : (
        <>
          {/* CALENDAR STRIP */}
          <View style={styles.calendarStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 16}}>
              {dates.map(dateStr => {
                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleDateString(locale, {
                  weekday: 'short',
                });
                const dayNum = dateObj.getDate();
                const isSelected = selectedDate === dateStr;
                const isPast = dateStr < todayStr;
                const isToday = dateStr === todayStr;
                const allDone = scheduleData[dateStr]?.every(
                  (e: any) => e.is_completed,
                );

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.dateBox,
                      isSelected && styles.dateBoxActive,
                      isPast && !isSelected && styles.dateBoxPast,
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.8}>
                    {isToday && !isSelected && (
                      <View style={styles.todayAccent} />
                    )}
                    <Text
                      style={[
                        styles.dateName,
                        isSelected && {color: COLORS.white},
                        isPast && !isSelected && {color: COLORS.textGray},
                      ]}>
                    {isToday ? t('schedule.calendar.today') : dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dateNum,
                        isSelected && {color: COLORS.white},
                        isPast && !isSelected && {color: COLORS.textGray},
                      ]}>
                      {dayNum}
                    </Text>
                    {!allDone && !isPast && (
                      <View
                        style={[
                          styles.dot,
                          isSelected && {backgroundColor: COLORS.white},
                        ]}
                      />
                    )}
                    {allDone && (
                      <View style={styles.doneDot}>
                        <Icon name="check" size={8} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* EXERCISE LIST */}
          <ScrollView
            style={styles.exerciseList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 110}}>
            {/* List header */}
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>
                  {selectedDate === todayStr
                    ? t('schedule.list.today_workout')
                    : t('schedule.list.workout_on', {
                        date: new Date(selectedDate).toLocaleDateString(locale),
                      })}
                </Text>
                {selectedDate < todayStr && (
                  <Text style={styles.pastWarningText}>
                    {t('schedule.list.past_warning')}
                  </Text>
                )}
              </View>
              <View style={styles.listCountBadge}>
                <Text style={styles.listCount}>
                  {completedCount}/{currentExercises.length}
                </Text>
                <Text style={styles.listCountSub}>
                  {t('schedule.list.completed_suffix')}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            {currentExercises.length > 0 && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (completedCount / currentExercises.length) * 100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPct}>
                  {Math.round((completedCount / currentExercises.length) * 100)}
                  %
                </Text>
              </View>
            )}

            {currentExercises.map((item: any, index: number) => (
              <ExerciseCard
                key={index}
                item={item}
                index={index}
                onStart={() =>
                  navigation.navigate('WorkoutCamera', {exerciseConfig: item})
                }
                onEdit={() => openEditModal(item)}
              />
            ))}

            {currentExercises.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="calendar" size={40} color={COLORS.border} />
                <Text style={styles.emptyText}>
                  {t('schedule.list.empty_title')}
                </Text>
                <Text style={styles.emptySub}>
                  {t('schedule.list.empty_sub')}
                </Text>
              </View>
            )}
          </ScrollView>

          <FAB onPress={openAddModal} />
        </>
      )}

      {/* MODAL */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'edit'
                    ? t('schedule.modal.title_edit')
                    : t('schedule.modal.title_add')}
                </Text>
                {modalMode === 'edit' && editingItem && (
                  <Text style={styles.modalSubtitle}>{editingItem.name}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeModalBtn}>
                <Icon name="x" size={20} color={COLORS.textGray} />
              </TouchableOpacity>
            </View>

            {/* ADD: exercise picker */}
            {modalMode === 'add' && (
              <View style={styles.addExerciseSection}>
                <Text style={styles.sectionLabel}>
                  {t('schedule.modal.exercise_picker_label')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{marginTop: 10}}>
                  {allExercises.length === 0 ? (
                    <Text style={{color: COLORS.textGray, marginVertical: 10}}>
                      {t('schedule.modal.loading_exercises')}
                    </Text>
                  ) : null}
                  {allExercises.map(ex => (
                    <TouchableOpacity
                      key={ex.id}
                      style={[
                        styles.addExCard,
                        selectedNewExercise?.id === ex.id &&
                          styles.addExCardActive,
                      ]}
                      onPress={() => setSelectedNewExercise(ex)}>
                      <Image
                        source={{
                          uri:
                            ex.thumbnail_url ||
                            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
                        }}
                        style={styles.addExImg}
                      />
                      {selectedNewExercise?.id === ex.id && (
                        <View style={styles.addExCheck}>
                          <Icon name="check" size={10} color={COLORS.white} />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.addExName,
                          selectedNewExercise?.id === ex.id && {
                            color: COLORS.primary,
                            fontWeight: '700',
                          },
                        ]}
                        numberOfLines={2}>
                        {ex.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Date + Time pickers */}
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={showAndroidDatePicker}>
                <View
                  style={[
                    styles.dateTimeIcon,
                    {backgroundColor: COLORS.primaryLight},
                  ]}>
                  <Icon name="calendar" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.dateTimeTextWrap}>
                  <Text style={styles.dateTimeLabel}>
                    {t('schedule.modal.date_label')}
                  </Text>
                  <Text style={styles.dateTimeValue}>
                    {editDateObj.toLocaleDateString(locale)}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={showAndroidTimePicker}>
                <View
                  style={[styles.dateTimeIcon, {backgroundColor: '#FFF4E5'}]}>
                  <Icon name="clock" size={16} color={COLORS.accentGold} />
                </View>
                <View style={styles.dateTimeTextWrap}>
                  <Text style={styles.dateTimeLabel}>
                    {t('schedule.modal.time_label')}
                  </Text>
                  <Text style={styles.dateTimeValue}>
                    {editDateObj.getHours().toString().padStart(2, '0')}:
                    {editDateObj.getMinutes().toString().padStart(2, '0')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sets stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperLeft}>
                <Icon
                  name="layers"
                  size={16}
                  color={COLORS.primary}
                  style={{marginRight: 8}}
                />
                <Text style={styles.stepperLabel}>
                  {t('schedule.modal.sets_stepper_label')}
                </Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditSets(Math.max(1, editSets - 1))}>
                  <Icon name="minus" size={18} color={COLORS.secondaryDeep} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{editSets}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditSets(editSets + 1)}>
                  <Icon name="plus" size={18} color={COLORS.secondaryDeep} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Reps stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperLeft}>
                <Icon
                  name="repeat"
                  size={16}
                  color={COLORS.accentGold}
                  style={{marginRight: 8}}
                />
                <Text style={styles.stepperLabel}>
                  {t('schedule.modal.reps_stepper_label')}
                </Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditReps(Math.max(1, editReps - 1))}>
                  <Icon name="minus" size={18} color={COLORS.secondaryDeep} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{editReps}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setEditReps(editReps + 1)}>
                  <Icon name="plus" size={18} color={COLORS.secondaryDeep} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveModalBtn}
              onPress={handleSaveModal}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveModalBtnText}>
                  {modalMode === 'edit'
                    ? t('schedule.modal.save_edit')
                    : t('schedule.modal.save_add')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  loadingText: {color: COLORS.textGray, fontSize: 14, fontWeight: '600'},

  // ── Survey header ──
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrap: {flex: 1},
  headerTitleCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
  },
  headerSubCompact: {fontSize: 12, color: COLORS.textGray, marginTop: 1},
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerBadgeText: {fontSize: 11, fontWeight: '800', color: COLORS.primary},

  // ── Survey body ──
  surveyBody: {flex: 1},
  surveyScrollContent: {padding: 20, paddingBottom: 150},

  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
  },
  questionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionNumText: {fontSize: 13, fontWeight: '900', color: COLORS.white},
  questionTitle: {fontSize: 17, fontWeight: '700', color: COLORS.secondaryDeep},

  // ── Goal cards ──
  goalRow: {flexDirection: 'row', gap: 10},
  goalCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  goalCardActive: {
    backgroundColor: COLORS.secondaryDeep,
    borderColor: COLORS.secondaryDeep,
    shadowColor: COLORS.secondaryDeep,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 4,
  },
  goalDesc: {
    fontSize: 10,
    color: COLORS.textGray,
    textAlign: 'center',
    lineHeight: 14,
  },
  goalCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Days ──
  daysRow: {flexDirection: 'row', justifyContent: 'space-between'},
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
  },
  dayText: {fontSize: 13, fontWeight: '800', color: COLORS.secondaryDeep},
  daysHint: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Time cards ──
  timeRow: {flexDirection: 'row', gap: 10},
  timeCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  timeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  timeActiveBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 4,
  },
  timeSub: {fontSize: 11, color: COLORS.textGray, fontWeight: '500'},

  // ── Footer ──
  footerFloat: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -8},
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 10,
  },
  generateBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 17,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  generateBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  generateBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Calendar header ──
  headerCal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'ios' ? 56 : 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnRound: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Calendar strip ──
  calendarStrip: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  dateBox: {
    width: 58,
    height: 74,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  dateBoxActive: {
    backgroundColor: COLORS.secondaryDeep,
    borderColor: COLORS.secondaryDeep,
    shadowColor: COLORS.secondaryDeep,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dateBoxPast: {
    backgroundColor: COLORS.pastDay,
    borderColor: COLORS.pastDay,
    opacity: 0.65,
  },
  todayAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  dateName: {
    fontSize: 10,
    color: COLORS.textGray,
    marginBottom: 3,
    fontWeight: '700',
  },
  dateNum: {fontSize: 20, color: COLORS.secondaryDeep, fontWeight: '900'},
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  doneDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  // ── Exercise list ──
  exerciseList: {flex: 1, paddingHorizontal: 20, paddingTop: 18},
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  listTitle: {fontSize: 18, fontWeight: '800', color: COLORS.secondaryDeep},
  listCountBadge: {flexDirection: 'row', alignItems: 'baseline'},
  listCount: {fontSize: 16, color: COLORS.primary, fontWeight: '900'},
  listCountSub: {fontSize: 12, color: COLORS.textGray, fontWeight: '600'},
  pastWarningText: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 3,
    fontWeight: '700',
  },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.success,
    width: 36,
    textAlign: 'right',
  },

  // ── Exercise card ──
  exCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exCardCompleted: {opacity: 0.55},
  exImgWrap: {position: 'relative', marginRight: 14},
  exImg: {width: 68, height: 68, borderRadius: 14, backgroundColor: '#eee'},
  exPlayBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  exInfo: {flex: 1},
  exName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 3,
  },
  exTarget: {
    fontSize: 12,
    color: COLORS.textGray,
    marginBottom: 8,
    fontWeight: '500',
  },
  exTags: {flexDirection: 'row', gap: 8},
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {fontSize: 11, fontWeight: '700', color: COLORS.textGray},
  actionCol: {paddingLeft: 6},
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    marginLeft: 6,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.45,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textGray,
    marginTop: 8,
  },
  emptySub: {fontSize: 13, color: COLORS.textGray},

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,35,92,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {fontSize: 20, fontWeight: '900', color: COLORS.secondaryDeep},
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },

  addExerciseSection: {marginBottom: 18},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  addExCard: {
    width: 90,
    marginRight: 12,
    alignItems: 'center',
    opacity: 0.45,
    position: 'relative',
  },
  addExCardActive: {opacity: 1},
  addExImg: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#eee',
    marginBottom: 6,
  },
  addExCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textGray,
    textAlign: 'center',
    lineHeight: 14,
  },

  dateTimeContainer: {flexDirection: 'row', gap: 12, marginBottom: 12},
  dateTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  dateTimeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeTextWrap: {flex: 1},
  dateTimeLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateTimeValue: {fontSize: 14, fontWeight: '800', color: COLORS.secondaryDeep},

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperLeft: {flexDirection: 'row', alignItems: 'center'},
  stepperLabel: {fontSize: 15, fontWeight: '700', color: COLORS.secondaryDeep},
  stepperControls: {flexDirection: 'row', alignItems: 'center', gap: 14},
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    width: 32,
    textAlign: 'center',
  },
  saveModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  saveModalBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default ScheduleScreen;
