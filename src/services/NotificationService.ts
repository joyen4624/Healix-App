import notifee, {
  TriggerType,
  TimeUnit,
  RepeatFrequency,
  TimestampTrigger,
} from '@notifee/react-native';

class NotificationService {
  // 1. Hàm xin quyền gửi thông báo
  static async requestPermissions() {
    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus) {
      console.log('Đã được cấp quyền gửi thông báo!');
      return true;
    }
    console.log('Người dùng từ chối quyền thông báo.');
    return false;
  }

  // ========================================================
  // PHẦN 1: NHẮC NHỞ UỐNG NƯỚC (DÙNG INTERVAL - KHOẢNG CÁCH)
  // ========================================================
  static async scheduleWaterReminder(intervalMinutes: number = 120) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const channelId = await notifee.createChannel({
      id: 'water_reminders',
      name: 'Nhắc nhở uống nước',
      sound: 'default',
      importance: 4,
    });

    const trigger: any = {
      type: TriggerType.INTERVAL,
      interval: intervalMinutes,
      timeUnit: TimeUnit.MINUTES,
    };

    await notifee.createTriggerNotification(
      {
        id: 'water_reminder_daily',
        title: '💧 Tới giờ uống nước rồi!',
        body: 'Cơ thể bạn đang khát kìa, hãy uống một ly nước nhé!',
        android: {
          channelId,
          pressAction: {id: 'default'},
          smallIcon: 'ic_launcher',
          importance: 4,
        },
      },
      trigger,
    );
    console.log(`⏰ Đã lên lịch nhắc uống nước mỗi ${intervalMinutes} phút!`);
  }

  static async cancelWaterReminder() {
    await notifee.cancelNotification('water_reminder_daily');
    console.log('🔕 Đã tắt nhắc nhở uống nước.');
  }

  static async resetWaterReminder(intervalMinutes: number = 120) {
    console.log(`🔄 Reset bộ đếm nhắc nhở nước: ${intervalMinutes} phút.`);
    await this.scheduleWaterReminder(intervalMinutes);
  }

  // ========================================================
  // PHẦN 2: NHẮC NHỞ BỮA ĂN (DÙNG TIMESTAMP - GIỜ CỐ ĐỊNH)
  // ========================================================

  // Hàm phụ trợ: Lấy Timestamp của giờ mốc.
  // (Nếu giờ mốc đã qua trong hôm nay, nó sẽ tự động tính cho ngày mai)
  static getNextTimeByHour(hour: number, minute: number): number {
    const now = new Date();
    const triggerTime = new Date();
    triggerTime.setHours(hour, minute, 0, 0);

    // Nếu thời gian đặt < thời gian hiện tại -> Cộng thêm 1 ngày (chuyển sang ngày mai)
    if (triggerTime.getTime() <= now.getTime()) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }

    return triggerTime.getTime();
  }

  static async scheduleMealReminders() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Tạo Channel riêng cho Bữa ăn
    const channelId = await notifee.createChannel({
      id: 'meal_reminders',
      name: 'Nhắc nhở bữa ăn',
      sound: 'default',
      importance: 4,
    });

    // Cấu hình chung cho thông báo Android
    const androidConfig = {
      channelId,
      pressAction: {id: 'default'},
      smallIcon: 'ic_launcher',
      importance: 4,
    };

    // 1. NHẮC BỮA SÁNG (Ví dụ: 8h00 sáng)
    const breakfastTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: this.getNextTimeByHour(8, 0),
      repeatFrequency: RepeatFrequency.DAILY, // Lặp lại mỗi ngày
    };
    await notifee.createTriggerNotification(
      {
        id: 'meal_breakfast',
        title: '🍳 Chào buổi sáng!',
        body: 'Đừng quên ăn sáng và lưu lại Nhật ký để có năng lượng cả ngày nhé!',
        android: androidConfig,
      },
      breakfastTrigger,
    );

    // 2. NHẮC BỮA TRƯA (Ví dụ: 12h00 trưa)
    const lunchTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: this.getNextTimeByHour(12, 0),
      repeatFrequency: RepeatFrequency.DAILY,
    };
    await notifee.createTriggerNotification(
      {
        id: 'meal_lunch',
        title: '🍱 Tới giờ nghỉ trưa rồi!',
        body: 'Nạp năng lượng thôi. Bạn ăn gì trưa nay? Chụp ảnh cho AI xem với nhé!',
        android: androidConfig,
      },
      lunchTrigger,
    );

    // 3. NHẮC BỮA TỐI (Ví dụ: 19h00 tối)
    const dinnerTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: this.getNextTimeByHour(19, 0),
      repeatFrequency: RepeatFrequency.DAILY,
    };
    await notifee.createTriggerNotification(
      {
        id: 'meal_dinner',
        title: '🍲 Bữa tối ấm cúng!',
        body: 'Kết thúc một ngày bằng bữa tối ngon miệng. Đừng quên lưu lại nhật ký nhé!',
        android: androidConfig,
      },
      dinnerTrigger,
    );

    console.log(
      '🍽️ Đã lên lịch nhắc nhở 3 bữa ăn (Sáng: 8h, Trưa: 12h, Tối: 19h).',
    );
  }

  // Hàm hủy nhắc nhở bữa ăn (nếu user muốn tắt trong Cài đặt)
  static async cancelMealReminders() {
    await notifee.cancelNotification('meal_breakfast');
    await notifee.cancelNotification('meal_lunch');
    await notifee.cancelNotification('meal_dinner');
    console.log('🔕 Đã tắt nhắc nhở 3 bữa ăn.');
  }

  // ========================================================
  // PHẦN 3: NHẮC NHỞ LỊCH TẬP (DÙNG TIMESTAMP - THEO LỊCH CUSTOM)
  // ========================================================

  static async scheduleWorkoutReminder(
    scheduleId: string,
    title: string,
    date: Date,
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // 1. Tạo Channel riêng cho Tập luyện (để user có thể chỉnh âm thanh riêng)
    const channelId = await notifee.createChannel({
      id: 'workout_reminders',
      name: 'Nhắc nhở tập luyện',
      sound: 'default',
      importance: 4,
    });

    // 2. Cấu hình Trigger dựa trên thời gian chính xác user đã hẹn
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(), // Thời gian cụ thể (Ngày + Giờ đã ghép lại)
    };

    // 3. Tạo thông báo (Lưu ý: Dùng scheduleId làm ID để tránh trùng lặp)
    await notifee.createTriggerNotification(
      {
        id: `workout_${scheduleId}`,
        title: '🔥 Đến giờ tập luyện rồi!',
        body: `Bài tập: ${title} đang chờ bạn. Khởi động và vào tập ngay thôi!`,
        android: {
          channelId,
          pressAction: {id: 'default'}, // Để khi bấm vào nó mở App
          smallIcon: 'ic_launcher',
          importance: 4,
          color: '#2c65e8', // Màu xanh chủ đạo của App bạn
        },
      },
      trigger,
    );

    console.log(
      `⏰ Đã đặt nhắc nhở bài tập [${title}] vào lúc: ${date.toLocaleString(
        'vi-VN',
      )}`,
    );
  }

  // Hàm hủy nhắc nhở tập luyện (Dùng khi user xóa lịch hoặc đổi sang giờ khác)
  static async cancelWorkoutReminder(scheduleId: string) {
    await notifee.cancelNotification(`workout_${scheduleId}`);
    console.log(`🔕 Đã hủy nhắc nhở cho bài tập ID: ${scheduleId}`);
  }
}

export default NotificationService;
