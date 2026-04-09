import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nhớ giữ đúng IP của bạn nhé
const BASE_URL: string = 'http://192.168.2.20:3000/api';

const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔴 ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT ĐỂ FIX LỖI 401
axiosClient.interceptors.request.use(
  async config => {
    // Lấy token bạn đã lưu lúc Login
    const token = await AsyncStorage.getItem('userToken');

    // Nếu có token, tự động gắn chữ 'Bearer ' vào header Authorization
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

export default axiosClient;
