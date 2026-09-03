import type { ConfigurationDto } from '../../../contracts/api';
import { Dashboard } from '../../domains/routes/components/Dashboard';

interface DashboardPageProps {
  readonly configuration: ConfigurationDto;
  readonly activePort: number;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly onSave: (configuration: ConfigurationDto) => Promise<boolean>;
  readonly onManageRoutes: () => void;
}

export function DashboardPage(props: DashboardPageProps) {
  return <Dashboard {...props} />;
}
