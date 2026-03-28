import {
  // NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import {BleManager, Device } from 'react-native-ble-plx';
import {DiscoverableDevices} from 'types/bluetooth';

const BleManagerModule = NativeModules.BleManager;
// const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BLEServiceInstance {
  [x: string]: any;
  private manager: BleManager;
  isPermissionsGranted: boolean = false;

  constructor() {
    this.manager = new BleManager();
  }

  requestBluetoothPermissions = async () => {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    ]);
    const isGranted =
      result['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.BLUETOOTH_SCAN'] ===
        PermissionsAndroid.RESULTS.GRANTED;


    this.isPermissionsGranted = isGranted;

    return isGranted;
  };

  scanAndConnect = async () => {

    debugger
    console.log("start scan devices");

    console.log(  "grnted "  +  this.isPermissionsGranted);

    const SERVICE_UUID = "00001800-0000-1000-8000-00805f9b34fb"; // Replace with your service UUID

    console.log(JSON.stringify( SERVICE_UUID));

    this.manager.startDeviceScan([], null , (error, device) => {

      console.log("startDeviceScan");


      if (error) {
        console.log('Scan error', error);
        return;
      }

      if (
        device?.name === DiscoverableDevices.remote ||
        device?.name === DiscoverableDevices.remote2 ||
        device?.name === DiscoverableDevices.remote3
      ) {
        if (__DEV__) {
          console.log('Connect to remote device');
        }

        console.log(device?.name);

        if (device) {
          // console.log('Discovered device:', device.name, device.id);
          // if (!this.devices.some((d) => d.id === device.id)) {
          //   this.devices.push(device as Device)
          // }

          this.manager.stopDeviceScan();

          this.connectRemoteDevice(device);
        }
      }
    });

    setTimeout(() => {
      this.manager.stopDeviceScan();
    }, 10000);

  };

  private connectRemoteDevice = async (device: Device) => {
    this.manager
      .connectToDevice(device.id)
      .then((device1: { id: any; }) => {
        console.log('servicesForDevice', device1.id);

        return this.manager.discoverAllServicesAndCharacteristicsForDevice(
          device1.id,
        );
      })
      .then(async (device2: { id: any; }) => {
        console.log('servicesForDevice', device2.id);
        const services = await this.manager.servicesForDevice(device2.id);

        services.forEach(async (service: { characteristics: () => any; monitorCharacteristic: (arg0: any, arg1: (characteristicError: any, characteristic: any) => void) => void; }) => {
          const serviceCharacteristics = await service.characteristics();

          serviceCharacteristics.forEach(async (serviceCharacteristic: { isIndicatable: any; uuid: any; monitor: (arg0: (characteristicError: any, characteristic: any) => void) => void; isNotifiable: any; deviceID: any; serviceUUID: any; isReadable: any; isWritableWithResponse: any; }) => {
            if (
              serviceCharacteristic.isNotifiable ||
              serviceCharacteristic.isIndicatable
            ) {
              service.monitorCharacteristic(
                serviceCharacteristic.uuid,
                (characteristicError: any, characteristic: any) => {
                  console.log(
                    'Monitor serviceCharacteristic ',
                    characteristicError,
                    characteristic,
                  );
                },
              );
              serviceCharacteristic.monitor(
                (characteristicError: any, characteristic: any) => {
                  console.log(
                    'Monitor serviceCharacteristic ',
                    characteristicError,
                    characteristic,
                  );
                },
              );
              console.log(
               'monitorCharacteristicForDevice',
                serviceCharacteristic.isNotifiable,
                serviceCharacteristic.isIndicatable,
                serviceCharacteristic.deviceID,
                serviceCharacteristic.serviceUUID,
                serviceCharacteristic.uuid,
              );

              this.manager.monitorCharacteristicForDevice(
                serviceCharacteristic.deviceID,
                serviceCharacteristic.serviceUUID,
                serviceCharacteristic.uuid,
                (characteristicError, characteristic): void => {
                  console.log(
                    'Monitor serviceCharacteristic ',
                    characteristicError?.errorCode,
                    characteristicError?.androidErrorCode,
                    characteristicError?.attErrorCode,
                    characteristicError?.iosErrorCode,
                    characteristicError?.name,
                    characteristicError?.message,
                    characteristicError?.reason,
                    characteristic,
                  );
                },
              );
            }

            if (serviceCharacteristic.isReadable) {
              const result = await this.manager.readCharacteristicForDevice(
                serviceCharacteristic.deviceID,
                serviceCharacteristic.serviceUUID,
                serviceCharacteristic.uuid,
              );

              console.log(
                'read character',
                serviceCharacteristic.uuid,
                result.value,
              );
            }

            if(serviceCharacteristic.isWritableWithResponse) {
              const result = await this.manager.writeCharacteristicWithResponseForDevice(
                serviceCharacteristic.deviceID,
                serviceCharacteristic.serviceUUID,
                serviceCharacteristic.uuid,
                serviceCharacteristic.isReadable,

              );

              console.log(
                'read character',
                serviceCharacteristic.uuid,
                result.value,
              );
            }
          });
        });

        this.manager.onStateChange((newState: any) => {
          console.log('State changed', newState);
        });
      })
      .catch((deviceError: any) => {
        console.log('Error connect', deviceError);
        // Handle errors
      });
  };
}


// export const BLEService = new BLEManagerInstance();
export const BLEService = new BLEServiceInstance();
