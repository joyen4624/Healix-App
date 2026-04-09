import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import TrackPlayer, {Capability} from 'react-native-track-player';
import {WebView} from 'react-native-webview';
import XpGainModal from '../../components/XpGainModal';

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  secondaryDeep: '#1E293B',
  textGray: '#64748B',
  white: '#ffffff',
  bg: '#F8FAFC',
  success: '#10B981',
  successLight: '#D1FAE5',
  errorBg: '#FEE2E2',
  errorText: '#DC2626',
  cardBorder: '#E2E8F0',
  overlay: 'rgba(0, 0, 0, 0.65)',
  warn: '#F59E0B',
};

const WEBSOCKET_URL = 'ws://192.168.2.20:8000/ws/workout';

const SKELETON_HTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; overflow: hidden; background-color: transparent; }
        canvas { display: block; width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <canvas id="skeletonCanvas"></canvas>
      <script>
        const canvas = document.getElementById('skeletonCanvas');
        const ctx = canvas.getContext('2d');
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize();
        const POSE_CONNECTIONS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
        const FLIP_X = true;
        const FLIP_Y = false;
        function getX(val) { return (FLIP_X ? 1 - val : val) * canvas.width; }
        function getY(val) { return (FLIP_Y ? 1 - val : val) * canvas.height; }
        window.drawSkeleton = function(landmarks, color) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (!landmarks || landmarks.length === 0) return;
          ctx.strokeStyle = color || '#3B82F6';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          POSE_CONNECTIONS.forEach(pair => {
            const s = pair[0], e = pair[1];
            if (landmarks[s] && landmarks[e]) {
              ctx.beginPath();
              ctx.moveTo(getX(landmarks[s].x), getY(landmarks[s].y));
              ctx.lineTo(getX(landmarks[e].x), getY(landmarks[e].y));
              ctx.stroke();
            }
          });
          ctx.fillStyle = color || '#3B82F6';
          landmarks.forEach(lm => {
            ctx.beginPath();
            ctx.arc(getX(lm.x), getY(lm.y), 4, 0, 2 * Math.PI);
            ctx.fill();
          });
        };
      </script>
    </body>
  </html>
