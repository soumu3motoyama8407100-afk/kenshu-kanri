import React from 'react'; 
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// PWA：Service Worker を登録し、新バージョンが出たら自動で最新に張り替える
// （施錠(RLS)後に古い版のままだとログインできないため、常に最新へ更新されるようにする）
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller; // 既に制御中＝再訪問
  let reloaded = false;
  // 新しいSWが有効化されたら（＝更新があったら）一度だけ再読込して最新版へ。初回訪問では再読込しない
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
      // 開いたまま放置でも新版を拾えるよう定期チェック
      setInterval(() => reg.update().catch(() => {}), 60 * 1000);
    }).catch(() => {});
  });
}
