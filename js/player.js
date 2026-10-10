/* ============================================================
   高市 · 播放器公共脚本  (song1.html ~ song6.html 共用)
   功能：播放/暂停、进度条拖拽、当前时间/总时长显示
   ============================================================ */
(function () {
  var audio = document.getElementById('audio');
  if (!audio) return;

  var playBtn = document.getElementById('playBtn');
  var progress = document.getElementById('progress');
  var currentTime = document.getElementById('current');
  var totalTime = document.getElementById('total');

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

  // 播放中实时更新进度条与当前时间
  audio.addEventListener('timeupdate', function () {
    progress.value = Math.floor(audio.currentTime);
    currentTime.textContent = fmt(audio.currentTime);
  });

  // 播放结束后复位
  audio.addEventListener('ended', function () {
    playBtn.textContent = '▶';
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

  // 拖拽进度条跳转
  progress.addEventListener('input', function () {
    audio.currentTime = progress.value;
    currentTime.textContent = fmt(progress.value);
  });
})();
