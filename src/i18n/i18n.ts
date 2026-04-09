import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import vi from './vi.json';
import en from './en.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {translation: en},
  vi: {translation: vi},
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi', // Ngôn ngữ mặc định
  fallbackLng: 'en',
  compatibilityJSON: 'v4', // 🔴 ĐÃ SỬA THÀNH 'v4' TẠI ĐÂY
  interpolation: {
    escapeValue: false,
  },
});

// Load ngôn ngữ đã lưu từ AsyncStorage (để persist sau khi thoát app)
AsyncStorage.getItem('appLanguage')
  .then(stored => {
    if (stored === 'en' || stored === 'vi') {
      i18n.changeLanguage(stored);
    }
  })
  .catch(() => {
    // ignore
  });

export default i18n;
