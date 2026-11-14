// QoL extensions: add inside the existing Venus bootstrap closure.
// Reply Timestamp decorates only the displayed quoted reply, never its source message.
function venusQolReplyDate(message) {
    if (!message || !message.id) return "";
    let time = message.timestamp;
    if (time && typeof time === "object" && typeof time.toDate === "function") time = time.toDate();
    let date = time instanceof Date ? time : typeof time === "number" || typeof time === "string" &&
        !/^\d{17,20}$/.test(time) ? new Date(time) : null;
    if ((!date || !Number.isFinite(date.getTime())) && /^\d{17,20}$/.test(String(message.id))) {
        try {
            const epoch = Math.floor(Number(String(message.id)) / 4194304) + 1420070400000;
            if (Number.isFinite(epoch)) date = new Date(epoch);
        } catch (_) {}
    }
    if (!date || !Number.isFinite(date.getTime())) return "";
    return date.toLocaleString(undefined, {dateStyle:"short", timeStyle:"short"});
}
function venusQolReplyTimestamp(message) {
    if (!enabled("replyTimestamp") || !message || !message.referencedMessage || !message.referencedMessage.message)
        return message;
    const quote = message.referencedMessage.message, stamp = venusQolReplyDate(quote);
    if (!stamp) return message;
    const content = typeof quote.content === "string" ? quote.content : "";
    const next = Object.assign({}, quote, {content:(content ? content + "  " : "") + "· " + stamp});
    return Object.assign({}, message, {referencedMessage:Object.assign({}, message.referencedMessage, {message:next})});
}
function venusQolDescriptionsSheet(orig, self, args) {
    const tree = orig.apply(self, args), props = args[0], message = props && props.message;
    if (!enabled("imageDescriptions") || !React || !tree || !message || !Array.isArray(message.attachments)) return tree;
    const texts = message.attachments.filter(a => a && venusQolImage(a) &&
        typeof a.description === "string" && a.description.trim()).slice(0, 8)
        .map(a => (a.filename || "Image") + ": " + a.description.trim());
    if (!texts.length) return tree;
    return sheetAddRow(tree, props, "venus-image-descriptions", tr("Image descriptions"),
        venusIcon(12003, "FileIcon"), () =>
            showProblem("Image descriptions", texts.join("\n\n").slice(0, 5000)));
}
function venusQolCachedMessages(channelId) {
    const store = msgStore || inspectedExport(5532, "default");
    if (!store || typeof store.getMessages !== "function") return [];
    let collection;
    try { collection = store.getMessages(channelId); } catch (_) { return []; }
    const values = collection && (Array.isArray(collection._array) ? collection._array :
        typeof collection.toArray === "function" ? collection.toArray() : null);
    if (!Array.isArray(values)) return [];
    return values.filter(m => m && typeof m.content === "string" && m.content.trim() && m.type !== 1)
        .slice(-12).map(m => ({
            id:String(m.id || ""), author:String(m.author && (m.author.globalName || m.author.username) || "User"),
            content:m.content.slice(0, 500)
        }));
}
function VenusQolChannelPreview(props) {
    const ui = reviewUI(), Sheet = ui.ActionSheet || RN.View, rows = venusQolCachedMessages(props.channelId);
    const header = ui.Header ? el(ui.Header, {title:tr("Channel preview"), trailing:ui.Close ?
        el(ui.Close, {onPress:() => hideReviewSheet(ui, props.sheetKey)}) : undefined}) : undefined;
    const body = rows.length ? rows.map(m => el(RN.View, {key:m.id, style:{
        paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#33363a"}},
        el(RN.Text,{style:{fontWeight:"600",color:"#e9eaf0",marginBottom:4}},m.author),
        el(RN.Text,{style:{color:"#c6c9d0"}},m.content))) :
        el(RN.Text,{style:{color:"#9ba0a9",padding:20}},tr("No cached messages. Open this channel first to load them."));
    const content = el(RN.View,{style:{paddingBottom:24}},body);
    return el(Sheet,{header,scrollable:true},RN.ScrollView ?
        el(RN.ScrollView,{style:{maxHeight:480}},content) : content);
}
function venusQolOpenChannelPreview(id) {
    if (!React || !RN) return;
    const ui = reviewUI();
    if (typeof ui.showSheet !== "function" || !ui.ActionSheet) {
        reviewToast(ui, "Channel preview unavailable", venusIcon(6573, "CircleXIcon")); return;
    }
    const sheetKey = "VenusQolChannelPreview:" + id;
    try { ui.showSheet({key:sheetKey,content:el(VenusQolChannelPreview,{channelId:id,sheetKey}),stackingBehavior:"stack"}); }
    catch (_) { reviewToast(ui, "Channel preview unavailable", venusIcon(6573, "CircleXIcon")); }
}
function venusQolChannelPreviewHook(sheetKeyForId) {
    return sheetInnerHook((tree, props) => {
        if (!enabled("channelPreview") || !React || !tree || !props) return tree;
        const channel = props.channel || props.thread || props.post;
        const id = String(props.channelId || channel && channel.id || "");
        if (!/^\d{17,20}$/.test(id)) return tree;
        return sheetAddRow(tree,props,"venus-channel-preview",tr("Preview cached messages"),
            venusIcon(8490,"AtIcon"),()=>venusQolOpenChannelPreview(id),sheetKeyForId(id));
    });
}
const venusQolChannelMenu = venusQolChannelPreviewHook(id=>"ChannelLongPress-"+id);
const venusQolThreadMenu = venusQolChannelPreviewHook(()=>"ThreadLongPressActionSheet");
const venusQolPostMenu = venusQolChannelPreviewHook(()=>"ForumPostLongPressActionSheet");
