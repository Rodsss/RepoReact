chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_APP_WITH_TEXT') {
    const webAppUrl = "http://127.0.0.1:8000/";
    const urlWithText = new URL(webAppUrl);
    urlWithText.searchParams.set('text', request.text);

    chrome.tabs.create({ url: urlWithText.href });
    
    sendResponse({ success: true });
  }
  return true;
});