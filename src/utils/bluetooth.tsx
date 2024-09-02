// import {
//   NativeEventEmitter,
//   NativeModules,
//   PermissionsAndroid,
// } from 'react-native';
// import {BleManager, Device} from 'react-native-ble-plx';
// import BLEManager, {
//   Peripheral,
//   Characteristic,
//   BleDisconnectPeripheralEvent,
// } from 'react-native-ble-manager';
// import {DiscoverableDevices} from 'types/bluetooth';
// import ConvertString from 'convert-string';

// const BleManagerModule = NativeModules.BleManager;
// const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// class BLEServiceInstance {
//   private manager: BleManager;
//   isPermissionsGranted: boolean = false;

//   constructor() {
//     this.manager = new BleManager();
//   }

//   requestBluetoothPermissions = async () => {
//     const result = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//     ]);
//     const isGranted =
//       result['android.permission.BLUETOOTH_CONNECT'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       result['android.permission.BLUETOOTH_SCAN'] ===
//         PermissionsAndroid.RESULTS.GRANTED;

//     this.isPermissionsGranted = isGranted;

//     return isGranted;
//   };

//   scanAndConnect = async () => {
//     this.manager.startDeviceScan(null, null, (error, device) => {
//       if (error) {
//         console.log('Scan error', error);
//         return;
//       }

//       if (
//         device?.name === DiscoverableDevices.remote ||
//         device?.name === DiscoverableDevices.remote2 ||
//         device?.name === DiscoverableDevices.remote3
//       ) {
//         if (__DEV__) {
//           console.log('Connect to remote device');
//         }

//         this.manager.stopDeviceScan();

//         this.connectRemoteDevice(device);
//       }
//     });
//   };

//   private connectRemoteDevice = async (device: Device) => {
//     this.manager
//       .connectToDevice(device.id)
//       .then(device1 => {
//         return this.manager.discoverAllServicesAndCharacteristicsForDevice(
//           device1.id,
//         );
//       })
//       .then(async device2 => {
//         console.log('servicesForDevice', device2.id);
//         const services = await this.manager.servicesForDevice(device2.id);

//         services.forEach(async service => {
//           const serviceCharacteristics = await service.characteristics();

//           serviceCharacteristics.forEach(async serviceCharacteristic => {
//             if (
//               // serviceCharacteristic.isNotifiable ||
//               serviceCharacteristic.isIndicatable
//             ) {
//               // service.monitorCharacteristic(
//               //   serviceCharacteristic.uuid,
//               //   (characteristicError, characteristic) => {
//               //     console.log(
//               //       'Monitor serviceCharacteristic ',
//               //       characteristicError,
//               //       characteristic,
//               //     );
//               //   },
//               // );
//               // serviceCharacteristic.monitor(
//               //   (characteristicError, characteristic) => {
//               //     console.log(
//               //       'Monitor serviceCharacteristic ',
//               //       characteristicError,
//               //       characteristic,
//               //     );
//               //   },
//               // );
//               console.log(
//                 'monitorCharacteristicForDevice',
//                 serviceCharacteristic.isNotifiable,
//                 serviceCharacteristic.isIndicatable,
//                 serviceCharacteristic.deviceID,
//                 serviceCharacteristic.serviceUUID,
//                 serviceCharacteristic.uuid,
//               );

//               this.manager.monitorCharacteristicForDevice(
//                 serviceCharacteristic.deviceID,
//                 serviceCharacteristic.serviceUUID,
//                 serviceCharacteristic.uuid,
//                 (characteristicError, characteristic) => {
//                   console.log(
//                     'Monitor serviceCharacteristic ',
//                     characteristicError?.errorCode,
//                     characteristicError?.androidErrorCode,
//                     characteristicError?.attErrorCode,
//                     characteristicError?.iosErrorCode,
//                     characteristicError?.name,
//                     characteristicError?.message,
//                     characteristicError?.reason,
//                     characteristic,
//                   );
//                 },
//               );
//             }

//             // if (serviceCharacteristic.isReadable) {
//             //   const result = await this.manager.readCharacteristicForDevice(
//             //     serviceCharacteristic.deviceID,
//             //     serviceCharacteristic.serviceUUID,
//             //     serviceCharacteristic.uuid,
//             //   );

//             //   console.log(
//             //     'read character',
//             //     serviceCharacteristic.uuid,
//             //     result.value,
//             //   );
//             // }

