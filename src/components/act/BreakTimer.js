class BreakTimer {
  constructor() {
    this.isRunning = false;
    this.timerInterval = null;
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerType = 'timer'; // 'timer' или 'stopwatch'
    this.targetDuration = 15 * 60; // 15 минут по умолчанию для перерыва
    this.onComplete = null;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getDisplayTime() {
    if (this.timerType === 'stopwatch') {
      return this.formatTime(this.elapsedTime);
    } else {
      const remaining = Math.max(0, this.targetDuration - this.elapsedTime);
      return this.formatTime(remaining);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now() - (this.elapsedTime * 1000);
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      
      if (this.timerType === 'timer' && this.elapsedTime >= this.targetDuration) {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
        return;
      }
    }, 100);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  reset() {
    this.stop();
    this.elapsedTime = 0;
  }

  setTimerType(type) {
    this.timerType = type;
    if (type === 'stopwatch') {
      this.elapsedTime = 0;
    }
  }

  setDuration(seconds) {
    this.targetDuration = seconds;
    if (this.timerType === 'timer') {
      this.elapsedTime = 0;
    }
  }
}

export default BreakTimer;
