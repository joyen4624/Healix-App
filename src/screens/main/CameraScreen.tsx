import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width, height} = Dimensions.get('window');

const CameraScreen = ({navigation}: any) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

  // STATE MỚI: Lưu ảnh đang quét để hiển thị lên màn hình
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Animation refs
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ANIMATION MỚI: Các điểm nhận diện (Detect Dots)
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const dot4Anim = useRef(new Animated.Value(0)).current;

  const statusTexts = [
    'Scanning for ingredients...',
    'Analyzing nutrients...',
    'Calculating with database...',
    'Finalizing results...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let scanLoop: Animated.CompositeAnimation;
    let pulseLoop: Animated.CompositeAnimation;
    let blinkLoops: Animated.CompositeAnimation[] = [];

    if (isScanning) {
      // 1. Hiệu ứng thanh quét (Scan Line)
      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: width * 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      scanLoop.start();

      // 2. Hiệu ứng co giãn khung ngắm (Pulse)
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();

      // 3. Hiệu ứng hiện dần cho text (Fade In)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // 4. ANIMATION MỚI: Tạo nhịp nhấp nháy cho các chấm Detect
      const createBlink = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.delay(1000 - delay),
          ]),
        );
      };

      blinkLoops = [
        createBlink(dot1Anim, 0),
        createBlink(dot2Anim, 300),
        createBlink(dot3Anim, 600),
        createBlink(dot4Anim, 900),
      ];
      blinkLoops.forEach(loop => loop.start());

      // 5. Thay đổi text trạng thái theo thời gian
      interval = setInterval(() => {
        setStatusIdx(prev => (prev < statusTexts.length - 1 ? prev + 1 : prev));
      }, 1000);
    } else {
      // Xóa mọi hiệu ứng khi dừng quét
      scanLineAnim.setValue(0);
      pulseAnim.setValue(1);
      fadeAnim.setValue(0);
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
      dot4Anim.setValue(0);
      setStatusIdx(0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (scanLoop) scanLoop.stop();
      if (pulseLoop) pulseLoop.stop();
      blinkLoops.forEach(loop => loop.stop());
    };
  }, [isScanning]);

  // ==========================================
  // LOGIC GỌI API AI PYTHON
  // ==========================================
  const uploadToAI = async (imageAsset: any) => {
    // HIỂN THỊ ẢNH VÀ BẬT HIỆU ỨNG TRƯỚC
    setSelectedImage(imageAsset.uri);
    setIsScanning(true);

    try {
      const currentUserId = await AsyncStorage.getItem('userId');

      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: imageAsset.fileName || `food_${Date.now()}.jpg`,
      });

      if (currentUserId) {
        formData.append('user_id', currentUserId);
      }

      // Thay bằng Link Hugging Face hoặc Ngrok của bạn
      const API_URL = 'http://192.168.2.20:8000/detect';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        setIsScanning(false);
        // Không xóa selectedImage ngay để màn hình Result lấy kịp hiệu ứng chuyển trang
        navigation.navigate('ScanResult', {
          aiData: data,
          imageUri: imageAsset.uri,
        });
      } else {
        throw new Error(data.error || 'AI không thể nhận diện được');
      }
    } catch (error) {
      console.error('Lỗi quét AI:', error);
      setIsScanning(false);
      setSelectedImage(null); // Lỗi thì xóa ảnh đi để chọn lại
      Alert.alert(
        'Thất bại',
        'Không thể kết nối với máy chủ AI. Vui lòng thử lại!',
      );
    }
  };

  const handleGallery = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.didCancel || result.errorCode || !result.assets) return;
    uploadToAI(result.assets[0]);
  };

  const handleCamera = async () => {
    const result = await launchCamera({mediaType: 'photo', quality: 0.8});
    if (result.didCancel || result.errorCode || !result.assets) return;
    uploadToAI(result.assets[0]);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View style={styles.cameraPreview}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="x" size={28} color="#fff" />
        </TouchableOpacity>

        {!isScanning && !selectedImage && (
          <>
            <Icon name="maximize" size={50} color="rgba(255,255,255,0.1)" />
            <Text style={styles.cameraHint}>Align food within the frame</Text>
          </>
        )}

        <Animated.View
          style={[styles.viewfinder, {transform: [{scale: pulseAnim}]}]}>
          {/* HIỆN ẢNH NỀN BÊN TRONG KHUNG NGẮM KHI QUÉT */}
          {isScanning && selectedImage && (
            <Image source={{uri: selectedImage}} style={styles.scannedImage} />
          )}

          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {isScanning && (
            <>
              {/* Lớp phủ Holographic */}
              <View style={styles.hologramOverlay} />

              {/* Thanh quét dọc */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {transform: [{translateY: scanLineAnim}]},
                ]}
              />

              {/* CÁC CHẤM NHẬN DIỆN MỚI */}
              <Animated.View
                style={[
                  styles.detectDot,
                  {top: '25%', left: '30%', opacity: dot1Anim},
                ]}
              />
              <Animated.View
                style={[
                  styles.detectDot,
                  {top: '65%', left: '75%', opacity: dot2Anim},
                ]}
              />
              <Animated.View
                style={[
                  styles.detectDot,
                  {top: '45%', left: '50%', opacity: dot3Anim},
                ]}
              />
              <Animated.View
                style={[
                  styles.detectDot,
                  {top: '80%', left: '20%', opacity: dot4Anim},
                ]}
              />
            </>
          )}
        </Animated.View>

        {isScanning && (
          <Animated.View style={[styles.loadingContainer, {opacity: fadeAnim}]}>
            <View style={styles.aiLabelContainer}>
              <View style={styles.pulseDot} />
              <Text style={styles.aiLabel}>AI PROCESSING</Text>
            </View>
            <Text style={styles.loadingText}>{statusTexts[statusIdx]}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={handleGallery}
          disabled={isScanning}>
          <View style={styles.iconCircle}>
            <Icon name="image" size={22} color="#fff" />
          </View>
          <Text style={styles.sideBtnText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureBtn}
          onPress={handleCamera}
          disabled={isScanning}>
          <View
            style={[
              styles.captureInternal,
              isScanning && {backgroundColor: '#444'},
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} disabled={isScanning}>
          <View style={styles.iconCircle}>
            <Icon name="zap" size={22} color="#fff" />
          </View>
          <Text style={styles.sideBtnText}>Flash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  closeBtn: {position: 'absolute', top: 50, left: 25, zIndex: 10, padding: 10},
  cameraHint: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  viewfinder: {
    width: width * 0.75,
    height: width * 0.75,
    position: 'relative',
    marginTop: 20,
  },
  scannedImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    opacity: 0.7, // Làm tối ảnh 1 chút để hiệu ứng AI nổi bật hơn
    resizeMode: 'cover',
  },
  hologramOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 101, 232, 0.1)', // Tăng màu xanh lên 1 xíu
    borderRadius: 20,
  },
  detectDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759', // Màu xanh lá success
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#34C759',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  corner: {position: 'absolute', width: 40, height: 40, borderColor: '#2c65e8'},
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 25,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 25,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 25,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 25,
  },
  scanLine: {
    width: '100%',
    height: 4,
    backgroundColor: '#2c65e8',
    shadowColor: '#2c65e8',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 20,
  },
  loadingContainer: {position: 'absolute', bottom: 60, alignItems: 'center'},
  aiLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 101, 232, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2c65e8',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2c65e8',
    marginRight: 8,
  },
  aiLabel: {
    color: '#2c65e8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 30,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInternal: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  sideBtn: {alignItems: 'center', gap: 10},
  sideBtnText: {color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.8},
});

export default CameraScreen;
