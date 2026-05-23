# Deferred patches

These patches were authored against earlier versions of their target
packages and no longer apply cleanly after the Expo SDK 56 / RN 0.85
upgrade (2026-05-23). They're moved here so `patch-package` doesn't
abort `npm install`, but the underlying issues may still exist.

Re-verify each one against the new package version before reinstating
or retiring permanently.

## react-native+0.83.6.patch

**What it fixes:** `IntBufferBatchMountItem.toString()` produced an
unbounded string when crash reporters stringified large mount batches,
causing OOM-on-OOM crash spirals.

**Target:** RN 0.83.6 — now on 0.85.3. Need to inspect
`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/fabric/mounting/mountitems/IntBufferBatchMountItem.kt`
on 0.85.3 to see if the verbose `toString()` was fixed upstream.

## react-native-screens+4.24.0.patch

**What it fixes:**
1. Screen → fragmentWrapper retain cycle that kept destroyed
   ScreenFragments alive in Fabric's `mTagToViewState`
   (software-mansion/react-native-screens#3755).
2. `canNavigateBack` `check(container is ScreenStack)` crash on
   Android 16+ during fragment detach / re-parent races.
3. `ScreenStackHeaderConfig.onUpdate` null-stack short-circuit gap that
   surfaced via Play Console as a `canNavigateBack` crash.
4. Belt-and-braces `onDropViewInstance` cleanup of the
   Screen → fragmentWrapper cycle when Fabric drops the view without
   firing `onDestroy`.

**Target:** `react-native-screens` 4.24.0 — now on 4.25.2 (or whatever
SDK 56 pins). The patch's hunks no longer align cleanly; some of the
upstream lines have been edited around our changes. Manual rebase
required if Play Console reports any of the listed crash signatures
post-upgrade.
