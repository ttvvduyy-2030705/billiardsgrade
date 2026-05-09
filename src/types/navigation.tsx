export type Navigation = {
  navigate: (name: string, params?: Object) => void;
  goBack: () => void;
  replace?: (route: {name: string; params?: Object}) => void;
  reset?: (
    index: number,
    routes: Array<{name: string; params?: Object}>,
  ) => void;
};
