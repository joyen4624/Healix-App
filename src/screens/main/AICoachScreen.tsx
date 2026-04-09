import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axiosClient from '../../api/axiosClient';
import Markdown from 'react-native-markdown-display';
import {useTranslation} from 'react-i18next';

const {width} = Dimensions.get('window');

const COLORS = {
  primary: '#4361EE',
  primaryLight: '#EEF2FF',
  primaryDark: '#3651C9',
  secondaryDeep: '#1E293B',
  textGray: '#64748B',
  bg: '#F4F7FC',
  white: '#ffffff',
  botBubble: '#ffffff',
  userBubble: '#4361EE',
  border: '#E2E8F0',
  success: '#10B981',
};

// Avatar width + marginRight
const AVATAR_TOTAL_WIDTH = 30 + 10;
const BUBBLE_MAX_WIDTH = width * 0.82 - AVATAR_TOTAL_WIDTH;

const SUGGESTION_KEYS = [
  'coachScreen.suggestions.workout_today',
  'coachScreen.suggestions.low_calo_dinner',
  'coachScreen.suggestions.water_intake',
  'coachScreen.suggestions.muscle_analysis',
  'coachScreen.suggestions.soreness',
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: any;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT HIỆU ỨNG: TIN NHẮN TRƯỢT LÊN VÀ HIỆN DẦN (FADE & SLIDE)
// ─────────────────────────────────────────────────────────────
const AnimatedMessageBubble = ({
  children,
  isUser,
}: {
  children: React.ReactNode;
  isUser: boolean;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current; // Trượt từ dưới lên 20px
  const scale = useRef(new Animated.Value(0.9)).current; // Phóng to nhẹ

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{opacity, transform: [{translateY}, {scale}]}}>
      {children}
    </Animated.View>
  );
};

