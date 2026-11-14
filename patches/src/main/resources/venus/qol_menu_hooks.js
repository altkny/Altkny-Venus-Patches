// Venus QoL experimental hooks for the existing 351.11 message action sheet.
// This file is intentionally not imported automatically. Integration into
// bootstrap.js and DiscordPatches.kt is required before the feature is usable.
const VENUS_QOL_TEXT_LIMIT = 262144;
function venusQolAttachment(message, predicate) {
    const items = message && message.attachments;
    return Array.isArray(items) ? items.find(a => a && predicate(a) &&
        typeof a.url === "string" && /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//i.test(a.url)) : null;
}
function venusQolImage(a) {
    return /^image\//i.test(a.content_type || "") ||
        /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(a.filename || "");
}
function venusQolText(a) {
    if (typeof a.size === "number" && a.size > VENUS_QOL_TEXT_LIMIT) return false;
    return /^(?:text\/|application\/(?:json|xml|javascript))/i.test(a.content_type || "") ||
        /\.(?:txt|json|md|csv|log|xml|js|ts|css|html|yml|yaml|ini|toml)$/i.test(a.filename || "");
}
function reverseImageSearchSheet(orig, self, args) {
    const tree = orig.apply(self, args), props = args[0];
    if (!enabled("reverseImageSearch") || !React || !tree) return tree;
    const a = venusQolAttachment(props && props.message, venusQolImage);
    if (!a) return tree;
    return sheetAddRow(tree, props, "venus-reverse-image-search", tr("Reverse image search"),
        venusIcon(13827, "ChatSmileIcon"), () => openLink("https://tineye.com/search?url=" + encodeURIComponent(a.url)));
}
function copyFileContentsSheet(orig, self, args) {
    const tree = orig.apply(self, args), props = args[0];
    if (!enabled("copyFileContents") || !React || !tree) return tree;
    const a = venusQolAttachment(props && props.message, venusQolText);
    if (!a) return tree;
    return sheetAddRow(tree, props, "venus-copy-file-contents", tr("Copy file contents"),
        venusIcon(5141, "CopyIcon"), () => {
            const ui = reviewUI(), clip = ui.clipboard || RN && RN.Clipboard;
            if (!clip || typeof clip.setString !== "function" || typeof fetch !== "function") return;
            Promise.resolve().then(() => fetch(a.url)).then(response => {
                if (!response || !response.ok) throw new Error("download failed");
                const n = Number(response.headers && response.headers.get && response.headers.get("content-length"));
                if (Number.isFinite(n) && n > VENUS_QOL_TEXT_LIMIT) throw new Error("too large");
                return response.text();
            }).then(value => {
                if (typeof value !== "string" || value.length > VENUS_QOL_TEXT_LIMIT) throw new Error("too large");
                clip.setString(value);
                reviewToast(ui, "File text copied", venusIcon(7144, "CircleCheckIcon"));
            }).catch(() => reviewToast(ui, "Couldn't copy this file", venusIcon(6573, "CircleXIcon")));
        });
}
