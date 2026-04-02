import SoundPlayer from 'react-native-sound-player';
import Tts from 'react-native-tts';

const Sound = {
  timeout: () => {
    try {
      SoundPlayer.playSoundFile('timeout', 'm4a');
    } catch (error) {
      console.log('Cannot play timeout', error);
    }
  },
  beep: () => {
    try {
      SoundPlayer.playSoundFile('beep', 'wav');
    } catch (error) {
      console.log('Cannot play timeout', error);
    }
  },
  speak: (utterance: string) => {
    Tts.speak(utterance);
  },
};

export default Sound;
