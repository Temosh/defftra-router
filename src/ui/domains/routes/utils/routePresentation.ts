import type { ConfigurationDto, RouteDto } from '../../../../contracts/api';

export interface RouteGroup {
  readonly target: string;
  readonly displayName: string | null;
  readonly routes: readonly RouteDto[];
}

export function groupRouteDtos(
  configuration: ConfigurationDto,
): readonly RouteGroup[] {
  const names = new Map(
    configuration.groupDisplayNames.map((entry) => [
      entry.target,
      entry.displayName,
    ]),
  );
  const groups = new Map<string, RouteDto[]>();
  for (const route of configuration.routes) {
    groups.set(route.target, [...(groups.get(route.target) ?? []), route]);
  }
  return [...groups].map(([target, routes]) => ({
    target,
    displayName: names.get(target) ?? null,
    routes,
  }));
}

export function localUrl(hostname: string, activePort: number): string {
  return `http://${hostname}${activePort === 80 ? '' : `:${activePort}`}`;
}

export function transformationSummary(route: RouteDto): string {
  if (route.transformations.length === 0) return 'No header changes';
  const count = route.transformations.length;
  return `${count} header ${count === 1 ? 'change' : 'changes'}`;
}
