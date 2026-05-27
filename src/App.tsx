import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from './theme';
import { EditorScreen } from './features/journalEditor/EditorScreen';

type ScreenKey = 'home' | 'folders' | 'editor' | 'share';

type NavItem = {
  key: ScreenKey;
  label: string;
};

type Folder = {
  id: string;
  name: string;
  count: number;
  color: string;
};

const navItems: NavItem[] = [
  { key: 'home', label: '首页' },
  { key: 'folders', label: '文件夹' },
  { key: 'editor', label: '手账' },
  { key: 'share', label: '共享' },
];

const recentPages = [
  { title: '周末约会', folder: '五月日常', time: '今天 20:18' },
  { title: '一起做晚饭', folder: '生活碎片', time: '昨天 22:06' },
];

const initialFolders: Folder[] = [
  { id: 'folder-may', name: '五月日常', count: 8, color: colors.primarySoft },
  { id: 'folder-trip', name: '旅行计划', count: 3, color: colors.accentSoft },
  { id: 'folder-anniversary', name: '纪念日', count: 5, color: colors.warmSoft },
];

export default function CoupleJournalApp() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('home');
  const [folders, setFolders] = useState<Folder[]>(initialFolders);

  const title = useMemo(() => {
    const current = navItems.find((item) => item.key === activeScreen);
    return current?.label ?? '首页';
  }, [activeScreen]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.appShell}>
          {activeScreen !== 'editor' ? (
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>情侣互动手账</Text>
                <Text style={styles.headerTitle}>{title}</Text>
              </View>
              <View style={styles.themePill}>
                <Text style={styles.themeText}>樱粉</Text>
              </View>
            </View>
          ) : null}

          {activeScreen === 'editor' ? (
            <View style={[styles.editorContent, styles.editorContentFullScreen]}>
              <EditorScreen onBackHome={() => setActiveScreen('home')} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {activeScreen === 'home' ? (
                <HomeScreen folderCount={folders.length} onNavigate={setActiveScreen} />
              ) : null}
              {activeScreen === 'folders' ? (
                <FoldersScreen folders={folders} onChangeFolders={setFolders} />
              ) : null}
              {activeScreen === 'share' ? <ShareScreen /> : null}
            </ScrollView>
          )}

          {activeScreen !== 'editor' ? (
            <View style={styles.bottomNav}>
              {navItems.map((item) => {
                const isActive = item.key === activeScreen;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setActiveScreen(item.key)}
                    style={[styles.navButton, isActive ? styles.navButtonActive : null]}
                  >
                    <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function HomeScreen({
  folderCount,
  onNavigate,
}: {
  folderCount: number;
  onNavigate: (screen: ScreenKey) => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>今天也一起记录一点点</Text>
        <Text style={styles.heroText}>8 页手账 · {folderCount} 个文件夹 · 1 位共同编辑者</Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={() => onNavigate('editor')}>
            <Text style={styles.primaryButtonText}>新建手账</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => onNavigate('folders')}>
            <Text style={styles.secondaryButtonText}>查看文件夹</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle title="最近编辑" />
      {recentPages.map((page) => (
        <View key={page.title} style={styles.listItem}>
          <View style={styles.pageThumbnail}>
            <View style={styles.thumbnailLine} />
            <View style={styles.thumbnailDot} />
          </View>
          <View style={styles.listText}>
            <Text style={styles.itemTitle}>{page.title}</Text>
            <Text style={styles.itemMeta}>{page.folder}</Text>
          </View>
          <Text style={styles.itemTime}>{page.time}</Text>
        </View>
      ))}
    </View>
  );
}

function FoldersScreen({
  folders,
  onChangeFolders,
}: {
  folders: Folder[];
  onChangeFolders: (folders: Folder[]) => void;
}) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const handleCreateFolder = () => {
    const nextFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: `新文件夹 ${folders.length + 1}`,
      count: 0,
      color: [colors.primarySoft, colors.accentSoft, colors.warmSoft][folders.length % 3],
    };

    onChangeFolders([...folders, nextFolder]);
    setEditingFolderId(nextFolder.id);
    setDraftName(nextFolder.name);
  };

  const handleStartRename = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setDraftName(folder.name);
  };

  const handleSaveRename = (folderId: string) => {
    const nextName = draftName.trim();

    if (!nextName) {
      return;
    }

    onChangeFolders(
      folders.map((folder) =>
        folder.id === folderId
          ? {
              ...folder,
              name: nextName,
            }
          : folder,
      ),
    );
    setEditingFolderId(null);
    setDraftName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    onChangeFolders(folders.filter((folder) => folder.id !== folderId));

    if (editingFolderId === folderId) {
      setEditingFolderId(null);
      setDraftName('');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbarRow}>
        <SectionTitle title="手账文件夹" />
        <Pressable style={styles.smallButton} onPress={handleCreateFolder}>
          <Text style={styles.smallButtonText}>新建</Text>
        </Pressable>
      </View>

      {folders.map((folder) => (
        <View key={folder.id} style={styles.folderRow}>
          <View style={[styles.folderCover, { backgroundColor: folder.color }]}>
            <View style={styles.folderTab} />
          </View>
          <View style={styles.listText}>
            {editingFolderId === folder.id ? (
              <TextInput
                autoFocus
                onChangeText={setDraftName}
                onSubmitEditing={() => handleSaveRename(folder.id)}
                placeholder="输入文件夹名称"
                placeholderTextColor={colors.mutedText}
                returnKeyType="done"
                style={styles.folderInput}
                value={draftName}
              />
            ) : (
              <Text style={styles.itemTitle}>{folder.name}</Text>
            )}
            <Text style={styles.itemMeta}>{folder.count} 页手账</Text>
          </View>
          <View style={styles.folderActions}>
            {editingFolderId === folder.id ? (
              <Pressable style={styles.folderActionButton} onPress={() => handleSaveRename(folder.id)}>
                <Text style={styles.folderActionText}>保存</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.folderActionButton} onPress={() => handleStartRename(folder)}>
                <Text style={styles.folderActionText}>重命名</Text>
              </Pressable>
            )}
            <Pressable style={styles.folderDeleteButton} onPress={() => handleDeleteFolder(folder.id)}>
              <Text style={styles.folderDeleteText}>删除</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function ShareScreen() {
  return (
    <View style={styles.screen}>
      <SectionTitle title="情侣共享" />
      <View style={styles.sharePanel}>
        <Text style={styles.shareLabel}>情侣邀请码</Text>
        <Text style={styles.inviteCode}>A7K2-LOVE</Text>
      </View>

      <View style={styles.sharePanel}>
        <Text style={styles.shareLabel}>只读分享链接</Text>
        <Text style={styles.shareLink}>couple.app/share/may-journal</Text>
      </View>

      <View style={styles.permissionRow}>
        <View style={styles.permissionPill}>
          <Text style={styles.permissionText}>情侣可编辑</Text>
        </View>
        <View style={styles.permissionPillMuted}>
          <Text style={styles.permissionTextMuted}>访客只读</Text>
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  themePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  themeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 92,
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  editorContentFullScreen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  screen: {
    gap: 16,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroText: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flex: 1,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  listItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  pageThumbnail: {
    backgroundColor: colors.warmSoft,
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    padding: 10,
    width: 46,
  },
  thumbnailLine: {
    backgroundColor: colors.warm,
    borderRadius: 2,
    height: 5,
    width: 22,
  },
  thumbnailDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    marginTop: 9,
    width: 10,
  },
  listText: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  itemMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  itemTime: {
    color: colors.mutedText,
    fontSize: 12,
  },
  toolbarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  folderRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  folderCover: {
    borderRadius: 8,
    height: 52,
    width: 64,
  },
  folderTab: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 8,
    height: 16,
    width: 34,
  },
  folderInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  folderActions: {
    gap: 8,
    minWidth: 74,
  },
  folderActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  folderActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  folderDeleteButton: {
    alignItems: 'center',
    backgroundColor: colors.warmSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  folderDeleteText: {
    color: colors.warm,
    fontSize: 12,
    fontWeight: '800',
  },
  canvas: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 420,
    overflow: 'hidden',
    padding: 18,
  },
  paperLine: {
    backgroundColor: colors.primarySoft,
    height: 1,
    marginTop: 54,
  },
  paperLineShort: {
    width: '72%',
  },
  photoBlock: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    left: 26,
    position: 'absolute',
    top: 36,
    transform: [{ rotate: '-4deg' }],
    width: 128,
  },
  photoText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  textBlock: {
    backgroundColor: colors.warmSoft,
    borderRadius: 8,
    bottom: 48,
    gap: 8,
    padding: 14,
    position: 'absolute',
    right: 24,
    width: 180,
  },
  textBlockTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  textBlockBody: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  sticker: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: 34,
    top: 82,
    transform: [{ rotate: '8deg' }],
    width: 64,
  },
  stickerText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '47%',
    paddingVertical: 14,
  },
  toolButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sharePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  shareLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  inviteCode: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  shareLink: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  permissionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  permissionPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permissionPillMuted: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permissionText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  permissionTextMuted: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  bottomNav: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    bottom: 18,
    flexDirection: 'row',
    gap: 6,
    left: 18,
    padding: 6,
    position: 'absolute',
    right: 18,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 11,
  },
  navButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  navLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
  },
  navLabelActive: {
    color: colors.primary,
  },
});
