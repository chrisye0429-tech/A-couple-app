import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JournalPage } from './types';

const JOURNAL_PAGE_STORAGE_KEY = 'couple-journal:local-page';

export async function loadLocalJournalPage() {
  const rawPage = await AsyncStorage.getItem(JOURNAL_PAGE_STORAGE_KEY);

  if (!rawPage) {
    return null;
  }

  return JSON.parse(rawPage) as JournalPage;
}

export async function saveLocalJournalPage(page: JournalPage) {
  await AsyncStorage.setItem(JOURNAL_PAGE_STORAGE_KEY, JSON.stringify(page));
}
