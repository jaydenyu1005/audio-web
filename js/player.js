/* ============================================================
   高市 · 播放器公共脚本  (song1.html ~ song6.html 共用)
   功能：播放/暂停、自定义进度条(含安卓触摸拖动)、时间显示
   进度条为纯 div 实现，不依赖原生 range，安卓拖动稳定
   ============================================================ */
(function () {
  var audio = document.getElementById('audio');
  if (!audio) return;

  var playBtn = document.getElementById('playBtn');
  var progress = document.getElementById('progress');
  var progressFill = document.getElementById('progressFill');
  var progressThumb = document.getElementById('progressThumb');
  var currentTime = document.getElementById('current');
  var totalTime = document.getElementById('total');

  var duration = 0;      // 歌曲总时长（秒）
  var scrubbing = false; // 是否正在拖动

  function fmt(s) {
    s = Math.floor(s || 0);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // 根据当前播放时间刷新进度条位置
  function updateBar() {
    if (duration <= 0) return;
    var pct = (audio.currentTime / duration) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressThumb) progressThumb.style.left = pct + '%';
  }

  // 元数据加载完成：记录总时长
  audio.addEventListener('loadedmetadata', function () {
    duration = audio.duration || 0;
    totalTime.textContent = fmt(duration);
    updateBar();
  });

  // 播放中实时刷新（拖动期间不抢位置）
  audio.addEventListener('timeupdate', function () {
    currentTime.textContent = fmt(audio.currentTime);
    if (!scrubbing) updateBar();
  });

  // 播放结束复位
  audio.addEventListener('ended', function () {
    playBtn.textContent = '▶';
    audio.currentTime = 0;
    currentTime.textContent = '0:00';
    updateBar();
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

  // 根据手指/鼠标横坐标跳转
  function seekFromX(x) {
    if (!progress) return;
    var rect = progress.getBoundingClientRect();
    if (rect.width <= 0) return;
    var ratio = (x - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    if (duration > 0) {
      audio.currentTime = ratio * duration;
      currentTime.textContent = fmt(audio.currentTime);
      updateBar();
    } else {
      // 尚未拿到时长，先只移动显示位置
      if (progressFill) progressFill.style.width = (ratio * 100) + '%';
      if (progressThumb) progressThumb.style.left = (ratio * 100) + '%';
    }
  }

  // ---- 指针事件（安卓/桌面统一） ----
  progress.addEventListener('pointerdown', function (e) {
    scrubbing = true;
    if (progress.setPointerCapture) {
      try { progress.setPointerCapture(e.pointerId); } catch (err) {}
    }
    seekFromX(e.clientX);
  });
  progress.addEventListener('pointermove', function (e) {
    if (scrubbing) seekFromX(e.clientX);
  });
  progress.addEventListener('pointerup', function (e) {
    scrubbing = false;
    seekFromX(e.clientX);
  });
  progress.addEventListener('pointercancel', function () {
    scrubbing = false;
  });

  // ---- 兼容旧版安卓 WebView 的触摸事件 ----
  progress.addEventListener('touchstart', function (e) {
    scrubbing = true;
    if (e.touches && e.touches[0]) seekFromX(e.touches[0].clientX);
  }, { passive: true });
  progress.addEventListener('touchmove', function (e) {
    if (scrubbing && e.touches && e.touches[0]) seekFromX(e.touches[0].clientX);
  }, { passive: true });
  progress.addEventListener('touchend', function () {
    scrubbing = false;
  }, { passive: true });
})();
