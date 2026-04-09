import React, {useState, useRef} from 'react';
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
  Alert, // <--- ĐÃ THÊM ALERT VÀO ĐÂY
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DatePicker from 'react-native-date-picker';

// --- THÊM CÁC IMPORT ĐỂ GỌI API ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import axiosClient from '../../api/axiosClient'; // Đảm bảo đường dẫn này đúng
// -----------------------------------

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#ffffff',
  lightGray: '#F0F4F8',
};

const ProfileSetupScreen = ({navigation}: any) => {
  const {width, height} = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState(new Date(2000, 0, 1));
  const [gender, setGender] = useState('');

  const goToNextStep = () => {
    if (step < totalSteps) {
      const next = step + 1;
      setStep(next);
      scrollViewRef.current?.scrollTo({x: width * (next - 1), animated: true});
    } else {
      handleComplete();
    }
  };

  const goToPrevStep = () => {
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      scrollViewRef.current?.scrollTo({x: width * (prev - 1), animated: true});
    }
  };

  // --- HÀM XỬ LÝ GỌI API KHI HOÀN THÀNH ---
  const handleComplete = async () => {
    try {
      // 1. Lấy userId từ bộ nhớ (đã lưu lúc Login/Register)
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        Alert.alert(
          'Lỗi',
          'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.',
        );
        return;
      }

      // 2. Format biến ngày sinh từ dạng Date Object sang chuỗi "YYYY-MM-DD" chuẩn của PostgreSQL
      const formattedDob = dob.toISOString().split('T')[0];

      // 3. Gọi API Setup Profile
      const response = await axiosClient.post('/profile/setup', {
        userId: userId,
        profile: {
          full_name: fullName,
          gender: gender,
          date_of_birth: formattedDob,
        },
        // health, goal, allergies sẽ được gửi ở các màn hình sau
      });

      if (response.data.success) {
        console.log('Đã lưu Profile:', {fullName, formattedDob, gender});

        // 4. Chuyển sang màn hình setup sức khỏe
        navigation.navigate('HealthProfileSetup');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ.';
        Alert.alert('Lỗi Server', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      }
    }
  };
  // ------------------------------------------

  const renderNextButton = () => {
    let isDisabled = true;
    if (step === 1 && fullName.trim().length > 0) isDisabled = false;
    if (step === 2) isDisabled = false;
    if (step === 3 && gender !== '') isDisabled = false;
    if (step === 4) isDisabled = false;

    if (isDisabled) return null;

    return (
      <Animated.View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={goToNextStep}
          activeOpacity={0.8}>
          <Icon
            name={step === 4 ? 'check' : 'arrow-right'}
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

      {/* THANH ĐIỀU HƯỚNG & TIẾN ĐỘ Ở TRÊN CÙNG */}
      <View style={styles.topBar}>
        {step > 1 ? (
          <TouchableOpacity onPress={goToPrevStep} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        {/* Progress Bar tinh tế */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map(item => (
            <View
              key={item}
              style={[
                styles.progressDot,
                step >= item ? styles.progressDotActive : null,
              ]}
            />
          ))}
        </View>
      </View>

      {/* KHUNG CUỘN TRƯỢT NGANG (SLIDER) */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false} // Khóa cuộn bằng tay, bắt buộc bấm nút
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ================= BƯỚC 1: NHẬP TÊN (NO BORDER) ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>What's your full name?</Text>
          <TextInput
            style={styles.borderlessInput}
            placeholder="Type your name here"
            placeholderTextColor={COLORS.textGray}
            value={fullName}
            onChangeText={setFullName}
            autoFocus
            autoCapitalize="words"
          />
        </View>

        {/* ================= BƯỚC 2: NGÀY SINH (WHEEL PICKER) ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>When is your birthday?</Text>
          <Text style={styles.subHeadline}>
            We use this to give you personalized skin tips.
          </Text>

          <View style={styles.pickerContainer}>
            <DatePicker
              date={dob}
              onDateChange={setDob}
              mode="date"
              theme="light" // Bắt buộc giao diện sáng
              textColor={COLORS.secondary}
              maximumDate={new Date()} // Không cho chọn ngày tương lai
              style={styles.datePicker}
            />
          </View>
        </View>

        {/* ================= BƯỚC 3: GIỚI TÍNH ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>What is your gender?</Text>
          <View style={styles.genderContainer}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderBox,
                  gender === g && styles.genderBoxActive,
                ]}
                onPress={() => {
                  setGender(g);
                  // Tự động nhảy trang khi chọn xong cho mượt
                  setTimeout(() => goToNextStep(), 300);
                }}>
                <Text
                  style={[
                    styles.genderText,
                    gender === g && styles.genderTextActive,
                  ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================= BƯỚC 4: AVATAR ================= */}
        <View style={[styles.pageContainer, {width}]}>
          <Text style={styles.headline}>Add a profile picture</Text>
          <Text style={styles.subHeadline}>
            You can skip this and do it later.
          </Text>

          <View style={styles.avatarWrapper}>
            <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.7}>
              <Icon name="camera" size={40} color={COLORS.textGray} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* NÚT TRÒN ĐIỀU HƯỚNG NẰM Ở GÓC DƯỚI */}
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
  backBtn: {
    padding: 8,
  },
  backBtnPlaceholder: {
    width: 40,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginRight: 40, // Cân bằng với nút back
  },
  progressDot: {
    width: 25,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  pageContainer: {
    paddingHorizontal: 30,
    paddingTop: 40,
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
    marginBottom: 40,
  },

  // Tùy chỉnh input không viền
  borderlessInput: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 30,
    paddingVertical: 10,
  },

  // Wheel Picker
  pickerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  datePicker: {
    height: 200,
  },

  // Gender Boxes
  genderContainer: {
    marginTop: 20,
    gap: 15,
  },
  genderBox: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderBoxActive: {
    backgroundColor: '#eff4ff',
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  genderTextActive: {
    color: COLORS.primary,
  },

  // Avatar
  avatarWrapper: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.textGray,
    borderStyle: 'dashed',
  },

  // Nút nổi (Floating Action Button)
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

export default ProfileSetupScreen;
