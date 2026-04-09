import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import {useTranslation} from 'react-i18next';

// 🔴 IMPORT MODAL LÊN CẤP KHI NHẬN THƯỞNG
import XpGainModal from '../../components/XpGainModal';

const COLORS = {
  primary: '#2c65e8',
  secondaryDeep: '#0A235C',
  gold: '#FFD700',
  white: '#ffffff',
  textGray: '#8A94A6',
  bgDark: '#F4F7FC',
  success: '#34C759',
  danger: '#FF3B30',
  cardBg: '#ffffff',
};

// =======================================================
// 1. ĐỊNH NGHĨA INTERFACE
// =======================================================
interface Challenge {
  id: string;
  title: string;
  description: string;
  image: string;
  rewardXp: number;
  rewardBadge: string;
  targetValue: number;
  type?: 'reps' | 'calories' | 'duration' | string;
  currentValue?: number;
  daysLeft?: number;
  participants?: number;
  historyStatus?: 'success' | 'failed'; // 🔴 Thêm field cho tab Lịch sử
}

// =======================================================
// 2. COMPONENT HIỆU ỨNG TRƯỢT VÀ HIỆN DẦN
// =======================================================
const FadeSlideCard = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{opacity, transform: [{translateY}]}}>
      {children}
    </Animated.View>
  );
};

