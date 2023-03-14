import {
    Ad,
    AddTrackEvent,
    ChromelessPlayer,
    Event,
    TextTrack,
    TextTrackEnterCueEvent,
    VolumeChangeEvent
} from "theoplayer";
import { loadNielsenLibrary } from "../nielsen/NOLBUNDLE";
import { AdMetadata, ContentMetadata, NielsenOptions } from "../nielsen/Types";
import { getAdType } from "../utils/Util";

export class NielsenConnector {

    private player: ChromelessPlayer;

    private nSdkInstance: any; // TODO fix type?

    private sessionInProgress: boolean = false;

    private duration: number = NaN;

    constructor(player: ChromelessPlayer, appId: string, instanceName: string, options: NielsenOptions) {
        this.player = player;
        this.nSdkInstance = loadNielsenLibrary(appId, instanceName, options);

        this.addEventListeners();
    }

    updateMetadata(metadata: { [ key: string ]: string }): void {
        this.nSdkInstance.ggPM('updateMetadata', metadata);
    }

    private addEventListeners(): void {
        this.player.addEventListener('play', this.onPlay);
        this.player.addEventListener('ended', this.onEnd);
        this.player.addEventListener('sourcechange', this.onEnd);
        this.player.addEventListener('loadedmetadata', this.onLoadMetadata);
        this.player.addEventListener('volumechange', this.onVolumeChange);
        this.player.addEventListener('durationchange', this.onDurationChange);

        this.player.textTracks.addEventListener('addtrack', this.onAddTrack);

        if (this.player.ads) {
            this.player.ads.addEventListener('adbegin', this.onAdBegin);
        }

        window.addEventListener('beforeunload', this.onEnd);
    }

    private removeEventListeners(): void {
        this.player.removeEventListener('play', this.onPlay);
        this.player.removeEventListener('ended', this.onEnd);
        this.player.removeEventListener('sourcechange', this.onEnd);
        this.player.removeEventListener('loadedmetadata', this.onLoadMetadata);
        this.player.removeEventListener('volumechange', this.onVolumeChange);

        this.player.textTracks.removeEventListener('addtrack', this.onAddTrack);

        window.removeEventListener('beforeunload', this.onEnd);
    }

    private onVolumeChange = (event: VolumeChangeEvent) => {
        const volumeLevel = this.player.muted ? 0 : event.volume * 100;
        this.nSdkInstance.ggPM('setVolume', volumeLevel);
    }

    private onDurationChange = () => {
        this.duration = this.player.duration;
        this.maybeSendPlayEvent();
    }

    private onLoadMetadata = () => {
        const data: ContentMetadata = {
            type: 'content',
            adModel: '1' // Always '1' for DTVR
        }
        this.nSdkInstance.ggPM('loadmetadata', data);
    }

    private onAddTrack = (event: AddTrackEvent) => {
        if (event.track.kind === 'metadata') {
            const track = ( event.track as TextTrack );
            if (track.type === 'id3' || track.type === 'emsg') {
                if (track.mode === 'disabled') {
                    track.mode = 'hidden';
                }
                track.addEventListener('entercue', this.onEnterCue);
            }
        }
    }

    private onEnterCue = (event: TextTrackEnterCueEvent) => {
        const { cue } = event;
        if (cue.track.type === 'id3') {
            if (cue.content.id === 'PRIV' && cue.content.ownerIdentifier.indexOf('www.nielsen.com') !== -1) {
                this.nSdkInstance.ggPM('sendID3', cue.content.ownerIdentifier);
            }
        } else {
            // DASH emsg
            // TODO test once we get DASH stream, verify if below is valid (with changes as I got it from old integration)
            // if (cue.schemeIDURI && cue.schemeIDURI.indexOf(NIELSEN_ID) > -1) {
            //     this.nielsenApi.sendId3Payload(cue.content);
            // }
        }
    }

    private onEnd = () => {
        if (this.sessionInProgress) {
            this.sessionInProgress = false;
            this.nSdkInstance.ggPM('end', this.getPlayHeadPosition());
        }
    }

    private onPlay = () => {
        this.maybeSendPlayEvent();
    }

    private maybeSendPlayEvent(): void {
        if (!this.sessionInProgress && !Number.isNaN(this.duration)) {          // TODO confirm we should only call it once!
            this.sessionInProgress = true;
            const metadataObject = {
                "channelName": "channelName",
                "length": this.duration
            }
            this.nSdkInstance.ggPM('play', metadataObject);
        }
    }

    private onAdBegin = (event: Event) => {
        const currentAd = this.player.ads!.currentAds.filter((ad: Ad) => ad.type === 'linear');
        if (currentAd.length !== 1) {
            console.error('WAIT I THOUGHT WE WOULD HAVE A LINEAR AD, lets hope it is only nonlinear!', currentAd, this.player.ads!.currentAds);
        }

        const type = getAdType(this.player.ads!.currentAdBreak!);
        const adMetadata: AdMetadata = {
            type,
            // TODO check if id is always filled
            assetid: currentAd[ 0 ].id!
        }
        this.nSdkInstance.ggPM('loadMetadata', adMetadata);
    }

    private getPlayHeadPosition(): string {
        return Math.floor(this.player.currentTime).toString();
    }

    destroy() {
        this.removeEventListeners();
    }
}
