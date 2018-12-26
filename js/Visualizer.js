export class Visualizer {
    constructor(audioContext) {
        this.waveformOverTimeCanvas = document.querySelector('#waveformOverTime');
        this.frequencyDomainCanvas = document.querySelector('#frequencyDomain');
        this.waveformCanvas = document.querySelector('#waveform');
        this.onAmplitudeChange = () => { };
        this.timeData = {
            time: Date.now(),
            timeScale: 60000,
            lastTimeX: 0,
            timeMax: 0,
            timeMin: 0,
            pausedTime: 0
        };
        this._paused = false;
        this._currentAmplitude = 0;
        this.waveformOverTimeCtx = this.waveformOverTimeCanvas.getContext('2d');
        this.frequencyDomainCtx = this.frequencyDomainCanvas.getContext('2d');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        this.analyser = audioContext.createAnalyser();
        // The analyser will always be
        // the last device before the destination
        this.analyser.connect(audioContext.destination);
        this.timeSmoothing = 0.5;
        this.frequencyBinCount = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(this.frequencyBinCount);
        this.waveformData = new Uint8Array(this.frequencyBinCount);
        const { width, height } = this.waveformCanvas.getBoundingClientRect();
        this.canvasProperties = {
            height: height,
            width: width,
            frequencyBarWidth: width / this.frequencyBinCount
        };
        // Update size of canvases
        this.waveformOverTimeCanvas.width = this.canvasProperties.width;
        this.waveformOverTimeCanvas.height = this.canvasProperties.height;
        this.frequencyDomainCanvas.width = this.canvasProperties.width;
        this.frequencyDomainCanvas.height = this.canvasProperties.height;
        this.waveformCanvas.width = this.canvasProperties.width;
        this.waveformCanvas.height = this.canvasProperties.height;
        // Colors
        const frequencyGrd = this.frequencyDomainCtx.createLinearGradient(0, 0, 0, this.canvasProperties.height);
        frequencyGrd.addColorStop(0, 'rgb(255, 0, 0)');
        frequencyGrd.addColorStop(1, 'rgb(0,255,100)');
        const waveformGrd = this.waveformCtx.createLinearGradient(0, 0, 0, this.canvasProperties.height);
        waveformGrd.addColorStop(0, 'rgb(255, 0, 0)');
        waveformGrd.addColorStop(0.5, 'rgb(0,255,100)');
        waveformGrd.addColorStop(1, 'rgb(255, 0, 0)');
        // Apply colors and line styles
        this.waveformOverTimeCtx.fillStyle = waveformGrd;
        this.frequencyDomainCtx.fillStyle = frequencyGrd;
        this.frequencyDomainCtx.lineJoin = 'round';
        this.frequencyDomainCtx.lineCap = 'round';
        this.waveformCtx.strokeStyle = waveformGrd;
        this.waveformCtx.lineJoin = 'round';
        this.waveformCtx.lineCap = 'round';
        this.render();
    }
    get paused() {
        return this._paused;
    }
    set paused(v) {
        this._paused = v;
        if (v)
            this.timeData.pausedTime = Date.now();
        else {
            this.timeData.time += Date.now() - this.timeData.pausedTime;
            this.render();
        }
    }
    get currentAmplitude() {
        return this._currentAmplitude;
    }
    set currentAmplitude(v) {
        this._currentAmplitude = v;
        this.onAmplitudeChange(v);
    }
    get timeSmoothing() {
        return this.analyser.smoothingTimeConstant;
    }
    set timeSmoothing(v) {
        this.analyser.smoothingTimeConstant = v;
    }
    get input() {
        return this.analyser;
    }
    get output() {
        return this.analyser;
    }
    clearAllCanvases() {
        this.frequencyDomainCtx.clearRect(0, 0, this.canvasProperties.width, this.canvasProperties.height);
        this.waveformCtx.clearRect(0, 0, this.canvasProperties.width, this.canvasProperties.height);
        this.waveformOverTimeCtx.clearRect(0, 0, this.canvasProperties.width, this.canvasProperties.height);
        this.timeData.time = Date.now();
        this.timeData.lastTimeX = 0;
    }
    render() {
        if (this.paused)
            return;
        this.analyser.getByteTimeDomainData(this.waveformData);
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.frequencyDomainCtx.clearRect(0, 0, this.canvasProperties.width, this.canvasProperties.height);
        this.waveformCtx.clearRect(0, 0, this.canvasProperties.width, this.canvasProperties.height);
        this.frequencyDomainCtx.beginPath();
        this.waveformCtx.beginPath();
        this.frequencyDomainCtx.moveTo(0, this.canvasProperties.height);
        let timeX = ((Date.now() - this.timeData.time) / this.timeData.timeScale) * this.canvasProperties.width, timeWidth = timeX - this.timeData.lastTimeX;
        this.waveformOverTimeCtx.fillRect(this.timeData.lastTimeX, this.timeData.timeMin, timeWidth, this.timeData.timeMax - this.timeData.timeMin);
        this.timeData.lastTimeX = timeX;
        // Display the waveform one frame behind to set widths properly.
        this.timeData.timeMax = Math.max.apply(null, this.waveformData) / 255 * this.canvasProperties.height;
        this.timeData.timeMin = Math.min.apply(null, this.waveformData) / 255 * this.canvasProperties.height;
        let frequencyXOffset = 0;
        let avg = 0, avgNum = 0;
        let barHeight, barYOffset;
        for (let i = 0; i < this.frequencyBinCount; i++) {
            barHeight = this.frequencyData[i] / 255 * this.canvasProperties.height;
            barYOffset = this.canvasProperties.height - barHeight;
            this.frequencyDomainCtx.lineTo(frequencyXOffset, barYOffset);
            let y = this.waveformData[i] / 255 * this.canvasProperties.height;
            if (i === 0) {
                this.waveformCtx.moveTo(frequencyXOffset, y);
            }
            else {
                this.waveformCtx.lineTo(frequencyXOffset, y);
            }
            frequencyXOffset += this.canvasProperties.frequencyBarWidth;
            // if (i <= 100)
            if (this.frequencyData[i] !== 0) {
                avg += this.frequencyData[i];
                avgNum++;
            }
        }
        this.currentAmplitude = avg / avgNum / 255;
        if (timeX > this.canvasProperties.width)
            this.clearAllCanvases();
        this.frequencyDomainCtx.lineTo(this.canvasProperties.width, this.canvasProperties.height);
        this.frequencyDomainCtx.closePath();
        this.frequencyDomainCtx.fill();
        this.waveformCtx.lineTo(this.canvasProperties.width, this.canvasProperties.height / 2);
        this.waveformCtx.stroke();
        requestAnimationFrame(() => this.render());
    }
}
//# sourceMappingURL=visualizer.js.map