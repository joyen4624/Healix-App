import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DatePicker from 'react-native-date-picker';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import {useTranslation} from 'react-i18next';

const COLORS = {
  primary: '#2c65e8',
  primaryLight: '#EEF2FF',
  secondary: '#0F172A', // Đổi sang màu Slate tối nhìn sang trọng hơn
  textGray: '#64748B',
  textLight: '#94A3B8',
  white: '#ffffff',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  inputBg: '#ffffff',
  success: '#22C55E',
  error: '#EF4444',
  info: '#3B82F6',
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

type GenderValue = 'Male' | 'Female' | 'Other';

type AlertDialogVariant = 'success' | 'error' | 'info';

function parseDobToDate(dob: string): Date {
  if (!dob || !dob.trim()) {
    return new Date(2000, 0, 1);
  }
  const [y, m, d] = dob.split('-').map(Number);
  if (!y || !m || !d) {
    return new Date(2000, 0, 1);
  }
  return new Date(y, m - 1, d);
}

function formatDateToDob(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

const PersonalDataScreen = ({navigation}: any) => {
  const {t, i18n} = useTranslation();
  const {width: windowWidth} = useWindowDimensions();
  const datePickerPixelWidth = Math.max(
    200,
    Math.min(360, windowWidth - 48) - 44,
  );

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dob: '',
    gender: 'Male' as GenderValue,
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alertDialog, setAlertDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: AlertDialogVariant;
  }>({visible: false, title: '', message: '', variant: 'info'});
  const alertDialogActionRef = useRef<(() => void) | undefined>(undefined);

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date(2000, 0, 1));

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const showAlertDialog = (
    title: string,
    message: string,
    variant: AlertDialogVariant = 'info',
    onAfterClose?: () => void,
  ) => {
    alertDialogActionRef.current = onAfterClose;
    setAlertDialog({visible: true, title, message, variant});
  };

  const dismissAlertDialog = () => {
    const fn = alertDialogActionRef.current;
    alertDialogActionRef.current = undefined;
    setAlertDialog(prev => ({...prev, visible: false}));
    fn?.();
  };

  const openDobPicker = () => {
    setPickerDate(parseDobToDate(formData.dob));
    setDateModalVisible(true);
  };

  const confirmDobPicker = () => {
    updateField('dob', formatDateToDob(pickerDate));
    setDateModalVisible(false);
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlertDialog(
          t('personalData.alerts.login_title'),
          t('personalData.alerts.login_message'),
          'error',
          () => navigation.goBack(),
        );
        return;
      }

      const res = await axiosClient.get('/profile/me');
      if (res.data.success) {
        const p = res.data.data?.profile || {};
        const rawDob = p.date_of_birth;
        const dobStr =
          rawDob != null
            ? String(rawDob).split('T')[0].split(' ')[0]
            : '';
        const g = p.gender as string | undefined;
        const gender: GenderValue =
          g === 'Female' || g === 'Other' ? g : 'Male';

        setFormData({
          fullName: p.full_name || '',
          email: p.email || '',
          dob: dobStr,
          gender,
        });
      }
    } catch {
      showAlertDialog(
        t('personalData.alerts.load_error_title'),
        t('personalData.alerts.load_error_message'),
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      showAlertDialog(
        t('personalData.alerts.missing_name_title'),
        t('personalData.alerts.missing_name'),
        'info',
      );
      return;
    }

    const emailTrim = formData.email.trim();
    if (!emailTrim) {
      showAlertDialog(
        t('personalData.alerts.missing_email_title'),
        t('personalData.alerts.missing_email'),
        'info',
      );
      return;
    }

    setSaving(true);
    try {
      const body: {
        full_name: string;
        email: string;
        gender: GenderValue;
        date_of_birth?: string;
      } = {
        full_name: formData.fullName.trim(),
        email: emailTrim,
        gender: formData.gender,
      };
      const dobTrim = formData.dob.trim();
      if (dobTrim) {
        body.date_of_birth = dobTrim;
      }

      const res = await axiosClient.patch('/profile/me', body);
      if (res.data.success) {
        showAlertDialog(
          t('personalData.alerts.success_title'),
          t('personalData.alerts.success_message'),
          'success',
          () => navigation.goBack(),
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('personalData.alerts.save_error_fallback');
      showAlertDialog(t('personalData.alerts.save_error_title'), String(msg), 'error');
    } finally {
      setSaving(false);
    }
  };

  const dialogIcon = (variant: AlertDialogVariant) => {
    switch (variant) {
      case 'success':
        return {name: 'check', bg: '#D1FAE5', color: COLORS.success};
      case 'error':
        return {name: 'x', bg: '#FEE2E2', color: COLORS.error};
      default:
        return {name: 'info', bg: '#DBEAFE', color: COLORS.info};
    }
  };

  const dialogBtnColor = (variant: AlertDialogVariant) => {
    switch (variant) {
      case 'success':
        return COLORS.primary;
      case 'error':
        return COLORS.error;
      default:
        return COLORS.primary;
    }
  };

  const alertIconSpec = dialogIcon(alertDialog.variant);

  const InputField = ({label, value, icon, field, editable = true}: any) => {
    const isFocused = focusedField === field;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            !editable && styles.disabledInput,
            isFocused && styles.inputFocused,
          ]}>
          <Icon
            name={icon}
            size={20}
            color={isFocused ? COLORS.primary : COLORS.textLight}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, !editable && {color: COLORS.textGray}]}
            value={value}
            editable={editable}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField(null)}
            onChangeText={text => updateField(field, text)}
            placeholderTextColor={COLORS.textLight}
          />
          {!editable && <Icon name="lock" size={16} color={COLORS.textLight} />}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* STATUS BAR TRÀN VIỀN TẠO CẢM GIÁC PREMIUM */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* HEADER LIỀN MẠCH KHÔNG DÙNG SAFEAREAVIEW */}
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
            {t('personalData.header_title')}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading || saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveText}>{t('personalData.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('personalData.loading')}</Text>
          </View>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* HỘP THÔNG TIN */}
          <AnimatedFadeSlide delay={50}>
            <View style={styles.infoBox}>
              <View style={styles.infoIconBg}>
                <Icon name="shield" size={18} color={COLORS.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.infoTitle}>
                  {t('personalData.info_title')}
                </Text>
                <Text style={styles.infoText}>
                  {t('personalData.info_text')}
                </Text>
              </View>
            </View>
          </AnimatedFadeSlide>

          {/* FORM NHẬP LIỆU */}
          <View style={styles.form}>
            <AnimatedFadeSlide delay={150}>
              <InputField
                label={t('personalData.labels.full_name')}
                value={formData.fullName}
                icon="user"
                field="fullName"
              />
            </AnimatedFadeSlide>

            <AnimatedFadeSlide delay={250}>
              <InputField
                label={t('personalData.labels.email')}
                value={formData.email}
                icon="mail"
                field="email"
              />
            </AnimatedFadeSlide>

            <AnimatedFadeSlide delay={350}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('personalData.labels.dob')}</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openDobPicker}
                  style={[
                    styles.inputContainer,
                    focusedField === 'dob' && styles.inputFocused,
                  ]}>
                  <Icon
                    name="calendar"
                    size={20}
                    color={COLORS.primary}
                    style={styles.inputIcon}
                  />
                  <Text
                    style={[
                      styles.input,
                      !formData.dob && {color: COLORS.textLight},
                    ]}>
                    {formData.dob
                      ? formData.dob.split('-').reverse().join('/')
                      : t('personalData.dob_placeholder')}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
            </AnimatedFadeSlide>

            <AnimatedFadeSlide delay={450}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('personalData.labels.gender')}
                </Text>
                <View style={styles.genderRow}>
                  {(
                    [
                      {
                        value: 'Male' as const,
                        labelKey: 'personalData.gender.male',
                        icon: 'user',
                      },
                      {
                        value: 'Female' as const,
                        labelKey: 'personalData.gender.female',
                        icon: 'users',
                      },
                      {
                        value: 'Other' as const,
                        labelKey: 'personalData.gender.other',
                        icon: 'help-circle',
                      },
                    ] as const
                  ).map(({value: g, labelKey, icon}) => {
                    const isActive = formData.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        activeOpacity={0.8}
                        style={[
                          styles.genderBtn,
                          isActive && styles.genderBtnActive,
                        ]}
                        onPress={() => updateField('gender', g)}>
                        <Icon
                          name={icon}
                          size={18}
                          color={isActive ? COLORS.primary : COLORS.textGray}
                          style={{marginRight: 6}}
                        />
                        <Text
                          style={[
                            styles.genderText,
                            isActive && styles.genderTextActive,
                          ]}>
                          {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </AnimatedFadeSlide>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={alertDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={dismissAlertDialog}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertDialogCard}>
            <View
              style={[
                styles.alertDialogIconWrap,
                {backgroundColor: alertIconSpec.bg},
              ]}>
              <Icon
                name={alertIconSpec.name as 'check' | 'x' | 'info'}
                size={28}
                color={alertIconSpec.color}
              />
            </View>
            <Text style={styles.alertDialogTitle}>{alertDialog.title}</Text>
            <Text style={styles.alertDialogMessage}>{alertDialog.message}</Text>
            <TouchableOpacity
              style={[
                styles.alertDialogBtn,
                {backgroundColor: dialogBtnColor(alertDialog.variant)},
              ]}
              activeOpacity={0.9}
              onPress={dismissAlertDialog}>
              <Text style={styles.alertDialogBtnText}>
                {t('personalData.dialog_ok')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdropFill}
            onPress={() => setDateModalVisible(false)}
          />
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>
              {t('personalData.date_modal.title')}
            </Text>
            <Text style={styles.dateModalHint}>
              {t('personalData.date_modal.hint')}
            </Text>
            <View style={styles.datePickerWrap}>
              <DatePicker
                date={pickerDate}
                onDateChange={setPickerDate}
                mode="date"
                theme="light"
                dividerColor={COLORS.primary}
                buttonColor={COLORS.primary}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                locale={i18n.language === 'en' ? 'en' : 'vi'}
                style={[
                  styles.datePickerNative,
                  {width: datePickerPixelWidth},
                ]}
                {...({
                  textColor: COLORS.secondary,
                  fadeToColor: COLORS.white,
                } as Record<string, string>)}
              />
            </View>
            <View style={styles.dateModalBtnRow}>
              <TouchableOpacity
                style={styles.dateModalCancelBtn}
                activeOpacity={0.85}
                onPress={() => setDateModalVisible(false)}>
                <Text style={styles.dateModalCancelText}>
                  {t('personalData.date_modal.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateModalOkBtn}
                activeOpacity={0.85}
                onPress={confirmDobPicker}>
                <Text style={styles.dateModalOkText}>
                  {t('personalData.date_modal.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // HEADER ĐƯỢC XÂY DỰNG LẠI ĐỂ TÍCH HỢP XUYÊN QUA TAI THỎ
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
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
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
  saveBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
    minHeight: 36,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  saveText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },

  scrollContent: {
    padding: 24,
    paddingTop: 30, // Thêm khoảng cách với header
    paddingBottom: 60,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 24,
    alignItems: 'flex-start',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  infoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '500',
    lineHeight: 22,
  },

  // Form Inputs
  form: {flex: 1},
  inputGroup: {marginBottom: 24},
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textGray,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 64,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: 'transparent',
  },
  inputIcon: {marginRight: 14},
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '700',
  },

  // Gender Row
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: '28%',
    flexDirection: 'row',
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  genderBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textGray,
  },
  genderTextActive: {
    color: COLORS.primary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  alertDialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  alertDialogIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  alertDialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  alertDialogMessage: {
    fontSize: 15,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },
  alertDialogBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  alertDialogBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  dateModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 1,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  dateModalHint: {
    fontSize: 13,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  datePickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePickerNative: {
    height: Platform.OS === 'ios' ? 220 : 240,
  },
  dateModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dateModalCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  dateModalOkBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  dateModalOkText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
});

export default PersonalDataScreen;
