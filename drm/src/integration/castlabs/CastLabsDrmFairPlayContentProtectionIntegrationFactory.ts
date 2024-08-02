import { ContentProtectionIntegration, ContentProtectionIntegrationFactory } from 'theoplayer';
import { CastLabsDrmConfiguration } from './CastLabsDrmConfiguration';
import { CastLabsDrmFairPlayContentProtectionIntegration } from './CastLabsDrmFairPlayContentProtectionIntegration';

export class CastLabsDrmFairPlayContentProtectionIntegrationFactory implements ContentProtectionIntegrationFactory {
    build(configuration: CastLabsDrmConfiguration): ContentProtectionIntegration {
        return new CastLabsDrmFairPlayContentProtectionIntegration(configuration);
    }
}
