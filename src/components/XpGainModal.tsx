import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import ConfettiCannon from 'react-native-confetti-cannon';

const {width, height} = Dimensions.get('window');

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  white: '#ffffff',
  accentGold: '#FF9F0A',
  bgDark: 'rgba(10, 35, 92, 0.85)',
  barBg: '#E0E5ED',
  success: '#34C759',
};

interface XpGainModalProps {
  visible: boolean;
  xpEarned: number;
  currentXp: number;
  nextLevelXp: number;
  level: number;
  isLevelUp: boolean;
  onClose: () => void;
}

const XpGainModal: React.FC<XpGainModalProps> = ({
  visible,
  xpEarned,
  currentXp,
  nextLevelXp,
  level,
  isLevelUp,
  onClose,
}) => {
  // Các giá trị Animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const floatUpAnim = useRef(new Animated.Value(20)).current; // Cho text +XP bay lên

  useEffect(() => {
    if (visible) {
      // 1. Tính toán % bắt đầu và kết thúc
      // Nếu vừa lên cấp, XP cũ được ước tính là (currentXp - xpEarned + nextLevelXp) của cấp trước.
      // Để đơn giản hiệu ứng RPG:
      // - Nếu Lên cấp: Chạy từ % cũ -> 100% -> Reset 0% -> % mới
      // - Nếu Bình thường: Chạy từ % cũ -> % mới

      const prevXp = isLevelUp ? 0 : Math.max(0, currentXp - xpEarned);
      const startPercent = (prevXp / nextLevelXp) * 100;
      const endPercent = Math.min((currentXp / nextLevelXp) * 100, 100);

      progressAnim.setValue(startPercent);

      // 2. Hiệu ứng Modal hiện ra (Pop-in)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Chữ +XP bay lên
        Animated.timing(floatUpAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Hiệu ứng thanh Progress Bar chạy
      if (isLevelUp) {
        Animated.sequence([
          // Chạy vọt lên 100%
          Animated.timing(progressAnim, {
            toValue: 100,
            duration: 600,
            useNativeDriver: false,
          }),
          // Reset về 0 ngay lập tức (ẩn đi)
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
          // Chạy lên % mới của level mới
          Animated.timing(progressAnim, {
            toValue: endPercent,
            duration: 600,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        // Chạy bình thường
        Animated.timing(progressAnim, {
          toValue: endPercent,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
    } else {
      // Reset khi đóng Modal
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      progressAnim.setValue(0);
      floatUpAnim.setValue(20);
    }
  }, [visible, xpEarned, currentXp, nextLevelXp, isLevelUp]);

  if (!visible) return null;

  // Gắn Width của thanh Bar vào Animation
  const barWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />

        {/* NỔ PHÁO HOA NẾU LÊN CẤP */}
        {isLevelUp && (
          <ConfettiCannon
            count={150}
            origin={{x: width / 2, y: height}}
            autoStart={true}
            fadeOut={true}
            fallSpeed={2500}
            colors={['#FFD700', '#FF453A', '#34C759', '#2c65e8', '#FF9F0A']}
          />
        )}

        <Animated.View
          style={[
            styles.popupContainer,
            {opacity: opacityAnim, transform: [{scale: scaleAnim}]},
          ]}>
          {/* ICON & TIÊU ĐỀ */}
          <View style={styles.headerWrap}>
            {isLevelUp ? (
              <View
                style={[
                  styles.iconCircle,
                  {backgroundColor: COLORS.accentGold},
                ]}>
                <Icon name="award" size={40} color={COLORS.white} />
              </View>
            ) : (
              <View
                style={[styles.iconCircle, {backgroundColor: COLORS.primary}]}>
                <Icon name="trending-up" size={40} color={COLORS.white} />
              </View>
            )}
          </View>

          <Text style={styles.titleText}>
            {isLevelUp ? 'LEVEL UP!' : 'THÀNH TÍCH MỚI'}
          </Text>

          {/* SỐ XP BAY LÊN */}
          <Animated.View style={{transform: [{translateY: floatUpAnim}]}}>
            <Text style={styles.xpGainedText}>+{xpEarned} XP</Text>
          </Animated.View>

          {/* THANH PROGRESS BAR GIỐNG GAME RPG */}
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelText}>Lv.{level}</Text>
            <Text style={styles.xpDetailText}>
              {currentXp} / {nextLevelXp}
            </Text>
          </View>

          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: barWidth,
                  backgroundColor: isLevelUp
                    ? COLORS.accentGold
                    : COLORS.primary,
                },
              ]}
            />
          </View>

          <Text style={styles.subText}>
            {isLevelUp
              ? 'Chúc mừng! Bạn đã mở khóa cấp độ mới.'
              : 'Hãy tiếp tục duy trì thói quen tốt nhé!'}
          </Text>

          <TouchableOpacity
            style={styles.btnAwesome}
            onPress={onClose}
            activeOpacity={0.8}>
            <Text style={styles.btnText}>Tuyệt Vời!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgDark},
  popupContainer: {
    width: width * 0.85,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  headerWrap: {marginTop: -50, marginBottom: 15},
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    elevation: 5,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  xpGainedText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.success,
    marginBottom: 20,
  },

  levelInfoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  levelText: {fontSize: 16, fontWeight: '800', color: COLORS.secondary},
  xpDetailText: {fontSize: 12, fontWeight: '600', color: '#8A94A6'},

  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E5ED',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {height: '100%', borderRadius: 6},

  subText: {
    fontSize: 14,
    color: '#8A94A6',
    textAlign: 'center',
    marginBottom: 25,
  },

  btnAwesome: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
});

export default XpGainModal;