// =======================================================
// 3. THẺ ĐANG THAM GIA ĐỘC LẬP (ĐỂ XỬ LÝ ANIMATION NÚT & BAR)
// =======================================================
const ActiveChallengeItem = ({
  item,
  index,
  onClaim,
}: {
  item: Challenge;
  index: number;
  onClaim: (challenge: Challenge) => void;
}) => {
  const {t} = useTranslation();
  const safeCurrentValue = item.currentValue || 0;
  const safeTargetValue = item.targetValue || 1;
  const progress = safeCurrentValue / safeTargetValue;
  const progressPercent = Math.min(Math.round(progress * 100), 100);
  const isCompleted = safeCurrentValue >= safeTargetValue;

  const widthAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressPercent,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (isCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [progressPercent, isCompleted]);

  return (
    <FadeSlideCard delay={index * 100}>
      <TouchableOpacity activeOpacity={0.9} style={styles.card}>
        <Image source={{uri: item.image}} style={styles.cardImage} />
        <View style={styles.cardOverlay} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeEmoji}>{item.rewardBadge}</Text>
            </View>

            {!isCompleted && item.daysLeft !== undefined && (
              <View style={styles.timeLeftBadge}>
                <Icon name="timer-sand" size={14} color={COLORS.danger} />
                <Text style={styles.timeLeftText}>
                  {t('challenges.cards.days_left', {count: item.daysLeft})}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {safeCurrentValue} / {safeTargetValue}{' '}
                  {item.type === 'reps'
                    ? t('challenges.units.reps')
                    : item.type === 'duration'
                    ? t('challenges.units.seconds')
                    : t('challenges.units.kcal')}
                </Text>
                <Text
                  style={[
                    styles.progressPercent,
                    isCompleted && {color: COLORS.gold},
                  ]}>
                  {progressPercent}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: widthAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                    isCompleted && {backgroundColor: COLORS.gold},
                  ]}
                />
              </View>
            </View>

            {isCompleted ? (
              <Animated.View
                style={{transform: [{scale: scaleAnim}], marginTop: 8}}>
                <TouchableOpacity
                  style={styles.claimBtn}
                  activeOpacity={0.9}
                  onPress={() => onClaim(item)}>
                  <Icon
                    name="gift"
                    size={20}
                    color={COLORS.secondaryDeep}
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.claimBtnText}>
                    {t('challenges.cards.claim_now')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardLabel}>{t('challenges.cards.reward_label')}</Text>
                <View style={styles.rewardPill}>
                  <Icon name="star-four-points" size={16} color={COLORS.gold} />
                  <Text style={styles.rewardXpText}>
                    +{item.rewardXp} {t('challenges.units.xp')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </FadeSlideCard>
  );
};

// =======================================================
// 4. MAIN COMPONENT
// =======================================================
const ChallengesScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  // 🔴 THÊM TAB 'past' CHO LỊCH SỬ
  const [activeTab, setActiveTab] = useState<'active' | 'discover' | 'past'>(
    'active',
  );

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>(
    [],
  );
  const [pastChallenges, setPastChallenges] = useState<Challenge[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [xpModalConfig, setXpModalConfig] = useState({
    visible: false,
    xpEarned: 0,
    currentXp: 0,
    nextLevelXp: 200,
    level: 1,
    isLevelUp: false,
  });

  const [customDialog, setCustomDialog] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success',
    onConfirm: () => {},
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: 'success' | 'error',
    onConfirm: () => void = () => {},
  ) => {
    setCustomDialog({visible: true, title, message, type, onConfirm});
  };

  const hideCustomAlert = () =>
    setCustomDialog({...customDialog, visible: false});

  // 🔴 FETCH DATA CÓ THÊM MẢNG PAST
  const fetchChallenges = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get('/challenges', {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.data.success) {
        setActiveChallenges(response.data.data.active || []);
        setAvailableChallenges(response.data.data.available || []);
        setPastChallenges(response.data.data.past || []);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thử thách:', error);
      showCustomAlert(
        t('challenges.alerts.connection_error_title'),
        t('challenges.alerts.load_failed'),
        'error',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const handleJoinChallenge = async (challengeId: string) => {
    setJoiningId(challengeId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.post(
        '/challenges/join',
        {challenge_id: challengeId},
        {headers: {Authorization: `Bearer ${token}`}},
      );

      if (response.data.success) {
        showCustomAlert(t('challenges.alerts.success_title'), response.data.message, 'success', () => {
          setActiveTab('active');
          fetchChallenges();
        });
      }
    } catch (error: any) {
      showCustomAlert(
        t('challenges.alerts.failed_title'),
        error.response?.data?.message || t('challenges.alerts.join_failed'),
        'error',
      );
    } finally {
      setJoiningId(null);
    }
  };

  const handleClaimReward = async (challenge: Challenge) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.post(
        `/challenges/claim/${challenge.id}`,
        {},
        {headers: {Authorization: `Bearer ${token}`}},
      );

      if (response.data.success) {
        const d = response.data.data;
        setXpModalConfig({
          visible: true,
          xpEarned: d.reward_xp || 0,
          currentXp: d.current_xp || 0,
          nextLevelXp: d.next_level_xp || 200,
          level: d.level || 1,
          isLevelUp: d.leveled_up || false,
        });
        fetchChallenges();
      }
    } catch (error: any) {
      showCustomAlert(
        t('challenges.alerts.error_title'),
        error.response?.data?.message || t('challenges.alerts.claim_failed'),
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER THẺ SỰ KIỆN MỚI
  // =======================================================
  const renderAvailableChallenge = ({
    item,
    index,
  }: {
    item: Challenge;
    index: number;
  }) => {
    const isJoining = joiningId === item.id;
    return (
      <FadeSlideCard delay={index * 100}>
        <TouchableOpacity activeOpacity={0.9} style={styles.card}>
          <Image source={{uri: item.image}} style={styles.cardImage} />
          <View style={styles.cardOverlay} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeEmoji}>{item.rewardBadge}</Text>
              </View>
              {item.participants !== undefined && (
                <View style={styles.participantsBadge}>
                  <Icon name="account-group" size={14} color={COLORS.primary} />
                  <Text style={styles.participantsText}>
                    {t('challenges.cards.participants', {count: item.participants})}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.actionRow}>
                <View style={styles.rewardPill}>
                  <Icon name="star-four-points" size={16} color={COLORS.gold} />
                  <Text style={styles.rewardXpText}>
                    +{item.rewardXp} {t('challenges.units.xp')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinBtn, isJoining && {opacity: 0.7}]}
                  disabled={isJoining}
                  onPress={() => handleJoinChallenge(item.id)}>
                  {isJoining ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.joinBtnText}>{t('challenges.cards.join')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </FadeSlideCard>
    );
  };

  // =======================================================
  // 🔴 RENDER THẺ LỊCH SỬ (PAST)
  // =======================================================
  const renderPastChallenge = ({
    item,
    index,
  }: {
    item: Challenge;
    index: number;
  }) => {
    const isSuccess = item.historyStatus === 'success';
    const badgeColor = isSuccess ? COLORS.success : COLORS.textGray;
    const overlayColor = isSuccess
      ? 'rgba(10, 35, 92, 0.85)'
      : 'rgba(0, 0, 0, 0.75)';

    return (
      <FadeSlideCard delay={index * 100}>
        <View style={[styles.card, {opacity: 0.9}]}>
          <Image
            source={{uri: item.image}}
            style={[styles.cardImage, !isSuccess && {tintColor: 'gray'}]}
          />
          <View style={[styles.cardOverlay, {backgroundColor: overlayColor}]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeEmoji}>{item.rewardBadge}</Text>
              </View>

              {/* Nhãn trạng thái lịch sử */}
              <View
                style={[
                  styles.historyBadge,
                  {
                    borderColor: badgeColor,
                    backgroundColor: isSuccess
                      ? 'rgba(52,199,89,0.15)'
                      : 'rgba(138,148,166,0.2)',
                  },
                ]}>
                <Icon
                  name={isSuccess ? 'check-circle' : 'close-circle'}
                  size={14}
                  color={badgeColor}
                  style={{marginRight: 4}}
                />
                <Text style={[styles.historyBadgeText, {color: badgeColor}]}>
                  {isSuccess
                    ? t('challenges.history.success')
                    : t('challenges.history.expired')}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text
                style={[styles.cardTitle, !isSuccess && {color: '#D1D5DB'}]}>
                {item.title}
              </Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.actionRow}>
                <View
                  style={[
                    styles.rewardPill,
                    !isSuccess && {
                      borderColor: COLORS.textGray,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  ]}>
                  <Icon
                    name="star-four-points"
                    size={16}
                    color={isSuccess ? COLORS.gold : COLORS.textGray}
                  />
                  <Text
                    style={[
                      styles.rewardXpText,
                      !isSuccess && {color: COLORS.textGray},
                    ]}>
                    +{item.rewardXp} {t('challenges.units.xp')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </FadeSlideCard>
    );
  };

  const getListData = () => {
    if (activeTab === 'active') return activeChallenges;
    if (activeTab === 'discover') return availableChallenges;
    return pastChallenges;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgDark} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Icon name="chevron-left" size={32} color={COLORS.secondaryDeep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('challenges.header.title')}</Text>
        <View style={{width: 32}} />
      </View>

      {/* 🔴 TABS ĐÃ ĐƯỢC CHIA 3 PHẦN ĐỀU NHAU */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}>
            {t('challenges.tabs.joined')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'discover' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('discover')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'discover' && styles.tabTextActive,
            ]}>
            {t('challenges.tabs.new_events')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.tabTextActive,
            ]}>
            {t('challenges.tabs.history')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DANH SÁCH THỬ THÁCH */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('challenges.loading')}</Text>
        </View>
      ) : (
        <FlatList<Challenge>
          data={getListData()}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => {
            if (activeTab === 'active')
              return (
                <ActiveChallengeItem
                  item={item}
                  index={index}
                  onClaim={handleClaimReward}
                />
              );
            if (activeTab === 'discover')
              return renderAvailableChallenge({item, index});
            return renderPastChallenge({item, index});
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="flag-checkered" size={60} color={COLORS.textGray} />
              <Text style={styles.emptyText}>
                {activeTab === 'active'
                  ? t('challenges.empty.joined')
                  : activeTab === 'discover'
                  ? t('challenges.empty.new_events')
                  : t('challenges.empty.history')}
              </Text>
            </View>
          }
        />
      )}

      {/* CUSTOM DIALOG */}
      <Modal visible={customDialog.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <View
              style={[
                styles.dialogIconWrap,
                {
                  backgroundColor:
                    customDialog.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                },
              ]}>
              <Icon
                name={customDialog.type === 'success' ? 'check' : 'close'}
                size={36}
                color={
                  customDialog.type === 'success'
                    ? COLORS.success
                    : COLORS.danger
                }
              />
            </View>
            <Text style={styles.dialogTitle}>{customDialog.title}</Text>
            <Text style={styles.dialogMessage}>{customDialog.message}</Text>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                {
                  backgroundColor:
                    customDialog.type === 'success'
                      ? COLORS.primary
                      : COLORS.danger,
                },
              ]}
              onPress={() => {
                hideCustomAlert();
                customDialog.onConfirm();
              }}>
              <Text style={styles.dialogBtnText}>{t('challenges.dialog.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BẢNG LÊN CẤP */}
      <XpGainModal
        visible={xpModalConfig.visible}
        xpEarned={xpModalConfig.xpEarned}
        currentXp={xpModalConfig.currentXp}
        nextLevelXp={xpModalConfig.nextLevelXp}
        level={xpModalConfig.level}
        isLevelUp={xpModalConfig.isLevelUp}
        onClose={() => setXpModalConfig({...xpModalConfig, visible: false})}
      />
    </View>
  );
};

// =======================================================
// STYLESHEET
// =======================================================
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bgDark},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 8,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.cardBg,
  },
  backBtn: {padding: 5, marginLeft: -10},
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    letterSpacing: 0.5,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#EDEFF2',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  tabActive: {borderColor: COLORS.primary},
  tabText: {fontSize: 13, fontWeight: '800', color: COLORS.textGray},
  tabTextActive: {color: COLORS.primary},

  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {
    color: COLORS.textGray,
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },

  listContent: {padding: 20, paddingBottom: 100},

  card: {
    minHeight: 240,
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.secondaryDeep,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 35, 92, 0.75)',
  },
  cardContent: {flex: 1, padding: 20, justifyContent: 'space-between'},

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  badgeEmoji: {fontSize: 20},
  timeLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  timeLeftText: {
    color: '#FFD1D1',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },

  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  participantsText: {
    color: COLORS.secondaryDeep,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },

  // 🔴 STYLE CHO NHÃN LỊCH SỬ
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  cardBody: {justifyContent: 'flex-end'},
  cardTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardDesc: {color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 15},

  progressContainer: {marginBottom: 15},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {color: COLORS.white, fontSize: 12, fontWeight: '700'},
  progressPercent: {color: COLORS.success, fontSize: 12, fontWeight: '900'},

  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },

  rewardContainer: {flexDirection: 'row', alignItems: 'center'},
  rewardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginRight: 10,
    fontWeight: '600',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  rewardXpText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 4,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  joinBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  joinBtnText: {color: COLORS.white, fontSize: 13, fontWeight: '900'},

  claimBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  claimBtnText: {
    color: COLORS.secondaryDeep,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  emptyContainer: {alignItems: 'center', marginTop: 100},
  emptyText: {
    color: COLORS.textGray,
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 35, 92, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIconWrap: {
    marginBottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondaryDeep,
    marginBottom: 10,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    fontWeight: '500',
  },
  dialogBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  dialogBtnText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
});

export default ChallengesScreen;
