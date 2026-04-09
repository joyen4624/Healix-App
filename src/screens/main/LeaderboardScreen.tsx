import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';
import {useTranslation} from 'react-i18next';

const {height} = Dimensions.get('window');

const COLORS = {
  primary: '#2c65e8', // Xanh thể thao
  primaryLight: '#eef2ff',
  primaryDark: '#1a4bb8',
  bg: '#F4F7FC',
  white: '#ffffff',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  textGray: '#8A94A6',
  textDark: '#0A235C',
  badgeBg: '#FFFBEB',
  badgeText: '#D97706',
};

// ==========================================
// COMPONENT HIỆU ỨNG TRƯỢT MỜ (REUSABLE)
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

// ==========================================
// COMPONENT HIỆU ỨNG NẢY & LƠ LỬNG (LOOP) CHO TOP 3
// ==========================================
const AnimatedFloatingAvatar = ({children, rank}: any) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Độ trễ xuất hiện: Top 1 hiện trước, rồi Top 2, Top 3
    const delay = rank === 1 ? 100 : rank === 2 ? 300 : 500;

    // Bước 1: Nảy lên (Spring)
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      delay: delay,
      useNativeDriver: true,
    }).start(() => {
      // Bước 2: Sau khi nảy xong, bắt đầu hiệu ứng lơ lửng (Loop)
      // Top 1 bay cao hơn và nhịp khác để nhìn tự nhiên hơn
      const floatOffset = rank === 1 ? -8 : -4;
      const floatDuration = rank === 1 ? 1500 : 1800;

      Animated.loop(
        Animated.sequence([
          Animated.timing(translateYAnim, {
            toValue: floatOffset,
            duration: floatDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: floatDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [rank]);

  return (
    <Animated.View
      style={{
        transform: [{scale: scaleAnim}, {translateY: translateYAnim}],
        alignItems: 'center',
      }}>
      {children}
    </Animated.View>
  );
};

const LeaderboardScreen = ({route, navigation}: any) => {
  const {t, i18n} = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const {exerciseKey, exerciseName} = route.params || {
    exerciseKey: 'squat',
    exerciseName: t('leaderboardScreen.exercise_default_name'),
  };

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserStats, setCurrentUserStats] = useState({
    rank: '-',
    score: 0,
  });
  const [myProfile, setMyProfile] = useState({
    name: t('leaderboardScreen.profile.default_name'),
    avatar: '',
  });

  // State cho Popup Modal Profile
  const [modalVisible, setModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Animation cho Footer của User
  const footerSlideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedAvatar = await AsyncStorage.getItem('userAvatar');
        setMyProfile({
          name: storedName || t('leaderboardScreen.profile.default_name'),
          avatar:
            storedAvatar ||
            `https://ui-avatars.com/api/?name=${
              storedName || 'U'
            }&background=2c65e8&color=fff`,
        });

        const token = await AsyncStorage.getItem('userToken');
        const response = await axiosClient.get(
          `/leaderboard/workouts/${exerciseKey}`,
          {headers: {Authorization: `Bearer ${token}`}},
        );

        if (response.data.success) {
          setLeaderboard(response.data.data.leaderboard);
          setCurrentUserStats({
            rank: response.data.data.current_user.rank || '-',
            score: response.data.data.current_user.score || 0,
          });
        }
      } catch (error) {
        console.error('Lỗi tải Leaderboard:', error);
      } finally {
        setLoading(false);
        // Trượt thanh Footer lên khi load xong
        Animated.spring(footerSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
          delay: 300,
        }).start();
      }
    };

    loadData();
  }, [exerciseKey]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeMain');
    }
  };

  // Hàm gọi API lấy Public Profile khi bấm vào một User
  const handleOpenProfile = async (userId: string) => {
    if (!userId) return;
    setModalVisible(true);
    setProfileLoading(true);
    setSelectedProfile(null);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axiosClient.get(
        `/leaderboard/public-profile/${userId}`,
        {headers: {Authorization: `Bearer ${token}`}},
      );

      if (response.data.success) {
        setSelectedProfile(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi tải Public Profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // ==========================================
  // COMPONENT: BỤC VINH QUANG DẠNG THẢ NỔI
  // ==========================================
  const renderFloatingPodium = () => {
    if (leaderboard.length === 0) return null;

    const top1 = leaderboard[0];
    const top2 = leaderboard[1];
    const top3 = leaderboard[2];

    const renderAvatar = (user: any, rank: number) => {
      if (!user) return <View style={styles.podiumCol} />;

      const isTop1 = rank === 1;
      const ringColor =
        rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : COLORS.bronze;
      const avatarSize = isTop1 ? 90 : 66;

      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleOpenProfile(user.user_id)}
          style={[
            styles.podiumCol,
            isTop1 ? styles.podiumTop1 : styles.podiumSide,
          ]}>
          <AnimatedFloatingAvatar rank={rank}>
            <View style={styles.avatarWrapper}>
              {isTop1 && (
                <Icon
                  name="crown"
                  size={36}
                  color={COLORS.gold}
                  style={styles.crownIcon}
                />
              )}
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: ringColor,
                    width: avatarSize + 8,
                    height: avatarSize + 8,
                  },
                ]}>
                <Image
                  source={{
                    uri:
                      user.avatar_url ||
                      `https://ui-avatars.com/api/?name=${user.full_name}`,
                  }}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                  }}
                />
              </View>
              <View style={[styles.rankBadge, {backgroundColor: ringColor}]}>
                <Text style={styles.rankBadgeText}>{rank}</Text>
              </View>
            </View>
          </AnimatedFloatingAvatar>

          {/* Vẫn giữ nguyên style căn giữa chữ */}
          <AnimatedFadeSlide
            delay={rank * 200 + 300}
            style={{alignItems: 'center', width: '100%'}}>
            <Text style={styles.podiumName} numberOfLines={1}>
              {user.full_name?.split(' ')[0]}
            </Text>
            <View style={styles.scorePill}>
              <Text style={styles.podiumScore}>
                {Math.floor(user.total_score)} {t('leaderboardScreen.units.pts')}
              </Text>
            </View>
          </AnimatedFadeSlide>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.podiumContainer}>
        {renderAvatar(top2, 2)}
        {renderAvatar(top1, 1)}
        {renderAvatar(top3, 3)}
      </View>
    );
  };

  // ==========================================
  // COMPONENT: ITEM DANH SÁCH
  // ==========================================
  const renderRankItem = ({item, index}: any) => {
    const actualRank = index + 4;
    // Delay theo thứ tự hiển thị để tạo hiệu ứng lượn sóng
    const delay = Math.min(index * 100 + 600, 1500);

    return (
      <AnimatedFadeSlide delay={delay}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleOpenProfile(item.user_id)}
          style={styles.rankCard}>
          <View style={styles.rankNumberBox}>
            <Text style={styles.rankNumberText}>{actualRank}</Text>
          </View>
          <Image
            source={{
              uri:
                item.avatar_url ||
                `https://ui-avatars.com/api/?name=${item.full_name}`,
            }}
            style={styles.listAvatar}
          />
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{item.full_name}</Text>
            <Text style={styles.listStats}>
              <Icon name="lightning-bolt" size={12} color={COLORS.primary} />{' '}
              {item.total_reps} {t('leaderboardScreen.units.reps')} |{' '}
              {Math.round(item.total_cals)} {t('leaderboardScreen.units.kcal')}
            </Text>
          </View>
          <View style={styles.listScoreBox}>
            <Text style={styles.listScore}>{Math.floor(item.total_score)}</Text>
            <Text style={styles.listPts}>{t('leaderboardScreen.units.pts')}</Text>
          </View>
        </TouchableOpacity>
      </AnimatedFadeSlide>
    );
  };

  // ==========================================
  // COMPONENT: PROFILE MODAL (BOTTOM SHEET)
  // ==========================================
  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.modalContent}>
          {/* Thanh gạt nhỏ trên cùng */}
          <View style={styles.modalDragger} />

          {profileLoading || !selectedProfile ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{color: COLORS.textGray, marginTop: 10}}>
                {t('leaderboardScreen.profile.loading')}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* HEADER: Avatar & Tên - Animation 1 */}
              <AnimatedFadeSlide delay={100}>
                <View style={styles.profileHeader}>
                  <Image
                    source={{
                      uri:
                        selectedProfile.profile.avatar_url ||
                        `https://ui-avatars.com/api/?name=${selectedProfile.profile.full_name}`,
                    }}
                    style={styles.profileAvatar}
                  />
                  <Text style={styles.profileName}>
                    {selectedProfile.profile.full_name}
                  </Text>

                  <View style={styles.levelRow}>
                    <View style={styles.levelBadge}>
                      <Icon
                        name="star-shooting"
                        size={16}
                        color={COLORS.gold}
                      />
                      <Text style={styles.levelText}>
                        {t('leaderboardScreen.profile.level_prefix')}{' '}
                        {selectedProfile.profile.level}
                      </Text>
                    </View>
                    <Text style={styles.xpText}>
                      {selectedProfile.profile.total_xp}{' '}
                      {t('leaderboardScreen.profile.xp')}
                    </Text>
                  </View>

                  <Text style={styles.bioText}>
                    {selectedProfile.profile.bio}
                  </Text>
                </View>
              </AnimatedFadeSlide>

              <View style={styles.divider} />

              {/* HUY HIỆU (BADGES) - Animation 2 */}
              <AnimatedFadeSlide delay={250}>
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>
                    {t('leaderboardScreen.profile.badges_title', {
                      count: selectedProfile.badges?.length || 0,
                    })}
                  </Text>
                  {selectedProfile.badges &&
                  selectedProfile.badges.length > 0 ? (
                    <View style={styles.badgesGrid}>
                      {selectedProfile.badges.map((badge: any, idx: number) => (
                        <View key={idx} style={styles.badgeItem}>
                          <View style={styles.badgeIconBg}>
                            <Icon
                              name={badge.icon_url || 'medal'}
                              size={28}
                              color={COLORS.gold}
                            />
                          </View>
                          <Text
                            style={styles.badgeName}
                            numberOfLines={2}
                            ellipsizeMode="tail">
                            {badge.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyContentText}>
                      {t('leaderboardScreen.profile.badges_empty')}
                    </Text>
                  )}
                </View>
              </AnimatedFadeSlide>

              {/* GIẢI THƯỞNG (AWARDS) - Animation 3 */}
              <AnimatedFadeSlide delay={400}>
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>
                    {t('leaderboardScreen.profile.awards_title', {
                      count: selectedProfile.awards?.length || 0,
                    })}
                  </Text>
                  {selectedProfile.awards &&
                  selectedProfile.awards.length > 0 ? (
                    selectedProfile.awards.map((award: any, idx: number) => (
                      <View key={idx} style={styles.awardCard}>
                        <View style={styles.awardIconBox}>
                          <Text style={{fontSize: 24}}>
                            {award.award_name || '🏆'}
                          </Text>
                        </View>
                        <View style={styles.awardInfo}>
                          <Text style={styles.awardTitle}>
                            {award.challenge_name}
                          </Text>
                          <Text style={styles.awardDate}>
                            {t('leaderboardScreen.profile.completed_prefix')}{' '}
                            {new Date(award.earned_at).toLocaleDateString(
                              locale,
                            )}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyContentText}>
                      {t('leaderboardScreen.profile.awards_empty')}
                    </Text>
                  )}
                </View>
              </AnimatedFadeSlide>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={{color: COLORS.textGray, marginTop: 10, fontWeight: 'bold'}}>
            {t('leaderboardScreen.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard.slice(3)}
          keyExtractor={item => item.user_id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          ListHeaderComponent={
            <View style={styles.topSection}>
              {/* Header Bar 3 Cột (Title luôn ở giữa tuyệt đối) */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Icon name="arrow-left" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.headerCenterBox}>
                  <Text style={styles.headerSubtitle}>
                    {t('leaderboardScreen.header.subtitle')}
                  </Text>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {exerciseName.toUpperCase()}
                  </Text>
                </View>

                {/* Khối tàng hình đối trọng để Title luôn nằm giữa */}
                <View style={styles.headerRight} />
              </View>

              {/* Podium */}
              {renderFloatingPodium()}
            </View>
          }
          renderItem={renderRankItem}
          ListEmptyComponent={
            <AnimatedFadeSlide delay={800}>
              <Text style={styles.emptyText}>
                {t('leaderboardScreen.empty.list')}
              </Text>
            </AnimatedFadeSlide>
          }
        />
      )}

      {/* THANH GHI DƯỚI CÙNG DẠNG LƠ LỬNG CO ANIMATION TRƯỢT LÊN */}
      {!loading && (
        <Animated.View
          style={[
            styles.floatingFooter,
            {transform: [{translateY: footerSlideAnim}]},
          ]}>
          <View style={styles.myRankBox}>
            <Text style={styles.myRankLabel}>
              {t('leaderboardScreen.footer.rank_label')}
            </Text>
            <Text style={styles.myRankValue}>
              {currentUserStats.rank === '-'
                ? t('leaderboardScreen.footer.rank_na')
                : `#${currentUserStats.rank}`}
            </Text>
          </View>
          <Image source={{uri: myProfile.avatar}} style={styles.myAvatar} />
          <View style={styles.myInfo}>
            <Text style={styles.myName}>{myProfile.name}</Text>
            <Text style={styles.myMessage}>
              {t('leaderboardScreen.footer.message')}
            </Text>
          </View>
          <View style={styles.myScoreBox}>
            <Text style={styles.myScore}>{currentUserStats.score}</Text>
            <Text style={styles.myPts}>{t('leaderboardScreen.footer.pts')}</Text>
          </View>
        </Animated.View>
      )}

      {/* GỌI MODAL RA ĐÂY */}
      {renderProfileModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  loaderWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  flatListContent: {paddingBottom: 130},
  topSection: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingBottom: 40,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },

  // =====================================
  // HEADER 3 CỘT
  // =====================================
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenterBox: {
    flex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // =====================================
  // BỤC VINH QUANG PODIUM
  // =====================================
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  podiumCol: {
    alignItems: 'center',
    flex: 1, // Đảm bảo mỗi khối chiếm không gian đều nhau
  },
  podiumTop1: {zIndex: 3, marginHorizontal: 15, marginBottom: 10},
  podiumSide: {zIndex: 1, marginBottom: -10},
  avatarWrapper: {alignItems: 'center', position: 'relative'},
  crownIcon: {
    position: 'absolute',
    top: -25,
    zIndex: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  avatarRing: {
    borderWidth: 4,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -10,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    zIndex: 5,
  },
  rankBadgeText: {color: COLORS.white, fontSize: 13, fontWeight: '900'},
  podiumName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  scorePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    marginTop: 6,
    alignItems: 'center',
  },
  podiumScore: {color: COLORS.white, fontSize: 12, fontWeight: '800'},

  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  rankNumberBox: {width: 32, alignItems: 'center'},
  rankNumberText: {fontSize: 16, fontWeight: '800', color: COLORS.textGray},
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 12,
    backgroundColor: COLORS.primaryLight,
  },
  listInfo: {flex: 1},
  listName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  listStats: {fontSize: 12, color: COLORS.textGray, fontWeight: '600'},
  listScoreBox: {alignItems: 'flex-end'},
  listScore: {fontSize: 18, fontWeight: '900', color: COLORS.primary},
  listPts: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textGray,
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textGray,
    marginTop: 30,
    fontSize: 15,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textDark,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: COLORS.textDark,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  myRankBox: {alignItems: 'center', marginRight: 15},
  myRankLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  myRankValue: {color: COLORS.gold, fontSize: 22, fontWeight: '900'},
  myAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
  },
  myInfo: {flex: 1},
  myName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  myMessage: {color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500'},
  myScoreBox: {alignItems: 'flex-end'},
  myScore: {color: COLORS.white, fontSize: 20, fontWeight: '900'},
  myPts: {color: COLORS.primary, fontSize: 10, fontWeight: '800'},

  // ==========================================
  // STYLES CHO PROFILE MODAL
  // ==========================================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 35, 92, 0.6)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: height * 0.75,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -5},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  modalDragger: {
    width: 50,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: COLORS.primaryLight,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  levelText: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 4,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  bioText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.textGray,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeIconBg: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.badgeBg,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  awardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  awardIconBox: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  awardInfo: {
    flex: 1,
  },
  awardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  awardDate: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '500',
  },
  emptyContentText: {
    color: COLORS.textGray,
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LeaderboardScreen;
