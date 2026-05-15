import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View as RNView,
} from 'react-native';
import RNText from './AdminText';
import {useAppTranslation} from 'utils/appI18n';

import type {
  MenuCategory,
  RestaurantMenuItem,
} from 'services/restaurantMenuRepository';
import {getMenuItemImageValue} from 'services/restaurantMenuImage';

type Props = {
  visible: boolean;
  item?: RestaurantMenuItem | null;
  categories: MenuCategory[];
  styles: any;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    createdAt?: string;
    name: string;
    price: number;
    categoryId: string;
    description: string;
    imageUrl?: string;
    available: boolean;
  }) => void;
};

const EditMenuItemModal = ({
  visible,
  item,
  categories,
  styles,
  onClose,
  onSave,
}: Props) => {
  const t = useAppTranslation();
  const defaultCategoryId = categories[0]?.id || 'drink';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(item?.name || '');
    setPrice(item ? String(item.price || '') : '');
    setCategoryId(item?.categoryId || defaultCategoryId);
    setDescription(item?.description || '');
    setImageUrl(getMenuItemImageValue(item));
    setAvailable(item?.available !== false);
    setError('');
  }, [defaultCategoryId, item, visible]);

  const priceValue = useMemo(
    () => Number(String(price).replace(/[^0-9]/g, '')),
    [price],
  );

  const submit = () => {
    if (!name.trim()) {
      setError(t('restaurantAdmin.menu.enterItemName'));
      return;
    }

    if (!priceValue || priceValue < 0) {
      setError(t('restaurantAdmin.menu.invalidPrice'));
      return;
    }

    onSave({
      id: item?.id,
      createdAt: item?.createdAt,
      name: name.trim(),
      price: priceValue,
      categoryId,
      description: description.trim(),
      imageUrl: getMenuItemImageValue({imageUrl}),
      available,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <RNView style={styles.modalBackdrop}>
        <RNView style={styles.editModalCard}>
          <RNView style={styles.editModalHeader}>
            <RNView>
              <RNText style={styles.editModalTitle}>
                {item ? t('restaurantAdmin.menu.editItem') : t('restaurantAdmin.menu.addItem')}
              </RNText>
              <RNText style={styles.editModalHint}>
                {t('restaurantAdmin.menu.localDataHint')}
              </RNText>
            </RNView>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <RNText style={styles.modalCloseText}>×</RNText>
            </Pressable>
          </RNView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.itemName')}</RNText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('restaurantAdmin.menu.itemNamePlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.36)"
              style={styles.adminInput}
            />

            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.price')}</RNText>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="25000"
              placeholderTextColor="rgba(255,255,255,0.36)"
              keyboardType="number-pad"
              style={styles.adminInput}
            />

            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.category')}</RNText>
            <RNView style={styles.categoryPickerWrap}>
              {categories.map(category => {
                const active = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[
                      styles.categoryPickChip,
                      active ? styles.categoryPickChipActive : null,
                    ]}>
                    <RNText
                      style={[
                        styles.categoryPickText,
                        active ? styles.categoryPickTextActive : null,
                      ]}>
                      {category.name}
                    </RNText>
                  </Pressable>
                );
              })}
            </RNView>

            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.description')}</RNText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('restaurantAdmin.menu.descriptionPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.36)"
              multiline
              style={[styles.adminInput, styles.adminTextArea]}
            />
            <RNText style={styles.inputLabel}>{t('restaurantAdmin.menu.status')}</RNText>
            <RNView style={styles.categoryPickerWrap}>
              <Pressable
                onPress={() => setAvailable(true)}
                style={[
                  styles.categoryPickChip,
                  available ? styles.categoryPickChipActive : null,
                ]}>
                <RNText
                  style={[
                    styles.categoryPickText,
                    available ? styles.categoryPickTextActive : null,
                  ]}>
                  {t('restaurantAdmin.menu.statusSelling')}
                </RNText>
              </Pressable>
              <Pressable
                onPress={() => setAvailable(false)}
                style={[
                  styles.categoryPickChip,
                  !available ? styles.categoryPickChipActive : null,
                ]}>
                <RNText
                  style={[
                    styles.categoryPickText,
                    !available ? styles.categoryPickTextActive : null,
                  ]}>
                  {t('restaurantAdmin.menu.statusHidden')} / {t('restaurantAdmin.menu.statusOutOfStock')}
                </RNText>
              </Pressable>
            </RNView>

            {error ? <RNText style={styles.formError}>{error}</RNText> : null}
          </ScrollView>

          <RNView style={styles.editModalFooter}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <RNText style={styles.cancelButtonText}>{t('restaurantAdmin.menu.cancel')}</RNText>
            </Pressable>
            <Pressable onPress={submit} style={styles.saveButton}>
              <RNText style={styles.saveButtonText}>{t('restaurantAdmin.menu.saveItem')}</RNText>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  );
};

export default memo(EditMenuItemModal);
