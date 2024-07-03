const fonts = {
  Nunito: {
    regular: 'Nunito-Regular',
    bold: 'Nunito-Bold',
    italic: 'Nunito-Italic',
  },
};

const getSelectedFont = (
  name: string,
  fontWeight: 'regular' | 'bold' | 'italic' = 'regular',
) => {
  switch (name) {
    case 'Nunito-Regular':
      return fonts.Nunito[fontWeight];
    default:
      return fonts.Nunito[fontWeight];
  }
};

export {getSelectedFont};
export default fonts;
