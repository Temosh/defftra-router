import type { ConfigurationDto } from '../../../contracts/api';
import { RouteManager } from '../../domains/routes/components/RouteManager';

interface RoutesPageProps {
  readonly configuration: ConfigurationDto;
  readonly activePort: number;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly onSave: (configuration: ConfigurationDto) => Promise<boolean>;
}

export function RoutesPage(props: RoutesPageProps) {
  return <RouteManager {...props} />;
}
