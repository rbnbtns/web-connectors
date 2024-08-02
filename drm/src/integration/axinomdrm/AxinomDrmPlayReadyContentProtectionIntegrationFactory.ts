import { ContentProtectionIntegration, ContentProtectionIntegrationFactory } from 'theoplayer';
import { AxinomDrmConfiguration } from './AxinomDrmConfiguration';
import { AxinomDrmPlayReadyContentProtectionIntegration } from './AxinomDrmPlayReadyContentProtectionIntegration';

export class AxinomDrmPlayReadyContentProtectionIntegrationFactory implements ContentProtectionIntegrationFactory {
    build(configuration: AxinomDrmConfiguration): ContentProtectionIntegration {
        return new AxinomDrmPlayReadyContentProtectionIntegration(configuration);
    }
}
