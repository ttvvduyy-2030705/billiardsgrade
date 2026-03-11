import React, {memo, useEffect, useState} from 'react';
import {Alert, StyleSheet, TextInput} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';

import {keys} from 'configuration/keys';
import {OutputType, WebcamType} from 'types/webcam';

const WebcamConfig = () => {
  const [webcamIP, setWebcamIP] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncTime, setSyncTime] = useState('5');
  const [outputType, setOutputType] = useState<OutputType>(OutputType.local);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await AsyncStorage.multiGet([
          keys.WEBCAM_IP_ADDRESS,
          keys.WEBCAM_USERNAME,
          keys.WEBCAM_PASSWORD,
          keys.WEBCAM_SYNC_TIME,
          keys.OUTPUT_TYPE,
        ]);

        const map = Object.fromEntries(result);

        setWebcamIP(map[keys.WEBCAM_IP_ADDRESS] || '');
        setUsername(map[keys.WEBCAM_USERNAME] || '');
        setPassword(map[keys.WEBCAM_PASSWORD] || '');
        setSyncTime(map[keys.WEBCAM_SYNC_TIME] || '5');

        if (
          map[keys.OUTPUT_TYPE] === OutputType.local ||
          map[keys.OUTPUT_TYPE] === OutputType.livestream
        ) {
          setOutputType(map[keys.OUTPUT_TYPE] as OutputType);
        }
      } catch (error) {
        console.log('Load webcam config error:', error);
      }
    };

    loadConfig();
  }, []);

  const onSave = async () => {
    try {
      setIsSaving(true);

      const safeSyncTime = `${Math.max(1, Number(syncTime) || 5)}`;

      await AsyncStorage.multiSet([
        [keys.WEBCAM_TYPE, WebcamType.webcam],
        [keys.WEBCAM_IP_ADDRESS, webcamIP.trim()],
        [keys.WEBCAM_USERNAME, username.trim()],
        [keys.WEBCAM_PASSWORD, password],
        [keys.WEBCAM_SYNC_TIME, safeSyncTime],
        [keys.OUTPUT_TYPE, outputType],
      ]);

      Alert.alert('Thông báo', 'Đã lưu cấu hình webcam');
    } catch (error) {
      console.log('Save webcam config error:', error);
      Alert.alert('Lỗi', 'Không lưu được cấu hình webcam');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <View flex="1" padding="20">
        <Text fontSize={20} fontWeight="bold" marginBottom="16">
          Cấu hình webcam
        </Text>

        <Text marginBottom="6">IP Webcam</Text>
        <TextInput
          style={styles.input}
          value={webcamIP}
          onChangeText={setWebcamIP}
          placeholder="Ví dụ: 192.168.1.10"
          autoCapitalize="none"
        />

        <Text marginBottom="6">Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Nhập username"
          autoCapitalize="none"
        />

        <Text marginBottom="6">Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Nhập password"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text marginBottom="6">Sync Time (giây)</Text>
        <TextInput
          style={styles.input}
          value={syncTime}
          onChangeText={setSyncTime}
          placeholder="5"
          keyboardType="numeric"
        />

        <Text marginBottom="8">Output Type</Text>
        <View direction="row" marginBottom="20">
          <Button onPress={() => setOutputType(OutputType.local)}>
            <Text>{outputType === OutputType.local ? '● Local' : 'Local'}</Text>
          </Button>

          <View marginLeft="12" />

          <Button onPress={() => setOutputType(OutputType.livestream)}>
            <Text>
              {outputType === OutputType.livestream
                ? '● Livestream'
                : 'Livestream'}
            </Text>
          </Button>
        </View>

        <Text marginBottom="16">
          Preview webcam vẫn đang tắt tạm để tránh crash camera.
        </Text>

        <Button onPress={onSave} disabled={isSaving}>
          <Text>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</Text>
        </Button>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
});

export default memo(WebcamConfig);