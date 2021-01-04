import {
  knownFolders,
  Observable,
  path as nsFilePath,
  Utils,
} from "@nativescript/core";
const timer = require("@nativescript/core/timer");
("use strict");
Object.defineProperty(exports, "__esModule", { value: true });
exports.TNSPlayerDelegate = void 0;
var TNSPlayerDelegate = /** @class */ (function (_super) {
  __extends(TNSPlayerDelegate, _super);
  function TNSPlayerDelegate() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  TNSPlayerDelegate.initWithOwner = function (owner) {
    var delegate = TNSPlayerDelegate.new();
    delegate._owner = owner;
    return delegate;
  };
  TNSPlayerDelegate.prototype.audioPlayerDidFinishPlayingSuccessfully = function (
    player,
    flag
  ) {
    console.log("pre get owner");
    var owner = this._owner;
    console.log("post get owner");
    if (owner) {
      if (flag && owner.completeCallback) {
        owner.completeCallback({ player: player, flag: flag });
      } else if (!flag && owner.errorCallback) {
        owner.errorCallback({ player: player, flag: flag });
      }
    } else {
      console.log("no owner?");
    }
  };
  TNSPlayerDelegate.prototype.audioPlayerDecodeErrorDidOccurError = function (
    player,
    error
  ) {
    var owner = this._owner;
    if (owner) {
      if (owner.errorCallback) {
        owner.errorCallback({ player: player, error: error });
      }
    }
  };
  TNSPlayerDelegate.ObjCProtocols = [AVAudioPlayerDelegate];
  return TNSPlayerDelegate;
})(NSObject);
exports.TNSPlayerDelegate = TNSPlayerDelegate;
export class TNSPlayer extends Observable {
  get ios() {
    return this._player;
  }
  get volume() {
    return this._player ? this._player.volume : 0;
  }
  set volume(value) {
    if (this._player && value >= 0) {
      this._player.volume = value;
    }
  }
  get duration() {
    if (this._player) {
      return this._player.duration;
    } else {
      return 0;
    }
  }
  get currentTime() {
    return this._player ? this._player.currentTime : 0;
  }
  initFromFile(options) {
    return new Promise((resolve, reject) => {
      options.autoPlay = false;
      this.playFromFile(options).then(resolve, reject);
    });
  }
  playFromFile(options) {
    return new Promise((resolve, reject) => {
      if (options.autoPlay !== false) {
        options.autoPlay = true;
      }
      try {
        let fileName = Utils.isString(options.audioFile)
          ? options.audioFile.trim()
          : "";
        if (fileName.indexOf("~/") === 0) {
          fileName = nsFilePath.join(
            knownFolders.currentApp().path,
            fileName.replace("~/", "")
          );
        }
        this.completeCallback = options.completeCallback;
        this.errorCallback = options.errorCallback;
        this.infoCallback = options.infoCallback;
        const audioSession = AVAudioSession.sharedInstance();
        if (options.audioMixing) {
          audioSession.setCategoryWithOptionsError(
            AVAudioSessionCategoryAmbient,
            1
          );
        } else {
          audioSession.setCategoryWithOptionsError(
            AVAudioSessionCategoryAmbient,
            2
          );
        }
        const output = audioSession.currentRoute.outputs.lastObject.portType;
        if (output.match(/Receiver/)) {
          try {
            audioSession.setCategoryError(AVAudioSessionCategoryPlayAndRecord);
            audioSession.overrideOutputAudioPortError(1936747378);
            audioSession.setActiveError(true);
          } catch (err) {
            console.error("setting audioSession catergory failed", err);
          }
        }
        const errorRef = new interop.Reference();
        this._player = AVAudioPlayer.alloc().initWithContentsOfURLError(
          NSURL.fileURLWithPath(fileName),
          errorRef
        );
        if (errorRef && errorRef.value) {
          reject(errorRef.value);
          return;
        } else if (this._player) {
          // this._player.delegate = TNSPlayerDelegate.initWithOwner(this);
          this._player.enableRate = true;
          if (options.metering) {
            this._player.meteringEnabled = true;
          }
          if (options.loop) {
            this._player.numberOfLoops = -1;
          }
          if (options.autoPlay) {
            // this._player.play();
          }
          resolve();
        } else {
          reject();
        }
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
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
      if (options.autoPlay !== false) {
        options.autoPlay = true;
      }
      try {
        this._task = NSURLSession.sharedSession.dataTaskWithURLCompletionHandler(
          NSURL.URLWithString(options.audioFile),
          (data, response, error) => {
            if (error !== null) {
              if (this.errorCallback) {
                this.errorCallback({ error });
              }
              reject();
            }
            this.completeCallback = options.completeCallback;
            this.errorCallback = options.errorCallback;
            this.infoCallback = options.infoCallback;
            const audioSession = AVAudioSession.sharedInstance();
            if (options.audioMixing) {
              audioSession.setCategoryWithOptionsError(
                AVAudioSessionCategoryAmbient,
                1
              );
            } else {
              audioSession.setCategoryWithOptionsError(
                AVAudioSessionCategoryAmbient,
                2
              );
            }
            const output =
              audioSession.currentRoute.outputs.lastObject.portType;
            if (output.match(/Receiver/)) {
              try {
                audioSession.setCategoryError(
                  AVAudioSessionCategoryPlayAndRecord
                );
                audioSession.overrideOutputAudioPortError(1936747378);
                audioSession.setActiveError(true);
              } catch (err) {
                console.error("Setting audioSession category failed.", err);
              }
            }
            const errorRef = new interop.Reference();
            this._player = AVAudioPlayer.alloc().initWithDataError(
              data,
              errorRef
            );
            if (errorRef && errorRef.value) {
              reject(errorRef.value);
              return;
            } else if (this._player) {
              this._player.delegate = TNSPlayerDelegate.initWithOwner(this);
              this._player.enableRate = true;
              this._player.numberOfLoops = options.loop ? -1 : 0;
              if (options.metering) {
                this._player.meteringEnabled = true;
              }
              if (options.autoPlay) {
                this._player.play();
              }
              resolve();
            } else {
              reject();
            }
          }
        );
        this._task.resume();
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
        reject(ex);
      }
    });
  }
  pause() {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this._player.playing) {
          this._player.pause();
          resolve(true);
        }
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
        reject(ex);
      }
    });
  }

  clearTimer() {
    if (this._interval) {
      timer.clearInterval(this._interval);
    }
  }

  play() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isAudioPlaying()) {
          this._player.play();
          this._interval = timer.setInterval(() => {
            if (this._player && this._player.playing) {
              console.log("playing");
            } else {
              this.completeCallback(this._player);
              this.clearTimer();
            }
          }, 500);
          resolve(true);
        }
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
        reject(ex);
      }
    });
  }
  resume() {
    if (this._player) {
      this._player.play();
    }
  }
  playAtTime(time) {
    if (this._player) {
      this._player.playAtTime(time);
    }
  }
  seekTo(time) {
    return new Promise((resolve, reject) => {
      try {
        if (this._player) {
          this._player.currentTime = time;
          resolve(true);
        }
      } catch (ex) {
        reject(ex);
      }
    });
  }
  dispose() {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this.isAudioPlaying()) {
          this._player.stop();
        }
        const audioSession = AVAudioSession.sharedInstance();
        audioSession.setActiveError(false);
        this._reset();
        resolve();
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
        reject(ex);
      }
    });
  }
  isAudioPlaying() {
    return this._player ? this._player.playing : false;
  }
  getAudioTrackDuration() {
    return new Promise((resolve, reject) => {
      try {
        const duration = this._player ? this._player.duration : 0;
        resolve(duration.toString());
      } catch (ex) {
        if (this.errorCallback) {
          this.errorCallback({ ex });
        }
        reject(ex);
      }
    });
  }
  changePlayerSpeed(speed) {
    if (this._player && speed) {
      if (typeof speed === "string") {
        speed = parseFloat(speed);
      }
      this._player.rate = speed;
    }
  }
  _reset() {
    if (this._player) {
      this._player = undefined;
    }
    if (this._task) {
      this._task.cancel();
      this._task = undefined;
    }
  }
}
//# sourceMappingURL=player.js.map