//             // if(serviceCharacteristic.isWritableWithResponse) {
//             //   const result = await this.manager.writeCharacteristicWithResponseForDevice(
//             //     serviceCharacteristic.deviceID,
//             //     serviceCharacteristic.serviceUUID,
//             //     serviceCharacteristic.uuid,
//             //   );

//             //   console.log(
//             //     'read character',
//             //     serviceCharacteristic.uuid,
//             //     result.value,
//             //   );
//             // }
//           });
//         });

//         this.manager.onStateChange(newState => {
//           console.log('State changed', newState);
//         });
//       })
//       .catch(deviceError => {
//         console.log('Error connect', deviceError);
//         // Handle errors
//       });
//   };
// }

// class BLEManagerInstance {
//   isPermissionsGranted: boolean = false;

//   constructor() {
//     BLEManager.start();
//   }

//   requestBluetoothPermissions = async () => {
//     const result = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//     ]);
//     const isGranted =
//       result['android.permission.BLUETOOTH_CONNECT'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       result['android.permission.BLUETOOTH_SCAN'] ===
//         PermissionsAndroid.RESULTS.GRANTED;

//     this.isPermissionsGranted = isGranted;

//     return isGranted;
//   };

//   registerListeners = () => {
//     const discoverUnsubscribe = bleManagerEmitter.addListener(
//       'BleManagerDiscoverPeripheral',
//       async (peripheral: Peripheral) => {
//         if (peripheral.name === DiscoverableDevices.remote) {
//           this.connectRemoteDevice(peripheral);
//         }
//       },
//     );

//     const connectUnsubscribe = bleManagerEmitter.addListener(
//       'BleManagerConnectPeripheral',
//       (peripheral: Peripheral) => {
//         console.log(
//           '[BleManagerConnectPeripheral] new BLE peripheral=',
//           peripheral,
//         );
//       },
//     );

//     const didUpdateUnsubscribe = bleManagerEmitter.addListener(
//       'BleManagerDidUpdateValueForCharacteristic',
//       ({value, peripheral, characteristic, service}) => {
//         // Convert bytes array to string
//         const data = ConvertString.convertString.bytesToString(value);
//         console.log(
//           `Received ${data} for characteristic ${characteristic}`,
//           service,
//           peripheral,
//         );
//       },
//     );

//     const stopScanUnsubscribe = bleManagerEmitter.addListener(
//       'BleManagerStopScan',
//       () => {
//         console.debug('[handleStopScan] scan is stopped.');
//       },
//     );

//     const disconnectUnsubscribe = bleManagerEmitter.addListener(
//       'BleManagerDisconnectPeripheral',
//       (event: BleDisconnectPeripheralEvent) => {
//         console.debug(
//           `[handleDisconnectedPeripheral][${event.peripheral}] disconnected.`,
//         );
//       },
//     );

//     return [
//       discoverUnsubscribe,
//       connectUnsubscribe,
//       didUpdateUnsubscribe,
//       stopScanUnsubscribe,
//       disconnectUnsubscribe,
//     ];
//   };

//   scanAndConnect = async () => {
//     BLEManager.scan([], 5, true).then(() => {
//       // Success code
//       console.log('Scan started');
//     });
//   };

//   private connectRemoteDevice = async (peripheral: Peripheral) => {
//     await BLEManager.connect(peripheral.id);
//     const services = await BLEManager.retrieveServices(peripheral.id);

//     for (const characteristic of services.characteristics || []) {
//       if (characteristic.descriptors) {
//         for (let descriptor of characteristic.descriptors) {
//           try {
//             let data = await BLEManager.readDescriptor(
//               peripheral.id,
//               characteristic.service,
//               characteristic.characteristic,
//               descriptor.uuid,
//             );
//             console.log(
//               `[connectPeripheral][${peripheral.id}] ${characteristic.service} ${characteristic.characteristic} ${descriptor.uuid} descriptor read as:`,
//               data,
//             );

//             BLEManager.startNotification(
//               peripheral.id,
//               characteristic.service,
//               characteristic.characteristic,
//             );
//           } catch (error) {
//             console.log(
//               `Error: [connectPeripheral][${peripheral.id}] failed to retrieve descriptor ${descriptor} for characteristic ${characteristic}:`,
//               error,
//             );
//           }
//         }
//       }
//     }
//   };
// }

// // export const BLEService = new BLEManagerInstance();
// export const BLEService = new BLEServiceInstance();