`;

// ─── LIVE DOT — nhấp nháy pulse ──────────────────────────────
const LiveDot = ({paused}: {paused: boolean}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.7,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [paused]);

  return (
    <View
      style={{
        width: 10,
        height: 10,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: paused ? COLORS.textGray : COLORS.errorText,
          opacity: paused ? 0.4 : opacity,
          transform: [{scale: paused ? 1 : pulse}],
        }}
      />
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: paused ? COLORS.textGray : COLORS.errorText,
        }}
      />
    </View>
  );
};

// ─── ANIMATED PROGRESS BAR ───────────────────────────────────
const ProgressBar = ({percent, color}: {percent: number; color: string}) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);
  return (
    <View style={styles.progressTrack}>
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

// ─── FEEDBACK BANNER — slide down ────────────────────────────
const FeedbackBanner = ({
  status,
  message,
}: {
  status: 'normal' | 'good' | 'bad';
  message: string;
}) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'normal') {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -50,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status, message]);

  const isGood = status === 'good';
  const bgColor = isGood ? COLORS.successLight : COLORS.errorBg;
  const textColor = isGood ? COLORS.success : COLORS.errorText;
  const iconName = isGood ? 'check-circle' : 'alert-circle';

  return (
    <Animated.View
      style={[
        styles.alertBanner,
        {backgroundColor: bgColor, opacity, transform: [{translateY}]},
      ]}>
      <Icon name={iconName} size={16} color={textColor} />
      <Text style={[styles.alertText, {color: textColor}]}>{message}</Text>
    </Animated.View>
  );
};

// ─── SET CIRCLE — pop-in spring ──────────────────────────────
const SetCircle = ({
  index,
  state,
}: {
  index: number;
  state: 'done' | 'active' | 'pending';
}) => {
  const scale = useRef(new Animated.Value(state === 'done' ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay: index * 60,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [state]);

  const bgColor = state === 'pending' ? COLORS.cardBorder : COLORS.primary;
  const opacity = state === 'active' ? 0.85 : 1;

  return (
    <Animated.View
      style={[
        styles.setCircle,
        {backgroundColor: bgColor, opacity, transform: [{scale}]},
      ]}>
      {state === 'done' ? (
        <Icon name="check" size={13} color={COLORS.white} />
      ) : (
        <Text
          style={[
            styles.setCircleText,
            {color: state === 'pending' ? COLORS.textGray : COLORS.white},
          ]}>
          {index + 1}
        </Text>
      )}
    </Animated.View>
  );
};

// ─── REST COUNTDOWN RING ─────────────────────────────────────
const RestCountdownRing = ({
  countdown,
  total = 30,
}: {
  countdown: number;
  total?: number;
}) => {
  const size = 140;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(countdown / total)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: countdown / total,
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [countdown]);

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
      }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: COLORS.cardBorder,
        }}
      />
      {/* Timer text in center */}
      <View style={{alignItems: 'center'}}>
        <Text style={styles.restTimerText}>
          {countdown.toString().padStart(2, '0')}
        </Text>
        <Text style={styles.restTimerUnit}>giây</Text>
      </View>
      {/* Animated colored ring overlay - approximate via border */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: COLORS.primary,
          opacity: progress,
        }}
      />
    </View>
  );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────
const WorkoutCameraScreen = ({navigation, route}: any) => {
  const defaultTargetReps =
    parseInt(route?.params?.exerciseConfig?.target_reps) || 20;
  const defaultTargetSets =
    parseInt(route?.params?.exerciseConfig?.target_sets) || 3;

  const exercise = {
    name: route?.params?.exerciseConfig?.name || 'Squat Cơ Bản',
    target_reps: defaultTargetReps,
    target_sets: defaultTargetSets,
    ai_model_key: route?.params?.exerciseConfig?.ai_model_key || 'squat',
  };

  const [totalReps, setTotalReps] = useState(0);
  const [feedback, setFeedback] = useState('Đang khởi động AI...');
  const [feedbackStatus, setFeedbackStatus] = useState<
    'normal' | 'good' | 'bad'
  >('normal');
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(30);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishData, setFinishData] = useState({cals: 0});
  const [xpModalConfig, setXpModalConfig] = useState({
    visible: false,
    xpEarned: 0,
    currentXp: 0,
    nextLevelXp: 200,
    level: 1,
    isLevelUp: false,
    oldRank: 0,
    newRank: 0,
  });

  const startTimeRef = useRef<number>(Date.now());
  const previousSetRef = useRef<number>(1);
  const restTimerRef = useRef<any>(null);

  // Animations
  const repScaleAnim = useRef(new Animated.Value(1)).current;
  const dashboardSlide = useRef(new Animated.Value(30)).current;
  const dashboardOpacity = useRef(new Animated.Value(0)).current;
  const finishCardScale = useRef(new Animated.Value(0.85)).current;
  const finishCardOpacity = useRef(new Animated.Value(0)).current;
  const restCardScale = useRef(new Animated.Value(0.9)).current;
  const endBtnPulse = useRef(new Animated.Value(1)).current;

  const isRestingRef = useRef(false);
  const isPausedRef = useRef(false);
  useEffect(() => {
    isRestingRef.current = isResting;
  }, [isResting]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);
  const camera = useRef<Camera>(null);

  const device = useCameraDevice('front');
  const format = useCameraFormat(device, [
    {videoResolution: {width: 1280, height: 720}},
    {fps: 30},
  ]);

  let calculatedSet = Math.floor(totalReps / exercise.target_reps) + 1;
  if (calculatedSet > exercise.target_sets)
    calculatedSet = exercise.target_sets;
  const currentSet = totalReps === 0 ? 1 : calculatedSet;
  const totalTargetReps = exercise.target_reps * exercise.target_sets;
  const progressPercent = Math.min(
    100,
    Math.round((totalReps / totalTargetReps) * 100),
  );

  // Dashboard entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(dashboardOpacity, {
        toValue: 1,
        duration: 550,
        delay: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(dashboardSlide, {
        toValue: 0,
        duration: 550,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // End button subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(endBtnPulse, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(endBtnPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Finish modal entrance
  useEffect(() => {
    if (showFinishModal) {
      finishCardScale.setValue(0.85);
      finishCardOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(finishCardScale, {
          toValue: 1,
          tension: 120,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(finishCardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFinishModal]);

  // Rest card entrance
  useEffect(() => {
    if (isResting) {
      restCardScale.setValue(0.88);
      Animated.spring(restCardScale, {
        toValue: 1,
        tension: 110,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }
  }, [isResting]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !isSaving &&
        !showFinishModal &&
        !isPausedRef.current &&
        !isRestingRef.current
      ) {
        setWorkoutTime(prev => prev + 1);
      }
    }, 1000);

    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({capabilities: [Capability.Play]});
      } catch (e) {}
    })();

    return () => {
      clearInterval(timer);
      TrackPlayer.reset();
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (ws.current) ws.current.close();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const playVoice = async (base64Audio: string) => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: 'voice',
        url: `data:audio/mp3;base64,${base64Audio}`,
        title: 'AI',
        artist: 'SelfCare',
      });
      await TrackPlayer.play();
    } catch (error) {}
  };

  useEffect(() => {
    if (!hasPermission) return;
    ws.current = new WebSocket(`${WEBSOCKET_URL}/${exercise.ai_model_key}`);
    ws.current.onopen = () => {
      setIsConnected(true);
      setFeedback('Sẵn sàng!');
      setFeedbackStatus('good');
    };
    ws.current.onmessage = event => {
      if (isRestingRef.current || isPausedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.reps !== undefined && data.reps > totalReps) {
          setTotalReps(data.reps);
          Vibration.vibrate(50);
          Animated.sequence([
            Animated.timing(repScaleAnim, {
              toValue: 1.35,
              duration: 90,
              useNativeDriver: true,
            }),
            Animated.spring(repScaleAnim, {
              toValue: 1,
              friction: 3,
              tension: 180,
              useNativeDriver: true,
            }),
          ]).start();
        }
        if (data.feedback) setFeedback(data.feedback);
        if (data.is_good_form === true) setFeedbackStatus('good');
        else if (data.is_good_form === false) {
          if (feedbackStatus !== 'bad') Vibration.vibrate([0, 100, 100, 100]);
          setFeedbackStatus('bad');
        } else setFeedbackStatus('normal');

        if (webViewRef.current) {
          const color =
            data.is_good_form === false ? COLORS.errorText : COLORS.primary;
          if (data.landmarks && data.landmarks.length > 0) {
            webViewRef.current.injectJavaScript(
              `window.drawSkeleton(${JSON.stringify(
                data.landmarks,
              )}, '${color}'); true;`,
            );
          } else {
            webViewRef.current.injectJavaScript(
              `window.drawSkeleton([], '${color}'); true;`,
            );
          }
        }
        if (data.audio) playVoice(data.audio);
      } catch (error) {}
    };
    ws.current.onerror = () => {
      setFeedback('Mất kết nối Server!');
      setFeedbackStatus('bad');
    };
    const captureInterval = setInterval(async () => {
      if (
        ws.current?.readyState === WebSocket.OPEN &&
        camera.current &&
        !isSaving &&
        !isRestingRef.current &&
        !isPausedRef.current
      ) {
        try {
          const photo = await camera.current.takeSnapshot({quality: 60});
          const base64Image = await RNFS.readFile(photo.path, 'base64');
          ws.current.send(base64Image);
          await RNFS.unlink(photo.path);
        } catch (err) {}
      }
    }, 200);
    return () => clearInterval(captureInterval);
  }, [hasPermission, totalReps]);

  const saveWorkoutData = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsPaused(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const response = await axiosClient.post(
        '/diary/workout-complete',
        {
          user_id: userId,
          exercise_key: exercise.ai_model_key,
          duration: workoutTime,
          reps: totalReps,
        },
        {headers: {Authorization: `Bearer ${token}`}},
      );
      if (response.data.success) {
        const d = response.data.data;
        setFinishData({cals: d?.calories || d?.calories_burned || 0});
        setXpModalConfig({
          visible: false,
          xpEarned: d?.xp_earned || 20,
          currentXp: d?.current_xp || 0,
          nextLevelXp: d?.next_level_xp || 200,
          level: d?.new_level || 1,
          isLevelUp: d?.leveled_up || false,
          oldRank: d?.old_rank || 0,
          newRank: d?.new_rank || 0,
        });
        setShowFinishModal(true);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (totalReps > 0 && totalReps % exercise.target_reps === 0) {
      if (totalReps < totalTargetReps && currentSet > previousSetRef.current) {
        Vibration.vibrate(500);
        setIsResting(true);
        setRestCountdown(30);
        previousSetRef.current = currentSet;
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        restTimerRef.current = setInterval(() => {
          setRestCountdown(prev => {
            if (prev <= 1) {
              clearInterval(restTimerRef.current);
              setIsResting(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (
        totalReps >= totalTargetReps &&
        !isSaving &&
        !showFinishModal
      ) {
        Vibration.vibrate([0, 200, 100, 500]);
        saveWorkoutData();
      }
    }
  }, [totalReps]);

  const handleCloseXpModal = () => {
    setXpModalConfig({...xpModalConfig, visible: false});
    navigation.navigate('RankUp', {
      oldRank: xpModalConfig.oldRank,
      newRank: xpModalConfig.newRank,
      exerciseKey: exercise.ai_model_key,
      exerciseName: exercise.name,
    });
  };

  if (!hasPermission || !device) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{
            marginTop: 12,
            color: COLORS.textGray,
            fontWeight: '600',
            fontSize: 15,
          }}>
          Đang khởi động camera...
        </Text>
      </View>
    );
  }

  const repsInCurrentSet = totalReps % exercise.target_reps;
  const repsProgressPercent = (repsInCurrentSet / exercise.target_reps) * 100;
  const progressColor =
    progressPercent >= 100
      ? COLORS.success
      : progressPercent >= 50
      ? COLORS.primary
      : COLORS.primaryDark;

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.secondaryDeep} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Workout Session</Text>
          <View style={styles.connBadge}>
            <View
              style={[
                styles.connDot,
                {backgroundColor: isConnected ? COLORS.success : COLORS.warn},
              ]}
            />
            <Text
              style={[
                styles.connText,
                {color: isConnected ? COLORS.success : COLORS.warn},
              ]}>
              {isConnected ? 'AI Connected' : 'Connecting...'}
            </Text>
          </View>
        </View>
        <View style={{width: 32}} />
      </View>

      <View style={styles.bodyWrapper}>
        {/* FEEDBACK BANNER — slide down */}
        <FeedbackBanner status={feedbackStatus} message={feedback} />

        {/* CAMERA CARD */}
        <View style={styles.cameraCard}>
          <Camera
            ref={camera}
            style={[StyleSheet.absoluteFill, {transform: [{rotate: '180deg'}]}]}
            device={device}
            format={format}
            isActive={!isSaving && !isResting && !isPaused}
            photo={true}
            video={false}
            audio={false}
            pixelFormat="yuv"
            resizeMode="cover"
            onError={error => console.log('Camera Error:', error)}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{html: SKELETON_HTML}}
              style={{
                backgroundColor: 'transparent',
                flex: 1,
                transform: [{rotate: '180deg'}],
              }}
              scrollEnabled={false}
            />
          </View>

          {/* Live badge */}
          <View style={styles.liveBadge}>
            <LiveDot paused={isPaused} />
            <Text style={styles.liveText}>
              {isPaused ? 'PAUSED' : 'LIVE VIEW'}
            </Text>
          </View>

          {/* Corner progress arc */}
          <View style={styles.cameraProgressBadge}>
            <Text style={styles.cameraProgressText}>{progressPercent}%</Text>
          </View>

          {isPaused && (
            <View style={styles.pausedOverlay}>
              <View style={styles.pausedIconWrap}>
                <Icon name="pause" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.pausedText}>Đã Tạm Dừng</Text>
              <Text style={styles.pausedSub}>Nhấn ▶ để tiếp tục</Text>
            </View>
          )}
        </View>

        {/* DASHBOARD — slide up entrance */}
        <Animated.View
          style={[
            styles.dashboardSection,
            {
              opacity: dashboardOpacity,
              transform: [{translateY: dashboardSlide}],
            },
          ]}>
          {/* Title + timer row */}
          <View style={styles.titleRow}>
            <View style={{flex: 1}}>
              <Text style={styles.subtitleText}>Đang thực hiện</Text>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {exercise.name}
              </Text>
            </View>
            <View style={styles.timerContainer}>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={() => setIsPaused(!isPaused)}
                disabled={isSaving || isResting}>
                <Icon
                  name={isPaused ? 'play' : 'pause'}
                  size={15}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
              <View
                style={[
                  styles.timerBadge,
                  isPaused && {backgroundColor: COLORS.cardBorder},
                ]}>
                <Icon
                  name="clock"
                  size={12}
                  color={isPaused ? COLORS.textGray : COLORS.primary}
                  style={{marginRight: 4}}
                />
                <Text
                  style={[
                    styles.timerText,
                    isPaused && {color: COLORS.textGray},
                  ]}>
                  {formatTime(workoutTime)}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {/* REPS card */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>REPS</Text>
                <Icon name="activity" size={15} color={COLORS.primary} />
              </View>
              <View style={styles.statBody}>
                <Animated.Text
                  style={[
                    styles.statBigValue,
                    {transform: [{scale: repScaleAnim}]},
                  ]}>
                  {totalReps % exercise.target_reps ||
                    (totalReps > 0 && totalReps % exercise.target_reps === 0
                      ? exercise.target_reps
                      : 0)}
                </Animated.Text>
                <Text style={styles.statSmallValue}>
                  /{exercise.target_reps}
                </Text>
              </View>
              {/* Reps mini progress */}
              <ProgressBar
                percent={repsProgressPercent}
                color={COLORS.primary}
              />
            </View>

            {/* TIẾN ĐỘ card */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>TIẾN ĐỘ</Text>
                <Icon name="trending-up" size={15} color={progressColor} />
              </View>
              <View style={styles.statBody}>
                <Text style={[styles.statBigValue, {color: progressColor}]}>
                  {progressPercent}
                </Text>
                <Text style={styles.statSmallValue}> %</Text>
              </View>
              <ProgressBar percent={progressPercent} color={progressColor} />
            </View>
          </View>

          {/* Target / set indicators */}
          <View style={styles.targetCard}>
            <View>
              <Text style={styles.statLabel}>MỤC TIÊU</Text>
              <Text style={styles.targetMainText}>
                {exercise.target_sets} Sets × {exercise.target_reps} Reps
              </Text>
            </View>
            <View style={styles.setIndicatorsRow}>
              {Array.from({length: exercise.target_sets}).map((_, i) => {
                const idx = i + 1;
                const state =
                  idx < currentSet || totalReps >= totalTargetReps
                    ? 'done'
                    : idx === currentSet
                    ? 'active'
                    : 'pending';
                return <SetCircle key={idx} index={i} state={state} />;
              })}
            </View>
          </View>

          {/* End button */}
          <Animated.View style={{transform: [{scale: endBtnPulse}]}}>
            <TouchableOpacity
              style={[styles.endBtn, isSaving && {opacity: 0.7}]}
              onPress={saveWorkoutData}
              disabled={isSaving}
              activeOpacity={0.85}>
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Icon name="stop-circle" size={18} color={COLORS.white} />
                  <Text style={styles.endBtnText}>KẾT THÚC BÀI TẬP</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>

      {/* REST OVERLAY */}
      {isResting && (
        <View style={styles.restOverlay}>
          <Animated.View
            style={[styles.restCard, {transform: [{scale: restCardScale}]}]}>
            <View style={styles.restIconWrap}>
              <Icon name="coffee" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.restTitle}>Nghỉ Ngơi</Text>
            <Text style={styles.restSubTitle}>
              Chuẩn bị cho Set {currentSet}
            </Text>

            <RestCountdownRing countdown={restCountdown} total={30} />

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                if (restTimerRef.current) clearInterval(restTimerRef.current);
                setIsResting(false);
              }}>
              <Icon
                name="skip-forward"
                size={16}
                color={COLORS.textGray}
                style={{marginRight: 6}}
              />
              <Text style={styles.skipText}>Bỏ qua & Tập tiếp</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* FINISH MODAL */}
      <Modal visible={showFinishModal} transparent animationType="none">
        <View style={styles.finishOverlay}>
          <Animated.View
            style={[
              styles.finishCard,
              {
                opacity: finishCardOpacity,
                transform: [{scale: finishCardScale}],
              },
            ]}>
            {/* Trophy */}
            <View style={styles.trophyIcon}>
              <Text style={{fontSize: 42}}>🏆</Text>
            </View>
            <Text style={styles.finishTitle}>Tuyệt Vời!</Text>
            <Text style={styles.finishDesc}>
              Bạn đã hoàn thành xuất sắc bài tập.
            </Text>

            <View style={styles.finishStatsRow}>
              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatValue}>{totalReps}</Text>
                <Text style={styles.finishStatLabel}>Tổng Reps</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatValue}>
                  {formatTime(workoutTime)}
                </Text>
                <Text style={styles.finishStatLabel}>Thời Gian</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatValue}>{finishData.cals}</Text>
                <Text style={styles.finishStatLabel}>Kcal Đốt</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => {
                setShowFinishModal(false);
                setXpModalConfig(prev => ({...prev, visible: true}));
              }}>
              <Text style={styles.returnText}>Xem phần thưởng 🎁</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <XpGainModal
        visible={xpModalConfig.visible}
        xpEarned={xpModalConfig.xpEarned}
        currentXp={xpModalConfig.currentXp}
        nextLevelXp={xpModalConfig.nextLevelXp}
        level={xpModalConfig.level}
        isLevelUp={xpModalConfig.isLevelUp}
        onClose={handleCloseXpModal}
      />
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 30,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerCenter: {alignItems: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '800', color: COLORS.secondaryDeep},
  connBadge: {flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4},
  connDot: {width: 6, height: 6, borderRadius: 3},
  connText: {fontSize: 11, fontWeight: '700'},

  bodyWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    flexDirection: 'column',
  },

  // Feedback banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  alertText: {fontSize: 13, fontWeight: '700', marginLeft: 8, flex: 1},

  // Camera
  cameraCard: {
    flex: 1,
    backgroundColor: '#CBD5E1',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  liveBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cameraProgressBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraProgressText: {color: COLORS.white, fontSize: 12, fontWeight: '800'},
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pausedText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  pausedSub: {color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500'},

  // Dashboard
  dashboardSection: {flexShrink: 0},
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseName: {fontSize: 20, fontWeight: '900', color: COLORS.secondaryDeep},
  timerContainer: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pauseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  timerText: {fontSize: 14, fontWeight: '800', color: COLORS.primary},

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    shadowColor: COLORS.secondaryDeep,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textGray,
    letterSpacing: 1,
  },
  statBody: {flexDirection: 'row', alignItems: 'baseline', marginBottom: 8},
  statBigValue: {fontSize: 30, fontWeight: '900', color: COLORS.secondaryDeep},
  statSmallValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textGray,
    marginLeft: 3,
  },

  progressTrack: {
    height: 5,
    backgroundColor: COLORS.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: 3},

  targetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: COLORS.secondaryDeep,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  targetMainText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.secondaryDeep,
    marginTop: 3,
  },
  setIndicatorsRow: {flexDirection: 'row', gap: 6},
  setCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setCircleText: {fontSize: 12, fontWeight: '800'},

  endBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  endBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Rest overlay
  restOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 50,
  },
  restCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 36,
    alignItems: 'center',
  },
  restIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    marginBottom: 6,
  },
  restSubTitle: {
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: '500',
    marginBottom: 24,
  },
  restTimerText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    lineHeight: 56,
  },
  restTimerUnit: {fontSize: 13, color: COLORS.textGray, fontWeight: '600'},
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 100,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  skipText: {fontSize: 14, fontWeight: '700', color: COLORS.textGray},

  // Finish modal
  finishOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  finishCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
  },
  trophyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  finishTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    marginBottom: 8,
  },
  finishDesc: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  finishStatsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 28,
  },
  divider: {width: 1, backgroundColor: COLORS.cardBorder},
  finishStatBox: {flex: 1, alignItems: 'center'},
  finishStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    marginBottom: 5,
  },
  finishStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  returnBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  returnText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
});

export default WorkoutCameraScreen;
