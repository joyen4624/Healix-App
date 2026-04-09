import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import axiosClient from '../../api/axiosClient';
// 🔴 IMPORT HOOK ĐA NGÔN NGỮ
import {useTranslation} from 'react-i18next';
import {LineChart, PieChart} from 'react-native-gifted-charts';

const {width} = Dimensions.get('window');

const COLORS = {
  primary: '#2c65e8',
  secondary: '#0a235c',
  textGray: '#8A94A6',
  textLight: '#A0ABC0',
  white: '#ffffff',
  bg: '#F4F7FC',
  border: '#EDEFF2',
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF453A',
  chartBg: '#F8FAFC',
};

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
};

// ============================================================
// SHIMMER SKELETON — hiện trong lúc loading
// ============================================================
const ShimmerBox = ({
  width: w,
  height: h,
  borderRadius = 12,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity: shimmer.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
        },
        style,
      ]}
    />
  );
};

const SkeletonCard = () => (
  <View style={[styles.card, {marginBottom: 16}]}>
    <ShimmerBox
      width="50%"
      height={20}
      borderRadius={8}
      style={{marginBottom: 10}}
    />
    <ShimmerBox
      width="30%"
      height={14}
      borderRadius={6}
      style={{marginBottom: 24}}
    />
    <ShimmerBox width="100%" height={120} borderRadius={16} />
  </View>
);

// ============================================================
// ANIMATED CARD — fade + slide-up khi vào màn hình
// ============================================================
const AnimatedCard = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        style || styles.card,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}, {scale: scaleAnim}],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

// ============================================================
// PULSE DOT — chấm nhấp nháy xanh lá "live"
// ============================================================
const PulseDot = ({color = COLORS.success}: {color?: string}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.8,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [pulse, opacity]);

  return (
    <View
      style={{
        width: 10,
        height: 10,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          opacity: opacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
          }),
          transform: [{scale: pulse}],
        }}
      />
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

