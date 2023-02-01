import { Ad, AdBreak, ChromelessPlayer, GoogleImaAd } from 'theoplayer';
import { AdAnalytics, Constants, ConvivaMetadata, VideoAnalytics } from '@convivainc/conviva-js-coresdk';
import { calculateCurrentAdBreakInfo, collectAdMetadata } from '../../utils/Utils';

export class CsaiAdReporter {
    private readonly player: ChromelessPlayer;
    private readonly convivaVideoAnalytics: VideoAnalytics;
    private readonly convivaAdAnalytics: AdAnalytics;
    private readonly metadata: ConvivaMetadata;

    private currentAdBreak: AdBreak | undefined;

    constructor(
        player: ChromelessPlayer,
        videoAnalytics: VideoAnalytics,
        adAnalytics: AdAnalytics,
        metadata: ConvivaMetadata
    ) {
        this.player = player;
        this.convivaVideoAnalytics = videoAnalytics;
        this.convivaAdAnalytics = adAnalytics;
        this.metadata = metadata;
        this.addEventListeners();
    }

    private readonly onAdBreakBegin = (event: any) => {
        this.currentAdBreak = event.ad as AdBreak;
        this.convivaVideoAnalytics.reportAdBreakStarted(
            Constants.AdType.CLIENT_SIDE,
            Constants.AdPlayer.CONTENT,
            calculateCurrentAdBreakInfo(this.currentAdBreak)
        );
    };

    private readonly onAdBreakEnd = () => {
        this.convivaVideoAnalytics.reportAdBreakEnded();
        this.currentAdBreak = undefined;
    };

    private readonly onAdBegin = (event: any) => {
        const currentAd = event.ad as Ad;
        if (currentAd.type !== 'linear') {
            return;
        }
        const adMetadata = collectAdMetadata(currentAd, this.metadata);
        this.convivaAdAnalytics.setAdInfo(adMetadata);
        this.convivaAdAnalytics.reportAdLoaded(adMetadata);
        this.convivaAdAnalytics.reportAdStarted(adMetadata);
        this.convivaAdAnalytics.reportAdMetric(
            Constants.Playback.RESOLUTION,
            this.player.videoWidth,
            this.player.videoHeight
        );
        this.convivaAdAnalytics.reportAdMetric(Constants.Playback.BITRATE, (currentAd as GoogleImaAd).bitrate || 0);
    };

    private readonly onAdEnd = (event: any) => {
        const currentAd = event.ad as Ad;
        if (currentAd.type !== 'linear') {
            return;
        }
        this.convivaAdAnalytics.reportAdEnded();
    };

    private readonly onAdSkip = () => {
        if (!this.currentAdBreak) {
            return;
        }
        this.convivaAdAnalytics.reportAdMetric(Constants.Playback.PLAYER_STATE, Constants.PlayerState.STOPPED);
    };

    private readonly onAdBuffering = () => {
        if (!this.currentAdBreak) {
            return;
        }
        this.convivaAdAnalytics.reportAdMetric(Constants.Playback.PLAYER_STATE, Constants.PlayerState.BUFFERING);
    };

    private readonly onAdError = (event: any) => {
        this.convivaAdAnalytics.reportAdFailed(event.message || 'Ad Request Failed');
    };

    private readonly onPlaying = () => {
        if (!this.currentAdBreak) {
            return;
        }
        this.convivaAdAnalytics.reportAdMetric(Constants.Playback.PLAYER_STATE, Constants.PlayerState.PLAYING);
    };

    private readonly onPause = () => {
        if (!this.currentAdBreak) {
            return;
        }
        this.convivaAdAnalytics.reportAdMetric(Constants.Playback.PLAYER_STATE, Constants.PlayerState.PAUSED);
    };

    private addEventListeners(): void {
        this.player.addEventListener('play', this.onPlaying);
        this.player.addEventListener('playing', this.onPlaying);
        this.player.addEventListener('pause', this.onPause);
        if (this.player.ads === undefined) {
            // should not happen
            return;
        }
        this.player.ads.addEventListener('adbreakbegin', this.onAdBreakBegin);
        this.player.ads.addEventListener('adbreakend', this.onAdBreakEnd);
        this.player.ads.addEventListener('adbegin', this.onAdBegin);
        this.player.ads.addEventListener('adend', this.onAdEnd);
        this.player.ads.addEventListener('adskip', this.onAdSkip);
        this.player.ads.addEventListener('adbuffering', this.onAdBuffering);
        this.player.ads.addEventListener('aderror', this.onAdError);
    }

    private removeEventListeners(): void {
        this.player.removeEventListener('play', this.onPlaying);
        this.player.removeEventListener('playing', this.onPlaying);
        this.player.removeEventListener('pause', this.onPause);
        if (this.player.ads === undefined) {
            // should not happen
            return;
        }
        this.player.ads.removeEventListener('adbreakbegin', this.onAdBreakBegin);
        this.player.ads.removeEventListener('adbreakend', this.onAdBreakEnd);
        this.player.ads.removeEventListener('adbegin', this.onAdBegin);
        this.player.ads.removeEventListener('adend', this.onAdEnd);
        this.player.ads.removeEventListener('adskip', this.onAdSkip);
        this.player.ads.removeEventListener('adbuffering', this.onAdBuffering);
        this.player.ads.removeEventListener('aderror', this.onAdError);
    }

    destroy(): void {
        this.removeEventListeners();
    }
}