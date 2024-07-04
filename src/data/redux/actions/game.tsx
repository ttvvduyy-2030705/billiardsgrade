import {createAction, mapType, status} from 'utils/redux';

export const gameTypes = {
  UPDATE_GAME_SETTINGS: mapType('UPDATE_GAME_SETTINGS', status.start),
  UPDATE_GAME_SETTINGS_SUCCESS: mapType('UPDATE_GAME_SETTINGS', status.success),
  UPDATE_GAME_SETTINGS_ERROR: mapType('UPDATE_GAME_SETTINGS', status.error),
};

export const gameActions = {
  updateGameSettings: createAction(gameTypes.UPDATE_GAME_SETTINGS),
  updateGameSettingsSuccess: createAction(
    gameTypes.UPDATE_GAME_SETTINGS_SUCCESS,
  ),
  updateGameSettingsError: createAction(gameTypes.UPDATE_GAME_SETTINGS_ERROR),
};
