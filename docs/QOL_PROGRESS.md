# QoL patch development

This is the **Venus-Patches fork**, preserving the upstream Morphe project structure.

## Experimental source added

`patches/src/main/resources/venus/qol_menu_hooks.js`

- Reverse image search: a TinEye link for supported Discord image attachments.
- Copy file contents: fetch and copy a text attachment under 256 KiB.

**Status: source only.** These functions are **not yet enabled** or wired into `bootstrap.js` or `DiscordPatches.kt`, and no `.mpp` has been built or tested. The hook file intentionally does not execute by itself.

To integrate, use the existing message action sheet (module 9978), register two Morphe feature flags, add defaults and UI toggles, and include the hooks within the Venus bootstrap closure. Runtime behavior must be checked on Discord Android 351.11.

The requested Custom Rich Presence and other QoL features are not implemented yet. Do not present this as a completed feature release.
