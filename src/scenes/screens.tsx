import {Scenes, Screens} from 'types/scenes';

import Home from './home';
import GameSettings from './game/settings';
import GamePlay from './game/game-play';

const scenes: Scenes = {
  home: Home,
  gameSettings: GameSettings,
  gamePlay: GamePlay,
};

const sceneKeys = Object.keys(scenes);

const screens: Screens = sceneKeys.reduce(
  (result, item) => ({...result, [item]: item}),
  {} as Screens,
);

export {screens, scenes, sceneKeys};
