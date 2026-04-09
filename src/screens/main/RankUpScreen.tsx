import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions, // 🔴 IMPORT THÊM DIMENSIONS
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../../api/axiosClient';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const ITEM_HEIGHT = 80;
const ITEM_SPACING = 12;
const TOTAL_ITEM_HEIGHT = ITEM_HEIGHT + ITEM_SPACING;

const COLORS = {
  primary: '#2c65e8',
  secondaryDeep: '#0A235C',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  white: '#ffffff',
  textGray: '#8A94A6',
  bgDark: '#051330',
};

const RankUpScreen = ({route, navigation}: any) => {
  const {
    oldRank,
    newRank,
    exerciseName = 'BÀI TẬP',
    exerciseKey = 'squat',
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [leaderboardAround, setLeaderboardAround] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // 🔴 Ép kiểu dữ liệu để đảm bảo luôn là SỐ
  // NẾU API bị lỗi chưa truyền qua, mặc định cho test thử từ 17 lên 5
  const fallbackOld = oldRank ? parseInt(oldRank, 10) : 17;
  const fallbackNew = newRank ? parseInt(newRank, 10) : 5;

  const validOldRank = fallbackOld > fallbackNew ? fallbackOld : fallbackNew;
  const validNewRank = fallbackNew > 0 ? fallbackNew : 1;
  const hasRankedUp = validOldRank > validNewRank;
  const rankDiff = validOldRank - validNewRank;

  // 🔴 BIẾN ANIMATION CHÍNH
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 🔴 BIẾN ĐẾM SỐ HẠNG NHẢY LIÊN TỤC
  const [runningRank, setRunningRank] = useState(validOldRank);

  useEffect(() => {
    const fetchSurroundingLeaderboard = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setMyUserId(storedUserId ? String(storedUserId) : null);

        const token = await AsyncStorage.getItem('userToken');
        const response = await axiosClient.get(
          `/leaderboard/workouts/${exerciseKey}/surrounding`,
          {headers: {Authorization: `Bearer ${token}`}},
        );

        if (response.data.success) {
          setLeaderboardAround(response.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu leo hạng:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurroundingLeaderboard();
  }, [exerciseKey]);

  // ==========================================
  // 🚀 KÍCH HOẠT HIỆU ỨNG TRƯỢT VÀ BỘ ĐẾM SỐ
  // ==========================================
  useEffect(() => {
    if (!loading && leaderboardAround.length > 0) {
      if (hasRankedUp) {
        // 1. Lắng nghe tiến trình animation để thay đổi số (17 -> 16 -> ... -> 5)
        const listenerId = slideAnim.addListener(({value}) => {
          const currentDisplayRank = Math.round(
            validOldRank - value * rankDiff,
          );
          setRunningRank(currentDisplayRank);
        });

        // 2. Chờ 0.8s để user nhìn thấy màn hình, sau đó phi lên!
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 1800, // Kéo dài thời gian bay để nhìn số nhảy cho đã
            useNativeDriver: true,
          }).start(() => {
            slideAnim.removeListener(listenerId);
            setRunningRank(validNewRank); // Chốt số ở vị trí mới
            setShowConfetti(true); // Tung pháo hoa
          });
        }, 800);
      } else {
        setRunningRank(validNewRank);
        setTimeout(() => setShowConfetti(true), 500);
      }
    }
    return () => slideAnim.removeAllListeners();
  }, [loading, leaderboardAround, hasRankedUp]);

  // ==========================================
  // RENDER THẺ XẾP HẠNG VỚI ANIMATION ĐỘC LẬP
  // ==========================================
  const renderUserItem = (user: any) => {
    const currentRankInt = parseInt(user.rank, 10);

    // ĐÂY LÀ THẺ CỦA BẠN CHỨ?
    const isMe = myUserId
      ? String(user.user_id) === myUserId
      : currentRankInt === validNewRank;

    // ĐÂY CÓ PHẢI ĐỐI THỦ XẾP SAU BẠN BỊ BẠN ĐẨY XUỐNG KHÔNG?
    const isPassedUser =
      currentRankInt > validNewRank && currentRankInt <= validOldRank;

    let translateY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0],
    });

    let scale = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1],
    });

    let opacity = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1],
    });

    if (hasRankedUp) {
      if (isMe) {
        // 🚀 THẺ CỦA MÌNH: Bay từ tuốt dưới đáy màn hình (khoảng 600px) đâm thẳng lên
        translateY = slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [SCREEN_HEIGHT / 1.2, 0], // Lấy chiều cao màn hình làm điểm xuất phát
        });

        // Phóng to ra 1.15x lúc đang bay để tạo cảm giác 3D lao tới
        scale = slideAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.15, 1],
        });
      } else if (isPassedUser && !isMe) {
        // 😰 THẺ ĐỐI THỦ: Bị mình chiếm chỗ nên phải lùi xuống 1 bậc (-80px)
        translateY = slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-TOTAL_ITEM_HEIGHT, 0],
        });

        // Mờ nhẹ lúc bị đẩy rồi rõ lại
        opacity = slideAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.4, 0.8, 1],
        });
      }
    }

    return (
      <Animated.View
        key={`rank_${user.user_id}_${currentRankInt}`}
        style={[
          styles.rankItem,
          isMe ? styles.myRankItem : null,
          {
            transform: [{translateY}, {scale}],
            opacity: opacity,
            zIndex: isMe ? 999 : 1, // Bạn luôn nằm trên cùng để bay đè mặt đối thủ
          },
        ]}>
        <View style={styles.rankNumberBox}>
          {isMe && hasRankedUp && showConfetti ? (
            <Icon name="trending-up" size={28} color={COLORS.gold} />
          ) : (
            // Dùng undefined để FIX LỖI TypeScript
            <Text
              style={[
                styles.rankNumber,
                isMe ? {color: COLORS.white} : undefined,
              ]}>
              #{isMe ? runningRank : currentRankInt}
            </Text>
          )}
        </View>

        <Image
          source={{
            uri:
              user.avatar_url ||
              `https://ui-avatars.com/api/?name=${user.full_name}`,
          }}
          style={styles.avatar}
        />

        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, isMe ? {color: COLORS.white} : undefined]}
            numberOfLines={1}>
            {isMe ? `${user.full_name} (Bạn)` : user.full_name}
          </Text>
          <Text
            style={[
              styles.userScore,
              isMe ? {color: 'rgba(255,255,255,0.8)'} : undefined,
            ]}>
            {Math.floor(user.total_score)} pts
          </Text>
        </View>

        {isMe && hasRankedUp && (
          <View style={styles.rankUpBadge}>
            <Icon name="menu-up" size={20} color={COLORS.bgDark} />
            <Text style={styles.rankUpText}>+{rankDiff}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />

      {/* PHÁO HOA NỔ TỪ DƯỚI LÊN (Nằm đè lên trên cùng) */}
      {showConfetti && (
        <View style={styles.confettiWrapper} pointerEvents="none">
          <ConfettiCannon
            count={250}
            origin={{x: -10, y: 0}}
            fallSpeed={2500}
            explosionSpeed={500}
            colors={[
              COLORS.gold,
              COLORS.primary,
              COLORS.white,
              '#34C759',
              '#FF3B30',
            ]}
          />
        </View>
      )}

      {/* DÙNG SCROLLVIEW VÀ OVERLOW VISIBLE ĐỂ THẺ BAY LÊN KHÔNG BỊ CẮT XÉN */}
      <ScrollView
        style={[styles.scrollView, {overflow: 'visible'}]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Icon name="trophy" size={45} color={COLORS.gold} />
          </View>
          <Text style={styles.headerSubtitle}>TỔNG KẾT BÀI TẬP</Text>
          <Text style={styles.headerTitle}>{exerciseName}</Text>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <View style={{alignItems: 'center', marginTop: 40}}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : leaderboardAround.length > 0 ? (
            leaderboardAround.map((user: any) => renderUserItem(user))
          ) : (
            <Text style={styles.emptyText}>Chưa có dữ liệu xếp hạng.</Text>
          )}
        </View>
      </ScrollView>

      {/* FOOTER CỐ ĐỊNH Ở ĐÁY */}
      <View style={styles.footer}>
        <Text style={styles.congratsText}>
          {hasRankedUp
            ? `Tuyệt đỉnh! Bạn đã vượt qua ${rankDiff} đối thủ!`
            : validNewRank > 0
            ? `Hạng hiện tại của bạn: #${validNewRank}`
            : 'Hãy cố gắng ở lần tập sau nhé!'}
        </Text>

        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Diary')}>
          <Text style={styles.doneBtnText}>VỀ NHẬT KÝ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  confettiWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 200, // Chừa khoảng trống lớn để Footer không đè lên List
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerSubtitle: {
    color: COLORS.gold,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  listContainer: {
    paddingHorizontal: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    height: ITEM_HEIGHT,
    marginBottom: ITEM_SPACING,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  myRankItem: {
    backgroundColor: COLORS.primary,
    elevation: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.6,
    shadowRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  rankNumberBox: {
    width: 45,
    alignItems: 'center',
    marginRight: 5,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textGray,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: '#eee',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  userScore: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: '700',
  },
  rankUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankUpText: {
    color: COLORS.bgDark,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 2,
  },
  emptyText: {
    color: COLORS.textGray,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 30,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
  },
  congratsText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: COLORS.white,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  doneBtnText: {
    color: COLORS.secondaryDeep,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default RankUpScreen;
