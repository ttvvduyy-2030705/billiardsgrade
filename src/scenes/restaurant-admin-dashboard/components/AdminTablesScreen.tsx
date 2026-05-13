import React, {memo, useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, TextInput, View as RNView} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import RNText from './AdminText';
import type {
  RestaurantBranch,
  RestaurantBranchStatus,
  RestaurantTable,
  RestaurantTableStatus,
} from 'services/restaurantMenuRepository';

type BranchQrFormState = {
  branchId: string;
  menuQrToken: string;
  status: RestaurantBranchStatus;
};

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
  onSaveBranchQr: (input: {
    id: string;
    restaurantId: string;
    name: string;
    address?: string;
    menuQrToken?: string;
    status?: RestaurantBranchStatus;
  }) => Promise<RestaurantBranch>;
  onReloadTables: () => Promise<void>;
};

type TableFilter = 'ACTIVE_BRANCH' | 'ALL';

const STATUS_OPTIONS: Array<{value: RestaurantTableStatus; label: string}> = [
  {value: 'AVAILABLE', label: 'Đang dùng'},
  {value: 'OCCUPIED', label: 'Có khách'},
  {value: 'LOCKED', label: 'Khóa đặt'},
  {value: 'HIDDEN', label: 'Ẩn bàn'},
];

const BRANCH_STATUS_OPTIONS: Array<{
  value: RestaurantBranchStatus;
  label: string;
  hint: string;
}> = [
  {value: 'ACTIVE', label: 'Đang mở', hint: 'Khách quét QR vào menu được'},
  {value: 'LOCKED', label: 'Khóa menu', hint: 'QR không mở menu/nhận đơn'},
  {value: 'HIDDEN', label: 'Ẩn QR', hint: 'Không dùng QR này cho khách'},
];

const getStatusLabel = (status?: RestaurantTableStatus) => {
  return (
    STATUS_OPTIONS.find(option => option.value === status)?.label || 'Đang dùng'
  );
};

const getBranchStatusLabel = (status?: RestaurantBranchStatus) => {
  return (
    BRANCH_STATUS_OPTIONS.find(option => option.value === status)?.label ||
    'Đang mở'
  );
};

