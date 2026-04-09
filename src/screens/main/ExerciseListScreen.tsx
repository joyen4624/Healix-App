import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

const {height, width} = Dimensions.get('window');

const COLORS = {
  primary: '#4361EE',
  primaryLight: '#EEF2FF',
  secondaryDeep: '#1E293B',
  textGray: '#64748B',
  textLight: '#94A3B8',
  white: '#ffffff',
  bg: '#F8FAFC',
  card: '#ffffff',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.6)',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  loseWeightBg: '#FFE4E6',
  loseWeightText: '#E11D48',
};

// ─── Animated card — fade + slide up with stagger ────────────────────────────
const AnimatedCard = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const delay = index * 90;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        tension: 100,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{opacity, transform: [{translateY}, {scale}]}}>
      {children}
    </Animated.View>
  );
};

// ─── Press-ripple wrapper for card touch ────────────────────────────────────
const PressableCard = ({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 300,
      friction: 12,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Animated.View style={[style, {transform: [{scale}]}]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Stepper number with bounce animation ────────────────────────────────────
const StepperValue = ({value}: {value: number}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          tension: 400,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  return (
    <View style={styles.stepperValueBox}>
      <Animated.Text style={[styles.stepperValue, {transform: [{scale}]}]}>
        {value}
      </Animated.Text>
    </View>
  );
};

// ─── Start button with idle pulse ────────────────────────────────────────────
const StartButton = ({onPress}: {onPress: () => void}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const arrowX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.025,
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
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowX, {
          toValue: 5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowX, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

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
      tension: 150,
      friction: 8,
    }).start();

  return (
    <Animated.View style={{transform: [{scale: pulse}], width: '100%'}}>
      <TouchableOpacity
        style={styles.startWorkoutBtn}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}>
        <Text style={styles.startWorkoutText}>BẮT ĐẦU BÀI TẬP</Text>
        <Animated.View style={{transform: [{translateX: arrowX}]}}>
          <Icon name="arrow-right" size={20} color={COLORS.white} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Header entrance animation ────────────────────────────────────────────────
const AnimatedHeader = ({onBack}: {onBack: () => void}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.header, {opacity, transform: [{translateY}]}]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Icon name="arrow-left" size={22} color={COLORS.secondaryDeep} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>Kế Hoạch Tập Luyện</Text>
        <View style={styles.headerDot} />
      </View>
      <View style={{width: 40}} />
    </Animated.View>
  );
};

// ─── Loading dots animation ───────────────────────────────────────────────────
const LoadingDots = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: -8,
            duration: 350,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(600 - i * 150),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <View style={styles.loadingDotsRow}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.loadingDot, {transform: [{translateY: dot}]}]}
          />
        ))}
      </View>
      <Text style={styles.loadingText}>Đang tải bài tập...</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ExerciseListScreen = ({navigation}: any) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE CHO CUSTOM DIALOG ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [customSets, setCustomSets] = useState(3);
  const [customReps, setCustomReps] = useState(15);

  // --- ANIMATION VALUES (giữ nguyên logic gốc) ---
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal icon spring
  const modalIconScale = useRef(new Animated.Value(0)).current;
  const modalIconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axiosClient.get('/exercises', {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (response.data.success) {
          setExercises(response.data.data);
        }
      } catch (error) {
        console.error('Lỗi fetch exercises:', error);
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExercises();
  }, []);

  // 🔴 HÀM MỞ MODAL VỚI ANIMATION TRƯỢT LÊN
  const openCustomDialog = (item: any) => {
    setSelectedExercise(item);
    setCustomSets(item.target_sets || 3);
    setCustomReps(item.target_reps || 15);
    setIsModalVisible(true);
    modalIconScale.setValue(0);
    modalIconRotate.setValue(-0.3);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Icon pop-in after sheet settles
      Animated.parallel([
        Animated.spring(modalIconScale, {
          toValue: 1,
          tension: 200,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(modalIconRotate, {
          toValue: 0,
          tension: 200,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // 🔴 HÀM ĐÓNG MODAL VỚI ANIMATION TRƯỢT XUỐNG
  const closeCustomDialog = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalVisible(false);
      if (callback) callback();
    });
  };

  const handleStartWorkout = () => {
    closeCustomDialog(() => {
      if (selectedExercise) {
        const customConfig = {
          ...selectedExercise,
          target_sets: customSets,
          target_reps: customReps,
        };
        navigation.navigate('WorkoutCamera', {exerciseConfig: customConfig});
      }
    });
  };

  const navToDetail = (item: any) => {
    navigation.navigate('ExerciseDetail', {exercise: item, id: item.id});
  };

  const navToLeaderboard = (item: any) => {
    navigation.navigate('Leaderboard', {
      exerciseKey: item.ai_model_key || item.id || 'squat',
      exerciseName: item.name || 'BÀI TẬP',
    });
  };

  const adjustSets = (amount: number) => {
    setCustomSets(prev => {
      const newSets = prev + amount;
      if (newSets < 1) return 1;
      if (newSets > 10) return 10;
      return newSets;
    });
  };

  const adjustReps = (amount: number) => {
    setCustomReps(prev => {
      const next = prev + amount;
      if (next < 1) return 1;
      if (next > 50) return 50;
      return next;
    });
  };

  const modalIconSpin = modalIconRotate.interpolate({
    inputRange: [-0.3, 0],
    outputRange: ['-30deg', '0deg'],
  });

  const renderItem = useCallback(
    ({item, index}: any) => {
      const caloriesPerMinute = Math.round((item.met_value || 5) * 1.14);

      let shortDescription = 'Bài tập tự động theo dõi tư thế thông minh.';
      if (item.instructions) {
        if (Array.isArray(item.instructions) && item.instructions.length > 0) {
          shortDescription = item.instructions[0];
        } else if (typeof item.instructions === 'string') {
          shortDescription = item.instructions.substring(0, 100);
        }
      }

      const goalBadgeColor =
        item.goal_category === 'lose_weight'
          ? COLORS.loseWeightBg
          : COLORS.primaryLight;
      const goalTextColor =
        item.goal_category === 'lose_weight'
          ? COLORS.loseWeightText
          : COLORS.primary;

      return (
        <AnimatedCard index={index}>
          <View style={styles.exerciseCard}>
            {/* --- PHẦN THÂN: BẤM VÀO ĐỂ MỞ MODAL TẬP LUYỆN --- */}
            <PressableCard onPress={() => openCustomDialog(item)}>
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri:
                      item.thumbnail_url ||
                      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
                  }}
                  style={styles.thumbnail}
                />
                <View style={styles.imageOverlay} />
                {/* Play overlay hint */}
                <View style={styles.playHint}>
                  <Icon
                    name="play"
                    size={18}
                    color={COLORS.white}
                    style={{marginLeft: 2}}
                  />
                </View>
                <View style={styles.difficultyBadge}>
                  <Icon
                    name="activity"
                    size={12}
                    color={COLORS.white}
                    style={{marginRight: 4}}
                  />
                  <Text style={styles.difficultyText}>
                    {item.difficulty?.toUpperCase() || 'BEGINNER'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.goalBadge,
                      {backgroundColor: goalBadgeColor},
                    ]}>
                    <Text style={[styles.goalText, {color: goalTextColor}]}>
                      {item.goal_category?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.exerciseDesc} numberOfLines={2}>
                  {shortDescription}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Icon name="clock" size={14} color={COLORS.textGray} />
                    <Text style={styles.statChipText}>
                      {item.estimated_duration || '5-7'} min
                    </Text>
                  </View>
                  <View style={styles.statChip}>
                    <Icon name="zap" size={14} color={COLORS.warning} />
                    <Text style={[styles.statChipText, {color: '#B45309'}]}>
                      {caloriesPerMinute} kcal/min
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor: COLORS.primaryLight,
                        marginLeft: 'auto',
                      },
                    ]}>
                    <Text style={styles.repsHighlight}>
                      {item.target_sets}x{item.target_reps}
                    </Text>
                  </View>
                </View>
              </View>
            </PressableCard>

            {/* --- PHẦN CHÂN: THANH CÔNG CỤ --- */}
            <View style={styles.cardFooter}>
              <FooterButton
                bgColor={COLORS.bg}
                iconName="info"
                iconColor={COLORS.textGray}
                label="Chi tiết"
                textColor={COLORS.textGray}
                onPress={() => navToDetail(item)}
              />
              <FooterButton
                bgColor={COLORS.warningLight}
                iconName="award"
                iconColor={COLORS.warning}
                label="Xếp hạng"
                textColor="#B45309"
                onPress={() => navToLeaderboard(item)}
              />
            </View>
          </View>
        </AnimatedCard>
      );
    },
    [exercises],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <AnimatedHeader onBack={() => navigation.goBack()} />

      {isLoading ? (
        <LoadingDots />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 🔴 CUSTOM DIALOG TÙY CHỈNH SETS (DẠNG BOTTOM SHEET VỚI ANIMATION) */}
      <Modal
        animationType="none"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => closeCustomDialog()}>
        <View style={styles.modalOverlayContainer}>
          {/* Nền đen mờ dần */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {backgroundColor: COLORS.overlay, opacity: fadeAnim},
            ]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => closeCustomDialog()}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Nội dung trượt lên từ dưới */}
          <Animated.View
            style={[
              styles.modalContent,
              {transform: [{translateY: slideAnim}]},
            ]}>
            {/* Drag handle */}
            <View style={styles.modalHandle} />

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => closeCustomDialog()}>
              <Icon name="x" size={20} color={COLORS.textGray} />
            </TouchableOpacity>

            {/* Modal header với icon animation */}
            <View style={styles.modalHeader}>
              <Animated.View
                style={[
                  styles.modalIconBg,
                  {
                    transform: [
                      {scale: modalIconScale},
                      {rotate: modalIconSpin},
                    ],
                  },
                ]}>
                <Icon
                  name="play"
                  size={24}
                  color={COLORS.primary}
                  style={{marginLeft: 4}}
                />
              </Animated.View>
              <Text style={styles.modalTitle}>Sẵn sàng luyện tập!</Text>
              <Text style={styles.modalSubtitle}>{selectedExercise?.name}</Text>
            </View>

            {/* Sets + Reps steppers side by side */}
            <View style={styles.steppersRow}>
              {/* SETS */}
              <View style={styles.stepperContainer}>
                <View style={styles.stepperTopRow}>
                  <Icon name="layers" size={13} color={COLORS.primary} />
                  <Text style={styles.stepperLabel}>Sets</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      customSets <= 1 && styles.stepBtnDisabled,
                    ]}
                    onPress={() => adjustSets(-1)}
                    disabled={customSets <= 1}>
                    <Icon
                      name="minus"
                      size={20}
                      color={
                        customSets <= 1
                          ? COLORS.textLight
                          : COLORS.secondaryDeep
                      }
                    />
                  </TouchableOpacity>
                  <StepperValue value={customSets} />
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      customSets >= 10 && styles.stepBtnDisabled,
                    ]}
                    onPress={() => adjustSets(1)}
                    disabled={customSets >= 10}>
                    <Icon
                      name="plus"
                      size={20}
                      color={
                        customSets >= 10
                          ? COLORS.textLight
                          : COLORS.secondaryDeep
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.stepperHint}>tối đa 10</Text>
              </View>

              <View style={styles.stepperDivider} />

              {/* REPS */}
              <View style={styles.stepperContainer}>
                <View style={styles.stepperTopRow}>
                  <Icon name="repeat" size={13} color={COLORS.warning} />
                  <Text style={styles.stepperLabel}>Reps / Set</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      customReps <= 1 && styles.stepBtnDisabled,
                    ]}
                    onPress={() => adjustReps(-1)}
                    disabled={customReps <= 1}>
                    <Icon
                      name="minus"
                      size={20}
                      color={
                        customReps <= 1
                          ? COLORS.textLight
                          : COLORS.secondaryDeep
                      }
                    />
                  </TouchableOpacity>
                  <StepperValue value={customReps} />
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      customReps >= 50 && styles.stepBtnDisabled,
                    ]}
                    onPress={() => adjustReps(1)}
                    disabled={customReps >= 50}>
                    <Icon
                      name="plus"
                      size={20}
                      color={
                        customReps >= 50
                          ? COLORS.textLight
                          : COLORS.secondaryDeep
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.stepperHint}>tối đa 50</Text>
              </View>
            </View>

            {/* Total volume summary */}
            <View style={styles.totalEstimateBox}>
              <Icon
                name="activity"
                size={14}
                color={COLORS.primary}
                style={{marginRight: 6}}
              />
              <Text style={styles.totalEstimateText}>
                Tổng khối lượng:{' '}
                <Text style={{fontWeight: '800', color: COLORS.primary}}>
                  {customSets * customReps} Reps
                </Text>
                {'  '}
                <Text style={{color: COLORS.textLight, fontWeight: '600'}}>
                  ({customSets} × {customReps})
                </Text>
              </Text>
            </View>

            <StartButton onPress={handleStartWorkout} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Footer button with press animation ──────────────────────────────────────
