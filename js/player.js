/* ============================================================
   高市 · 播放器公共脚本  (song1.html ~ song6.html 共用)
   功能：播放/暂停、自定义进度条(含安卓触摸拖动)、时间显示
   关键：
   1) 拖动时只更新UI动画，松手后才真正跳转音频一次；
   2) 缓存进度条尺寸 + requestAnimationFrame 按帧更新，减少安卓卡顿。
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

  var duration = 0;       // 歌曲总时长（秒）
  var scrubbing = false;  // 是否正在拖动
  var barLeft = 0, barWidth = 0;  // 缓存的进度条几何位置
  var rafPending = false; // 是否已有待执行的动画帧

  function fmt(s) {
    s = Math.floor(s || 0);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // 刷新进度条显示（无动画帧批处理版，供时间更新用）
  function updateBar() {
    if (duration <= 0) return;
    var pct = (audio.currentTime / duration) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressThumb) progressThumb.style.left = pct + '%';
  }

  // 缓存进度条的位置与宽度（拖动开始和窗口变化时刷新）
  function cacheBarRect() {
    if (!progress) return;
    var rect = progress.getBoundingClientRect();
    barLeft = rect.left;
    barWidth = rect.width;
  }
  window.addEventListener('resize', cacheBarRect);

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

  // 根据缓存的几何位置计算横坐标对应的百分比(0~1)
  function ratioFromX(x) {
    if (barWidth <= 0) return 0;
    var r = (x - barLeft) / barWidth;
    return Math.max(0, Math.min(1, r));
  }

  // 移动UI动画（按帧批处理，减少安卓卡顿）
  function moveBarUI(ratio) {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (progressFill) progressFill.style.width = (ratio * 100) + '%';
      if (progressThumb) progressThumb.style.left = (ratio * 100) + '%';
      if (duration > 0) {
        currentTime.textContent = fmt(ratio * duration);
      }
    });
  }

  // 真正跳转音频（点击 / 松手时调用）
  function seekAudio(x) {
    var ratio = ratioFromX(x);
    moveBarUI(ratio);
    if (duration > 0) {
      audio.currentTime = ratio * duration;
      currentTime.textContent = fmt(audio.currentTime);
    }
  }

  // ---- 指针事件（安卓/桌面统一） ----
  progress.addEventListener('pointerdown', function (e) {
    scrubbing = true;
    cacheBarRect();
    if (progress.setPointerCapture) {
      try { progress.setPointerCapture(e.pointerId); } catch (err) {}
    }
    seekAudio(e.clientX);            // 点一下就立刻跳
  });
  progress.addEventListener('pointermove', function (e) {
    if (scrubbing) moveBarUI(ratioFromX(e.clientX));  // 拖动：只动动画
  });
  progress.addEventListener('pointerup', function (e) {
    scrubbing = false;
    seekAudio(e.clientX);            // 松手：真正跳转一次
  });
  progress.addEventListener('pointercancel', function () {
    scrubbing = false;
    updateBar();
  });

  // ---- 兼容旧版安卓 WebView 的触摸事件 ----
  progress.addEventListener('touchstart', function (e) {
    scrubbing = true;
    cacheBarRect();
    if (e.touches && e.touches[0]) seekAudio(e.touches[0].clientX);
  }, { passive: true });
  progress.addEventListener('touchmove', function (e) {
    if (scrubbing && e.touches && e.touches[0]) moveBarUI(ratioFromX(e.touches[0].clientX));
  }, { passive: true });
  progress.addEventListener('touchend', function (e) {
    scrubbing = false;
    var x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
    if (x !== null) seekAudio(x);
  }, { passive: true });
})();
