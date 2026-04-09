import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [url, setUrl] = useState('https://eazy-pay.vercel.app'); // Replace with your live URL or internal IP
  const [currentPath, setCurrentPath] = useState('/');

  // Handle Deep Links (from the Widget)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      let data = Linking.parse(event.url);
      console.log('Deep Link Received:', data);
      
      // If widget calls eazypay://quick-buy
      if (data.path === 'quick-buy') {
        setCurrentPath('/dashboard?action=quick-buy');
      }
      // If widget calls eazypay://ai-chat
      if (data.path === 'ai-chat') {
        setCurrentPath('/dashboard?action=ai-chat');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via a link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleDeepLink({ url: initialUrl });
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView 
        source={{ uri: `${url}${currentPath}` }} 
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});
