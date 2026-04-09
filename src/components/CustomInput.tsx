// CustomInput.tsx (đúng)
import React from 'react';
import {TextInput, View, Text, StyleSheet} from 'react-native';

// ... code component ...

const CustomInput = ({label, ...props}) => {
  // code input
  return (
    <View>
      <Text>{label}</Text>
      <TextInput {...props} />
    </View>
  );
};

export default CustomInput;
