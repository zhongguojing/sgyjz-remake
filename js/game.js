// ============================================================
// 三国志英杰传 重制版 - 游戏主入口（模块化版 v0.3）
// 使用Lua翻译的战斗数据模块
// ============================================================

import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { BattleScene } from './scenes/BattleScene.js';

// Phaser配置
const GAME_W = 960;
const GAME_H = 640;

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0d1b2a',
  scene: [BootScene, TitleScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
  },
  input: {
    activePointers: 1,
  },
};

// 启动游戏
window.addEventListener('load', () => {
  // 更新加载进度条
  const ls = document.getElementById('loading-screen');
  if (ls) {
    const bar = ls.querySelector('#loading-bar');
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => {
        ls.style.display = 'none';
      }, 500);
    }
  }
  
  // 创建Phaser游戏实例
  new Phaser.Game(config);
});
