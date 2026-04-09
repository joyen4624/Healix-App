import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

// 🔴 IMPORT COMPONENT THANH XP GAME RPG
import XpGainModal from '../../components/XpGainModal';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const COLORS = {
  primary: '#2c65e8',
  primaryLight: '#5b87f0',
  primaryDark: '#1a4bc4',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#F4F7FC',
  bgCard: '#ffffff',
  border: '#EDEFF2',
  success: '#34C759',
  protein: '#FF453A',
  carbs: '#FF9500',
  fat: '#32ADE6',
  overlay: 'rgba(10,35,92,0.55)',
};

// ─── Shimmer loader for image ───────────────────────────────────────────────
const ShimmerBox = ({style}: {style: any}) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.85],
  });
  return (
    <Animated.View style={[style, {opacity, backgroundColor: '#dde4f0'}]} />
  );
};

// ─── Animated macro card ─────────────────────────────────────────────────────
const MacroCard = ({
  icon,
  value,
  label,
  color,
  delay,
  iconSet,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
  delay: number;
  iconSet?: string;
}) => {
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 480,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 90,
        friction: 8,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.nutritionCard,
        {
          opacity: fadeIn,
          transform: [{translateY: slideUp}, {scale}],
          borderTopColor: color,
          borderTopWidth: 3,
        },
      ]}>
      <View style={[styles.iconCircle, {backgroundColor: color + '18'}]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.nutValue, {color: COLORS.secondary}]}>{value}</Text>
      <Text style={styles.nutLabel}>{label}</Text>
    </Animated.View>
  );
};

// ─── Animated progress ring for confidence ──────────────────────────────────
const ConfidencePill = ({confidence}: {confidence: number}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay: 300,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.aiBadge, {opacity: fade, transform: [{scale}]}]}>
      <View style={styles.aiBadgeDot} />
      <Icon
        name="cpu"
        size={13}
        color={COLORS.white}
        style={{marginRight: 5}}
      />
      <Text style={styles.aiBadgeText}>AI · {confidence}% match</Text>
    </Animated.View>
  );
};

// ─── Animated calorie counter ────────────────────────────────────────────────
const AnimatedCalories = ({target}: {target: number}) => {
  const count = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const listener = count.addListener(({value}) =>
      setDisplay(Math.round(value)),
    );
    Animated.timing(count, {
      toValue: target,
      duration: 900,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => count.removeListener(listener);
  }, [target]);

  return <Text style={styles.calValue}>{display}</Text>;
};

