import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const HealthMetricsScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#0a235c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Metrics</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Chỉ số BMI chi tiết */}
        <View style={styles.metricCard}>
          <Text style={styles.label}>Body Mass Index (BMI)</Text>
          <Text style={styles.value}>23.3</Text>
          <View style={styles.bmiBar}>
            <View style={[styles.bmiPointer, {left: '45%'}]} />
          </View>
          <Text style={styles.statusText}>
            You are in the **Healthy** range
          </Text>
        </View>

        {/* Cập nhật cân nặng nhanh */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Update Weight</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currentWeight}>71.5 kg</Text>
            <TouchableOpacity style={styles.updateBtn}>
              <Text style={styles.updateBtnText}>Log Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F4F7FC'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#0a235c'},
  content: {padding: 20},
  metricCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  label: {color: '#8A94A6', fontWeight: '600'},
  value: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c65e8',
    marginVertical: 10,
  },
  bmiBar: {
    height: 8,
    backgroundColor: '#EDEFF2',
    borderRadius: 4,
    marginTop: 10,
  },
  bmiPointer: {
    position: 'absolute',
    width: 4,
    height: 16,
    backgroundColor: '#2c65e8',
    top: -4,
  },
  statusText: {
    marginTop: 15,
    color: '#34C759',
    fontWeight: '700',
    textAlign: 'center',
  },
  inputCard: {backgroundColor: '#fff', padding: 20, borderRadius: 20},
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a235c',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentWeight: {fontSize: 24, fontWeight: '800', color: '#0a235c'},
  updateBtn: {
    backgroundColor: '#2c65e8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  updateBtnText: {color: '#fff', fontWeight: '700'},
});

export default HealthMetricsScreen;
