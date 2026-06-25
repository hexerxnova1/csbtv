package com.alphatv.app;

import android.app.PictureInPictureParams;
import android.app.PendingIntent;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private boolean isVideoPlaying = false;

    private static final String ACTION_PREV = "com.alphatv.app.ACTION_PREV";
    private static final String ACTION_PLAY_PAUSE = "com.alphatv.app.ACTION_PLAY_PAUSE";
    private static final String ACTION_NEXT = "com.alphatv.app.ACTION_NEXT";

    private final BroadcastReceiver pipReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null || bridge == null || bridge.getWebView() == null) {
                return;
            }
            String action = intent.getAction();
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    if (ACTION_PREV.equals(action)) {
                        bridge.getWebView().evaluateJavascript("if(window.prevChannel){window.prevChannel();}", null);
                    } else if (ACTION_PLAY_PAUSE.equals(action)) {
                        bridge.getWebView().evaluateJavascript("if(window.togglePlay){window.togglePlay();}", null);
                    } else if (ACTION_NEXT.equals(action)) {
                        bridge.getWebView().evaluateJavascript("if(window.nextChannel){window.nextChannel();}", null);
                    }
                }
            });
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Use the display cutout (notch/punch hole) area to prevent white letterboxes on the side
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        applySystemUiVisibility(getResources().getConfiguration().orientation);

        // Register PiP control receiver
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PREV);
        filter.addAction(ACTION_PLAY_PAUSE);
        filter.addAction(ACTION_NEXT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(pipReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(pipReceiver, filter);
        }

        // Add Javascript Interface for PiP state tracking
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setVideoPlaying(boolean playing) {
                    isVideoPlaying = playing;
                    updatePiPParams();
                }
            }, "AndroidPiP");
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(pipReceiver);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode()) {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().onResume();
            }
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemUiVisibility(newConfig.orientation);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applySystemUiVisibility(getResources().getConfiguration().orientation);
        }
    }

    private PictureInPictureParams getPiPParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Rational aspectRatio = new Rational(16, 9);
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                .setAspectRatio(aspectRatio);

            List<RemoteAction> actions = new ArrayList<>();
            int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            Intent prevIntent = new Intent(ACTION_PREV);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(this, 1, prevIntent, pendingIntentFlags);
            Icon prevIcon = Icon.createWithResource(this, R.drawable.ic_prev);
            actions.add(new RemoteAction(prevIcon, "Previous Channel", "Previous Channel", prevPendingIntent));

            Intent playPauseIntent = new Intent(ACTION_PLAY_PAUSE);
            PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(this, 2, playPauseIntent, pendingIntentFlags);
            Icon playPauseIcon = Icon.createWithResource(this, isVideoPlaying ? R.drawable.ic_pause : R.drawable.ic_play);
            String playPauseTitle = isVideoPlaying ? "Pause" : "Play";
            actions.add(new RemoteAction(playPauseIcon, playPauseTitle, playPauseTitle, playPausePendingIntent));

            Intent nextIntent = new Intent(ACTION_NEXT);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(this, 3, nextIntent, pendingIntentFlags);
            Icon nextIcon = Icon.createWithResource(this, R.drawable.ic_next);
            actions.add(new RemoteAction(nextIcon, "Next Channel", "Next Channel", nextPendingIntent));

            builder.setActions(actions);
            return builder.build();
        }
        return null;
    }

    private void updatePiPParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = getPiPParams();
                if (params != null) {
                    setPictureInPictureParams(params);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isVideoPlaying && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = getPiPParams();
                if (params != null) {
                    enterPictureInPictureMode(params);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            // Force orientation back to portrait to exit fullscreen
            setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            
            // Allow sensor orientation again after 1 second so auto-rotate still works
            getWindow().getDecorView().postDelayed(new Runnable() {
                @Override
                public void run() {
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                }
            }, 1000);
        } else if (isVideoPlaying && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = getPiPParams();
                if (params != null) {
                    enterPictureInPictureMode(params);
                }
            } catch (Exception e) {
                e.printStackTrace();
                super.onBackPressed();
            }
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onPictureInPictureModeChanged(final boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    bridge.getWebView().evaluateJavascript(
                        "if(window.onPiPModeChanged){window.onPiPModeChanged(" + isInPictureInPictureMode + ");}", 
                        null
                    );
                }
            });
        }
    }

    private void applySystemUiVisibility(int orientation) {
        if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
            // Hide both Status Bar (Notification Bar) and Navigation Bar (Home/Back/Menu)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
        } else {
            // Restore System Bars in Portrait mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_VISIBLE
                );
            }
        }
    }
}
