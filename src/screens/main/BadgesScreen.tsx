import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import axiosClient from '../../api/axiosClient'; // Đảm bảo đường dẫn này đúng với project của bạn

const {width} = Dimensions.get('window');

// ĐỒNG BỘ BẢNG MÀU VỚI APP
const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  white: '#ffffff',
  bg: '#F4F7FC',
  border: '#EDEFF2',
  disabled: '#E0E5ED',
  lockedBg: '#F8FAFC',
  success: '#34C759',
};

const BadgesScreen = ({navigation}: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [badgesData, setBadgesData] = useState<any>({
    total: 0,
    earned: 0,
    badges: [],
  });

  // State cho Modal xem chi tiết huy hiệu
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔴 FETCH DỮ LIỆU TỪ API (Tự động chạy lại mỗi khi mở màn hình)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchBadges = async () => {
        setIsLoading(true);
        try {
          const token = await AsyncStorage.getItem('userToken');
          const response = await axiosClient.get('/badges', {
            headers: {Authorization: `Bearer ${token}`},
          });

          if (isActive && response.data.success) {
            setBadgesData(response.data.data);
          }
        } catch (error) {
          console.error('Lỗi tải huy hiệu:', error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchBadges();
      return () => {
        isActive = false;
      };
    }, []),
  );

  // 🔴 MỞ MODAL CHI TIẾT
  const openBadgeDetail = (badge: any) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  // Format ngày sang chuẩn Việt Nam (DD/MM/YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // =====================================================================
  // RENDER TỪNG HUY HIỆU (GRID ITEM)
  // =====================================================================
  const renderBadgeItem = ({item}: any) => {
    const isUnlocked = item.is_earned;

    return (
      <TouchableOpacity
        style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}
        activeOpacity={0.7}
        onPress={() => openBadgeDetail(item)}>
        {/* Vòng sáng quanh Icon */}
        <View
          style={[
            styles.iconRing,
            isUnlocked
              ? {backgroundColor: item.color + '20'}
              : {backgroundColor: COLORS.disabled},
          ]}>
          <View
            style={[
              styles.iconCircle,
              isUnlocked
                ? {backgroundColor: item.color}
                : {backgroundColor: '#CBD5E1'},
            ]}>
            <Icon
              name={isUnlocked ? item.icon : 'lock'}
              size={28}
              color={COLORS.white}
            />
          </View>
        </View>

        <Text
          style={[styles.badgeName, !isUnlocked && {color: COLORS.textGray}]}
          numberOfLines={2}>
          {item.name}
        </Text>

        {isUnlocked ? (
          <Text style={styles.dateEarnedText}>
            {formatDate(item.earned_at)}
          </Text>
        ) : (
          <Text style={styles.lockedText}>Chưa đạt</Text>
        )}
      </TouchableOpacity>
    );
  };

  // =====================================================================
  // GIAO DIỆN CHÍNH
  // =====================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      {/* Sửa lại đoạn này */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kho báu Huy hiệu</Text>
        <View style={{width: 24}} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{marginTop: 10, color: COLORS.textGray}}>
            Đang tải bộ sưu tập...
          </Text>
        </View>
      ) : (
        <View style={{flex: 1}}>
          {/* BẢNG TÓM TẮT THÀNH TÍCH (CARD XANH ĐẬM) */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>Bộ sưu tập của bạn</Text>
              <Text style={styles.summarySub}>
                Đã thu thập{' '}
                <Text
                  style={{color: '#FF9F0A', fontWeight: 'bold', fontSize: 16}}>
                  {badgesData.earned}
                </Text>{' '}
                / {badgesData.total} huy hiệu
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>
                {badgesData.total > 0
                  ? Math.round((badgesData.earned / badgesData.total) * 100)
                  : 0}
                %
              </Text>
            </View>
          </View>

          {/* LƯỚI HUY HIỆU (2 CỘT) */}
          <FlatList
            data={badgesData.badges}
            keyExtractor={item => item.code}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.rowWrapper}
            renderItem={renderBadgeItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* =====================================================================
          MODAL CHI TIẾT HUY HIỆU (POPUP MƯỢT MÀ)
      ===================================================================== */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBadge && (
              <>
                <View
                  style={[
                    styles.modalIconCircle,
                    {
                      backgroundColor: selectedBadge.is_earned
                        ? selectedBadge.color
                        : '#CBD5E1',
                    },
                  ]}>
                  <Icon
                    name={selectedBadge.is_earned ? selectedBadge.icon : 'lock'}
                    size={40}
                    color={COLORS.white}
                  />
                </View>

                <Text style={styles.modalTitle}>{selectedBadge.name}</Text>

                {selectedBadge.is_earned ? (
                  <Text style={styles.modalStatusSuccess}>
                    Đã mở khóa vào {formatDate(selectedBadge.earned_at)} 🎉
                  </Text>
                ) : (
                  <Text style={styles.modalStatusLocked}>
                    <Icon name="lock" size={12} /> Chưa mở khóa
                  </Text>
                )}

                <Text style={styles.modalDesc}>{selectedBadge.desc}</Text>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeModalText}>
                    {selectedBadge.is_earned ? 'Tuyệt vời' : 'Tôi sẽ cố gắng!'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// =====================================================================
// STYLESHEET CHUẨN PIXEL
// =====================================================================
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  loadingWrapper: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backBtn: {padding: 5, marginLeft: -5},
  headerTitle: {fontSize: 22, fontWeight: '800', color: COLORS.secondary},

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    margin: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  summaryTextWrap: {flex: 1, marginRight: 15},
  summaryTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summarySub: {color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22},
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressText: {color: COLORS.white, fontSize: 16, fontWeight: 'bold'},

  listContainer: {paddingHorizontal: 15, paddingBottom: 50},
  rowWrapper: {justifyContent: 'space-between', paddingHorizontal: 5},

  badgeCard: {
    width: (width - 60) / 2, // Chia 2 cột, trừ khoảng cách margin
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeCardLocked: {
    backgroundColor: COLORS.lockedBg,
    elevation: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
  },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 6,
    height: 40, // Cố định chiều cao để không bị lệch hàng khi tên dài
  },
  dateEarnedText: {fontSize: 12, color: COLORS.success, fontWeight: '700'},
  lockedText: {fontSize: 12, color: COLORS.textGray, fontWeight: '600'},

  // STYLES CHO MODAL POP-UP
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 35, 92, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 6,
    borderColor: '#F4F7FC',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalStatusSuccess: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '700',
    marginBottom: 15,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusLocked: {
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: '700',
    marginBottom: 15,
    backgroundColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalDesc: {
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    opacity: 0.8,
    paddingHorizontal: 10,
  },

  closeModalBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeModalText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
});

export default BadgesScreen;
