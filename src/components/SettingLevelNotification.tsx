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

const {width} = Dimensions.get('window');

const CARD_MAX_W = 340;

export interface MaintainModeNotificationProps {
  visible: boolean;
  onClose: () => void;
  onGoToSettings?: () => void;
  /** Cân mục tiêu duy trì (kg) — từ API maintenance hoặc cân vừa ghi */
  maintainWeightKg?: number | null;
}

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  white: '#ffffff',
  success: '#34C759',
  bgDark: 'rgba(10, 35, 92, 0.55)',
  textMuted: '#6B7280',
  textBody: '#4B5563',
};

/**
 * Modal gọn: thông báo đã chuyển sang chế độ giữ cân / duy trì (không dùng mức dễ–khó).
 */
const SettingLevelNotification: React.FC<MaintainModeNotificationProps> = ({
  visible,
  onClose,
  onGoToSettings,
  maintainWeightKg,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      backdropOpacity.setValue(0);
      iconPulse.setValue(1);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    backdropOpacity.setValue(0);
  }, [visible]);

  const handleGoToSettings = () => {
    onClose();
    if (onGoToSettings) {
      setTimeout(onGoToSettings, 280);
    }
  };

  if (!visible) return null;

  const weightLine =
    maintainWeightKg != null && !Number.isNaN(Number(maintainWeightKg))
      ? `Mục tiêu duy trì hiện tại: ${Number(maintainWeightKg).toFixed(1)} kg`
      : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, {opacity: backdropOpacity}]}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <TouchableOpacity
            style={styles.closeIconBtn}
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityLabel="Đóng">
            <Icon name="x" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Animated.View
            style={[styles.iconWrap, {transform: [{scale: iconPulse}]}]}>
            <View style={styles.iconCircle}>
              <Icon name="heart" size={26} color={COLORS.white} />
            </View>
          </Animated.View>

          <Text style={styles.badge}>Giữ cân & duy trì</Text>
          <Text style={styles.title}>Đã chuyển chế độ mục tiêu</Text>

          <Text style={styles.lead}>
            Bạn đã chạm mục tiêu. Hệ thống đã đặt mục tiêu sang{' '}
            <Text style={styles.leadStrong}>giữ cân và duy trì</Text> (theo dữ
            liệu trên máy chủ).
          </Text>

          {weightLine ? (
            <View style={styles.weightPill}>
              <Icon name="anchor" size={16} color={COLORS.primary} />
              <Text style={styles.weightPillText}>{weightLine}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Icon name="info" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Muốn đặt mục tiêu khác (giảm / tăng cân, v.v.), vào{' '}
              <Text style={styles.infoStrong}>Cài đặt</Text> hoặc chỉnh mục
              tiêu trong hồ sơ.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleGoToSettings}
            activeOpacity={0.85}>
            <Icon name="settings" size={18} color={COLORS.primary} />
            <Text style={styles.btnSecondaryText}>Đi đến Cài đặt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={onClose}
            activeOpacity={0.9}>
            <Text style={styles.btnPrimaryText}>Đã hiểu</Text>
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
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgDark,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_W,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  closeIconBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    padding: 4,
  },
  iconWrap: {
    marginBottom: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  lead: {
    fontSize: 14,
    color: COLORS.textBody,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  leadStrong: {
    fontWeight: '800',
    color: COLORS.secondary,
  },
  weightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  weightPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textBody,
    lineHeight: 18,
  },
  infoStrong: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  btnSecondary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 10,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  btnPrimary: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default SettingLevelNotification;
