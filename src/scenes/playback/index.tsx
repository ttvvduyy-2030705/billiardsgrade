import React, {memo, useEffect, useMemo, useState} from 'react';
import {Alert, Linking, Pressable, ScrollView, StyleSheet} from 'react-native';
import RNFS from 'react-native-fs';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Loading from 'components/Loading';
import {goBack} from 'utils/navigation';

const PlaybackScreen = (props: any) => {
  const webcamFolderName = props?.route?.params?.webcamFolderName;
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        if (!webcamFolderName) {
          setError('Khong co thu muc video.');
          setIsLoading(false);
          return;
        }

        const folderPath = `${RNFS.DownloadDirectoryPath}/${webcamFolderName}`;
        const exists = await RNFS.exists(folderPath);

        if (!exists) {
          setError('Khong tim thay thu muc video.');
          setFiles([]);
          setIsLoading(false);
          return;
        }

        const result = await RNFS.readDir(folderPath);

        const onlyFiles = result
          .filter(item => item.isFile())
          .sort((a, b) => {
            const aTime = a.mtime?.getTime?.() || 0;
            const bTime = b.mtime?.getTime?.() || 0;
            return bTime - aTime;
          });

        setFiles(onlyFiles);
        setCurrentIndex(0);
      } catch (e: any) {
        setError(e?.message || 'Khong doc duoc danh sach video.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [webcamFolderName]);

  const currentFile = useMemo(() => {
    if (!files.length) {
      return null;
    }
    return files[currentIndex] || null;
  }, [files, currentIndex]);

  const onOpenFile = async (path: string) => {
    try {
      const fileUrl = `file://${path}`;
      const supported = await Linking.canOpenURL(fileUrl);

      if (!supported) {
        Alert.alert('Thong bao', 'Thiet bi khong mo duoc file nay.');
        return;
      }

      await Linking.openURL(fileUrl);
    } catch (e: any) {
      Alert.alert('Loi', e?.message || 'Khong mo duoc video.');
    }
  };

  return (
    <Container>
      <View flex={'1'} direction={'row'} style={styles.root}>
        <View style={styles.leftPanel}>
          <View style={styles.leftHeader}>
            <Text fontSize={18} fontWeight={'bold'}>
              Xem lai
            </Text>
          </View>

          <View style={styles.folderBox}>
            <Text style={styles.folderLabel}>Folder</Text>
            <Text style={styles.folderValue}>
              {webcamFolderName || 'N/A'}
            </Text>
          </View>

          {isLoading ? (
            <View flex={'1'} alignItems={'center'} justify={'center'}>
              <Loading isLoading />
            </View>
          ) : error ? (
            <View style={styles.messageBox}>
              <Text>{error}</Text>
            </View>
          ) : files.length > 0 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.fileList}>
              {files.map((item, index) => {
                const active = index === currentIndex;

                return (
                  <Pressable
                    key={`${item.path}-${index}`}
                    onPress={() => setCurrentIndex(index)}
                    style={[
                      styles.fileItem,
                      active ? styles.fileItemActive : null,
                    ]}>
                    <Text
                      style={[
                        styles.fileName,
                        active ? styles.fileNameActive : null,
                      ]}>
                      {item.name}
                    </Text>

                    <Text style={styles.fileTime}>
                      {item.mtime ? item.mtime.toLocaleTimeString() : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.messageBox}>
              <Text>Chua co file video de xem lai.</Text>
            </View>
          )}

          <Button style={styles.backButton} onPress={goBack}>
            <Text>Quay lai</Text>
          </Button>
        </View>

        <View flex={'1'} style={styles.rightPanel}>
          <View style={styles.previewBox}>
            {isLoading ? (
              <View flex={'1'} alignItems={'center'} justify={'center'}>
                <Loading isLoading />
              </View>
            ) : currentFile ? (
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewHint}>
                  Player trong app dang tat tam de tranh loi native.
                </Text>

                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Ten file</Text>
                  <Text style={styles.metaValue}>{currentFile.name}</Text>
                </View>

                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Thoi gian</Text>
                  <Text style={styles.metaValue}>
                    {currentFile.mtime
                      ? currentFile.mtime.toLocaleString()
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Duong dan</Text>
                  <Text style={styles.metaPath}>{currentFile.path}</Text>
                </View>

                <View marginTop={'14'}>
                  <Button onPress={() => onOpenFile(currentFile.path)}>
                    <Text>Mo video</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View flex={'1'} alignItems={'center'} justify={'center'}>
                <Text>Khong co video de hien thi.</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  root: {
    padding: 16,
  },
  leftPanel: {
    width: 250,
    marginRight: 16,
  },
  leftHeader: {
    marginBottom: 12,
    alignItems: 'center',
  },
  folderBox: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  folderLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  folderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
  },
  fileList: {
    maxHeight: 320,
  },
  fileItem: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 10,
  },
  fileItemActive: {
    borderColor: '#666666',
    backgroundColor: '#F3F3F3',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  fileNameActive: {
    color: '#000000',
  },
  fileTime: {
    fontSize: 12,
    color: '#666666',
  },
  messageBox: {
    paddingVertical: 20,
  },
  backButton: {
    marginTop: 14,
  },
  rightPanel: {
    flex: 1,
  },
  previewBox: {
    flex: 1,
    minHeight: 420,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  previewHint: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 16,
  },
  metaBox: {
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
  },
  metaPath: {
    fontSize: 12,
    color: '#888888',
  },
});

export default memo(PlaybackScreen);