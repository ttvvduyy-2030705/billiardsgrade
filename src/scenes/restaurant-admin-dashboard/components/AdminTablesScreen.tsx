import React, {memo, useMemo, useState} from 'react';
import {Alert, Pressable, TextInput, View as RNView} from 'react-native';

import RNText from './AdminText';
import type {
  RestaurantBranch,
  RestaurantTable,
  RestaurantTableStatus,
} from 'services/restaurantMenuRepository';

type TableFormState = {
  id: string | null;
  tableNumber: string;
  branchId: string;
  qrCodeToken: string;
  status: RestaurantTableStatus;
};

type Props = {
  tables: RestaurantTable[];
  branches: RestaurantBranch[];
  activeBranchId?: string;
  activeRestaurantId?: string;
  styles: any;
  onSaveTable: (input: {
    id?: string;
    restaurantId?: string;
    branchId?: string;
    tableNumber: string;
    qrCodeToken?: string;
    status?: RestaurantTableStatus;
  }) => Promise<RestaurantTable>;
  onDeleteTable: (tableId: string) => Promise<RestaurantTable[]>;
  onReloadTables: () => Promise<void>;
};

type TableFilter = 'ACTIVE_BRANCH' | 'ALL';

const STATUS_OPTIONS: Array<{value: RestaurantTableStatus; label: string}> = [
  {value: 'AVAILABLE', label: 'Đang dùng'},
  {value: 'OCCUPIED', label: 'Có khách'},
  {value: 'LOCKED', label: 'Khóa đặt'},
  {value: 'HIDDEN', label: 'Ẩn QR'},
];

const getStatusLabel = (status?: RestaurantTableStatus) => {
  return (
    STATUS_OPTIONS.find(option => option.value === status)?.label ||
    'Đang dùng'
  );
};

const normaliseToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const createDraftToken = (tableNumber: string) => {
  const suffix = normaliseToken(tableNumber) || 'ban_moi';
  return `qr_${suffix}_${Math.random().toString(36).slice(2, 7)}`;
};

const emptyForm = (branchId?: string): TableFormState => ({
  id: null,
  tableNumber: '',
  branchId: branchId || '',
  qrCodeToken: '',
  status: 'AVAILABLE',
});

