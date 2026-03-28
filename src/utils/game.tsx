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

const isPool15OnlyGame = (category?: BilliardCategory) => {
  if (category === '15-ball') {
    return true;
  }

  return false;
};

const isPool9Game = (category?: BilliardCategory) => {
  if (category === '9-ball') {
    return true;
  }

  return false;
};

const isPool10Game = (category?: BilliardCategory) => {
  if (category === '10-ball') {
    return true;
  }

  return false;
};

const isCaromGame = (category?: BilliardCategory) => {
  if (category === 'one-cushion' || category === 'three-cusion') {
    return true;
  }

  return false;
};

const isCarom3CGame = (category?: BilliardCategory) => {
  if (category === 'three-cusion') {
    return true;
  }

  return false;
};

export {
  isPoolGame,
  isPool9Game,
  isPool10Game,
  isPool15Game,
  isPool15OnlyGame,
  isCaromGame,
  isCarom3CGame,
};
