import React, {memo} from 'react';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import BluetoothViewModel from './BluetoothViewModel';
import styles from './styles';
import { FlatList } from 'react-native';

const BluetoothConfig = () => {
  const viewModel = BluetoothViewModel();

  if (!viewModel.isBluetoothEnabled) {
    return <Text style={styles.errorText}>Bluetooth is not enabled. Please enable it to scan devices.</Text>;
  }

  return (
     <View style={styles.container}>
      <Button style={[styles.button]} onPress={viewModel.startScan} disable={viewModel.isScanning}>

     {
      viewModel.isScanning ? (<Text>Scanning</Text>) : (<Text>start scan</Text>)
     }
      
      </Button> 

      {viewModel.connectedDevice ? (
        <View style={styles.info}>
          <Text>Connected to: {viewModel.connectedDevice.name || 'Unnamed Device'}</Text>
          <Text>ID: {viewModel.connectedDevice.id}</Text>
        </View>
      ) : ( <FlatList
        data={viewModel.scannedDevices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <>
             <Text style={styles.deviceText}>
            {item.name || 'Unnamed Device'} ({item.id})
          </Text>
          <Button style={[styles.button]} onPress={ () => {
            viewModel.connectToDevice(item.id)
          }}>
          <Text>Connect</Text>

          </Button>
          </>
        )}
      />)}

     
    </View>

  );
};

export default memo(BluetoothConfig);
