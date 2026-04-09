import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axiosClient from '../../api/axiosClient';
// 🔴 IMPORT HOOK ĐA NGÔN NGỮ
import {useTranslation} from 'react-i18next';

// 🔴 IMPORT THƯ VIỆN YOUTUBE PLAYER
import YoutubePlayer from 'react-native-youtube-iframe';

const {width, height} = Dimensions.get('window');

const COLORS = {
  primary: '#4361EE',
  primaryLight: '#EEF2FF',
  secondaryDeep: '#1E293B',
  textGray: '#64748B',
  textLight: '#94A3B8',
  white: '#ffffff',
  bg: '#F8FAFC',
  border: '#F1F5F9',
  success: '#10B981',
  warning: '#F59E0B',
  muscleBg: '#F3E8FF',
  muscleText: '#6D28D9',
  proTipBg: '#EEF2FF',
  rankBgActive: '#F4F7FF',
};

const FALLBACK_DATA = {
  id: 'ex_squat',
  name: 'Barbell/Bodyweight Squat',
  difficulty: 'Beginner',
  estimated_calories: 45,
  target_reps: 15,
  sets: 3,
  image_url:
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1200&auto=format&fit=crop',
  target_muscles: ['Quads', 'Glutes', 'Hamstrings', 'Core'],
  video_url: 'https://www.youtube.com/watch?v=gcNh17Ckjgg',
  ai_model_key: 'squat',
  instructions: [
    'Stand with your feet shoulder-width apart, toes pointing slightly outward.',
    'Keep your back straight, chest up, and engage your core.',
    'Push your hips back and bend your knees as if you are sitting in a chair.',
  ],
};

const getYoutubeVideoId = (url: string) => {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

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
    new Animated.Value(from === 'bottom' ? 40 : 0),
  ).current;
  const translateX = useRef(
    new Animated.Value(from === 'left' ? -40 : from === 'right' ? 40 : 0),
  ).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
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
  }, [value, scale]);

  return (
    <View style={styles.stepperValueBox}>
      <Animated.Text style={[styles.stepperValue, {transform: [{scale}]}]}>
        {value}
      </Animated.Text>
    </View>
  );
};

