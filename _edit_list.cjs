const fs = require('fs');
const f = 'src/screens/functions/ErrandListScreen.tsx';
let s = fs.readFileSync(f, 'utf8');

// 1. Add useState
s = s.replace(
  "import React, { useCallback, useEffect } from 'react';",
  "import React, { useCallback, useEffect, useState } from 'react';"
);

// 2. Add Modal
s = s.replace(
  "  SafeAreaView,\n} from 'react-native';",
  "  SafeAreaView,\n  Modal,\n} from 'react-native';"
);

// 3. Add icons
s = s.replace(
  "  ForwardIcon,\n} from '../../components/common/icons';",
  "  ForwardIcon,\n  ImageIcon,\n  EditIcon,\n  BarChartIcon,\n  ChevronRightIcon,\n  CloseIcon,\n} from '../../components/common/icons';"
);

// 4. Add state + handler after handleDmPoster closing
s = s.replace(
  "    [navigation]\n  );\n\n  const renderItem",
  `    [navigation]
  );

  const [shareSheetItem, setShareSheetItem] = useState<Errand | null>(null);

  const handleShareToForum = useCallback(
    (type: 'text' | 'image' | 'poll') => {
      if (!shareSheetItem) return;
      setShareSheetItem(null);
      navigation.getParent()?.navigate('ForumTab', {
        screen: 'Compose',
        params: { type, functionType: 'errand', functionTitle: shareSheetItem.title },
      });
    },
    [navigation, shareSheetItem]
  );

  const renderItem`
);

// 5. Replace forward navigation
s = s.replace(
  "onPress={() => navigation.navigate('ErrandShare', { taskName: item.title })}",
  "onPress={() => setShareSheetItem(item)}"
);

// 6. Add modal before </SafeAreaView>
const modalJsx = `
      {/* Share Type Sheet */}
      <Modal
        visible={!!shareSheetItem}
        transparent
        animationType="slide"
        onRequestClose={() => setShareSheetItem(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShareSheetItem(null)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('shareToForum')}</Text>
              <TouchableOpacity onPress={() => setShareSheetItem(null)}>
                <CloseIcon size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.composeOption} onPress={() => handleShareToForum('image')}>
              <View style={styles.composeOptionIcon}><ImageIcon size={24} color={colors.primary} /></View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('imagePost')}</Text>
                <Text style={styles.composeOptionDesc}>{t('imagePostDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composeOption} onPress={() => handleShareToForum('text')}>
              <View style={styles.composeOptionIcon}><EditIcon size={24} color={colors.primary} /></View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('textPost')}</Text>
                <Text style={styles.composeOptionDesc}>{t('textPostDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composeOption} onPress={() => handleShareToForum('poll')}>
              <View style={styles.composeOptionIcon}><BarChartIcon size={24} color={colors.primary} /></View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('poll')}</Text>
                <Text style={styles.composeOptionDesc}>{t('pollDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
`;
s = s.replace(
  "    </SafeAreaView>\n  );\n}",
  modalJsx + "    </SafeAreaView>\n  );\n}"
);

// 7. Add styles - use lastIndexOf to find the LAST }); which is the StyleSheet.create closing
const lastIdx = s.lastIndexOf('});');
if (lastIdx === -1) {
  console.error('Could not find closing }); for StyleSheet.create');
  process.exit(1);
}
const sheetStyles = `  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center' as const,
    marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  composeOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  composeOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.md,
  },
  composeOptionInfo: {
    flex: 1,
  },
  composeOptionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  composeOptionDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
`;
s = s.substring(0, lastIdx) + sheetStyles + s.substring(lastIdx);

fs.writeFileSync(f, s);
console.log('ErrandListScreen.tsx updated successfully');
console.log('New line count:', s.split('\n').length);
