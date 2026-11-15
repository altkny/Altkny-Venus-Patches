package app.venus.diag

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.os.UserManager
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject
import java.util.HashSet

/**
 * Opt-in foreground app matcher for Venus RPC.
 *
 * No accessibility service, installed-app enumeration, history persistence or
 * network calls. The caller supplies an allowlist of package IDs; every other
 * package name is discarded from the bridge result.
 */
object ForegroundApps {
    private var lastScan = 0L
    private var activePackage = ""
    private var activatedAt = 0L

    fun granted(context: Context): Boolean = try {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(),
            context.packageName) == AppOpsManager.MODE_ALLOWED
    } catch (_: Throwable) { false }

    fun permission(context: Context): String = JSONObject()
        .put("granted", granted(context)).toString()

    fun openSettings(context: Context): String {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return "opened"
    }

    private fun validPackage(text: String): Boolean {
        if (text.length < 3 || text.length > 128 || !text.contains('.')) return false
        for (c in text) {
            if (!(c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9' || c == '_' || c == '.'))
                return false
        }
        return true
    }

    @Synchronized
    fun foreground(context: Context, argument: String?): String {
        val result = JSONObject().put("granted", granted(context))
            .put("packageName", "").put("since", 0L)
        if (!granted(context)) return result.toString()
        val allowed = HashSet<String>()
        try {
            val names = JSONArray(argument ?: "[]")
            var i = 0
            while (i < names.length() && i < 64) {
                val name = names.optString(i, "")
                if (validPackage(name)) allowed.add(name)
                i++
            }
        } catch (_: Throwable) { return result.toString() }
        if (allowed.isEmpty()) return result.toString()
        return try {
            val user = context.getSystemService(Context.USER_SERVICE) as UserManager
            if (!user.isUserUnlocked) {
                activePackage = ""
                lastScan = 0L
                return result.toString()
            }
            val now = System.currentTimeMillis()
            // Initial scan is bounded; subsequent scans only inspect new events.
            val start = if (lastScan > 0L && now >= lastScan)
                Math.max(now - 120000L, lastScan - 1500L)
                else now - 1800000L
            val stats = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val stream = stats.queryEvents(start, now)
            if (stream != null) {
                val event = UsageEvents.Event()
                while (stream.hasNextEvent()) {
                    stream.getNextEvent(event)
                    val pkg = event.packageName ?: ""
                    when (event.eventType) {
                        UsageEvents.Event.ACTIVITY_RESUMED -> {
                            activePackage = pkg
                            activatedAt = event.timeStamp
                        }
                        UsageEvents.Event.ACTIVITY_PAUSED -> {
                            if (activePackage == pkg) activePackage = ""
                        }
                        UsageEvents.Event.SCREEN_NON_INTERACTIVE,
                        UsageEvents.Event.KEYGUARD_SHOWN -> activePackage = ""
                    }
                }
            }
            lastScan = now
            if (allowed.contains(activePackage) && activePackage != context.packageName) {
                result.put("packageName", activePackage)
                result.put("since", activatedAt)
            }
            result.toString()
        } catch (_: Throwable) {
            lastScan = 0L
            activePackage = ""
            result.toString()
        }
    }
}
