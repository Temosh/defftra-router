export type HeaderOperationDto = 'SET' | 'APPEND' | 'REMOVE';

export interface HeaderTransformationDto {
  readonly operation: HeaderOperationDto;
  readonly name: string;
  readonly value?: string;
}

export interface RouteDto {
  readonly id: string;
  readonly displayName: string;
  readonly hostname: string;
  readonly target: string;
  readonly enabled: boolean;
  readonly transformations: readonly HeaderTransformationDto[];
}

export interface ConfigurationDto {
  readonly schemaVersion: 1;
  readonly listener: { readonly host: string; readonly port: number };
  readonly routes: readonly RouteDto[];
  readonly groupDisplayNames: readonly {
    readonly target: string;
    readonly displayName: string;
  }[];
}

export interface ValidationIssueDto {
  readonly path: string;
  readonly message: string;
}

export interface ConfigurationResponse {
  readonly configuration: ConfigurationDto;
  readonly activePort: number;
}

export interface ApiError {
  readonly error: {
    readonly code:
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'UNSUPPORTED_MEDIA_TYPE'
      | 'PAYLOAD_TOO_LARGE'
      | 'FORBIDDEN_ORIGIN'
      | 'METHOD_NOT_ALLOWED'
      | 'PERSISTENCE_ERROR'
      | 'NOT_FOUND'
      | 'INTERNAL_ERROR';
    readonly message: string;
    readonly details?: readonly ValidationIssueDto[];
  };
}
