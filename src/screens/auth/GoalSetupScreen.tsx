import React, {useState, useRef, useEffect} from 'react';
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
  SafeAreaView,
  Modal,
  ActivityIndicator,
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
  accent: '#E5EDFF',
};

// --- Đã xóa Hardcode LIST, thay bằng State để lấy từ API ---
interface ListItem {
  id: number;
  name: string;
}

const GOAL_TYPES = [
  {
    id: 'lose_weight',
    title: 'Lose Weight',
    icon: 'trending-down',
    desc: 'Burn fat & get leaner',
  },
  {
    id: 'maintain',
    title: 'Maintain Weight',
    icon: 'activity',
    desc: 'Stay healthy & fit',
  },
  {
    id: 'gain_weight',
    title: 'Gain Muscle',
    icon: 'trending-up',
    desc: 'Build muscle mass',
  },
];

const GoalSetupScreen = ({navigation}: any) => {
  const {width} = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  // States quản lý luồng
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // States danh sách lấy từ Database
  const [allergiesList, setAllergiesList] = useState<ListItem[]>([]);
  const [conditionsList, setConditionsList] = useState<ListItem[]>([]);

  // States lưu trữ dữ liệu người dùng
  const [selectedAllergies, setSelectedAllergies] = useState<number[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<number[]>([]);
  const [goalType, setGoalType] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [weeklyPace, setWeeklyPace] = useState(0.5); // Mặc định giảm/tăng 0.5kg/tuần

  // --- HÀM TẢI DANH SÁCH TỪ BACKEND KHI MỞ MÀN HÌNH ---
  useEffect(() => {
    const fetchLists = async () => {
      try {
        // Gọi song song 2 API List để tiết kiệm thời gian
        const [allergiesRes, conditionsRes] = await Promise.all([
          axiosClient.get('/list/allergies'),
          axiosClient.get('/list/medical-conditions'),
        ]);

        if (allergiesRes.data.success) {
          setAllergiesList(allergiesRes.data.data);
        }
        if (conditionsRes.data.success) {
          setConditionsList(conditionsRes.data.data);
        }
      } catch (error) {
        console.error('Lỗi lấy danh sách:', error);
        // Có thể gán lại mảng rỗng hoặc báo lỗi nếu muốn
      }
    };
    fetchLists();
  }, []);
  // ----------------------------------------------------

  const toggleItem = (
    id: number,
    list: number[],
    setList: (l: number[]) => void,
  ) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const goToNextStep = () => {
    Keyboard.dismiss();
    // Logic: Nếu chọn Maintain ở bước 3, hoàn tất luôn
    if (step === 3 && goalType === 'maintain') {
      handleComplete();
      return;
    }

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
      navigation.goBack();
    }
  };

  // --- HÀM LƯU DỮ LIỆU CUỐI CÙNG LÊN DATABASE ---
  const handleComplete = async () => {
    setIsLoading(true);

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setIsLoading(false);
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
        return;
      }

      // 1. Cấu trúc dữ liệu chuẩn để gửi lên Backend
      // Vì bảng Medical Conditions mới ở dạng mảng ID (list), ta phải lưu riêng hoặc nối chuỗi.
      // Dựa vào thiết kế DB hiện tại, Backend của ta có `user_allergies` (mảng ID)
      // Nhưng bảng `user_health_profiles` chỉ có 1 cột `medical_conditions` dạng text.
      // Do đó, ta sẽ chuyển mảng ID bệnh lý thành tên để lưu vào text cho khớp DB cũ của bạn.
      const conditionNames = selectedConditions
        .map(id => conditionsList.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      const finalData = {
        userId: userId,
        // Cập nhật lại cột medical_conditions nếu user có chọn thêm ở bước này
        health: {
          medical_conditions: conditionNames || 'Không có',
        },
        // Gửi mảng ID dị ứng để lưu vào bảng user_allergies
        allergies: selectedAllergies,
        // Gửi dữ liệu vào bảng user_goals
        goal: {
          goal_type: goalType,
          target_weight:
            goalType === 'maintain' ? null : parseFloat(targetWeight),
          weekly_goal: goalType === 'maintain' ? null : weeklyPace,
          start_date: new Date().toISOString().split('T')[0], // Lấy ngày hôm nay
        },
      };

      // 2. Gọi chung API POST /profile/setup
      const response = await axiosClient.post('/profile/setup', finalData);

      if (response.data.success) {
        console.log('Final Setup Data Lưu Thành Công:', finalData);
        setShowSuccessDialog(true); // Hiện hộp thoại chúc mừng
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.message || 'Lỗi lưu hồ sơ cuối.';
        Alert.alert('Lỗi Server', errorMsg);
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối máy chủ.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  // ----------------------------------------------

  const renderNextButton = () => {
    let isDisabled = true;
    if (step === 1 || step === 2) isDisabled = false; // Bước 1, 2 có thể bỏ trống
    if (step === 3 && goalType) isDisabled = false;
    if (step === 4 && targetWeight) isDisabled = false;

    if (isDisabled) return null;

    return (
      <Animated.View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={goToNextStep}
          activeOpacity={0.8}>
          <Icon
            name={
              step === totalSteps || (step === 3 && goalType === 'maintain')
                ? 'check'
                : 'arrow-right'
            }
            size={28}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: COLORS.bg}}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{flex: 1}}>
        {/* THANH TIẾN ĐỘ */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goToPrevStep} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  step >= i && styles.progressDotActive,
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
          {/* BƯỚC 1: DỊ ỨNG */}
          <View style={[styles.pageContainer, {width}]}>
            <Text style={styles.headline}>Any food allergies?</Text>
            <Text style={styles.subHeadline}>
              Tell us what to avoid. We'll adjust your plans accordingly.
            </Text>
            <View style={styles.tagsContainer}>
              {allergiesList.length === 0 ? (
                <Text style={{color: COLORS.textGray}}>
                  Loading allergies...
                </Text>
              ) : (
                allergiesList.map(item => {
                  const isSelected = selectedAllergies.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.tag, isSelected && styles.tagActive]}
                      onPress={() =>
                        toggleItem(
                          item.id,
                          selectedAllergies,
                          setSelectedAllergies,
                        )
                      }>
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextActive,
                        ]}>
                        {item.name}
                      </Text>
                      {isSelected && (
                        <Icon
                          name="check"
                          size={16}
                          color={COLORS.primary}
                          style={{marginLeft: 6}}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* BƯỚC 2: BỆNH LÝ */}
          <View style={[styles.pageContainer, {width}]}>
            <Text style={styles.headline}>Medical Conditions?</Text>
            <Text style={styles.subHeadline}>
              This helps us calculate your nutrient needs more accurately.
            </Text>
            <View style={styles.tagsContainer}>
              {conditionsList.length === 0 ? (
                <Text style={{color: COLORS.textGray}}>
                  Loading conditions...
                </Text>
              ) : (
                conditionsList.map(item => {
                  const isSelected = selectedConditions.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.tag, isSelected && styles.tagActive]}
                      onPress={() =>
                        toggleItem(
                          item.id,
                          selectedConditions,
                          setSelectedConditions,
                        )
                      }>
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextActive,
                        ]}>
                        {item.name}
                      </Text>
                      {isSelected && (
                        <Icon
                          name="check"
                          size={16}
                          color={COLORS.primary}
                          style={{marginLeft: 6}}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* BƯỚC 3: MỤC TIÊU */}
          <View style={[styles.pageContainer, {width}]}>
            <Text style={styles.headline}>What's your goal?</Text>
            <View style={styles.cardsContainer}>
              {GOAL_TYPES.map(item => {
                const active = goalType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.goalCard, active && styles.goalCardActive]}
                    onPress={() => {
                      setGoalType(item.id);
                      if (item.id !== 'maintain') setTimeout(goToNextStep, 300);
                    }}>
                    <View
                      style={[styles.iconBox, active && styles.iconBoxActive]}>
                      <Icon
                        name={item.icon}
                        size={24}
                        color={active ? COLORS.white : COLORS.primary}
                      />
                    </View>
                    <View style={styles.cardTextContent}>
                      <Text
                        style={[styles.cardTitle, active && styles.textWhite]}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.cardDesc, active && styles.textWhiteOp]}>
                        {item.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* BƯỚC 4: CÂN NẶNG MỤC TIÊU */}
          <View style={[styles.pageContainer, {width}]}>
            <Text style={styles.headline}>Set your target</Text>
            <View style={styles.targetCard}>
              <Text style={styles.inputLabel}>Target Weight</Text>
              <View style={styles.weightRow}>
                <TextInput
                  style={styles.hugeInput}
                  placeholder="00.0"
                  keyboardType="decimal-pad"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  autoFocus={step === 4}
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {renderNextButton()}

        {/* LOADING OVERLAY */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Saving Profile...</Text>
            </View>
          </View>
        )}

        {/* SUCCESS DIALOG */}
        <Modal
          visible={showSuccessDialog}
          transparent={true}
          animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.successIconCircle}>
                <Icon name="check" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.dialogTitle}>Success!</Text>
              <Text style={styles.dialogDesc}>
                Your health profile is ready. Let's start!
              </Text>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={() => {
                  setShowSuccessDialog(false);
                  navigation.replace('MainApp');
                }}>
                <Text style={styles.dialogBtnText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {flexDirection: 'row', alignItems: 'center', padding: 20},
  backBtn: {padding: 8},
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginRight: 40,
  },
  progressDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {backgroundColor: COLORS.primary},
  pageContainer: {paddingHorizontal: 30, paddingTop: 10},
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  subHeadline: {
    fontSize: 15,
    color: COLORS.textGray,
    marginBottom: 20,
    lineHeight: 22,
  },
  tagsContainer: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tagActive: {backgroundColor: COLORS.accent, borderColor: COLORS.primary},
  tagText: {fontSize: 15, fontWeight: '600', color: COLORS.secondary},
  tagTextActive: {color: COLORS.primary},
  cardsContainer: {gap: 16},
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconBoxActive: {backgroundColor: 'rgba(255,255,255,0.2)'},
  cardTitle: {fontSize: 17, fontWeight: '700', color: COLORS.secondary},
  cardDesc: {fontSize: 13, color: COLORS.textGray},
  textWhite: {color: COLORS.white},
  textWhiteOp: {color: 'rgba(255,255,255,0.8)'},
  targetCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 24,
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  weightRow: {flexDirection: 'row', alignItems: 'baseline'},
  hugeInput: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.secondary,
    minWidth: 120,
  },
  unitText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textGray,
    marginLeft: 8,
  },
  fabContainer: {position: 'absolute', bottom: 40, right: 30},
  fabButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 35, 92, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 35, 92, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  dialogDesc: {
    fontSize: 15,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 25,
  },
  dialogBtn: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnText: {color: COLORS.white, fontSize: 18, fontWeight: '800'},
});

export default GoalSetupScreen;
