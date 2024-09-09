import Realm, {BSON} from 'realm';
import {GameSchema} from '../models/game';
import {GameExtraTimeTurns, GameSettings} from 'types/settings';
import {useQuery} from '@realm/react';

const CreateGame = (realm: Realm, gameSettings: GameSettings) => {
  const now = new Date();
  // const id = new BSON.ObjectId();

  realm.write(() => {
    realm.create(GameSchema, {
      // id,
      createdAt: now,
      updatedAt: now,
      totalTime: gameSettings.totalTime || 0,
      category: gameSettings.category,
      mode: {
        ...gameSettings.mode,
        extraTimeTurns:
          gameSettings.mode.extraTimeTurns?.toString() as GameExtraTimeTurns,
      },
      players: gameSettings.players,
    });
  });
};

const ReadGames = (params?: {
  length?: number;
}): (GameSettings & {createdAt: Date; updatedAt: Date})[] => {
  const games = useQuery(GameSchema);

  return games.slice(0, params?.length || 20).map(
    game =>
      ({
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        totalTime: game.totalTime,
        category: game.category,
        mode: game.mode,
        players: game.players,
      } as GameSettings & {createdAt: Date; updatedAt: Date}),
  );
};

const UpdateGame = (
  realm: Realm,
  id: BSON.ObjectId,
  gameSettings: GameSettings,
) => {
  const toUpdate = realm.objects(GameSchema).filtered('_id == $0', id);

  const now = new Date();
  realm.write(() => {
    toUpdate[0].updatedAt = now;
    toUpdate[0].category = gameSettings.category;
    toUpdate[0].mode = gameSettings.mode;
    toUpdate[0].players = gameSettings.players;
  });
};

const DeleteGame = (realm: Realm, id: BSON.ObjectId) => {
  const toDelete = realm.objects(GameSchema).filtered('_id == $0', id);

  realm.write(() => {
    realm.delete(toDelete);
  });
};

export {CreateGame, ReadGames, UpdateGame, DeleteGame};
