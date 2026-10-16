/* ============================================================
   高市 · 播放器公共脚本  (song1.html ~ song6.html 共用)
   功能：播放/暂停、进度条拖拽(含移动端)、当前时间/总时长显示
   ============================================================ */
(function () {
  var audio = document.getElementById('audio');
  if (!audio) return;

  var playBtn = document.getElementById('playBtn');
  var progress = document.getElementById('progress');
  var currentTime = document.getElementById('current');
  var totalTime = document.getElementById('total');

  // 标记是否正在拖动进度条：拖动期间暂停由 timeupdate 复位滑块，避免拖不动/回弹
  var scrubbing = false;

  function fmt(s) {
    s = Math.floor(s || 0);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // 元数据加载完成：设置进度条上限与总时长
  audio.addEventListener('loadedmetadata', function () {
    progress.max = Math.floor(audio.duration);
    totalTime.textContent = fmt(audio.duration);
  });

  // 播放中实时更新进度条与当前时间（拖动时只更新时间文字，不复位滑块）
  audio.addEventListener('timeupdate', function () {
    currentTime.textContent = fmt(audio.currentTime);
    if (!scrubbing) {
      progress.value = Math.floor(audio.currentTime);
    }
  });

  // 播放结束后复位
  audio.addEventListener('ended', function () {
    playBtn.textContent = '▶';
    progress.value = 0;
    currentTime.textContent = '0:00';
  });

  // 播放/暂停切换
  playBtn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '❚❚';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  function startScrub() { scrubbing = true; }

  function endScrub() {
    scrubbing = false;
    audio.currentTime = progress.value;
    currentTime.textContent = fmt(progress.value);
  }

  // 拖动进度条跳转（边拖边实时跳转，抬起后定格）
  progress.addEventListener('input', function () {
    currentTime.textContent = fmt(progress.value);
    audio.currentTime = progress.value;
  });

  // 指针事件：桌面鼠标 + 移动端触摸统一处理
  progress.addEventListener('pointerdown', startScrub);
  progress.addEventListener('pointerup', endScrub);
  progress.addEventListener('pointercancel', endScrub);

  // 兼容旧版移动端浏览器
  progress.addEventListener('touchstart', startScrub, { passive: true });
  progress.addEventListener('touchend', endScrub, { passive: true });
})();