// ─── Main screen ─────────────────────────────────────────────────────────────
const ScanResultScreen = ({route, navigation}: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // 🔴 STATE QUẢN LÝ MODAL XP
  const [xpModalConfig, setXpModalConfig] = useState({
    visible: false,
    xpEarned: 0,
    currentXp: 0,
    nextLevelXp: 200,
    level: 1,
    isLevelUp: false,
    newBadges: [],
  });

  // --- Entry animations ---
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.06)).current;
  const infoSlide = useRef(new Animated.Value(30)).current;
  const infoFade = useRef(new Animated.Value(0)).current;
  const calorieFade = useRef(new Animated.Value(0)).current;
  const calorieScale = useRef(new Animated.Value(0.8)).current;
  const footerSlide = useRef(new Animated.Value(60)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(imageFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(imageScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(infoFade, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(infoSlide, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(calorieScale, {
          toValue: 1,
          tension: 85,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(calorieFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(footerFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(footerSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Idle pulse on CTA button
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1.035,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Press animation for CTA
  const pressIn = () => {
    Animated.spring(btnPulse, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(btnPulse, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  // ==========================================
  // 1. NHẬN DỮ LIỆU TỪ TRANG CAMERA TRUYỀN SANG
  // ==========================================
  const {aiData, imageUri} = route.params || {};

  const foodDetails = aiData?.food_details || {};
  const mainDetection = aiData?.detections?.[0] || {};

  const foodName =
    foodDetails.name || mainDetection.class_name || 'Unknown Food';
  const confidence = mainDetection.confidence
    ? Math.round(mainDetection.confidence * 100)
    : 0;
  const calories = foodDetails.calories || 0;
  const protein = foodDetails.protein || 0;
  const carbs = foodDetails.carbs || 0;
  const fat = foodDetails.fat || 0;

  // ==========================================
  // XỬ LÝ LƯU VÀO NHẬT KÝ (DÙNG AXIOS CLIENT)
  // ==========================================
  const handleAddFood = async () => {
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Không tìm thấy token đăng nhập');

      const hour = new Date().getHours();
      // Backend đang làm với dạng id/canonical key (lowercase) như `breakfast/lunch/dinner`.
      // Dùng lowercase để khi lưu nhật ký không bị phụ thuộc chuỗi tiếng Anh.
      let mealType = 'snack';
      if (hour >= 5 && hour < 10) mealType = 'breakfast';
      else if (hour >= 10 && hour < 15) mealType = 'lunch';
      else if (hour >= 15 && hour < 21) mealType = 'dinner';

      const className = mainDetection.class_name;
      if (!className) throw new Error('Không có dữ liệu class_name để lưu');

      const response = await axiosClient.post(
        '/diary/add-food',
        {
          class_name: className,
          meal_type: mealType,
          serving_quantity: 1,
          total_calories: calories,
          total_carbs: carbs,
          total_protein: protein,
          total_fat: fat,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success) {
        // 🔴 BẬT MODAL NHẬN XP THAY VÌ CHUYỂN TRANG NGAY
        const d = response.data.data;
        setXpModalConfig({
          visible: true,
          xpEarned: d.xp_earned || 10,
          currentXp: d.current_xp || 0,
          nextLevelXp: d.next_level_xp || 200,
          level: d.new_level || 1,
          isLevelUp: d.leveled_up || false,
          newBadges: d.new_badges || [],
        });
      } else {
        throw new Error(response.data.message || 'Lưu thất bại');
      }
    } catch (error: any) {
      console.error('Lỗi lưu thức ăn:', error.response?.data || error.message);
      Alert.alert('Thất bại', 'Không thể lưu món ăn vào nhật ký lúc này.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🔴 HÀM XỬ LÝ KHI NGƯỜI DÙNG BẤM "TUYỆT VỜI" TẠI MODAL XP
  const handleCloseXpModal = () => {
    setXpModalConfig({...xpModalConfig, visible: false});
    navigation.navigate('Diary', {newBadges: xpModalConfig.newBadges});
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* THÔNG BÁO NHỎ (CUSTOM TOAST) */}
      <Animated.View
        style={[styles.toastContainer, {transform: [{translateY: toastAnim}]}]}>
        <View style={styles.toastContent}>
          <Icon name="check-circle" size={18} color={COLORS.white} />
          <Text style={styles.toastText}>Added to your Diary!</Text>
        </View>
      </Animated.View>

      {/* HEADER */}
      <Animated.View
        style={[
          styles.header,
          {opacity: headerFade, transform: [{translateY: headerSlide}]},
        ]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Recognition</Text>
        <View style={styles.headerBtn} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* HERO IMAGE */}
        <Animated.View
          style={[
            styles.imageWrapper,
            {opacity: imageFade, transform: [{scale: imageScale}]},
          ]}>
          <Image
            source={{uri: imageUri || 'https://via.placeholder.com/400'}}
            style={styles.foodImage}
          />
          {/* Gradient overlay at bottom of image */}
          <View style={styles.imageOverlay} />
          <ConfidencePill confidence={confidence} />
        </Animated.View>

        {/* FOOD NAME + SERVING */}
        <Animated.View
          style={[
            styles.infoSection,
            {opacity: infoFade, transform: [{translateY: infoSlide}]},
          ]}>
          <Text style={styles.foodName} numberOfLines={2}>
            {foodName}
          </Text>
          <View style={styles.servingChip}>
            <Icon
              name="layers"
              size={13}
              color={COLORS.primary}
              style={{marginRight: 5}}
            />
            <Text style={styles.servingType}>1 Serving · 100g Standard</Text>
          </View>
        </Animated.View>

        {/* CALORIE BOX */}
        <Animated.View
          style={[
            styles.calorieBox,
            {opacity: calorieFade, transform: [{scale: calorieScale}]},
          ]}>
          <View style={styles.calorieInner}>
            <View style={styles.calorieLeft}>
              <Text style={styles.calLabel}>Total Calories</Text>
              <AnimatedCalories target={calories} />
              <Text style={styles.calUnit}>kcal</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieRight}>
              <Icon
                name="activity"
                size={38}
                color={COLORS.primary}
                style={{opacity: 0.18}}
              />
            </View>
          </View>
          {/* Subtle progress strip */}
          <View style={styles.calorieBar}>
            <Animated.View
              style={[
                styles.calorieBarFill,
                {width: `${Math.min((calories / 800) * 100, 100)}%`},
              ]}
            />
          </View>
        </Animated.View>

        {/* MACRO GRID */}
        <View style={styles.nutritionGrid}>
          <MacroCard
            icon="zap"
            value={`${protein}g`}
            label="Protein"
            color={COLORS.protein}
            delay={500}
          />
          <MacroCard
            icon="pie-chart"
            value={`${carbs}g`}
            label="Carbs"
            color={COLORS.carbs}
            delay={580}
          />
          <MacroCard
            icon="droplet"
            value={`${fat}g`}
            label="Fat"
            color={COLORS.fat}
            delay={660}
          />
          <MacroCard
            icon="check-circle"
            value="Good"
            label="Health Score"
            color={COLORS.success}
            delay={740}
          />
        </View>

        <Text style={styles.disclaimer}>
          * Nutrition values are estimated by AI based on standard recipes.
        </Text>
      </ScrollView>

      {/* FOOTER */}
      <Animated.View
        style={[
          styles.footer,
          {opacity: footerFade, transform: [{translateY: footerSlide}]},
        ]}>
        <Animated.View style={{transform: [{scale: btnPulse}]}}>
          <TouchableOpacity
            style={[styles.addBtn, isSaving && {opacity: 0.75}]}
            onPress={handleAddFood}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={isSaving}
            activeOpacity={1}>
            {isSaving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Icon
                  name="book-open"
                  size={19}
                  color={COLORS.white}
                  style={{marginRight: 10}}
                />
                <Text style={styles.addBtnText}>Add to Diary</Text>
                <View style={styles.addBtnArrow}>
                  <Icon name="plus" size={18} color={COLORS.primary} />
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* 🔴 NHÚNG THẺ MODAL XP RPG */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: COLORS.success,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 60,
  },
  toastText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.2,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero image
  imageWrapper: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
    height: 240,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  aiBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
  aiBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7fffb2',
    marginRight: 7,
  },
  aiBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Info section
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 22,
    marginBottom: 4,
  },
  foodName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'capitalize',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  servingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  servingType: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Calorie box
  calorieBox: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  calorieInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 18,
  },
  calorieLeft: {
    flex: 1,
  },
  calLabel: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  calValue: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.primary,
    lineHeight: 60,
    letterSpacing: -1,
  },
  calUnit: {
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  calorieDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  calorieRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  calorieBarFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Nutrition grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  nutritionCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: COLORS.white,
    margin: 6,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  nutLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  disclaimer: {
    fontSize: 12,
    color: COLORS.textGray,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 40,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: COLORS.white,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 7,
    paddingHorizontal: 24,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  addBtnArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScanResultScreen;
