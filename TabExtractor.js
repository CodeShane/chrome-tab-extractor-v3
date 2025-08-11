(() => {
  const queryInfo = { windowType: "normal" };

  const getMatchingTabs = async (text) => {
    if (!text) return [];
    const tabs = await chrome.tabs.query(queryInfo);
    const textLower = text.toLowerCase();
    return tabs.filter(tab =>
      (tab.url && tab.url.toLowerCase().includes(textLower)) ||
      (tab.title && tab.title.toLowerCase().includes(textLower))
    );
  };

  const getPinnedTabIDs = (tabs) =>
    tabs.filter(t => t.pinned).map(t => t.id);

  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const matchingTabs = await getMatchingTabs(text);
    const suggestionText = matchingTabs.length < 1
      ? "0 matching tabs. Try a different search or press Esc to cancel."
      : `${matchingTabs.length} matching tabs. Press Enter to move them to a new window.`;

    suggest([{ content: text, description: suggestionText }]);
  });

  chrome.omnibox.onInputEntered.addListener(async (text) => {
    const matchingTabs = await getMatchingTabs(text);
    if (matchingTabs.length > 0) {
      const newWindow = await chrome.windows.create({ type: "normal" });

      const pinnedTabIDs = getPinnedTabIDs(matchingTabs);
      await chrome.tabs.move(
        matchingTabs.map(t => t.id),
        { windowId: newWindow.id, index: -1 }
      );

      for (const id of pinnedTabIDs) {
        try {
          await chrome.tabs.update(id, { pinned: true });
        } catch (err) {
          // Ignore if tab disappeared
        }
      }

      // Remove the blank new tab Chrome creates by default
      const tabsInNewWindow = await chrome.tabs.query({ windowId: newWindow.id });
      if (tabsInNewWindow.length === 1 && tabsInNewWindow[0].url === "chrome://newtab/") {
        await chrome.tabs.remove(tabsInNewWindow[0].id);
      }
    }
  });
})();