const getBranchStatusHint = (status?: RestaurantBranchStatus) => {
  return (
    BRANCH_STATUS_OPTIONS.find(option => option.value === status)?.hint ||
    'Khách quét QR vào menu được'
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

const createBranchDraftToken = (branch?: RestaurantBranch) => {
  const branchKey = normaliseToken(branch?.name || branch?.id || 'chi_nhanh');
  const restaurantKey = normaliseToken(branch?.restaurantId || 'restaurant');
  return `qr_${restaurantKey}_${branchKey}_menu`;
};

const getQrPrintValue = (token: string) =>
  `scoremenu://menu?qrToken=${encodeURIComponent(token)}`;

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
  onSaveBranchQr,
  onReloadTables,
}: Props) => {
  const [form, setForm] = useState<TableFormState>(() =>
    emptyForm(activeBranchId),
  );
  const [filter, setFilter] = useState<TableFilter>('ACTIVE_BRANCH');
  const [saving, setSaving] = useState(false);
  const [savingBranchQr, setSavingBranchQr] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [branchQrMessage, setBranchQrMessage] = useState('');
  const [branchQrForm, setBranchQrForm] = useState<BranchQrFormState>(() => ({
    branchId: activeBranchId || branches[0]?.id || '',
    menuQrToken:
      branches.find(branch => branch.id === activeBranchId)?.menuQrToken ||
      branches[0]?.menuQrToken ||
      '',
    status:
      branches.find(branch => branch.id === activeBranchId)?.status ||
      branches[0]?.status ||
      'ACTIVE',
  }));

  const visibleTables = useMemo(() => {
    const scopedTables =
      filter === 'ACTIVE_BRANCH' && activeBranchId
        ? tables.filter(table => table.branchId === activeBranchId)
        : tables;

    return [...scopedTables].sort((a, b) =>
      String(a.tableNumber || '').localeCompare(
        String(b.tableNumber || ''),
        'vi',
      ),
    );
  }, [activeBranchId, filter, tables]);

  const branchNameById = useMemo(() => {
    return branches.reduce<Record<string, string>>((acc, branch) => {
      acc[branch.id] = branch.name;
      return acc;
    }, {});
  }, [branches]);

  const selectedBranch = useMemo(() => {
    return (
      branches.find(branch => branch.id === branchQrForm.branchId) ||
      branches.find(branch => branch.id === activeBranchId) ||
      branches[0]
    );
  }, [activeBranchId, branchQrForm.branchId, branches]);

  const selectedBranchMenuQrToken = (
    branchQrForm.menuQrToken ||
    selectedBranch?.menuQrToken ||
    createBranchDraftToken(selectedBranch)
  ).trim();
  const selectedBranchQrPrintValue = getQrPrintValue(selectedBranchMenuQrToken);

  useEffect(() => {
    const nextBranch =
      branches.find(branch => branch.id === activeBranchId) ||
      branches.find(branch => branch.id === branchQrForm.branchId) ||
      branches[0];

    if (!nextBranch) {
      return;
    }

    setBranchQrForm(current => {
      if (
        current.branchId === nextBranch.id &&
        current.menuQrToken === (nextBranch.menuQrToken || '') &&
        current.status === (nextBranch.status || 'ACTIVE')
      ) {
        return current;
      }

      return {
        branchId: nextBranch.id,
        menuQrToken:
          nextBranch.menuQrToken || createBranchDraftToken(nextBranch),
        status: nextBranch.status || 'ACTIVE',
      };
    });
  }, [activeBranchId, branchQrForm.branchId, branches]);

  const patchBranchQrForm = (next: Partial<BranchQrFormState>) => {
    setBranchQrMessage('');
    setBranchQrForm(current => ({...current, ...next}));
  };

  const selectBranchForQr = (branch: RestaurantBranch) => {
    setBranchQrMessage('');
    setBranchQrForm({
      branchId: branch.id,
      menuQrToken: branch.menuQrToken || createBranchDraftToken(branch),
      status: branch.status || 'ACTIVE',
    });
  };

  const handleSaveBranchQr = async () => {
    const targetBranch = selectedBranch;
    const menuQrToken = normaliseToken(selectedBranchMenuQrToken);

    if (!targetBranch) {
      setBranchQrMessage('Chưa có chi nhánh để lưu QR menu.');
      return;
    }

    if (!menuQrToken) {
      setBranchQrMessage('Vui lòng nhập QR token cho chi nhánh.');
      return;
    }

    setSavingBranchQr(true);
    setBranchQrMessage('');

    try {
      await onSaveBranchQr({
        id: targetBranch.id,
        restaurantId: targetBranch.restaurantId,
        name: targetBranch.name,
        address: targetBranch.address,
        menuQrToken,
        status: branchQrForm.status,
      });
      setBranchQrMessage(
        'Đã lưu QR menu chi nhánh. Khách quét QR này sẽ vào đúng menu chi nhánh.',
      );
      await onReloadTables();
    } catch (error) {
      setBranchQrMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu QR menu chi nhánh. Vui lòng thử lại.',
      );
    } finally {
      setSavingBranchQr(false);
    }
  };

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
    const qrCodeToken =
      form.qrCodeToken.trim() || createDraftToken(tableNumber);

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
            Quản lý QR menu của chi nhánh và danh sách bàn. Khách quét QR chi
            nhánh để vào menu, sau đó nhập/chọn số bàn trong giỏ hàng.
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

      <RNView style={styles.branchQrPanel}>
        <RNView style={styles.branchQrHeaderRow}>
          <RNView style={styles.sectionTitleBlock}>
            <RNText style={styles.branchQrEyebrow}>
              QR menu quán / chi nhánh
            </RNText>
            <RNText style={styles.branchQrTitle}>
              {selectedBranch?.name || 'Chưa có chi nhánh'}
            </RNText>
            <RNText style={styles.branchQrHint}>
              QR này dùng để mở menu của chi nhánh. Số bàn sẽ được khách nhập
              hoặc chọn trong giỏ hàng và được hệ thống kiểm tra trước khi tạo
              đơn.
            </RNText>
          </RNView>
          <RNView style={styles.branchQrStatusPill}>
            <RNText style={styles.branchQrStatusText}>
              {getBranchStatusLabel(branchQrForm.status)}
            </RNText>
          </RNView>
        </RNView>

        <RNText style={styles.inputLabel}>Chọn chi nhánh để lấy QR menu</RNText>
        <RNView style={styles.categoryPickerWrap}>
          {branches.map(branch => {
            const active = selectedBranch?.id === branch.id;
            return (
              <Pressable
                key={branch.id}
                onPress={() => selectBranchForQr(branch)}
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

        {selectedBranch ? (
          <RNView style={styles.branchQrColumns}>
            <RNView style={styles.branchQrPreviewCard}>
              <RNText style={styles.branchQrPreviewTitle}>
                Ảnh QR để in/dán
              </RNText>
              <RNView style={styles.branchQrCodeBox}>
                <QRCode value={selectedBranchQrPrintValue} size={148} />
              </RNView>
              <RNText selectable style={styles.qrTokenValue}>
                {selectedBranchMenuQrToken}
              </RNText>
              <RNText selectable style={styles.branchQrPrintUrl}>
                {selectedBranchQrPrintValue}
              </RNText>
            </RNView>

            <RNView style={styles.branchQrFormCard}>
              <RNText style={styles.inputLabel}>QR token chi nhánh</RNText>
              <TextInput
                value={branchQrForm.menuQrToken}
                onChangeText={value =>
                  patchBranchQrForm({menuQrToken: normaliseToken(value)})
                }
                placeholder="qr_menu_chi_nhanh"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.adminInput}
                allowFontScaling={false}
              />

              <RNText style={styles.inputLabel}>Trạng thái QR chi nhánh</RNText>
              <RNView style={styles.categoryPickerWrap}>
                {BRANCH_STATUS_OPTIONS.map(option => {
                  const active = branchQrForm.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => patchBranchQrForm({status: option.value})}
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

              <RNText style={styles.branchQrStatusHint}>
                {getBranchStatusHint(branchQrForm.status)}
              </RNText>

              {branchQrMessage ? (
                <RNText style={styles.formError}>{branchQrMessage}</RNText>
              ) : null}

              <RNView style={styles.branchQrActions}>
                <Pressable
                  disabled={savingBranchQr}
                  onPress={() => void handleSaveBranchQr()}
                  style={[
                    styles.saveButton,
                    savingBranchQr ? styles.disabledButton : null,
                  ]}>
                  <RNText style={styles.saveButtonText}>
                    {savingBranchQr ? 'Đang lưu QR...' : 'Lưu QR chi nhánh'}
                  </RNText>
                </Pressable>
              </RNView>
            </RNView>
          </RNView>
        ) : (
          <RNText style={styles.workspaceEmptyText}>
            Chưa có chi nhánh để tạo QR menu.
          </RNText>
        )}
      </RNView>

      <RNView style={styles.tableManagerPanel}>
        <RNText style={styles.inputLabel}>
          {form.id ? 'Sửa bàn' : 'Thêm bàn mới'}
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
            <RNText style={styles.inputLabel}>QR bàn tùy chọn</RNText>
            <TextInput
              value={form.qrCodeToken}
              onChangeText={value =>
                patchForm({qrCodeToken: normaliseToken(value)})
              }
              placeholder="Tự tạo nếu để trống - không bắt buộc cho QR chi nhánh"
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
            Tạo bàn đầu tiên để khách chọn/nhập đúng số bàn khi gửi đơn.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.tableGrid}>
          {visibleTables.map(table => (
            <RNView key={table.id} style={styles.tableCard}>
              <RNView style={styles.orderHeader}>
                <RNView style={styles.orderTitleBlock}>
                  <RNText style={styles.orderCode}>Bàn trong chi nhánh</RNText>
                  <RNText style={styles.orderTable}>{table.tableNumber}</RNText>
                  <RNText style={styles.orderTime}>
                    {branchNameById[table.branchId || ''] ||
                      'Chưa gắn chi nhánh'}
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
                <RNText style={styles.qrTokenLabel}>QR bàn tùy chọn</RNText>
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
                      onPress={() =>
                        void handleQuickStatus(table, option.value)
                      }
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