const ModalStartButton = ({onPress}: {onPress: () => void}) => {
  const {t} = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;
  const arrowX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
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
    );

    const arrowLoop = Animated.loop(
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
    );

    pulseLoop.start();
    arrowLoop.start();

    return () => {
      pulseLoop.stop();
      arrowLoop.stop();
    };
  }, [pulse, arrowX]);

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
        <Text style={styles.startWorkoutText}>
          {t('exerciseDetail.start_workout')}
        </Text>
        <Animated.View style={{transform: [{translateX: arrowX}]}}>
          <Icon name="arrow-right" size={20} color={COLORS.white} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ExerciseDetailScreen = ({navigation, route}: any) => {
  const {t} = useTranslation();
  const [exercise, setExercise] = useState<any>(
    route?.params?.exercise || FALLBACK_DATA,
  );

  const [leaderboard, setLeaderboard] = useState<{
    currentUser: any;
    topUsers: any[];
  }>({
    currentUser: null,
    topUsers: [],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [customSets, setCustomSets] = useState<number>(3);
  const [customReps, setCustomReps] = useState<number>(15);

  // 🔴 BIẾN ANIMATED ĐỂ LƯU TỌA ĐỘ CUỘN VÀ FOOTER
  const scrollY = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(150)).current; // Dùng cho hiệu ứng trượt nút dưới cùng lên
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalIconScale = useRef(new Animated.Value(0)).current;
  const modalIconRotate = useRef(new Animated.Value(-0.3)).current;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const exerciseId = route?.params?.exercise?.id || route?.params?.id;
    let currentAiKey =
      route?.params?.exercise?.ai_model_key || FALLBACK_DATA.ai_model_key;

    if (!exerciseId) return;

    try {
      setLoading(true);

      const exResponse = await axiosClient.get(`/exercises/${exerciseId}`);
      let fetchedExercise = exercise;

      if (exResponse && exResponse.data) {
        fetchedExercise = exResponse.data.data || exResponse.data;
        setExercise(fetchedExercise);
        setCustomSets(fetchedExercise.sets || fetchedExercise.target_sets || 3);
        setCustomReps(fetchedExercise.target_reps || 15);
        currentAiKey = fetchedExercise.ai_model_key || currentAiKey;
      }

      try {
        const lbResponse = await axiosClient.get(
          `/leaderboard/workouts/${currentAiKey}`,
        );
        if (lbResponse.data?.success) {
          setLeaderboard({
            currentUser: lbResponse.data.data.current_user,
            topUsers: lbResponse.data.data.leaderboard.slice(0, 3) || [],
          });
        }
      } catch (lbError) {
        console.log('Chưa có dữ liệu bảng xếp hạng hoặc API lỗi:', lbError);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu bài tập:', error);
    } finally {
      setLoading(false);
      // Kích hoạt hiệu ứng trượt nút Bắt đầu từ dưới lên sau khi load xong data
      Animated.spring(footerTranslateY, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
        delay: 200,
      }).start();
    }
  };

  const safeImageUrl = exercise?.image_url || FALLBACK_DATA.image_url;
  const safeVideoUrl = exercise?.video_url || FALLBACK_DATA.video_url;
  const videoId = getYoutubeVideoId(safeVideoUrl);

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

  const openCustomDialog = () => {
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

  const adjustSets = (amount: number) => {
    setCustomSets(prev => {
      const next = prev + amount;
      if (next < 1) return 1;
      if (next > 10) return 10;
      return next;
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

  const handleStartWorkout = () => {
    closeCustomDialog(() => {
      const exerciseConfig = {
        ...exercise,
        target_sets: customSets,
        target_reps: customReps,
      };
      navigation.navigate('WorkoutCamera', {exerciseConfig});
    });
  };

  const handleOpenLeaderboard = () => {
    navigation.navigate('Leaderboard', {
      exerciseKey: exercise?.ai_model_key || exercise?.id || 'squat',
      exerciseName: exercise?.name || t('exerciseDetail.exercise_default_name'),
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  let parsedMuscles = exercise?.target_muscles || [];
  if (typeof parsedMuscles === 'string') {
    try {
      parsedMuscles = JSON.parse(parsedMuscles);
    } catch {
      parsedMuscles = parsedMuscles.split(',');
    }
  }

  let parsedInstructions = exercise?.instructions || [];
  if (typeof parsedInstructions === 'string') {
    try {
      parsedInstructions = JSON.parse(parsedInstructions);
    } catch {
      parsedInstructions = [parsedInstructions];
    }
  }

  // 🔴 NỘI SUY (INTERPOLATE) MÀU NỀN HEADER THEO SCROLLY
  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)'],
    extrapolate: 'clamp',
  });

  const headerBorderColor = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ['rgba(241, 245, 249, 0)', 'rgba(241, 245, 249, 1)'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* HEADER */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: headerBackgroundColor,
            borderBottomColor: headerBorderColor,
            borderBottomWidth: 1,
          },
        ]}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.secondaryDeep} />
        </TouchableOpacity>
        <Animated.Text
          style={[
            styles.headerTitle,
            {
              opacity: scrollY.interpolate({
                inputRange: [200, 320],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
          numberOfLines={1}>
          {exercise?.name}
        </Animated.Text>
        <View style={styles.headerIconPlaceholder} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}
        scrollEventThrottle={16}>
        {/* HERO CÓ ANIMATION */}
        <FadeSlideCard delay={50} style={styles.heroContainer}>
          <Image source={{uri: safeImageUrl}} style={styles.heroImage} />
          <View style={styles.heroGradientOverlay}>
            <View style={styles.badgeWrapper}>
              <Text style={styles.badgeText}>
                {t('exerciseDetail.badge.strength_training')}
              </Text>
            </View>
            <Text style={styles.exerciseName}>{exercise?.name}</Text>
          </View>
        </FadeSlideCard>

        <View style={styles.bodyContainer}>
          {/* STATS CÓ ANIMATION */}
          <FadeSlideCard delay={150} style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <Icon name="maximize-2" size={16} color={COLORS.primary} />
                <Text style={styles.statLabel}>
                  {t('exerciseDetail.stats.volume_label')}
                </Text>
              </View>
              <Text style={styles.statMainValue}>
                {exercise?.target_reps || 15} {t('exerciseDetail.units.reps')}{' '}
                <Text style={styles.statSubValue}>
                  x {exercise?.sets || exercise?.target_sets || 3}
                </Text>
              </Text>
              <Text style={styles.statFooter}>
                {t('exerciseDetail.stats.sets_footer')}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <Icon name="zap" size={16} color="#EF4444" />
                <Text style={styles.statLabel}>
                  {t('exerciseDetail.stats.energy_label')}
                </Text>
              </View>
              <Text style={styles.statMainValue}>
                ~
                {exercise?.estimated_calories ||
                  exercise?.calories_per_minute * 5 ||
                  45}{' '}
                <Text style={styles.statSubValue}>
                  {t('exerciseDetail.units.kcal')}
                </Text>
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <Icon name="clock" size={16} color={COLORS.secondaryDeep} />
                <Text style={styles.statLabel}>
                  {t('exerciseDetail.stats.duration_label')}
                </Text>
              </View>
              <Text style={styles.statMainValue}>
                {exercise?.duration || '5-7'}{' '}
                <Text style={styles.statSubValue}>
                  {t('exerciseDetail.units.minutes')}
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={handleOpenLeaderboard}>
              <View style={styles.statRow}>
                <Icon name="award" size={16} color={COLORS.primary} />
                <Text style={[styles.statLabel, {color: COLORS.primary}]}>
                  {t('exerciseDetail.leaderboard.global_rank')}
                </Text>
              </View>
              <Text style={[styles.statMainValue, {color: COLORS.primary}]}>
                #{leaderboard.currentUser?.rank || '---'}
              </Text>
            </TouchableOpacity>
          </FadeSlideCard>

          {/* VIDEO CÓ ANIMATION */}
          <FadeSlideCard delay={250}>
            <Text style={styles.sectionTitle}>
              {t('exerciseDetail.sections.master_the_form')}
            </Text>
            <View style={styles.videoCard}>
              {isVideoPlaying && videoId ? (
                <YoutubePlayer
                  height={200}
                  play={true}
                  videoId={videoId}
                  onChangeState={state => {
                    if (state === 'ended') setIsVideoPlaying(false);
                  }}
                />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{flex: 1}}
                  onPress={() => {
                    if (videoId) setIsVideoPlaying(true);
                    else
                      Alert.alert(
                        t('exerciseDetail.errors.title'),
                        t('exerciseDetail.errors.invalid_video'),
                      );
                  }}>
                  <Image
                    source={{
                      uri:
                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` ||
                        safeImageUrl,
                    }}
                    style={styles.videoThumbnail}
                  />
                  <View style={styles.playOverlay}>
                    <View style={styles.playButton}>
                      <Icon
                        name="play"
                        size={28}
                        color={COLORS.white}
                        style={{marginLeft: 4}}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </FadeSlideCard>

          {/* MUSCLES CÓ ANIMATION */}
          {parsedMuscles.length > 0 && (
            <FadeSlideCard delay={350}>
              <Text style={styles.subSectionTitle}>
                {t('exerciseDetail.sections.primary_muscle_targets')}
              </Text>
              <View style={styles.musclesContainer}>
                {parsedMuscles.map((muscle: string, index: number) => (
                  <View key={index} style={styles.muscleChip}>
                    <Text style={styles.muscleChipText}>{muscle.trim()}</Text>
                  </View>
                ))}
              </View>
            </FadeSlideCard>
          )}

          {/* INSTRUCTIONS CÓ ANIMATION */}
          {parsedInstructions.length > 0 && (
            <FadeSlideCard delay={450}>
              <Text style={styles.sectionTitle}>
                {t('exerciseDetail.sections.step_by_step')}
              </Text>
              <View style={styles.stepsContainer}>
                {parsedInstructions.map((step: string, index: number) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>
                        {t('exerciseDetail.steps.step_heading', {
                          step: index + 1,
                        })}
                      </Text>
                      <Text style={styles.stepDesc}>{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </FadeSlideCard>
          )}

          {/* LEADERBOARD CÓ ANIMATION */}
          <FadeSlideCard delay={550} style={styles.leaderboardCard}>
            <View style={styles.lbHeaderRow}>
              <Text style={styles.lbTitle}>
                {t('exerciseDetail.leaderboard.title')}
              </Text>
              <Icon name="users" size={20} color={COLORS.primary} />
            </View>

            {leaderboard.currentUser && (
              <View style={styles.lbItemActive}>
                <View style={styles.avatarPlaceholder}>
                  <Icon name="user" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.lbItemInfo}>
                  <Text style={styles.lbItemName}>
                    {t('exerciseDetail.leaderboard.you_today')}
                  </Text>
                  <Text style={styles.lbItemSub}>
                    {t('exerciseDetail.leaderboard.current_global_sub', {
                      rank: leaderboard.currentUser.rank,
                    })}
                  </Text>
                </View>
                <Text style={styles.lbItemScoreActive}>
                  {leaderboard.currentUser.score}{' '}
                  {t('exerciseDetail.leaderboard.points')}
                </Text>
              </View>
            )}

            {leaderboard.topUsers.length > 0 ? (
              leaderboard.topUsers.map((user: any, idx: number) => (
                <View key={user.user_id || idx} style={styles.lbItem}>
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      {backgroundColor: '#F1F5F9'},
                    ]}>
                    {user.avatar_url ? (
                      <Image
                        source={{uri: user.avatar_url}}
                        style={{width: 40, height: 40, borderRadius: 20}}
                      />
                    ) : (
                      <Icon name="user" size={20} color={COLORS.textGray} />
                    )}
                  </View>
                  <View style={styles.lbItemInfo}>
                    <Text style={styles.lbItemName}>
                      {user.full_name ||
                        t('exerciseDetail.leaderboard.user_placeholder', {
                          index: idx + 1,
                        })}
                    </Text>
                    <Text style={styles.lbItemSub}>
                      {t('exerciseDetail.leaderboard.rank_sub', {
                        rank: idx + 1,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.lbItemScore}>
                    {Math.floor(user.total_score)}{' '}
                    {t('exerciseDetail.leaderboard.points')}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={{
                  textAlign: 'center',
                  color: COLORS.textLight,
                  marginVertical: 10,
                }}>
                Chưa có dữ liệu xếp hạng
              </Text>
            )}

            <TouchableOpacity
              style={styles.lbFooter}
              onPress={handleOpenLeaderboard}>
              <Text style={styles.lbFooterText}>
                {t('exerciseDetail.leaderboard.view_all')}
              </Text>
            </TouchableOpacity>
          </FadeSlideCard>

          {/* PRO TIP CÓ ANIMATION */}
          <FadeSlideCard delay={650} style={styles.proTipCard}>
            <Icon
              name="zap"
              size={20}
              color={COLORS.primary}
              style={{marginBottom: 8}}
            />
            <Text style={styles.proTipTitle}>
              {t('exerciseDetail.pro_tip.title')}
            </Text>
            <Text style={styles.proTipDesc}>
              {exercise?.pro_tip ||
                t('exerciseDetail.pro_tip.default_desc')}
            </Text>
          </FadeSlideCard>
        </View>
      </Animated.ScrollView>

      {/* FOOTER CÓ ANIMATION TRƯỢT LÊN */}
      <Animated.View
        style={[
          styles.footerContainer,
          {transform: [{translateY: footerTranslateY}]},
        ]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openCustomDialog}
          style={styles.startBtn}>
          <View style={styles.startBtnInner}>
            <View style={styles.startBtnIconWrap}>
              <Icon name="zap" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.startBtnText}>
                {t('exerciseDetail.footer.start_button')}
              </Text>
              <Text style={styles.startBtnSubText}>
                {t('exerciseDetail.footer.start_button_sub')}
              </Text>
            </View>
          </View>
          <Icon name="arrow-right" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        animationType="none"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => closeCustomDialog()}>
        <View style={styles.modalOverlayContainer}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {backgroundColor: 'rgba(0, 0, 0, 0.35)', opacity: fadeAnim},
            ]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => closeCustomDialog()}
              activeOpacity={1}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalContent,
              {transform: [{translateY: slideAnim}]},
            ]}>
            <View style={styles.modalHandle} />

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => closeCustomDialog()}>
              <Icon name="x" size={20} color={COLORS.textGray} />
            </TouchableOpacity>

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
              <Text style={styles.modalTitle}>
                {t('exerciseDetail.modal.ready_title')}
              </Text>
              <Text style={styles.modalSubtitle}>{exercise?.name}</Text>
            </View>

            <View style={styles.steppersRow}>
              <View style={styles.stepperContainer}>
                <View style={styles.stepperTopRow}>
                  <Icon name="layers" size={13} color={COLORS.primary} />
                  <Text style={styles.stepperLabel}>
                    {t('exerciseDetail.modal.sets_label')}
                  </Text>
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
                <Text style={styles.stepperHint}>
                  {t('exerciseDetail.modal.sets_hint_max')}
                </Text>
              </View>

              <View style={styles.stepperDivider} />

              <View style={styles.stepperContainer}>
                <View style={styles.stepperTopRow}>
                  <Icon name="repeat" size={13} color={COLORS.warning} />
                  <Text style={styles.stepperLabel}>
                    {t('exerciseDetail.modal.reps_per_set_label')}
                  </Text>
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
                <Text style={styles.stepperHint}>
                  {t('exerciseDetail.modal.reps_hint_max')}
                </Text>
              </View>
            </View>

            <View style={styles.totalEstimateBox}>
              <Icon
                name="activity"
                size={14}
                color={COLORS.primary}
                style={{marginRight: 6}}
              />
              <Text style={styles.totalEstimateText}>
                {t('exerciseDetail.modal.total_volume_label')}:{' '}
                <Text style={{fontWeight: '800', color: COLORS.primary}}>
                  {customSets * customReps} {t('exerciseDetail.units.reps')}
                </Text>{' '}
                <Text style={{color: COLORS.textLight, fontWeight: '600'}}>
                  ({customSets} × {customReps})
                </Text>
              </Text>
            </View>

            <ModalStartButton onPress={handleStartWorkout} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// CÁC STYLE ĐƯỢC GIỮ NGUYÊN 100%
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  header: {
    position: 'absolute',
    top: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerIconPlaceholder: {
    width: 38,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondaryDeep,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  heroContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
  },
  heroImage: {width: '100%', height: '100%', resizeMode: 'cover'},
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  badgeWrapper: {
    backgroundColor: 'rgba(67, 97, 238, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },

  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: -100,
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 15,
    shadowColor: COLORS.textGray,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textGray,
    letterSpacing: 1,
    marginLeft: 6,
  },
  statMainValue: {fontSize: 22, fontWeight: '900', color: COLORS.secondaryDeep},
  statSubValue: {fontSize: 14, fontWeight: '600', color: COLORS.textGray},
  statFooter: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  videoCard: {
    width: '100%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.8,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },

  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    gap: 10,
  },
  muscleChip: {
    backgroundColor: COLORS.muscleBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  muscleChipText: {color: COLORS.muscleText, fontSize: 13, fontWeight: '700'},

  stepsContainer: {marginBottom: 32},
  stepRow: {flexDirection: 'row', marginBottom: 20},
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
  },
  stepContent: {flex: 1},
  stepHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textGray,
    lineHeight: 22,
    fontWeight: '500',
  },

  leaderboardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  lbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  lbTitle: {fontSize: 16, fontWeight: '800', color: COLORS.secondaryDeep},
  lbItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.rankBgActive,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  lbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lbItemInfo: {flex: 1},
  lbItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondaryDeep,
    marginBottom: 2,
  },
  lbItemSub: {fontSize: 12, color: COLORS.textLight, fontWeight: '500'},
  lbItemScoreActive: {fontSize: 14, fontWeight: '800', color: COLORS.primary},
  lbItemScore: {fontSize: 14, fontWeight: '700', color: COLORS.secondaryDeep},
  lbFooter: {
    marginTop: 16,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  lbFooterText: {fontSize: 13, fontWeight: '700', color: COLORS.primary},

  proTipCard: {
    backgroundColor: COLORS.proTipBg,
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
  },
  proTipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginBottom: 8,
  },
  proTipDesc: {
    fontSize: 14,
    color: COLORS.textGray,
    lineHeight: 22,
    fontWeight: '500',
  },

  footerContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -8},
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 15,
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startBtnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  startBtnSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

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

export default ExerciseDetailScreen;
