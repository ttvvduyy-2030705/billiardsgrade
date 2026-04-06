import {PLAYER_COLOR} from 'constants/player';
import {PlayerSettings} from 'types/player';
import {GameSettingsMode} from 'types/settings';
import i18n from 'i18n';

const DEFAULT_PLAYERS = () => [
  {
    name: i18n.t('player1'),
    color: PLAYER_COLOR[1],
    totalPoint: 0,
    countryCode: '',
    countryName: '',
    flag: '',
    flagImage: '',
  },
  {
    name: i18n.t('player2'),
    color: PLAYER_COLOR[1],
    totalPoint: 0,
    countryCode: '',
    countryName: '',
    flag: '',
    flagImage: '',
  },
];

const GAME_SETTINGS: GameSettingsMode = {
  mode: 'fast',
};

const PLAYER_SETTINGS = (): PlayerSettings => ({
  playerNumber: 2,
  playingPlayers: DEFAULT_PLAYERS(),
  goal: {
    goal: 9,
    pointSteps: [-5, -1, 1, 5],
  },
});

export {DEFAULT_PLAYERS, GAME_SETTINGS, PLAYER_SETTINGS};
