import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useTranslation} from 'react-i18next';

const COLORS = {
  primary: '#2c65e8',
  primaryLight: '#EEF2FF',
  secondary: '#0F172A',
  textGray: '#64748B',
  white: '#ffffff',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  selectedBg: '#F0F5FF',
};

// ==========================================
// COMPONENT HIỆU ỨNG TRƯỢT MỜ LÊN (REUSABLE)
// ==========================================
const AnimatedFadeSlide = ({children, delay = 0, style}: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
      ]}>
      {children}
    </Animated.View>
  );
};

const GOAL_ITEMS = [
  {id: '1', titleKey: 'editGoal.goals.lose.title', descKey: 'editGoal.goals.lose.desc', icon: 'trending-down'},
  {id: '2', titleKey: 'editGoal.goals.maintain.title', descKey: 'editGoal.goals.maintain.desc', icon: 'refresh-cw'},
  {id: '3', titleKey: 'editGoal.goals.gain_muscle.title', descKey: 'editGoal.goals.gain_muscle.desc', icon: 'trending-up'},
] as const;

const EditGoalScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  const [selectedGoal, setSelectedGoal] = useState('3');

  return (
    <View style={styles.mainContainer}>
      {/* 1. Status Bar tràn viền */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* 2. Header 3 cột */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerActionBtn}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {t('editGoal.header_title')}
          </Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* 3. Phần nội dung cuộn */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <AnimatedFadeSlide delay={50}>
          <Text style={styles.title}>{t('editGoal.title')}</Text>
        </AnimatedFadeSlide>

        <AnimatedFadeSlide delay={150}>
          <Text style={styles.subtitle}>{t('editGoal.subtitle')}</Text>
        </AnimatedFadeSlide>

        <View style={styles.goalList}>
          {GOAL_ITEMS.map((goal, index) => {
            const isSelected = selectedGoal === goal.id;
            const itemDelay = 250 + index * 100;

            return (
              <AnimatedFadeSlide key={goal.id} delay={itemDelay}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.goalItem, isSelected && styles.goalItemActive]}
                  onPress={() => setSelectedGoal(goal.id)}>
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && styles.iconContainerActive,
                    ]}>
                    <Icon
                      name={goal.icon}
                      size={20} // Thu nhỏ icon bên trong
                      color={isSelected ? COLORS.white : COLORS.textGray}
                    />
                  </View>

                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.goalTitle,
                        isSelected && styles.goalTitleActive,
                      ]}>
                      {t(goal.titleKey)}
                    </Text>
                    <Text style={styles.goalDesc}>{t(goal.descKey)}</Text>
                  </View>

                  {/* Vòng tròn checkmark */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleActive,
                    ]}>
                    {isSelected && (
                      <Icon name="check" size={12} color={COLORS.white} />
                    )}
                  </View>
                </TouchableOpacity>
              </AnimatedFadeSlide>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. FOOTER trượt lên */}
      <AnimatedFadeSlide delay={600} style={styles.footer}>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={() => {
            console.log('Goal Updated:', selectedGoal);
            navigation.goBack();
          }}>
          <Text style={styles.saveBtnText}>{t('editGoal.save')}</Text>
        </TouchableOpacity>
      </AnimatedFadeSlide>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ==========================
  // HEADER
  // ==========================
  header: {
    paddingTop:
      Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 3,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },

  // ==========================
  // CONTENT
  // ==========================
  scrollContent: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 160,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textGray,
    marginBottom: 30,
    lineHeight: 22,
    fontWeight: '500',
  },

  // ==========================
  // GOAL LIST (ĐÃ ĐƯỢC THU GỌN)
  // ==========================
  goalList: {gap: 12}, // Giảm khoảng cách giữa các card
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, // Giảm padding từ 20 xuống 16
    borderRadius: 20, // Bo góc nhỏ lại một chút
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  goalItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.selectedBg,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 44, // Thu nhỏ icon box từ 52 xuống 44
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary, // Đổi sang màu nền primary cho nổi bật icon màu trắng
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  textContainer: {flex: 1, paddingRight: 10},
  goalTitle: {
    fontSize: 16, // Giảm từ 17 xuống 16
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 2, // Thu hẹp khoảng cách giữa Title và Desc
  },
  goalTitleActive: {color: COLORS.primary},
  goalDesc: {
    fontSize: 12, // Giảm từ 13 xuống 12
    color: COLORS.textGray,
    lineHeight: 18, // Giảm từ 20 xuống 18
    fontWeight: '500',
  },
  radioCircle: {
    width: 22, // Nhỏ lại một chút
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  // ==========================
  // FOOTER
  // ==========================
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 25,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderTopWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default EditGoalScreen;
