// 三国志英杰传重制版 - 主入口
// 使用全局 Phaser（通过 CDN 引入，无需 import）

const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0d1b2a',
  scene: [BootScene, TitleScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  // 关闭默认右键菜单
  input: {
    activePointers: 1,
  },
};

// 等待 DOM + Phaser 加载完毕
window.addEventListener('load', () => {
  // 隐藏加载画面
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
  new Phaser.Game(config);
});
