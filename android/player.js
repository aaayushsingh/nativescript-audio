import { Application, Observable, Utils } from '@nativescript/core';
import { resolveAudioFilePath } from '../common';
import { AudioPlayerEvents } from '../options';
export var AudioFocusDurationHint;
(function (AudioFocusDurationHint) {
    AudioFocusDurationHint[AudioFocusDurationHint["AUDIOFOCUS_GAIN"] = android.media.AudioManager.AUDIOFOCUS_GAIN] = "AUDIOFOCUS_GAIN";
    AudioFocusDurationHint[AudioFocusDurationHint["AUDIOFOCUS_GAIN_TRANSIENT"] = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT] = "AUDIOFOCUS_GAIN_TRANSIENT";
    AudioFocusDurationHint[AudioFocusDurationHint["AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK"] = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK] = "AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK";
    AudioFocusDurationHint[AudioFocusDurationHint["AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE"] = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK] = "AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE";
})(AudioFocusDurationHint || (AudioFocusDurationHint = {}));
export class TNSPlayer {
    constructor(durationHint = AudioFocusDurationHint.AUDIOFOCUS_GAIN) {
        this._mAudioFocusGranted = false;
        this._mOnAudioFocusChangeListener = new android.media.AudioManager.OnAudioFocusChangeListener({
            onAudioFocusChange: (focusChange) => {
                switch (focusChange) {
                    case android.media.AudioManager.AUDIOFOCUS_GAIN:
                        if (this._lastPlayerVolume && this._lastPlayerVolume >= 10) {
                            this.volume = 1.0;
                        }
                        else if (this._lastPlayerVolume) {
                            this.volume = parseFloat('0.' + this._lastPlayerVolume.toString());
                        }
                        this.resume();
                        break;
                    case android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT:
                        break;
                    case android.media.AudioManager.AUDIOFOCUS_LOSS:
                        this.pause();
                        break;
                    case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                        this.pause();
                        break;
                    case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                        this._lastPlayerVolume = this.volume;
                        this.volume = 0.2;
                        break;
                }
            }
        });
        this._durationHint = durationHint;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            const playbackAttributes = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            this._audioFocusRequest = new android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(this._mOnAudioFocusChangeListener)
                .build();
        }
    }
    get events() {
        if (!this._events) {
            this._events = new Observable();
        }
        return this._events;
    }
    get android() {
        return this._player;
    }
    get volume() {
        const ctx = this._getAndroidContext();
        const mgr = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
        return mgr.getStreamVolume(android.media.AudioManager.STREAM_MUSIC);
    }
    set volume(value) {
        if (this._player && value >= 0) {
            this._player.setVolume(value, value);
        }
    }
    get duration() {
        if (this._player) {
            return this._player.getDuration();
        }
        else {
            return 0;
        }
    }
    get currentTime() {
        return this._player ? this._player.getCurrentPosition() : 0;
    }
    initFromFile(options) {
        return new Promise((resolve, reject) => {
            options.autoPlay = false;
            this.playFromFile(options).then(resolve, reject);
        });
    }
    playFromFile(options) {
        return new Promise((resolve, reject) => {
            try {
                this._options = options;
                if (options.autoPlay !== false) {
                    options.autoPlay = true;
                }
                if (!options.audioMixing) {
                    this._mAudioFocusGranted = this._requestAudioFocus();
                }
                const audioPath = resolveAudioFilePath(options.audioFile);
                this._player.setAudioStreamType(android.media.AudioManager.STREAM_MUSIC);
                this._player.reset();
                this._player.setDataSource(audioPath);
                if (Utils.isFileOrResourcePath(audioPath)) {
                    this._player.prepare();
                }
                else {
                    this._player.prepareAsync();
                }
                if (options.infoCallback) {
                    this._player.setOnInfoListener(new android.media.MediaPlayer.OnInfoListener({
                        onInfo: (player, info, extra) => {
                            options.infoCallback({ player, info, extra });
                            return true;
                        }
                    }));
                }
                this._player.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener({
                    onPrepared: mp => {
                        if (options.autoPlay) {
                            this.play();
                        }
                        resolve(null);
                    }
                }));
            }
            catch (ex) {
                this._abandonAudioFocus();
                reject(ex);
            }
        });
    }
    initFromUrl(options) {
        return new Promise((resolve, reject) => {
            options.autoPlay = false;
            this.playFromUrl(options).then(resolve, reject);
        });
    }
    playFromUrl(options) {
        return new Promise((resolve, reject) => {
            resolve(this.playFromFile(options));
        });
    }
    pause() {
        return new Promise((resolve, reject) => {
            try {
                if (this._player && this._player.isPlaying()) {
                    this._player.pause();
                    this._abandonAudioFocus(true);
                    this._sendEvent(AudioPlayerEvents.paused);
                }
                resolve(true);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    play() {
        return new Promise((resolve, reject) => {
            try {
                console.log('player play()');
                if (this._player && !this._player.isPlaying()) {
                    this._mAudioFocusGranted = this._requestAudioFocus();
                    if (!this._mAudioFocusGranted) {
                        throw new Error('Could not request audio focus');
                    }
                    this._sendEvent(AudioPlayerEvents.started);
                    Application.android.foregroundActivity.setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);
                    Application.android.registerBroadcastReceiver(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY, (context, intent) => {
                        this.pause();
                    });
                    this._player.start();
                }
                resolve(true);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    resume() {
        if (this._player) {
            this.play();
            this._sendEvent(AudioPlayerEvents.started);
        }
    }
    seekTo(time) {
        return new Promise((resolve, reject) => {
            try {
                if (this._player) {
                    time = time * 1000;
                    this._player.seekTo(time);
                    this._sendEvent(AudioPlayerEvents.seek);
                }
                resolve(true);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    changePlayerSpeed(speed) {
        var _a, _b;
        if (android.os.Build.VERSION.SDK_INT >= 23 && this.play) {
            if ((_a = this._player) === null || _a === void 0 ? void 0 : _a.isPlaying()) {
                this._player.setPlaybackParams(this._player.getPlaybackParams().setSpeed(speed));
            }
            else {
                this._player.setPlaybackParams(this._player.getPlaybackParams().setSpeed(speed));
                (_b = this._player) === null || _b === void 0 ? void 0 : _b.pause();
            }
        }
        else {
            console.warn('Android device API is not 23+. Cannot set the playbackRate on lower Android APIs.');
        }
    }
    dispose() {
        return new Promise((resolve, reject) => {
            try {
                if (this._player) {
                    this._player.stop();
                    this._player.reset();
                    this._options = undefined;
                    Application.android.unregisterBroadcastReceiver(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY);
                    this._abandonAudioFocus();
                }
                resolve(null);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    isAudioPlaying() {
        if (this._player) {
            return this._player.isPlaying();
        }
        else {
            return false;
        }
    }
    getAudioTrackDuration() {
        return new Promise((resolve, reject) => {
            try {
                const duration = this._player ? this._player.getDuration() : 0;
                resolve(duration.toString());
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    _sendEvent(eventName, data) {
        if (this.events) {
            this.events.notify({
                eventName,
                object: this,
                data: data
            });
        }
    }
    _requestAudioFocus() {
        let result = true;
        let focusResult = null;
        if (!this._mAudioFocusGranted) {
            const ctx = this._getAndroidContext();
            const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                focusResult = am.requestAudioFocus(this._audioFocusRequest);
            }
            else {
                focusResult = am.requestAudioFocus(this._mOnAudioFocusChangeListener, android.media.AudioManager.STREAM_MUSIC, this._durationHint);
            }
            if (focusResult === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                result = true;
            }
            else {
                result = false;
            }
        }
        return result;
    }
    _abandonAudioFocus(preserveMP = false) {
        const ctx = this._getAndroidContext();
        const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
        let result = null;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            console.log('abandonAudioFocusRequest...', this._audioFocusRequest);
            result = am.abandonAudioFocusRequest(this._audioFocusRequest);
            console.log('abandonAudioFocusRequest...result...', result);
        }
        else {
            console.log('abandonAudioFocus...', this._mOnAudioFocusChangeListener);
            result = am.abandonAudioFocus(this._mOnAudioFocusChangeListener);
        }
        if (this._mediaPlayer && !preserveMP) {
            this._mediaPlayer.release();
            this._mediaPlayer = undefined;
        }
        if (result === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            this._mAudioFocusGranted = false;
        }
        else {
            console.log('Failed to abandon audio focus.');
        }
        this._mOnAudioFocusChangeListener = null;
    }
    _getAndroidContext() {
        let ctx = Application.android.context;
        if (!ctx) {
            ctx = Application.getNativeApplication().getApplicationContext();
        }
        if (ctx === null) {
            setTimeout(() => {
                this._getAndroidContext();
            }, 200);
            return;
        }
        return ctx;
    }
    get _player() {
        if (!this._mediaPlayer && this._options) {
            this._mediaPlayer = new android.media.MediaPlayer();
            this._mediaPlayer.setOnCompletionListener(new android.media.MediaPlayer.OnCompletionListener({
                onCompletion: mp => {
                    if (this._options && this._options.completeCallback) {
                        if (this._options.loop === true) {
                            mp.seekTo(5);
                            mp.start();
                        }
                        this._options.completeCallback({ player: mp });
                    }
                    if (this._options && !this._options.loop) {
                        this._abandonAudioFocus();
                    }
                }
            }));
            this._mediaPlayer.setOnErrorListener(new android.media.MediaPlayer.OnErrorListener({
                onError: (player, error, extra) => {
                    if (this._options && this._options.errorCallback) {
                        this._options.errorCallback({ player, error, extra });
                    }
                    this.dispose();
                    return true;
                }
            }));
        }
        return this._mediaPlayer;
    }
}
//# sourceMappingURL=player.js.map