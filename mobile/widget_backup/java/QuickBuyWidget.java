package com.eazypay.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class QuickBuyWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quick_buy_widget);

        // Intent for Quick Buy
        Intent quickBuyIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("eazypay://quick-buy"));
        quickBuyIntent.setPackage(context.getPackageName());
        PendingIntent quickBuyPendingIntent = PendingIntent.getActivity(context, 0, quickBuyIntent, PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_quick_buy, quickBuyPendingIntent);

        // Intent for AI Chat
        Intent aiChatIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("eazypay://ai-chat"));
        aiChatIntent.setPackage(context.getPackageName());
        PendingIntent aiChatPendingIntent = PendingIntent.getActivity(context, 1, aiChatIntent, PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_ai_chat, aiChatPendingIntent);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}
