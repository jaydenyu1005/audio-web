/* ============================================================
   高市 · 播放器公共脚本  (song1.html ~ song6.html 共用)
   功能：播放/暂停、自定义进度条(含安卓触摸拖动)、时间显示
   关键点：
   1) 拖动时只更新UI动画，松手后跳转音频一次；
   2) 若音频时长尚未就绪，先记录目标位置，时长就绪后自动补跳，
      解决安卓上"滑块能拖但声音不动"的问题；
   3) 兼容 Pointer / Touch / Mouse 三种输入。
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

  var duration = 0;        // 有效总时长（秒）
  var scrubbing = false;   // 是否正在拖动
  var pendingRatio = -1;   // 时长未就绪时暂存的目标比例
  var barLeft = 0, barWidth = 0;
  var rafPending = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // 返回有效的有限时长；异常(0/NaN/Infinity)返回 0
  function goodDuration() {
    return (isFinite(duration) && duration > 0) ? duration : 0;
  }

  function updateBar() {
    var d = goodDuration();
    if (d <= 0) return;
    var pct = (audio.currentTime / d) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressThumb) progressThumb.style.left = pct + '%';
  }

  function cacheBarRect() {
    if (!progress) return;
    var rect = progress.getBoundingClientRect();
    barLeft = rect.left;
    barWidth = rect.width;
  }
  window.addEventListener('resize', cacheBarRect);

  // 时长更新：loadedmetadata / durationchange 都处理
  function onDuration() {
    var d = audio.duration;
    if (isFinite(d) && d > 0) {
      duration = d;
      totalTime.textContent = fmt(d);
    }
    updateBar();
    applyPendingSeek();
  }
  audio.addEventListener('loadedmetadata', onDuration);
  audio.addEventListener('durationchange', onDuration);

  // 若时长已就绪且有未完成的跳转，则补跳
  function applyPendingSeek() {
    var d = goodDuration();
    if (pendingRatio >= 0 && d > 0) {
      var target = pendingRatio * d;
      pendingRatio = -1;
      try { audio.currentTime = Math.min(target, d); } catch (err) {}
      currentTime.textContent = fmt(audio.currentTime);
      updateBar();
    }
  }

  // 播放中实时刷新（拖动期间不抢位置）
  audio.addEventListener('timeupdate', function () {
    currentTime.textContent = fmt(audio.currentTime);
    if (!scrubbing) updateBar();
  });

  audio.addEventListener('ended', function () {
    playBtn.textContent = '▶';
    audio.currentTime = 0;
    currentTime.textContent = '0:00';
    updateBar();
  });

  playBtn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '❚❚';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  function ratioFromX(x) {
    if (barWidth <= 0) return 0;
    var r = (x - barLeft) / barWidth;
    return Math.max(0, Math.min(1, r));
  }

  function moveBarUI(ratio) {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (progressFill) progressFill.style.width = (ratio * 100) + '%';
      if (progressThumb) progressThumb.style.left = (ratio * 100) + '%';
      var d = goodDuration();
      if (d > 0) currentTime.textContent = fmt(ratio * d);
    });
  }

  // 真正跳转音频：时长就绪则立即跳，否则暂存待时长就绪后补跳
  function seekAudio(x) {
    var ratio = ratioFromX(x);
    moveBarUI(ratio);
    var d = goodDuration();
    if (d > 0) {
      pendingRatio = -1;
      try { audio.currentTime = Math.min(ratio * d, d); } catch (err) {}
      currentTime.textContent = fmt(audio.currentTime);
      updateBar();
    } else {
      pendingRatio = ratio;   // 时长未就绪，记录目标
    }
  }

  // ---- 指针事件 ----
  progress.addEventListener('pointerdown', function (e) {
    scrubbing = true;
    cacheBarRect();
    if (progress.setPointerCapture) {
      try { progress.setPointerCapture(e.pointerId); } catch (err) {}
    }
    seekAudio(e.clientX);
  });
  progress.addEventListener('pointermove', function (e) {
    if (scrubbing) moveBarUI(ratioFromX(e.clientX));
  });
  progress.addEventListener('pointerup', function (e) {
    scrubbing = false;
    seekAudio(e.clientX);
  });
  progress.addEventListener('pointercancel', function () {
    scrubbing = false;
    updateBar();
  });

  // ---- 触摸事件：非被动 + preventDefault ----
  progress.addEventListener('touchstart', function (e) {
    if (e.cancelable) e.preventDefault();
    scrubbing = true;
    cacheBarRect();
    if (e.touches && e.touches[0]) seekAudio(e.touches[0].clientX);
  }, { passive: false });
  progress.addEventListener('touchmove', function (e) {
    if (!scrubbing) return;
    if (e.cancelable) e.preventDefault();
    if (e.touches && e.touches[0]) moveBarUI(ratioFromX(e.touches[0].clientX));
  }, { passive: false });
  progress.addEventListener('touchend', function (e) {
    if (e.cancelable) e.preventDefault();
    scrubbing = false;
    var x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
    if (x !== null) seekAudio(x);
  }, { passive: false });
  progress.addEventListener('touchcancel', function () {
    scrubbing = false;
    updateBar();
  }, { passive: false });

  // ---- 鼠标兜底（不支持 Pointer 的浏览器） ----
  if (!window.PointerEvent) {
    var mouseDown = false;
    progress.addEventListener('mousedown', function (e) {
      mouseDown = true;
      cacheBarRect();
      seekAudio(e.clientX);
    });
    progress.addEventListener('mousemove', function (e) {
      if (mouseDown) moveBarUI(ratioFromX(e.clientX));
    });
    progress.addEventListener('mouseup', function (e) {
      if (mouseDown) {
        mouseDown = false;
        seekAudio(e.clientX);
      }
    });
  }
})();
