# Venus QoL development status

Target: Venus-Patches 1.21.1, Discord Android 351.11 (HBC98).

## Source integrated into `bootstrap.js`

Five selectable Morphe patches are registered in `DiscordPatches.kt`:

1. **Reverse image search:** opens TinEye for a Discord image attachment. The URL is disclosed to TinEye.
2. **Copy file contents:** copies small text attachments (at most 256 KiB) to the Android clipboard.
3. **Reply timestamp:** appends the original reply's date/time to the displayed quoted message only.
4. **Image descriptions:** shows supplied attachment descriptions/alt text from the message hold menu.
5. **Channel preview:** previews up to 12 *already cached* messages from a channel/thread/post menu, without requesting new messages.

The new hooks are maintained in:
- `patches/src/main/resources/venus/qol_menu_hooks.js`
- `patches/src/main/resources/venus/qol_more_hooks.js`

The integration scripts and workflow:
- `scripts/integrate_qol.py`
- `scripts/integrate_qol_more.py`
- `.github/workflows/integrate-qol.yml`

Both scripts are idempotent. The workflow has applied both transformations to the real `bootstrap.js`, and verified JavaScript syntax with the runtime's `/*__FEATURES__*/` placeholder replaced by `{}`.

**Not yet tested on Discord Android.** Passing a syntax/build check does not establish runtime stability, cache access, or visual correctness. The feature list is opt-in and defaults to off.

## Still requested, not yet implemented

Custom Rich Presence, Message Link Embeds, Edit Attachments, Message Preview, Better Search, Call Timer, Who Reacted, Better Friend List, Edit Users Locally, Notification Sounds, GIF/Sticker Paste, More Quick Reactions, Permissions Viewer, Favorite Emoji First, Recent Profile Pictures, Better DM Pins, Channel Browser, Forward Favorites and any others from prior research.

Custom Rich Presence specifically requires a separately validated mechanism for updating the user's Discord presence. Displaying an activity locally is not the same as publishing a Rich Presence visible to others.

Do not publish these functions as fully supported until the Morphe build and real Android tests pass.
