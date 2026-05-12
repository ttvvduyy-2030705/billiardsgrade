export type Navigation = {
  navigate: (name: string, params?: Object) => void;
  goBack: () => void;
  replace?: (route: {name: string; params?: Object}) => void;
  isFocused?: () => boolean;
  addListener?: (name: string, callback: () => void) => (() => void) | undefined;
  reset?: (
    index: number,
    routes: Array<{name: string; params?: Object}>,
  ) => void;
};