// ============================================================
// ANIMATED NUMBER — đếm từ 0 lên số thật
// ============================================================
const AnimatedNumber = ({
  value,
  duration = 1000,
  delay = 0,
  style,
  suffix = '',
}: {
  value: number;
  duration?: number;
  delay?: number;
  style?: any;
  suffix?: string;
}) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    const timeout = setTimeout(() => {
      Animated.timing(animVal, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);

    const listener = animVal.addListener(({value: v}) => {
      setDisplay(Math.round(v));
    });

    return () => {
      clearTimeout(timeout);
      animVal.removeListener(listener);
    };
  }, [value, duration, delay, animVal]);

  return (
    <Text style={style}>
      {display.toLocaleString()}
      {suffix}
    </Text>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const StatsScreen = () => {
  const [period, setPeriod] = useState('Week');
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const {t} = useTranslation();

  const enterAnim = useRef(new Animated.Value(0)).current;
  // Animation cho tab switch
  const tabIndicator = useRef(
    new Animated.Value(period === 'Week' ? 0 : 1),
  ).current;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchReport = async () => {
        setIsLoading(true);
        enterAnim.setValue(0);
        try {
          const token = await AsyncStorage.getItem('userToken');
          const endpoint =
            period === 'Month' ? '/report/monthly' : '/report/weekly';

          const response = await axiosClient.get(endpoint, {
            headers: {Authorization: `Bearer ${token}`},
          });

          if (isActive && response.data.success) {
            setReportData(response.data.data);
            Animated.timing(enterAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }).start();
          }
        } catch (error) {
          console.error('Lỗi tải báo cáo:', error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchReport();
      return () => {
        isActive = false;
      };
    }, [period, enterAnim]),
  );

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    Animated.spring(tabIndicator, {
      toValue: p === 'Week' ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  };

  // --- DATA ---
  const dailyData = reportData?.daily_data || [];
  const barWidth = period === 'Month' ? Math.max((width - 120) / 30, 4) : 14;
  const highestCal = Math.max(...dailyData.map((d: any) => d.cal), 0);
  const maxCal = Math.max(2500, highestCal + 500);
  const targetCal = reportData?.average_tdee || 2200;
  const avgCal = reportData?.analyzed_days
    ? Math.round(reportData.total_food_kcal / reportData.analyzed_days)
    : 0;

  const periodLabel = period === 'Month' ? t('stats.period.month') : t('stats.period.week');
  const forecastDays = period === 'Month' ? 30 : 14;
  const caloriesDays = period === 'Month' ? 30 : 7;

  let chartActualData: any[] = [];
  let chartForecastData: any[] = [];
  let referenceWeight = 0;
  let forecastInsight = '';

  if (reportData?.weight_forecast) {
    const wf = reportData.weight_forecast;
    referenceWeight = wf.target_weight;

    chartActualData = wf.actual_history.map((item: any, index: number) => ({
      value: item.weight,
      label:
        period === 'Month' && index % 5 !== 0 ? '' : formatShortDate(item.date),
    }));

    const paddingEmpty = Array(Math.max(0, chartActualData.length - 1)).fill({
      value: null,
      hideDataPoint: true,
    });

    const mappedForecast = wf.ai_forecast.map((item: any, idx: number) => {
      const isLast = idx === wf.ai_forecast.length - 1;
      if (isLast) {
        forecastInsight = t('stats.forecast.insight_reaches', {
          weight: item.weight,
          date: formatShortDate(item.date),
        });
      }
      return {
        value: item.weight,
        label:
          period === 'Month' && idx % 5 !== 0 && !isLast
            ? ''
            : formatShortDate(item.date),
        dataPointText: isLast ? `${item.weight}kg` : '',
        textColor: COLORS.success,
        textShiftY: -15,
        textShiftX: -15,
        textFontSize: 12,
        textFontWeight: 'bold',
      };
    });

    chartForecastData = [...paddingEmpty, ...mappedForecast];
  }

  const pieData =
    reportData?.meal_timing?.map((item: any) => {
      const pct =
        item.value > 0
          ? Math.round((item.value / (reportData.total_food_kcal || 1)) * 100)
          : 0;
      return {
        value: item.value,
        color: item.color,
        text: pct >= 10 ? `${pct}%` : '',
      };
    }) || [];

  const macros = reportData?.nutrition_breakdown || {
    carbs: 0,
    protein: 0,
    fat: 0,
  };
  const comparisonData = reportData?.comparison || [];
  const activityBalance = reportData?.activity_balance || null;

  const tabWidth = (width - 40 - 8) / 2;
  const tabTranslate = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [4, tabWidth + 4],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>{t('stats.header.statistics')}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <PulseDot color={COLORS.success} />
            <Text style={styles.liveText}>{t('stats.header.live')}</Text>
          </View>
        </View>

        {/* TAB — animated sliding indicator */}
        <View style={styles.periodTab}>
          <Animated.View
            style={[
              styles.tabSlider,
              {width: tabWidth, transform: [{translateX: tabTranslate}]},
            ]}
          />
          {['Week', 'Month'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.tabBtn, {width: tabWidth}]}
              onPress={() => handlePeriodChange(p)}
              activeOpacity={0.8}>
              <Text
                style={[styles.tabText, period === p && styles.tabTextActive]}>
                {p === 'Week' ? t('stats.period.week') : t('stats.period.month')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* AI INSIGHT */}
          {reportData?.insight_message && (
            <AnimatedCard delay={80} style={styles.insightCard}>
              <View style={styles.insightIconWrap}>
                <Icon name="zap" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.insightText}>
                {reportData.insight_message}
              </Text>
            </AnimatedCard>
          )}

          {/* COMPARISON */}
          {comparisonData.length > 0 && (
            <AnimatedCard delay={160}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {period === 'Month'
                      ? t('stats.comparison.title_monthly')
                      : t('stats.comparison.title_weekly')}
                  </Text>
                  <Text style={styles.subTitle}>{t('stats.comparison.subtitle')}</Text>
                </View>
                <View style={styles.badgeLight}>
                  <Text style={styles.badgeTextLight}>
                    {t('stats.comparison.vs_last', {period: periodLabel})}
                  </Text>
                </View>
              </View>

              <View style={styles.compTable}>
                <View style={styles.compHeaderRow}>
                  <Text style={[styles.compLabel, {flex: 2}]}>{t('stats.comparison.metric')}</Text>
                  <Text style={[styles.compLabel, {flex: 1}]}>
                    {t('stats.comparison.this_period', {period: periodLabel})}
                  </Text>
                  <Text style={[styles.compLabel, {flex: 1}]}>
                    {t('stats.comparison.prev_period', {period: periodLabel})}
                  </Text>
                  <Text
                    style={[styles.compLabel, {flex: 1, textAlign: 'right'}]}>
                    {t('stats.comparison.change')}
                  </Text>
                </View>

                {comparisonData.map((item: any, index: number) => {
                  const diff = item.current - item.previous;
                  const isPositive = diff > 0;
                  const isNeutral = item.improvement === null;
                  const tagColor = isNeutral
                    ? COLORS.textGray
                    : item.improvement
                    ? COLORS.success
                    : COLORS.danger;
                  const tagBg = isNeutral
                    ? '#F0F4F8'
                    : item.improvement
                    ? 'rgba(52,199,89,0.12)'
                    : 'rgba(255,69,58,0.12)';

                  return (
                    <View
                      key={index}
                      style={[
                        styles.compRow,
                        index === comparisonData.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}>
                      <Text style={[styles.compMetric, {flex: 2}]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.compVal, {flex: 1}]}>
                        {item.current}
                        {item.unit === 'g' ? 'g' : ''}
                      </Text>
                      <Text
                        style={[
                          styles.compVal,
                          {flex: 1, color: COLORS.textLight, fontWeight: '500'},
                        ]}>
                        {item.previous}
                        {item.unit === 'g' ? 'g' : ''}
                      </Text>
                      <View style={{flex: 1, alignItems: 'flex-end'}}>
                        <View
                          style={[styles.changeTag, {backgroundColor: tagBg}]}>
                          <Icon
                            name={
                              isNeutral
                                ? 'minus'
                                : isPositive
                                ? 'arrow-up-right'
                                : 'arrow-down-right'
                            }
                            size={12}
                            color={tagColor}
                          />
                          <Text style={[styles.changeText, {color: tagColor}]}>
                            {Math.abs(
                              item.unit === 'g'
                                ? diff
                                : item.previous > 0
                                ? Math.round((diff / item.previous) * 100)
                                : 0,
                            )}
                            {item.unit === 'g' ? 'g' : '%'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </AnimatedCard>
          )}

          {/* WEIGHT FORECAST */}
          {chartActualData.length > 0 && (
            <AnimatedCard delay={240}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{t('stats.forecast.title')}</Text>
                  <Text style={styles.subTitle}>
                    {t('stats.forecast.subtitle_next_days', {days: forecastDays})}
                  </Text>
                </View>
              </View>

              {forecastInsight !== '' && (
                <View style={styles.forecastBadge}>
                  <Icon name="trending-down" size={14} color={COLORS.success} />
                  <Text style={styles.forecastBadgeText}>
                    {forecastInsight}
                  </Text>
                </View>
              )}

              <View
                style={{
                  marginTop: 20,
                  marginHorizontal: -24,
                  overflow: 'hidden',
                }}>
                <LineChart
                  data={chartActualData}
                  data2={chartForecastData}
                  isAnimated
                  animationDuration={1200}
                  height={160}
                  width={width - 32}
                  initialSpacing={24}
                  endSpacing={24}
                  color1={COLORS.primary}
                  color2={COLORS.success}
                  thickness={period === 'Month' ? 2 : 3}
                  dataPointsColor1={COLORS.primary}
                  dataPointsColor2={COLORS.success}
                  dataPointsRadius={period === 'Month' ? 3 : 4}
                  showReferenceLine1
                  referenceLine1Position={referenceWeight}
                  referenceLine1Config={
                    {
                      color: COLORS.danger,
                      strokeDashArray: [5, 5],
                      strokeWidth: 2,
                    } as any
                  }
                  yAxisColor="transparent"
                  xAxisColor={COLORS.border}
                  yAxisTextStyle={{
                    color: COLORS.textLight,
                    fontSize: 10,
                    fontWeight: '500',
                  }}
                  xAxisLabelTextStyle={{
                    color: COLORS.textGray,
                    fontSize: 10,
                    width: 45,
                    fontWeight: '500',
                  }}
                  noOfSections={4}
                  curved
                  overflowTop={20}
                  hideRules={false}
                  rulesColor="#F1F5F9"
                  rulesType="dashed"
                  backgroundColor="transparent"
                  areaChart
                  startFillColor1={COLORS.primary}
                  endFillColor1="transparent"
                  startOpacity1={0.12}
                  endOpacity1={0}
                  startFillColor2={COLORS.success}
                  endFillColor2="transparent"
                  startOpacity2={0.1}
                  endOpacity2={0}
                />
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.lineBox, {backgroundColor: COLORS.primary}]}
                  />
                  <Text style={styles.legendText}>{t('stats.legend.actual')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.lineBox, {backgroundColor: COLORS.success}]}
                  />
                  <Text style={styles.legendText}>{t('stats.legend.ai_forecast')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.lineBox,
                      {
                        backgroundColor: COLORS.danger,
                        height: 2,
                        borderStyle: 'dashed',
                        borderWidth: 1,
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>{t('stats.legend.target')}</Text>
                </View>
              </View>
            </AnimatedCard>
          )}

          {/* CALORIES INTAKE */}
          <AnimatedCard delay={320}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{t('stats.calories.title')}</Text>
                <Text style={styles.subTitle}>
                  {t('stats.calories.subtitle', {days: caloriesDays})}
                </Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <AnimatedNumber
                  value={avgCal}
                  duration={1000}
                  delay={400}
                  style={styles.avgText}
                  suffix=" kcal"
                />
                  <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textGray,
                    fontWeight: '500',
                    marginTop: 2,
                  }}>
                    {t('stats.calories.avg_per_day')}
                </Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <View style={styles.yAxis}>
                <Text style={styles.axisLabel}>
                  {(maxCal / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.axisLabel}>
                  {(maxCal / 2 / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.axisLabel}>0</Text>
              </View>

              <View style={styles.chartArea}>
                <View style={styles.gridLinesContainer}>
                  <View style={styles.gridLine} />
                  <View style={styles.gridLine} />
                  <View style={[styles.gridLine, {borderBottomWidth: 0}]} />
                </View>

                <View style={styles.barsContainer}>
                  {dailyData.map((item: any, index: number) => {
                    const isOver = item.cal > targetCal;
                    const barHeight =
                      item.cal > 0 ? Math.max((item.cal / maxCal) * 100, 5) : 0;
                    const animatedHeight = enterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${barHeight}%`],
                    });
                    return (
                      <View key={index} style={styles.barWrapper}>
                        <View style={[styles.barTrack, {width: barWidth}]}>
                          <Animated.View
                            style={[
                              styles.barFill,
                              {
                                height: animatedHeight,
                                backgroundColor: isOver
                                  ? COLORS.danger
                                  : COLORS.primary,
                              },
                            ]}>
                            {isOver && period === 'Week' && (
                              <View style={styles.warningDot} />
                            )}
                          </Animated.View>
                        </View>
                        {period === 'Week' && (
                          <Text style={styles.barLabel}>{item.day}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* ACTIVITY VS INTAKE */}
          {activityBalance && (
            <AnimatedCard delay={400}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {t('stats.activity_vs_intake.title')}
                  </Text>
                  <Text style={styles.subTitle}>
                    {t('stats.activity_vs_intake.subtitle')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.ratioBadge,
                    {
                      backgroundColor:
                        activityBalance.status === 'danger'
                          ? 'rgba(255,69,58,0.1)'
                          : activityBalance.status === 'warning'
                          ? 'rgba(255,159,10,0.1)'
                          : 'rgba(52,199,89,0.1)',
                    },
                  ]}>
                  <AnimatedNumber
                    value={activityBalance.ratio}
                    duration={1000}
                    delay={500}
                    style={[
                      styles.ratioText,
                      {
                        color:
                          activityBalance.status === 'danger'
                            ? COLORS.danger
                            : activityBalance.status === 'warning'
                            ? COLORS.warning
                            : COLORS.success,
                      },
                    ]}
                    suffix="%"
                  />
                </View>
              </View>

              <View style={styles.balanceBarContainer}>
                <View style={styles.balanceLabels}>
                  <Text style={styles.balanceLabelMin}>
                    {t('stats.activity_vs_intake.intake_100')}
                  </Text>
                  <Text style={styles.balanceLabelMin}>
                    {t('stats.activity_vs_intake.burned_ratio', {
                      ratio: activityBalance.ratio,
                    })}
                  </Text>
                </View>

                <View style={styles.mainProgressBg}>
                  <View
                    style={[
                      styles.progressBase,
                      {backgroundColor: COLORS.primary + '15', width: '100%'},
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: enterAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            '0%',
                            `${Math.min(activityBalance.ratio || 0, 100)}%`,
                          ],
                        }),
                        backgroundColor:
                          activityBalance.status === 'danger'
                            ? COLORS.danger
                            : activityBalance.status === 'warning'
                            ? COLORS.warning
                            : COLORS.success,
                      },
                    ]}
                  />
                </View>

                <View style={styles.balanceValues}>
                  <AnimatedNumber
                    value={activityBalance.intake}
                    duration={1000}
                    delay={500}
                    style={styles.balanceValText}
                    suffix=" kcal"
                  />
                  <AnimatedNumber
                    value={activityBalance.activity}
                    duration={1000}
                    delay={600}
                    style={styles.balanceValText}
                    suffix=" kcal"
                  />
                </View>
              </View>

              {activityBalance.insight && (
                <View
                  style={[
                    styles.insightBoxWrapper,
                    {
                      backgroundColor:
                        activityBalance.status === 'danger'
                          ? '#FFF0F0'
                          : activityBalance.status === 'warning'
                          ? '#FFFBEB'
                          : '#F0FDFA',
                    },
                  ]}>
                  <View
                    style={[
                      styles.insightDot,
                      {
                        backgroundColor:
                          activityBalance.status === 'danger'
                            ? COLORS.danger
                            : activityBalance.status === 'warning'
                            ? COLORS.warning
                            : COLORS.success,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.balanceInsightText,
                      {
                        color:
                          activityBalance.status === 'danger'
                            ? '#991B1B'
                            : activityBalance.status === 'warning'
                            ? '#92400E'
                            : '#115E59',
                      },
                    ]}>
                    {activityBalance.insight}
                  </Text>
                </View>
              )}
            </AnimatedCard>
          )}

          {/* NUTRITION BREAKDOWN */}
          <AnimatedCard delay={480}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{t('stats.nutrition.title')}</Text>
                <Text style={styles.subTitle}>{t('stats.nutrition.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.macroSegmentBar}>
              <Animated.View
                style={[
                  styles.macroSegment,
                  {
                    width: enterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${macros.carbs}%`],
                    }),
                    backgroundColor: COLORS.warning,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.macroSegment,
                  {
                    width: enterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${macros.protein}%`],
                    }),
                    backgroundColor: COLORS.danger,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.macroSegment,
                  {
                    width: enterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${macros.fat}%`],
                    }),
                    backgroundColor: '#32ADE6',
                  },
                ]}
              />
            </View>

            <View style={styles.macroLegendRow}>
              {[
                {key: 'carbs', val: macros.carbs, color: COLORS.warning},
                {key: 'protein', val: macros.protein, color: COLORS.danger},
                {key: 'fat', val: macros.fat, color: '#32ADE6'},
              ].map(({key, val, color}) => (
                <View key={key} style={styles.macroLegendItem}>
                  <View style={[styles.dot, {backgroundColor: color}]} />
                  <View>
                    <Text style={styles.macroLegendTitle}>
                      {t(`stats.macros.${key}`)}
                    </Text>
                    <AnimatedNumber
                      value={val}
                      duration={900}
                      delay={560}
                      style={styles.macroLegendVal}
                      suffix="%"
                    />
                  </View>
                </View>
              ))}
            </View>
          </AnimatedCard>

          {/* MEAL TIMING */}
          {reportData?.meal_timing && reportData.meal_timing.length > 0 && (
            <AnimatedCard delay={560}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{t('stats.meal_timing.title')}</Text>
                  <Text style={styles.subTitle}>
                    {t('stats.meal_timing.subtitle')}
                  </Text>
                </View>
              </View>

              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  donut
                  isAnimated
                  animationDuration={1400}
                  radius={80}
                  innerRadius={52}
                  showText
                  textColor={COLORS.white}
                  textSize={10}
                  fontWeight="bold"
                  textBackgroundColor="transparent"
                  textBackgroundRadius={12}
                  showTextBackground={false}
                  centerLabelComponent={() => (
                    <View
                      style={{alignItems: 'center', justifyContent: 'center'}}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: COLORS.secondary,
                        }}>
                        {avgCal.toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: COLORS.textGray,
                          fontWeight: '500',
                        }}>
                        {t('stats.meal_timing.kcal_per_day')}
                      </Text>
                    </View>
                  )}
                />

                <View style={styles.pieLegend}>
                  {reportData.meal_timing.map((item: any, index: number) => {
                    const pct =
                      reportData.total_food_kcal > 0
                        ? Math.round(
                            (item.value / reportData.total_food_kcal) * 100,
                          )
                        : 0;
                    return (
                      <View key={index} style={styles.pieLegendItem}>
                        <View
                          style={[styles.dot, {backgroundColor: item.color}]}
                        />
                        <View style={{flex: 1}}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}>
                            <Text style={styles.legendText}>{item.name}</Text>
                            {pct > 0 && (
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '700',
                                  color: item.color,
                                }}>
                                {pct}%
                              </Text>
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: COLORS.textLight,
                              marginTop: 2,
                              fontWeight: '500',
                            }}>
                            {item.value.toLocaleString()} kcal
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {reportData?.meal_timing_insight && (
                <View style={styles.mealInsightBox}>
                  <Icon
                    name="info"
                    size={16}
                    color={COLORS.primary}
                    style={{marginTop: 2}}
                  />
                  <Text style={styles.mealInsightText}>
                    {reportData.meal_timing_insight}
                  </Text>
                </View>
              )}
            </AnimatedCard>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  loadingWrapper: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {
    marginTop: 12,
    color: COLORS.textGray,
    fontSize: 15,
    fontWeight: '500',
  },

  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 55 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },

  // TAB — animated slider
  periodTab: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 4,
    position: 'relative',
    height: 44,
    alignItems: 'center',
  },
  tabSlider: {
    position: 'absolute',
    height: 36,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.08,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 8,
    elevation: 3,
  },
  tabBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {fontSize: 14, fontWeight: '600', color: COLORS.textGray},
  tabTextActive: {color: COLORS.primary, fontWeight: '700'},

  scrollContent: {padding: 16, paddingTop: 20, paddingBottom: 100},

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.2,
  },
  subTitle: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 4,
    fontWeight: '500',
  },
  avgText: {fontSize: 20, color: COLORS.primary, fontWeight: '900'},

  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 22,
  },

  badgeLight: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextLight: {fontSize: 11, color: COLORS.textGray, fontWeight: '700'},

  compTable: {marginTop: 0},
  compHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  compLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  compMetric: {fontSize: 14, fontWeight: '700', color: COLORS.secondary},
  compVal: {fontSize: 14, color: COLORS.secondary, fontWeight: '700'},
  changeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeText: {fontSize: 12, fontWeight: '800'},

  forecastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,199,89,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: -5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  forecastBadgeText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center'},
  lineBox: {width: 16, height: 4, borderRadius: 2, marginRight: 8},
  legendText: {fontSize: 13, color: COLORS.textGray, fontWeight: '600'},

  chartContainer: {flexDirection: 'row', height: 180, marginTop: 10},
  yAxis: {
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingRight: 10,
    width: 35,
  },
  axisLabel: {fontSize: 10, color: COLORS.textLight, fontWeight: '600'},
  chartArea: {flex: 1, position: 'relative'},
  gridLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    width: '100%',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    height: 140,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    paddingTop: 4,
  },
  warningDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
    marginTop: 10,
  },

  ratioBadge: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10},
  ratioText: {fontSize: 13, fontWeight: '800'},
  balanceBarContainer: {marginVertical: 10},
  balanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balanceLabelMin: {fontSize: 12, color: COLORS.textGray, fontWeight: '600'},
  mainProgressBg: {
    height: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBase: {position: 'absolute', height: '100%', left: 0, top: 0},
  progressFill: {height: '100%', borderRadius: 100},
  balanceValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  balanceValText: {fontSize: 14, fontWeight: '800', color: COLORS.secondary},

  insightBoxWrapper: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  balanceInsightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },

  macroSegmentBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 100,
    overflow: 'hidden',
    marginVertical: 15,
  },
  macroSegment: {height: '100%'},
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  macroLegendItem: {flexDirection: 'row', alignItems: 'flex-start', flex: 1},
  macroLegendTitle: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroLegendVal: {fontSize: 16, color: COLORS.secondary, fontWeight: '800'},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: 8, marginTop: 2},

  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pieLegend: {flex: 1, marginLeft: 24, justifyContent: 'center'},
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  mealInsightBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(44,101,232,0.08)',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  mealInsightText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.secondary,
    marginLeft: 12,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default StatsScreen;
