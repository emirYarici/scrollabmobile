package com.scrollabmobile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import java.net.URLEncoder
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "scrollabmobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    handleSendIntent(intent)
    super.onCreate(savedInstanceState)
  }

  override fun onNewIntent(intent: Intent) {
    handleSendIntent(intent)
    super.onNewIntent(intent)
  }

  private fun handleSendIntent(intent: Intent?) {
    if (intent != null && intent.action == Intent.ACTION_SEND && "text/plain" == intent.type) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (sharedText != null) {
        val url = extractUrl(sharedText)
        try {
          val encodedUrl = URLEncoder.encode(url, "UTF-8")
          intent.action = Intent.ACTION_VIEW
          intent.data = Uri.parse("scrollab://share?url=$encodedUrl")
        } catch (e: Exception) {
          e.printStackTrace()
        }
      }
    }
  }

  private fun extractUrl(text: String): String {
    val regex = "https?://[^\\s]+".toRegex()
    val match = regex.find(text)
    return match?.value ?: text
  }
}
