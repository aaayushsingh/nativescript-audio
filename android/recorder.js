import { Application } from '@nativescript/core';
import { hasPermission, requestPermission } from 'nativescript-permissions';
export class TNSRecorder {
    get android() {
        return this._recorder;
    }
    static CAN_RECORD() {
        const pManager = Application.android.context.getPackageManager();
        const canRecord = pManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_MICROPHONE);
        if (canRecord) {
            return true;
        }
        else {
            return false;
        }
    }
    requestRecordPermission(explanation = '') {
        return new Promise(async (resolve, reject) => {
            try {
                await requestPermission(android.Manifest.permission.RECORD_AUDIO).catch(err => {
                    reject(err);
                });
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    hasRecordPermission() {
        const permission = hasPermission(android.Manifest.permission.RECORD_AUDIO);
        return !0 === permission ? !0 : !1;
    }
    start(options) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.requestRecordPermission().catch(err => {
                    console.log(err);
                    reject('Permission to record audio is not granted.');
                });
                if (this._recorder) {
                    this._recorder.reset();
                }
                else {
                    this._recorder = new android.media.MediaRecorder();
                }
                const audioSource = options.source ? options.source : 0;
                this._recorder.setAudioSource(audioSource);
                const outFormat = options.format ? options.format : 0;
                this._recorder.setOutputFormat(outFormat);
                const encoder = options.encoder ? options.encoder : 0;
                this._recorder.setAudioEncoder(encoder);
                if (options.channels) {
                    this._recorder.setAudioChannels(options.channels);
                }
                if (options.sampleRate) {
                    this._recorder.setAudioSamplingRate(options.sampleRate);
                }
                if (options.bitRate) {
                    this._recorder.setAudioEncodingBitRate(options.bitRate);
                }
                if (options.maxDuration) {
                    this._recorder.setMaxDuration(options.maxDuration);
                }
                this._recorder.setOutputFile(options.filename);
                this._recorder.setOnErrorListener(new android.media.MediaRecorder.OnErrorListener({
                    onError: (recorder, error, extra) => {
                        options.errorCallback({ recorder, error, extra });
                    }
                }));
                this._recorder.setOnInfoListener(new android.media.MediaRecorder.OnInfoListener({
                    onInfo: (recorder, info, extra) => {
                        options.infoCallback({ recorder, info, extra });
                    }
                }));
                this._recorder.prepare();
                this._recorder.start();
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    getMeters() {
        if (this._recorder != null)
            return this._recorder.getMaxAmplitude();
        else
            return 0;
    }
    pause() {
        return new Promise((resolve, reject) => {
            try {
                if (this._recorder) {
                    this._recorder.pause();
                }
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    resume() {
        return new Promise((resolve, reject) => {
            try {
                if (this._recorder) {
                    this._recorder.resume();
                }
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    stop() {
        return new Promise((resolve, reject) => {
            try {
                if (this._recorder) {
                    this._recorder.stop();
                }
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    dispose() {
        return new Promise((resolve, reject) => {
            try {
                if (this._recorder) {
                    this._recorder.release();
                }
                this._recorder = undefined;
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
}
//# sourceMappingURL=recorder.js.map