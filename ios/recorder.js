import { Observable } from '@nativescript/core';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TNSRecorderDelegate = void 0;
var TNSRecorderDelegate = /** @class */ (function (_super) {
    __extends(TNSRecorderDelegate, _super);
    function TNSRecorderDelegate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TNSRecorderDelegate.initWithOwner = function (owner) {
        var delegate = TNSRecorderDelegate.new();
        delegate._owner = new WeakRef(owner);
        return delegate;
    };
    TNSRecorderDelegate.prototype.audioRecorderDidFinishRecording = function (recorder, success) {
        console.log("audioRecorderDidFinishRecording: " + success);
        var owner = this._owner.get();
        if (owner) {
            // owner.notify({
            //   eventName: 'RecorderFinished',
            // })
        }
    };
    TNSRecorderDelegate.prototype.audioRecorderDidFinishRecordingSuccessfully = function (recorder, flag) {
        console.log("audioRecorderDidFinishRecordingSuccessfully: " + flag);
        var owner = this._owner.get();
        if (owner) {
            // owner.notify({
            //   eventName: 'RecorderFinishedSuccessfully',
            // })
        }
    };
    TNSRecorderDelegate.ObjCProtocols = [AVAudioRecorderDelegate];
    return TNSRecorderDelegate;
}(NSObject));
exports.TNSRecorderDelegate = TNSRecorderDelegate;
export class TNSRecorder extends Observable {
    static CAN_RECORD() {
        return true;
    }
    get ios() {
        return this._recorder;
    }
    requestRecordPermission() {
        return new Promise((resolve, reject) => {
            this._recordingSession.requestRecordPermission((allowed) => {
                if (allowed) {
                    resolve(true);
                }
                else {
                    reject('Record permissions denied');
                }
            });
        });
    }
    start(options) {
        this._recorderOptions = options;
        return new Promise((resolve, reject) => {
            try {
                this._recordingSession = AVAudioSession.sharedInstance();
                let errorRef = new interop.Reference();
                this._recordingSession.setCategoryError(AVAudioSessionCategoryPlayAndRecord, errorRef);
                if (errorRef) {
                    console.error(`setCategoryError: ${errorRef.value}, ${errorRef}`);
                }
                this._recordingSession.setActiveError(true, null);
                this._recordingSession.requestRecordPermission((allowed) => {
                    if (allowed) {
                        const recordSetting = NSMutableDictionary.alloc().init();
                        if (options.format) {
                            recordSetting.setValueForKey(NSNumber.numberWithInt(options.format), 'AVFormatIDKey');
                        }
                        else {
                            recordSetting.setValueForKey(NSNumber.numberWithInt(kAudioFormatMPEG4AAC), 'AVFormatIDKey');
                        }
                        recordSetting.setValueForKey(NSNumber.numberWithInt(64), 'AVEncoderAudioQualityKey');
                        recordSetting.setValueForKey(NSNumber.numberWithFloat(16000.0), 'AVSampleRateKey');
                        recordSetting.setValueForKey(NSNumber.numberWithInt(1), 'AVNumberOfChannelsKey');
                        errorRef = new interop.Reference();
                        const url = NSURL.fileURLWithPath(options.filename);
                        this._recorder = (AVAudioRecorder.alloc()).initWithURLSettingsError(url, recordSetting, errorRef);
                        if (errorRef && errorRef.value) {
                            console.error(`initWithURLSettingsError errorRef: ${errorRef.value}, ${errorRef}`);
                        }
                        else {
                            this._recorder.delegate = TNSRecorderDelegate.initWithOwner(this);
                            if (options.metering) {
                                this._recorder.meteringEnabled = true;
                            }
                            if (options.maxDuration) {
                                this._recorder.recordForDuration(options.maxDuration / 1000);
                            }
                            else {
                                this._recorder.prepareToRecord();
                                this._recorder.record();
                            }
                            resolve();
                        }
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
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
                    this._recorder.record();
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
                this._recorder.meteringEnabled = false;
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
                    this._recorder.stop();
                    this._recorder.meteringEnabled = false;
                    this._recordingSession.setActiveError(false, null);
                    this._recorder.release();
                    this._recorder = undefined;
                }
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    isRecording() {
        return this._recorder && this._recorder.recording;
    }
    getMeters(channel) {
        if (this._recorder) {
            if (!this._recorder.meteringEnabled) {
                this._recorder.meteringEnabled = true;
            }
            this._recorder.updateMeters();
            return this._recorder.averagePowerForChannel(channel);
        }
    }
}
//# sourceMappingURL=recorder.js.map