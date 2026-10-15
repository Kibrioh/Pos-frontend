import { tabId } from "../utils/id.js";

export const initialTabsState = {
  tabs: [],
  activeTabId: null,
};

export function tabsReducer(state, action) {
  switch (action.type) {
    case "ADD_TAB": {
      const newTab = {
        id: action.tab?.id ?? tabId(),
        name:
          action.tab?.name ??
          `Tab ${state.tabs.length + 1}`,
        items: action.tab?.items ?? [],
        createdAt:
          action.tab?.createdAt ?? Date.now(),
      };

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
    }

    case "SET_ACTIVE_TAB":
      return {
        ...state,
        activeTabId: action.id,
      };

    case "UPDATE_TAB":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.id
            ? {
                ...tab,
                ...action.updates,
              }
            : tab
        ),
      };

    case "SET_TAB_ITEMS":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.id
            ? {
                ...tab,
                items: action.items ?? [],
              }
            : tab
        ),
      };

    case "REMOVE_TAB": {
      const remainingTabs = state.tabs.filter(
        (tab) => tab.id !== action.id
      );

      let activeTabId = state.activeTabId;

      if (activeTabId === action.id) {
        activeTabId =
          remainingTabs.length > 0
            ? remainingTabs[remainingTabs.length - 1].id
            : null;
      }

      return {
        ...state,
        tabs: remainingTabs,
        activeTabId,
      };
    }

    case "CLEAR_TABS":
      return initialTabsState;

    default:
      return state;
  }
}