const FooterButton = ({
  bgColor,
  iconName,
  iconColor,
  label,
  textColor,
  onPress,
}: {
  bgColor: string;
  iconName: string;
  iconColor: string;
  label: string;
  textColor: string;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();

  return (
    <TouchableOpacity
      style={{flex: 1}}
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.footerBtn,
          {backgroundColor: bgColor, transform: [{scale}]},
        ]}>
        <Icon name={iconName} size={16} color={iconColor} />
        <Text style={[styles.footerBtnText, {color: textColor}]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  loadingDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 4,
    color: COLORS.textGray,
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
  },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },

  listContent: {paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10},

  // Card
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: COLORS.secondaryDeep,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageContainer: {width: '100%', height: 180, position: 'relative'},
  thumbnail: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  playHint: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  infoContainer: {padding: 20, paddingBottom: 16},
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    flex: 1,
    marginRight: 12,
  },
  goalBadge: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8},
  goalText: {fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},

  exerciseDesc: {
    fontSize: 14,
    color: COLORS.textGray,
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statChipText: {fontSize: 12, fontWeight: '700', color: COLORS.textGray},
  repsHighlight: {fontSize: 13, fontWeight: '900', color: COLORS.primary},

  cardFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  footerBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  footerBtnText: {fontSize: 14, fontWeight: '800'},

  // Modal
  modalOverlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 20,
  },
  closeModalBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
  },
  modalHeader: {alignItems: 'center', marginBottom: 24},
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: COLORS.textGray,
    fontWeight: '500',
  },

  stepperContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.bg,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  stepperDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  stepperTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepperHint: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 8,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondaryDeep,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepBtnDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
  },
  stepperValueBox: {
    width: 48,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
  },
  totalEstimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginBottom: 24,
  },
  totalEstimateText: {
    fontSize: 13,
    color: COLORS.secondaryDeep,
    fontWeight: '600',
  },

  startWorkoutBtn: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  startWorkoutText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default ExerciseListScreen;
