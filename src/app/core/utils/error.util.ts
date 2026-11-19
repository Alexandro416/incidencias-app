import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { ApiError } from '../models/models';

/** Error de API ya traducido a un mensaje legible para el usuario. */
export class ApiException extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errores: Record<string, string> | null = null,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

const MENSAJES_POR_STATUS: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa los datos ingresados.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'La operación entra en conflicto con el estado actual de los datos.',
  500: 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.',
};

export function toApiException(err: unknown): ApiException {
  if (err instanceof ApiException) return err;

  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return new ApiException(
        'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución (puerto 8080).',
        0,
      );
    }
    const body = (typeof err.error === 'object' && err.error !== null ? err.error : null) as Partial<ApiError> | null;
    const errores = body?.errores ?? null;
    let mensaje = body?.mensaje?.trim() ?? '';

    if (errores && Object.keys(errores).length > 0) {
      const detalle = Object.entries(errores)
        .map(([campo, msg]) => `${campo}: ${msg}`)
        .join('; ');
      mensaje = `${mensaje || 'Datos inválidos'} (${detalle})`;
    }
    if (!mensaje) {
      mensaje = MENSAJES_POR_STATUS[err.status] ?? `Error inesperado (código ${err.status}).`;
    }
    return new ApiException(mensaje, err.status, errores);
  }

  return new ApiException('Ocurrió un error inesperado.', -1);
}

/** Úsalo en `catchError(handleHttpError)` dentro de los servicios. */
export const handleHttpError = (err: unknown) => throwError(() => toApiException(err));

/** Mensaje seguro desde cualquier error capturado en un componente. */
export function mensajeDeError(err: unknown): string {
  return toApiException(err).message;
}
