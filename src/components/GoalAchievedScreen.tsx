import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const {width, height} = Dimensions.get('window');

interface GoalAchievedScreenProps {
  visible: boolean;
  targetWeight: number;
  startWeight: number;
  weeksElapsed: number;
  goalType: 'lose_weight' | 'gain_weight' | 'build_muscle';
  xpEarned?: number;
  onNewGoal: () => void;
  onMaintain: () => void;
  onClose: () => void;
}

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  white: '#ffffff',
  gold: '#FFD700',
  success: '#34C759',
  warning: '#FF9500',
  textGray: '#8A94A6',
  bgDark: 'rgba(10, 35, 92, 0.9)',
  lightGold: '#FFF3CD',
};

const GoalAchievedScreen: React.FC<GoalAchievedScreenProps> = ({
  visible,
  targetWeight,
  startWeight,
  weeksElapsed,
  goalType,
  xpEarned = 500,
  onNewGoal,
  onMaintain,
  onClose,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const starPulseAnim = useRef(new Animated.Value(1)).current;
  const contentSlideAnim = useRef(new Animated.Value(50)).current;
  const trophyBounceAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;

  // Confetti particles
  const confettiItems = Array.from({length: 30}, (_, i) => ({
    id: i,
    color: [COLORS.gold, COLORS.primary, COLORS.success, COLORS.warning, '#FF69B4'][
      i % 5
    ],
    delay: i * 50,
    startX: Math.random() * width,
  }));

  const getGoalLabel = () => {
    switch (goalType) {
      case 'lose_weight':
        return 'Giảm cân';
      case 'gain_weight':
        return 'Tăng cân';
      case 'build_muscle':
        return 'Tạo cơ bắp';
      default:
        return 'Mục tiêu';
    }
  };

  const getWeightChange = () => {
    return Math.abs(startWeight - targetWeight).toFixed(1);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 Mình đã đạt mục tiêu ${getGoalLabel()}!\n\n` +
          `• Cân nặng: ${targetWeight}kg\n` +
          `• Đã ${startWeight > targetWeight ? 'giảm' : 'tăng'}: ${getWeightChange()}kg\n` +
          `• Thời gian: ${weeksElapsed} tuần\n\n` +
          `Cùng đồng hành với Healix để đạt mục tiêu sức khỏe nhé! 💪`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      confettiAnim.setValue(0);
      starPulseAnim.setValue(1);
      contentSlideAnim.setValue(50);
      trophyBounceAnim.setValue(0);
      badgeScaleAnim.setValue(0);

      // Main popup animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(contentSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(trophyBounceAnim, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti animation
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }).start();

      // Star pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(starPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(starPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Background overlay */}
        <Animated.View style={[styles.backdrop, {opacity: opacityAnim}]} />

        {/* Confetti */}
        {confettiItems.map(item => {
          const translateY = confettiAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, height + 100],
          });
          const rotate = confettiAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${Math.random() * 720 - 360}deg`],
          });
          const opacity = confettiAnim.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0, 1, 0],
          });

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.confettiPiece,
                {
                  left: item.startX,
                  backgroundColor: item.color,
                  transform: [{translateY}, {rotate}],
                  opacity,
                },
              ]}
            />
          );
        })}

        {/* Main Content */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {/* Trophy Section */}
          <Animated.View
            style={[
              styles.trophyContainer,
              {
                transform: [
                  {
                    scale: trophyBounceAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}>
            {/* Glow effect */}
            <View style={styles.trophyGlow} />

            {/* Trophy Icon */}
            <View style={styles.trophyCircle}>
              <Icon name="award" size={40} color={COLORS.gold} />
            </View>
          </Animated.View>

          {/* Celebration Stars */}
          <Animated.View
            style={[styles.starsContainer, {transform: [{scale: starPulseAnim}]}]}>
            <Icon name="star" size={16} color={COLORS.gold} style={styles.star1} />
            <Icon name="star" size={12} color={COLORS.gold} style={styles.star2} />
            <Icon name="star" size={18} color={COLORS.gold} style={styles.star3} />
          </Animated.View>

          {/* Title */}
          <Text style={styles.congratsText}>CHÚC MỪNG!</Text>
          <Text style={styles.subtitleText}>Bạn đã đạt mục tiêu</Text>

          {/* Target Weight Display */}
          <View style={styles.weightCard}>
            <Icon name="target" size={20} color={COLORS.success} />
            <Text style={styles.targetWeightText}>{targetWeight} kg</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="trending-down" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {getWeightChange()} kg
              </Text>
              <Text style={styles.statLabel}>
                {startWeight > targetWeight ? 'Đã giảm' : 'Đã tăng'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Icon name="calendar" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{weeksElapsed}</Text>
              <Text style={styles.statLabel}>Tuần</Text>
            </View>
          </View>

          {/* XP Badge */}
          <Animated.View
            style={[
              styles.xpBadge,
              {
                transform: [{scale: badgeScaleAnim}],
              },
            ]}>
            <Icon name="zap" size={16} color={COLORS.warning} />
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
          </Animated.View>

          {/* Message */}
          <Text style={styles.messageText}>
            Hệ thống đã tự động chuyển sang{'\n'}
            <Text style={styles.messageHighlight}>chế độ giữ cân</Text>
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onMaintain}
              activeOpacity={0.8}>
              <Icon name="heart" size={18} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Duy trì cân nặng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onNewGoal}
              activeOpacity={0.8}>
              <Icon name="refresh-cw" size={16} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Mục tiêu mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.7}>
              <Icon name="share-2" size={14} color={COLORS.textGray} />
              <Text style={styles.shareButtonText}>Chia sẻ thành tích</Text>
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <Icon name="x" size={20} color={COLORS.textGray} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const CARD_MAX_W = 318;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgDark,
  },
  container: {
    width: '100%',
    maxWidth: CARD_MAX_W,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
  },
  trophyContainer: {
    marginTop: -28,
    marginBottom: 8,
  },
  trophyGlow: {
    position: 'absolute',
    top: -6,
    left: -14,
    right: -14,
    bottom: -6,
    backgroundColor: COLORS.gold,
    borderRadius: 44,
    opacity: 0.28,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.lightGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  starsContainer: {
    position: 'absolute',
    top: -8,
    right: 8,
  },
  star1: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  star2: {
    position: 'absolute',
    top: 10,
    right: 22,
  },
  star3: {
    position: 'absolute',
    top: -4,
    right: 34,
  },
  congratsText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.success,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  targetWeightText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.success,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E0E0E0',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.warning,
  },
  messageText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  messageHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: COLORS.success,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 11,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 5,
  },
  shareButtonText: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
    top: -20,
  },
});

export default GoalAchievedScreen;
