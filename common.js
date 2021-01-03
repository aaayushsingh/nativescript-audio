import { knownFolders, path as nsFilePath, Utils } from '@nativescript/core';
export function isStringUrl(value) {
    let isURL = false;
    if (value.indexOf('://') !== -1) {
        if (value.indexOf('res://') === -1) {
            isURL = true;
        }
    }
    if (isURL === true) {
        return true;
    }
    else {
        return false;
    }
}
export function resolveAudioFilePath(path) {
    if (path) {
        const isUrl = isStringUrl(path);
        if (isUrl === true) {
            return path;
        }
        else {
            let audioPath;
            let fileName = Utils.isString(path) ? path.trim() : '';
            if (fileName.indexOf('~/') === 0) {
                fileName = nsFilePath.join(knownFolders.currentApp().path, fileName.replace('~/', ''));
                audioPath = fileName;
            }
            else {
                audioPath = fileName;
            }
            return audioPath;
        }
    }
}
//# sourceMappingURL=common.js.map