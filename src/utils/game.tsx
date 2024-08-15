import {BilliardCategory} from 'types/category';

const isPoolGame = (category?: BilliardCategory) => {
  if (
    category === '9-ball' ||
    category === '10-ball' ||
    category === '15-ball' ||
    category === '15-free-ball'
  ) {
    return true;
  }

  return false;
};

const isPool15Game = (category?: BilliardCategory) => {
  if (category === '15-ball' || category === '15-free-ball') {
    return true;
  }

  return false;
};

export {isPoolGame, isPool15Game};
