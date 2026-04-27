import React, {memo, useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View as RNView,
} from 'react-native';

import type {MenuCategory, RestaurantMenuItem} from 'services/restaurantMenuStorage';

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
    imageUri?: string;
    available: boolean;
  }) => void;
};

const EditMenuItemModal = ({visible, item, categories, styles, onClose, onSave}: Props) => {
  const defaultCategoryId = categories[0]?.id || 'drink';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
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
    setImageUri(item?.imageUri || '');
    setAvailable(item?.available !== false);
    setError('');
  }, [defaultCategoryId, item, visible]);

  const priceValue = useMemo(() => Number(String(price).replace(/[^0-9]/g, '')), [price]);

  const submit = () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên món');
      return;
    }

    if (!priceValue || priceValue < 0) {
      setError('Vui lòng nhập giá hợp lệ');
      return;
    }

    onSave({
      id: item?.id,
      createdAt: item?.createdAt,
      name: name.trim(),
      price: priceValue,
      categoryId,
      description: description.trim(),
      imageUri: imageUri.trim(),
      available,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <RNView style={styles.modalBackdrop}>
        <RNView style={styles.editModalCard}>
          <RNView style={styles.editModalHeader}>
            <RNView>
              <RNText style={styles.editModalTitle}>{item ? 'Sửa món' : 'Thêm món mới'}</RNText>
              <RNText style={styles.editModalHint}>Dữ liệu lưu local, sau này thay bằng API admin.</RNText>
            </RNView>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <RNText style={styles.modalCloseText}>×</RNText>
            </Pressable>
          </RNView>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <RNText style={styles.inputLabel}>Tên món</RNText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ví dụ: Coca lạnh"
              placeholderTextColor="rgba(255,255,255,0.36)"
              style={styles.adminInput}
            />

            <RNText style={styles.inputLabel}>Giá</RNText>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="25000"
              placeholderTextColor="rgba(255,255,255,0.36)"
              keyboardType="number-pad"
              style={styles.adminInput}
            />

            <RNText style={styles.inputLabel}>Danh mục</RNText>
            <RNView style={styles.categoryPickerWrap}>
              {categories.map(category => {
                const active = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.categoryPickChip, active ? styles.categoryPickChipActive : null]}>
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

            <RNText style={styles.inputLabel}>Mô tả / ghi chú món</RNText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả ngắn hiển thị cho nhân viên/khách"
              placeholderTextColor="rgba(255,255,255,0.36)"
              multiline
              style={[styles.adminInput, styles.adminTextArea]}
            />

            <RNText style={styles.inputLabel}>Ảnh món URL</RNText>
            <TextInput
              value={imageUri}
              onChangeText={setImageUri}
              placeholder="https://..."
              placeholderTextColor="rgba(255,255,255,0.36)"
              autoCapitalize="none"
              style={styles.adminInput}
            />

            <RNText style={styles.inputLabel}>Trạng thái</RNText>
            <RNView style={styles.categoryPickerWrap}>
              <Pressable
                onPress={() => setAvailable(true)}
                style={[styles.categoryPickChip, available ? styles.categoryPickChipActive : null]}>
                <RNText style={[styles.categoryPickText, available ? styles.categoryPickTextActive : null]}>
                  Đang bán
                </RNText>
              </Pressable>
              <Pressable
                onPress={() => setAvailable(false)}
                style={[styles.categoryPickChip, !available ? styles.categoryPickChipActive : null]}>
                <RNText style={[styles.categoryPickText, !available ? styles.categoryPickTextActive : null]}>
                  Tạm ẩn / hết hàng
                </RNText>
              </Pressable>
            </RNView>

            {error ? <RNText style={styles.formError}>{error}</RNText> : null}
          </ScrollView>

          <RNView style={styles.editModalFooter}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <RNText style={styles.cancelButtonText}>Huỷ</RNText>
            </Pressable>
            <Pressable onPress={submit} style={styles.saveButton}>
              <RNText style={styles.saveButtonText}>Lưu món</RNText>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  );
};

export default memo(EditMenuItemModal);