const AICoachScreen = ({navigation}: any) => {
  const {t} = useTranslation();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const suggestions = SUGGESTION_KEYS.map(key => t(key));

  // --- ANIMATION VALUES CHO MÀN HÌNH CHÍNH ---
  const headerTranslateY = useRef(new Animated.Value(-50)).current;
  const inputTranslateY = useRef(new Animated.Value(100)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axiosClient.get('/chat/history');
      if (response.data.success && response.data.data.length > 0) {
        setMessages(response.data.data);
      } else {
        setMessages([
          {
            id: 'welcome_1',
            text: t('coachScreen.welcome.text'),
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Lỗi tải lịch sử:', error);
    } finally {
      setLoadingHistory(false);
      // Kích hoạt hiệu ứng Header và Input trượt vào
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(inputTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
          delay: 100,
        }),
      ]).start();
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Lần đầu load lịch sử cần delay lớn hơn để Markdown render xong
      const delay = loadingHistory ? 300 : 100;
      setTimeout(
        () => flatListRef.current?.scrollToEnd({animated: false}),
        delay,
      );
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    await processSend(textToSend);
  };

  const handleSendSuggestion = async (suggestionText: string) => {
    const cleanText = suggestionText.replace(
      /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u,
      '',
    );
    await processSend(cleanText);
  };

  const processSend = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      const response = await axiosClient.post('/chat', {message: text});
      if (response.data.success) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.data.text,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: t('coachScreen.errors.connection_interrupted'),
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
    const isUser = item.sender === 'user';

    if (isUser) {
      return (
        <AnimatedMessageBubble isUser={true}>
          <View style={styles.messageWrapperUser}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.messageText, styles.userText]}>
                {item.text}
              </Text>
            </View>
          </View>
        </AnimatedMessageBubble>
      );
    }

    return (
      <AnimatedMessageBubble isUser={false}>
        <View style={styles.messageWrapperBot}>
          <View style={styles.botAvatarContainer}>
            <View style={styles.botAvatarBg}>
              <Icon name="cpu" size={16} color={COLORS.white} />
            </View>
          </View>
          <View style={[styles.bubble, styles.botBubble]}>
            <Markdown
              style={{
                body: {
                  color: COLORS.secondaryDeep,
                  fontSize: 15,
                  lineHeight: 22,
                },
                strong: {fontWeight: '800', color: COLORS.primaryDark},
                paragraph: {marginTop: 0, marginBottom: 5},
                bullet_list: {marginTop: 0, marginBottom: 0},
                ordered_list: {marginTop: 0, marginBottom: 0},
                list_item: {marginTop: 0, marginBottom: 4},
              }}>
              {item.text}
            </Markdown>
          </View>
        </View>
      </AnimatedMessageBubble>
    );
  };

  if (loadingHistory) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER CÓ ANIMATION TRƯỢT XUỐNG */}
      <Animated.View
        style={[
          styles.header,
          {opacity: headerOpacity, transform: [{translateY: headerTranslateY}]},
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Icon name="chevron-left" size={28} color={COLORS.secondaryDeep} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {t('coachScreen.header.title')}
          </Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              {t('coachScreen.header.online_status')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Icon name="more-horizontal" size={24} color={COLORS.secondaryDeep} />
        </TouchableOpacity>
      </Animated.View>

      {/* KHUNG CHAT */}
      <FlatList
        ref={flatListRef}
        style={{flex: 1}}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({animated: false})
        }
        onLayout={() => flatListRef.current?.scrollToEnd({animated: false})}
        ListFooterComponent={() =>
          isTyping ? (
            <AnimatedMessageBubble isUser={false}>
              <View style={styles.messageWrapperBot}>
                <View style={styles.botAvatarContainer}>
                  <View style={styles.botAvatarBg}>
                    <Icon name="cpu" size={16} color={COLORS.white} />
                  </View>
                </View>
                <View
                  style={[
                    styles.bubble,
                    styles.botBubble,
                    styles.typingBubble,
                  ]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.typingText}>
                    {t('coachScreen.typing')}
                  </Text>
                </View>
              </View>
            </AnimatedMessageBubble>
          ) : null
        }
      />

      {/* THANH GỢI Ý CÓ ANIMATION FADE IN */}
      {inputText.length === 0 && !isTyping && (
        <Animated.View
          style={[styles.suggestionsWrapper, {opacity: headerOpacity}]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}>
            {suggestions.map((sug, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                activeOpacity={0.7}
                onPress={() => handleSendSuggestion(sug)}>
                <Text style={styles.suggestionText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* KHUNG NHẬP TIN NHẮN CÓ ANIMATION TRƯỢT LÊN */}
      <Animated.View
        style={[
          styles.inputContainer,
          {transform: [{translateY: inputTranslateY}]},
        ]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Icon name="plus" size={24} color={COLORS.textGray} />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('coachScreen.input.placeholder')}
            placeholderTextColor={COLORS.textGray}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping}>
          <Icon
            name="send"
            size={18}
            color={COLORS.white}
            style={{marginLeft: -2, marginTop: 2}}
          />
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

// CÁC STYLES ĐƯỢC GIỮ NGUYÊN 100%
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {padding: 5, marginLeft: -5},
  headerIcon: {padding: 5},
  headerCenter: {alignItems: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '800', color: COLORS.secondaryDeep},
  onlineStatusRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4},
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  onlineText: {fontSize: 12, color: COLORS.textGray, fontWeight: '600'},

  chatContent: {padding: 16, paddingBottom: 20},

  messageWrapperUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 18,
    paddingLeft: 50,
  },

  messageWrapperBot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 18,
    paddingRight: 50,
  },

  botAvatarContainer: {
    marginRight: 10,
    flexShrink: 0,
  },
  botAvatarBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    flex: 1,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
    flex: 0,
    flexShrink: 1,
    maxWidth: '100%',
  },
  botBubble: {
    backgroundColor: COLORS.botBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  messageText: {fontSize: 15, lineHeight: 24},
  userText: {color: COLORS.white, fontWeight: '500'},

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingText: {
    marginLeft: 10,
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '700',
  },

  suggestionsWrapper: {
    backgroundColor: COLORS.bg,
    paddingVertical: 10,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -5},
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 10,
  },
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    marginHorizontal: 8,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    fontSize: 15,
    color: COLORS.secondaryDeep,
    padding: 0,
    maxHeight: 100,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default AICoachScreen;
