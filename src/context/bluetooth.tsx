// import React, { createContext, useContext, useEffect, useState } from 'react';
// import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
// import BleManager, { Peripheral } from 'react-native-ble-manager';

// const BleManagerModule = NativeModules.BleManager;
// const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);



// interface PreviewVideoContextProps {
//     isBackRecording: boolean;
//   }


//   const defaultValue: PreviewVideoContextProps = {
//     isBackRecording: false
//   };
  

//   const BlueContext = createContext<PreviewVideoContextProps>(defaultValue);


// export const PreviewVideoProvider = ({ children }: {
//     children: React.ReactNode
//   }) =>  {
//     const [isBackRecording, setISBackRecording] = useState(false);
//     const [scannedDevices, setScannedDevices] = useState<Peripheral[]>([]);
//     const [isScanning, setIsScanning] = useState(false);
//     const [connectedDevice, setConnectedDevice] = useState<Peripheral | null>(null);
//     const [notifications, setNotifications] = useState<{ [key: string]: string }>({});

//     useEffect(() => {
//         BleManager.start({ showAlert: false })
//         .then(() => console.log('Bluetooth initialized'))
//         .catch((error) => console.error('Bluetooth initialization failed:', error));
  
//       checkBluetoothState();
  
//       const stopListener = bleManagerEmitter.addListener('BleManagerStopScan', () => {
//         setIsScanning(false);
//       });
  
//       const discoverListener = bleManagerEmitter.addListener(
//         // 'BleManagerDiscoverPeripheral',
//         (device: Peripheral) => {
//           setScannedDevices((prevDevices) => {
//             if (!prevDevices.some((d) => d.id === device.id)) {
//               return [...prevDevices, device];
//             }
//             return prevDevices;
//           });
//         }
//       );
//       const updateListener = bleManagerEmitter.addListener(
//         'BleManagerDidUpdateValueForCharacteristic',
//         ({ value, characteristic }: { value: number[]; characteristic: string }) => {
//           const data = String.fromCharCode(...value); // Convert byte array to string
//           setNotifications((prev) => ({ ...prev, [characteristic]: data }));
//           console.log(`Characteristic ${characteristic} updated with value:`, data);
//         }
//       );

  
//       return () => {
//         stopListener.remove();
//         updateListener.remove();
//         discoverListener.remove();
//       };
//     }, []);
  
//     const checkBluetoothState = async () => {
//       if (Platform.OS === 'android') {
//         const granted = await PermissionsAndroid.requestMultiple([
//           PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//           PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         ]);
  
//         const allGranted = Object.values(granted).every((status) => status === 'granted');
//         setIsBluetoothEnabled(allGranted);
//       } else {
//         setIsBluetoothEnabled(true);
//       }
//     };
//     const startScan = () => {
//       if (!isScanning) {
//         setScannedDevices([]);
//         setIsScanning(true);
//         BleManager.scan([], 30, false)
//           .then(() => console.log('Scan started'))
//           .catch((error) => console.error('Scan error:', error));
//       }

//           setTimeout(() => {
//             BleManager.stopScan();
//          }, 30000);
//     };

//     const connectToDevice = async (id: string) => {
//         try {
//           console.log(`Connecting to device with id: ${id}`);
//           await BleManager.connect(id);
//           console.log('Connected to device:', id);
    
//           const peripheralData = await BleManager.retrieveServices(id);
//           console.log('Retrieved services for device:', peripheralData);
    
//           setConnectedDevice(peripheralData);
    
//           // Enable notifications for all characteristics
//           peripheralData.characteristics?.forEach(async (char) => {
//             if (char.properties?.Notify) {
//               try {
//                 await BleManager.startNotification(id, char.service, char.characteristic);
//                 console.log(`Started notification for characteristic: ${char.characteristic}`);
//               } catch (err) {
//                 console.error(`Failed to start notification for ${char.characteristic}:`, err);
//               }
//             }
//           });
//         } catch (err) {
//           console.error('Error connecting to device:', err);
//         }
//       };

//     return (
//         <BlueContext.Provider
//             value={{
//                 isBluetoothEnabled,
//                 scannedDevices,
//                 isScanning,
//                 startScan,
//                 connectToDevice,
//                 connectedDevice,
//                 notifications,
//             }}>
//             {children}
//         </BlueContext.Provider>
//     );
// }

// // Custom hook for consuming the context
// export const useBlueContext = () => useContext(BlueContext);