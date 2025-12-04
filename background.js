// background.js

const OS_API_KEY = "Tu9FaiAaLkKAzsALV9DF9WIaouK8NLxp"; // your key

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // EXACT headers that worked in curl
  const COMMON_HEADERS = {
    "Api-Key": OS_API_KEY,
    "User-Agent": "SubtitleMaster v1.0.0",
    "Content-Type": "application/json"
  };

  // SEARCH SUBTITLES
  if (request.action === "searchSubtitles") {
    (async () => {
      try {
        const url =
          "https://api.opensubtitles.com/api/v1/subtitles" +
          `?languages=en&order_by=download_count&query=${encodeURIComponent(
            request.query
          )}`;

        const response = await fetch(url, {
          method: "GET",
          headers: COMMON_HEADERS
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("OpenSubtitles search error body:", body);
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const subtitles = Array.isArray(data.data) ? data.data : [];
        sendResponse({ subtitles });
      } catch (err) {
        console.error("Search error:", err);
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  // DOWNLOAD SUBTITLE
  if (request.action === "downloadSubtitle") {
    (async () => {
      try {
        const fileId = request.fileId;
        if (!fileId) throw new Error("No file_id provided");

        // Step 1: get download link (same headers as curl)
        const tokenResponse = await fetch(
          "https://api.opensubtitles.com/api/v1/download",
          {
            method: "POST",
            headers: COMMON_HEADERS,
            body: JSON.stringify({ file_id: fileId })
          }
        );

        if (!tokenResponse.ok) {
          const body = await tokenResponse.text();
          console.error("OpenSubtitles download token error body:", body);
          throw new Error(`Download token error: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData.link) throw new Error("No download link returned");

        // Step 2: fetch subtitle file
        const subtitleResponse = await fetch(tokenData.link);
        if (!subtitleResponse.ok) {
          throw new Error(`Subtitle file error: ${subtitleResponse.status}`);
        }

        const subtitleText = await subtitleResponse.text();

        // Step 3: trigger download
        const blob = new Blob([subtitleText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download(
          {
            url,
            filename: tokenData.file_name || `subtitle-${fileId}.srt`,
            saveAs: true
          },
          () => URL.revokeObjectURL(url)
        );

        sendResponse({ success: true });
      } catch (err) {
        console.error("Download error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