const AdminTablesScreen = ({
  tables,
  branches,
  activeBranchId,
  activeRestaurantId,
  styles,
  onSaveTable,
  onDeleteTable,
  onReloadTables,
}: Props) => {
  const [form, setForm] = useState<TableFormState>(() =>
    emptyForm(activeBranchId),
  );
  const [filter, setFilter] = useState<TableFilter>('ACTIVE_BRANCH');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const visibleTables = useMemo(() => {
    const scopedTables =
      filter === 'ACTIVE_BRANCH' && activeBranchId
        ? tables.filter(table => table.branchId === activeBranchId)
        : tables;

    return [...scopedTables].sort((a, b) =>
      String(a.tableNumber || '').localeCompare(String(b.tableNumber || ''), 'vi'),
    );
  }, [activeBranchId, filter, tables]);

  const branchNameById = useMemo(() => {
    return branches.reduce<Record<string, string>>((acc, branch) => {
      acc[branch.id] = branch.name;
      return acc;
    }, {});
  }, [branches]);

  const resetForm = () => {
    setForm(emptyForm(activeBranchId));
    setErrorMessage('');
  };

  const startEdit = (table: RestaurantTable) => {
    setForm({
      id: table.id,
      tableNumber: table.tableNumber,
      branchId: table.branchId || activeBranchId || '',
      qrCodeToken: table.qrCodeToken,
      status: table.status || 'AVAILABLE',
    });
    setErrorMessage('');
  };

  const patchForm = (next: Partial<TableFormState>) => {
    setForm(current => ({...current, ...next}));
  };

  const handleSave = async () => {
    const tableNumber = form.tableNumber.trim();
    const qrCodeToken = form.qrCodeToken.trim() || createDraftToken(tableNumber);

    if (!tableNumber) {
      setErrorMessage('Vui lòng nhập số bàn trước khi lưu.');
      return;
    }

    if (!form.branchId && branches.length > 0) {
      setErrorMessage('Vui lòng chọn chi nhánh cho bàn.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      await onSaveTable({
        id: form.id || undefined,
        restaurantId: activeRestaurantId,
        branchId: form.branchId || activeBranchId,
        tableNumber,
        qrCodeToken,
        status: form.status,
      });
      resetForm();
      await onReloadTables();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu bàn/QR. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (table: RestaurantTable) => {
    Alert.alert(
      'Xóa bàn?',
      `Bạn muốn xóa ${table.tableNumber}? QR của bàn này sẽ không dùng được nữa.`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void onDeleteTable(table.id)
              .then(onReloadTables)
              .catch(error => {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : 'Không thể xóa bàn. Vui lòng thử lại.',
                );
              });
          },
        },
      ],
    );
  };

  const handleQuickStatus = async (
    table: RestaurantTable,
    status: RestaurantTableStatus,
  ) => {
    setErrorMessage('');
    try {
      await onSaveTable({
        id: table.id,
        restaurantId: table.restaurantId,
        branchId: table.branchId,
        tableNumber: table.tableNumber,
        qrCodeToken: table.qrCodeToken,
        status,
      });
      await onReloadTables();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể đổi trạng thái bàn. Vui lòng thử lại.',
      );
    }
  };

  return (
    <RNView>
      <RNView style={styles.sectionHeader}>
        <RNView style={styles.sectionTitleBlock}>
          <RNText style={styles.sectionTitle}>Quản lý bàn / QR</RNText>
          <RNText style={styles.sectionHint}>
            Tạo bàn, gắn chi nhánh, khóa/ẩn QR khi cần. Khách quét QR chỉ vào
            đúng bàn và nhà hàng hiện tại.
          </RNText>
        </RNView>
        <RNView style={styles.sectionHeaderActions}>
          <Pressable
            onPress={() => void onReloadTables()}
            style={styles.headerSecondaryButton}>
            <RNText style={styles.headerSecondaryButtonText}>Làm mới</RNText>
          </Pressable>
          <Pressable onPress={resetForm} style={styles.primaryButton}>
            <RNText style={styles.primaryButtonText}>Tạo bàn mới</RNText>
          </Pressable>
        </RNView>
      </RNView>

      <RNView style={styles.tableManagerPanel}>
        <RNText style={styles.inputLabel}>
          {form.id ? 'Sửa bàn / QR' : 'Thêm bàn mới'}
        </RNText>
        <RNView style={styles.tableFormGrid}>
          <RNView style={styles.tableFormColumn}>
            <RNText style={styles.inputLabel}>Số bàn</RNText>
            <TextInput
              value={form.tableNumber}
              onChangeText={value => patchForm({tableNumber: value})}
              placeholder="Ví dụ: HDL 01"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.adminInput}
              allowFontScaling={false}
            />
          </RNView>

          <RNView style={styles.tableFormColumn}>
            <RNText style={styles.inputLabel}>QR token</RNText>
            <TextInput
              value={form.qrCodeToken}
              onChangeText={value => patchForm({qrCodeToken: normaliseToken(value)})}
              placeholder="Tự tạo nếu để trống"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="none"
              style={styles.adminInput}
              allowFontScaling={false}
            />
          </RNView>
        </RNView>

        <RNText style={styles.inputLabel}>Chi nhánh</RNText>
        <RNView style={styles.categoryPickerWrap}>
          {branches.map(branch => {
            const active = form.branchId === branch.id;
            return (
              <Pressable
                key={branch.id}
                onPress={() => patchForm({branchId: branch.id})}
                style={[
                  styles.categoryPickChip,
                  active ? styles.categoryPickChipActive : null,
                ]}>
                <RNText
                  style={[
                    styles.categoryPickText,
                    active ? styles.categoryPickTextActive : null,
                  ]}>
                  {branch.name}
                </RNText>
              </Pressable>
            );
          })}
        </RNView>

        <RNText style={styles.inputLabel}>Trạng thái bàn</RNText>
        <RNView style={styles.categoryPickerWrap}>
          {STATUS_OPTIONS.map(option => {
            const active = form.status === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => patchForm({status: option.value})}
                style={[
                  styles.categoryPickChip,
                  active ? styles.categoryPickChipActive : null,
                ]}>
                <RNText
                  style={[
                    styles.categoryPickText,
                    active ? styles.categoryPickTextActive : null,
                  ]}>
                  {option.label}
                </RNText>
              </Pressable>
            );
          })}
        </RNView>

        {errorMessage ? (
          <RNText style={styles.formError}>{errorMessage}</RNText>
        ) : null}

        <RNView style={styles.editModalFooter}>
          <Pressable onPress={resetForm} style={styles.cancelButton}>
            <RNText style={styles.cancelButtonText}>Hủy nhập</RNText>
          </Pressable>
          <Pressable
            disabled={saving}
            onPress={() => void handleSave()}
            style={[styles.saveButton, saving ? styles.disabledButton : null]}>
            <RNText style={styles.saveButtonText}>
              {saving ? 'Đang lưu...' : form.id ? 'Lưu bàn' : 'Tạo bàn'}
            </RNText>
          </Pressable>
        </RNView>
      </RNView>

      <RNView style={styles.filterWrap}>
        <Pressable
          onPress={() => setFilter('ACTIVE_BRANCH')}
          style={[
            styles.filterChip,
            filter === 'ACTIVE_BRANCH' ? styles.filterChipActive : null,
          ]}>
          <RNText
            style={[
              styles.filterText,
              filter === 'ACTIVE_BRANCH' ? styles.filterTextActive : null,
            ]}>
            Chi nhánh hiện tại
          </RNText>
        </Pressable>
        <Pressable
          onPress={() => setFilter('ALL')}
          style={[
            styles.filterChip,
            filter === 'ALL' ? styles.filterChipActive : null,
          ]}>
          <RNText
            style={[
              styles.filterText,
              filter === 'ALL' ? styles.filterTextActive : null,
            ]}>
            Tất cả bàn
          </RNText>
        </Pressable>
      </RNView>

      {visibleTables.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>▦</RNText>
          <RNText style={styles.emptyText}>Chưa có bàn/QR</RNText>
          <RNText style={styles.emptySubText}>
            Tạo bàn đầu tiên để in QR và cho khách gọi món đúng ngữ cảnh.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.tableGrid}>
          {visibleTables.map(table => (
            <RNView key={table.id} style={styles.tableCard}>
              <RNView style={styles.orderHeader}>
                <RNView style={styles.orderTitleBlock}>
                  <RNText style={styles.orderCode}>Bàn / QR</RNText>
                  <RNText style={styles.orderTable}>{table.tableNumber}</RNText>
                  <RNText style={styles.orderTime}>
                    {branchNameById[table.branchId || ''] || 'Chưa gắn chi nhánh'}
                  </RNText>
                </RNView>
                <RNView style={styles.orderBadgeColumn}>
                  <RNView style={styles.badge}>
                    <RNText style={styles.badgeText}>
                      {getStatusLabel(table.status)}
                    </RNText>
                  </RNView>
                </RNView>
              </RNView>

              <RNView style={styles.qrTokenBox}>
                <RNText style={styles.qrTokenLabel}>QR token</RNText>
                <RNText selectable style={styles.qrTokenValue}>
                  {table.qrCodeToken}
                </RNText>
              </RNView>

              <RNText style={styles.actionLabel}>Đổi nhanh trạng thái</RNText>
              <RNView style={styles.actionChipWrap}>
                {STATUS_OPTIONS.map(option => {
                  const active = table.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => void handleQuickStatus(table, option.value)}
                      style={[
                        styles.actionChip,
                        active ? styles.actionChipActive : null,
                      ]}>
                      <RNText
                        style={[
                          styles.actionChipText,
                          active ? styles.actionChipTextActive : null,
                        ]}>
                        {option.label}
                      </RNText>
                    </Pressable>
                  );
                })}
              </RNView>

              <RNView style={styles.tableCardActions}>
                <Pressable
                  onPress={() => startEdit(table)}
                  style={[styles.secondaryButton, styles.tableActionButton]}>
                  <RNText style={styles.secondaryButtonText}>Sửa</RNText>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(table)}
                  style={[styles.dangerButton, styles.tableActionButton]}>
                  <RNText style={styles.dangerButtonText}>Xóa</RNText>
                </Pressable>
              </RNView>
            </RNView>
          ))}
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminTablesScreen);
