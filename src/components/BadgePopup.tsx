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
import ConfettiCannon from 'react-native-confetti-cannon';
import Icon from 'react-native-vector-icons/Feather';

const {width, height} = Dimensions.get('window');

// Kiểu dữ liệu của Huy hiệu trả về từ API
interface Badge {
  name: string;
  icon: string;
  color: string;
  desc?: string;
}

interface BadgePopupProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
}

const BadgePopup: React.FC<BadgePopupProps> = ({visible, badge, onClose}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      // Khi Popup hiện, chạy hiệu ứng "Nảy" (Spring) và Hiện dần (Fade in)
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
      ]).start();
    } else {
      // Khi đóng, reset lại animation
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, badge, scaleAnim, opacityAnim]);

  if (!badge) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Lớp nền mờ */}
        <View style={styles.backdrop} />

        {/* 🔴 HIỆU ỨNG PHÁO HOA BẮN TỪ DƯỚI LÊN */}
        {visible && (
          <ConfettiCannon
            count={100}
            origin={{x: width / 2, y: height}}
            autoStart={true}
            fadeOut={true}
            fallSpeed={3000}
            colors={['#FFD700', '#FF453A', '#34C759', '#2c65e8', '#FF9F0A']}
          />
        )}

        {/* NỘI DUNG POPUP CÓ ANIMATION */}
        <Animated.View
          style={[
            styles.popupContainer,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <View style={styles.headerGlow}>
            <Text style={styles.congratsText}>CHÚC MỪNG!</Text>
          </View>

          {/* Vòng tròn chứa Icon Huy hiệu */}
          <View
            style={[styles.iconWrapper, {backgroundColor: badge.color + '20'}]}>
            <View style={[styles.iconCircle, {backgroundColor: badge.color}]}>
              {/* Giả sử bạn dùng Feather, nếu trong DB lưu tên icon khác thì đổi lại thư viện Icon nhé */}
              <Icon name={badge.icon || 'award'} size={40} color="#FFF" />
            </View>
          </View>

          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDesc}>
            {badge.desc ||
              'Bạn vừa mở khóa một thành tựu mới vô cùng xuất sắc!'}
          </Text>

          {/* Nút đóng / Khoe thành tích */}
          <TouchableOpacity
            style={[styles.btnTada, {backgroundColor: badge.color}]}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 35, 92, 0.7)', // Màu xanh đen trong suốt
  },
  popupContainer: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGlow: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  congratsText: {
    color: '#FF9F0A',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  badgeName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0a235c',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDesc: {
    fontSize: 14,
    color: '#8A94A6',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  btnTada: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default BadgePopup;
