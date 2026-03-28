import {NativeModules} from 'react-native';

const {UvcProbe} = NativeModules;

export type UsbProbeItem = {
  deviceName: string;
  vendorId: number;
  productId: number;
  deviceClass: number;
  deviceSubclass: number;
  looksLikeVideo: boolean;
};

export type UvcZoomInfo = {
  supported: boolean;
  minZoom: number;
  maxZoom: number;
  zoom: number;
  source?: string;
};

export async function listUsbDevices(): Promise<UsbProbeItem[]> {
  if (!UvcProbe?.listUsbDevices) {
    return [];
  }

  return UvcProbe.listUsbDevices();
}

export async function startUvcRecording(outputPath: string): Promise<string> {
  if (!UvcProbe?.startRecording) {
    throw new Error('UVC recorder unavailable');
  }

  return UvcProbe.startRecording(outputPath);
}

export async function stopUvcRecording(): Promise<string | null> {
  if (!UvcProbe?.stopRecording) {
    return null;
  }

  return UvcProbe.stopRecording();
}

export async function setUvcZoom(zoom: number): Promise<number> {
  if (!UvcProbe?.setZoom) {
    return 1;
  }

  return UvcProbe.setZoom(zoom);
}

export async function getUvcZoomInfo(): Promise<UvcZoomInfo> {
  if (!UvcProbe?.getZoomInfo) {
    return {
      supported: false,
      minZoom: 1,
      maxZoom: 1,
      zoom: 1,
      source: 'external',
    };
  }

  return UvcProbe.getZoomInfo();
}
