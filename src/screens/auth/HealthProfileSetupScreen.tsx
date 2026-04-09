import React, {useState, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  Animated,
  Keyboard,
  Alert, // <--- THÊM ALERT
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// --- THÊM CÁC IMPORT ĐỂ GỌI API ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import axiosClient from '../../api/axiosClient';
// -----------------------------------

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#ffffff',
  lightGray: '#F7F9FC',
  border: '#EDEFF2',
  success: '#34C759',
  warning: '#FF9500',
};

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    desc: 'Little or no exercise',
    icon: 'coffee',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    desc: 'Light exercise 1-3 days/week',
    icon: 'sun',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    desc: 'Moderate exercise 3-5 days/week',
    icon: 'zap',
  },
  {
    id: 'active',
    title: 'Very Active',
    desc: 'Hard exercise 6-7 days/week',
    icon: 'activity',
  },
];

const HealthProfileSetupScreen = ({navigation}: any) => {
  const {width} = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form Data tương ứng với Database
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  // Tự động tính BMI
  const bmiCalc = useMemo(() => {
    const h = parseFloat(height) / 100; // Đổi cm sang m
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      let status = 'Normal';
      let color = COLORS.success;
      if (Number(bmi) < 18.5) {
        status = 'Underweight';
        color = COLORS.warning;
      } else if (Number(bmi) > 25) {
        status = 'Overweight';
        color = COLORS.warning;
      }
      return {value: bmi, status, color};
    }
    return null;
  }, [height, weight]);

  const goToNextStep = () => {
    Keyboard.dismiss();
    if (step < totalSteps) {
      const next = step + 1;
      setStep(next);
      scrollViewRef.current?.scrollTo({x: width * (next - 1), animated: true});
    } else {
      handleComplete();
    }
  };

  const goToPrevStep = () => {
    Keyboard.dismiss();
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      scrollViewRef.current?.scrollTo({x: width * (prev - 1), animated: true});
    } else {
      navigation.goBack(); // Trở về trang Profile Setup trước đó nếu muốn
    }
  };

  // --- HÀM XỬ LÝ GỌI API KHI HOÀN THÀNH ---
  const handleComplete = async () => {
    try {
      // 1. Lấy userId
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
        return;
      }

      // 2. Gói dữ liệu Health gửi lên API (Trùng khớp với cấu trúc Database)
      const healthData = {
        height_cm: parseInt(height),
        weight_kg: parseFloat(weight),
        activity_level: activityLevel,
        bmi: bmiCalc ? parseFloat(bmiCalc.value) : null,
        medical_conditions: medicalConditions || 'Không có', // Mặc định nếu bỏ trống
      };

      // 3. Gọi chung API /profile/setup (Nhưng lần này chỉ gửi cục health)
      const response = await axiosClient.post('/profile/setup', {
        userId: userId,
        health: healthData,
      });

      if (response.data.success) {
        console.log('Đã lưu Health Profile:', healthData);
        // Chuyển tiếp sang màn hình Setup Mục tiêu (Goal)
        navigation.navigate('GoalSetup');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message ||
          'Có lỗi xảy ra khi lưu chỉ số sức khỏe.';
        Alert.alert('Lỗi Server', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      }
    }
  };
  // ----------------------------------------

  const renderNextButton = () => {
    let isDisabled = true;
    if (step === 1 && height && weight) isDisabled = false;
    if (step === 2 && activityLevel) isDisabled = false;
    if (step === 3) isDisabled = false; // Medical condition là optional

    if (isDisabled) return null;

    return (
      <Animated.View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={goToNextStep}
          activeOpacity={0.8}>
          <Icon
            name={step === totalSteps ? 'check' : 'arrow-right'}
            size={28}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: COLORS.bg}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* THANH ĐIỀU HƯỚNG */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={goToPrevStep} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          {[1, 2, 3].map(item => (
            <View
              key={item}
              style={[
                styles.progressDot,
                step >= item && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ================= BƯỚC 1: CHIỀU CAO & CÂN NẶNG ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>Let's get your measurements</Text>
          <Text style={styles.subHeadline}>
            This helps us calculate your BMI accurately.
          </Text>

          <View style={styles.measurementContainer}>
            {/* Input Chiều cao */}
            <View style={styles.measureBox}>
              <Text style={styles.measureLabel}>Height</Text>
              <View style={styles.measureInputRow}>
                <TextInput
                  style={styles.hugeInput}
                  placeholder="000"
                  placeholderTextColor={COLORS.textGray}
                  keyboardType="numeric"
                  maxLength={3}
                  value={height}
                  onChangeText={setHeight}
                  autoFocus
                />
                <Text style={styles.unitText}>cm</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Input Cân nặng */}
            <View style={styles.measureBox}>
              <Text style={styles.measureLabel}>Weight</Text>
              <View style={styles.measureInputRow}>
                <TextInput
                  style={styles.hugeInput}
                  placeholder="00.0"
                  placeholderTextColor={COLORS.textGray}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  value={weight}
                  onChangeText={setWeight}
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= BƯỚC 2: MỨC ĐỘ HOẠT ĐỘNG ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>How active are you?</Text>
          <Text style={styles.subHeadline}>
            Select your daily activity level.
          </Text>

          <View style={styles.cardsContainer}>
            {ACTIVITY_LEVELS.map(item => {
              const isActive = activityLevel === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.activityCard,
                    isActive && styles.activityCardActive,
                  ]}
                  onPress={() => {
                    setActivityLevel(item.id);
                    setTimeout(() => goToNextStep(), 300); // Tự động lướt trang mượt mà
                  }}
                  activeOpacity={0.7}>
                  <View
                    style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                    <Icon
                      name={item.icon}
                      size={24}
                      color={isActive ? COLORS.white : COLORS.primary}
                    />
                  </View>
                  <View style={styles.cardTextContent}>
                    <Text
                      style={[styles.cardTitle, isActive && styles.textWhite]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.cardDesc, isActive && styles.textWhiteOp]}>
                      {item.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================= BƯỚC 3: MEDICAL CONDITIONS & BMI ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>Health & Medical</Text>

          {/* Card hiển thị BMI Tự Động Tính */}
          {bmiCalc && (
            <View style={styles.bmiCard}>
              <View>
                <Text style={styles.bmiLabel}>Your estimated BMI</Text>
                <Text style={[styles.bmiStatus, {color: bmiCalc.color}]}>
                  {bmiCalc.status}
                </Text>
              </View>
              <Text style={styles.bmiValue}>{bmiCalc.value}</Text>
            </View>
          )}

          <Text style={[styles.subHeadline, {marginTop: 20}]}>
            Do you have any medical conditions, allergies, or skin sensitivities
            we should know about?
          </Text>

          <View style={styles.textAreaWrapper}>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: Eczema, sensitive to Vitamin C, asthma..."
              placeholderTextColor={COLORS.textGray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={medicalConditions}
              onChangeText={setMedicalConditions}
            />
          </View>
        </View>
      </ScrollView>

      {renderNextButton()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backBtn: {padding: 8},
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginRight: 40,
  },
  progressDot: {
    width: 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {backgroundColor: COLORS.primary},
  pageContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
    lineHeight: 40,
  },
  subHeadline: {
    fontSize: 15,
    color: COLORS.textGray,
    marginBottom: 30,
    lineHeight: 22,
  },

  // MEASUREMENTS UI
  measurementContainer: {
    marginTop: 20,
    backgroundColor: COLORS.lightGray,
    borderRadius: 24,
    padding: 24,
  },
  measureBox: {
    paddingVertical: 10,
  },
  measureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textGray,
    marginBottom: 5,
  },
  measureInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hugeInput: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.secondary,
    padding: 0,
    margin: 0,
    minWidth: 100,
  },
  unitText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textGray,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  // ACTIVITY CARDS UI
  cardsContainer: {gap: 16},
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#E5EDFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconBoxActive: {backgroundColor: 'rgba(255,255,255,0.2)'},
  cardTextContent: {flex: 1},
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textGray,
  },
  textWhite: {color: COLORS.white},
  textWhiteOp: {color: 'rgba(255,255,255,0.8)'},

  // BMI CARD & TEXT AREA UI
  bmiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E5EDFF',
    padding: 20,
    borderRadius: 20,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  bmiStatus: {
    fontSize: 16,
    fontWeight: '800',
  },
  bmiValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
  },
  textAreaWrapper: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 5,
  },
  textArea: {
    height: 120,
    padding: 15,
    fontSize: 16,
    color: COLORS.secondary,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: 30,
  },
  fabButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default HealthProfileSetupScreen;
