import React, { memo, ReactElement, useCallback, useMemo, useState } from 'react';
import Button from 'components/Button';
import View from 'components/View';
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import HTML from 'react-native-render-html';
import { MIN_DESC_HEIGHT, SYSTEM_HTML_FONTS } from './constants';
import Image from 'components/Image';
import images from 'assets';

import styles from './styles';
import { dims } from 'configuration';
import { LayoutChangeEvent } from 'react-native';
import { removeSpecificHtmlTag } from 'utils/string';
import colors from 'configuration/colors';

interface Props {
  scrollViewRef: SharedValue<number>;
  contentRef: SharedValue<number>;
  content: string;
  additionalComponent: (bottomHeight: number) => ReactElement | ReactElement[];
  minHeight?: number;
}

const CollapsibleText = (props: Props) => {
  const {
    scrollViewRef,
    contentRef,
    content,
    additionalComponent,
    minHeight = MIN_DESC_HEIGHT,
  } = props;

  const arrowRef = useSharedValue(90);

  const [descriptionHeight, setDescriptionHeight] = useState<number>(0);
  const [bottomHeight, setBottomHeight] = useState(minHeight);

  const DESCRIPTION = useMemo(() => {
    if (!content) {
      return '';
    }

    let newDescription = removeSpecificHtmlTag(/\<p\>\<br\>\<\/p\>/g, content);
    newDescription = removeSpecificHtmlTag(/\<\/p\>\<br\>\<p\>/g, newDescription, '<br>');
    newDescription = removeSpecificHtmlTag(/\<p\>\<\/p\>/g, newDescription);
    newDescription = removeSpecificHtmlTag(/\<p>\<br\>/g, newDescription, '<br>');
    newDescription = removeSpecificHtmlTag(/\<\/p\>\<p\>\<\/p\>\<p\>/g, newDescription, '</p><p>');
    newDescription = removeSpecificHtmlTag(
      /\<\/p\>\<p\>\s\<\/p\>\<p\>/g,
      newDescription,
      '</p><p>',
    );
    newDescription = removeSpecificHtmlTag(
      /\<\/p\>\<p\>\<b\>\<br\>\<\/b\>\<\/p\>\<p\>/g,
      newDescription,
      '</p><p>',
    );
    newDescription = removeSpecificHtmlTag(/&nbsp;/g, newDescription);
    newDescription = removeSpecificHtmlTag(/<br> /g, newDescription);
    newDescription = removeSpecificHtmlTag(/<br><br>/g, newDescription);
    newDescription = removeSpecificHtmlTag(/<br><br><br>/g, newDescription, '<br><br>');

    return newDescription;
  }, [content]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      if (!scrollViewRef) {
        return;
      }

      scrollViewRef.value = event.contentOffset.y;
    },
  });

  const onSpringDescription = useCallback(() => {
    const FINAL_HEIGHT = contentRef.value === 0 ? (descriptionHeight || 0) - minHeight : 0;
    const FINAL_DEG = contentRef.value === 0 ? -90 : 90;

    if (FINAL_HEIGHT === undefined) {
      return;
    }

    setBottomHeight(contentRef.value === 0 && descriptionHeight ? descriptionHeight : minHeight);
    arrowRef.value = withTiming(FINAL_DEG, { duration: 100 });
    contentRef.value = withSpring(FINAL_HEIGHT, { damping: 12 });
  }, [descriptionHeight, minHeight]);

  const onDescriptionLayout = useCallback((e: LayoutChangeEvent) => {
    setDescriptionHeight(e.nativeEvent.layout.height + 15);
  }, []);

  const contentStyle = useAnimatedStyle(() => {
    return {
      zIndex: 1,
      transform: [{ translateY: minHeight + contentRef.value }],
      backgroundColor: colors.white,
    };
  }, [minHeight]);

  const arrowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${arrowRef.value}deg` }],
    };
  }, [descriptionHeight]);

  const scrollViewStyle = useMemo(() => {
    return { paddingTop: minHeight + dims.screenHeight * 0.2 * 0.2 };
  }, [minHeight]);

  return (
    <Animated.ScrollView
      style={scrollViewStyle}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={1}>
      <Button onPress={onSpringDescription} style={styles.descriptionOverlay}>
        <View onLayout={onDescriptionLayout}>
          <HTML
            baseStyle={styles.html}
            source={{ html: DESCRIPTION }}
            contentWidth={dims.screenWidth - 30}
            systemFonts={SYSTEM_HTML_FONTS}
          />
        </View>
      </Button>

      <Animated.View style={contentStyle}>
        {additionalComponent(bottomHeight)}

        <Animated.View style={[styles.arrowContainer, arrowStyle]}>
          <Image source={images.arrowFilled} style={styles.tinyIcon} />
        </Animated.View>
      </Animated.View>
    </Animated.ScrollView>
  );
};

export default memo(CollapsibleText);
