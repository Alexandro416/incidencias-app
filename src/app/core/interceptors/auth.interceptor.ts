import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * - Agrega `Authorization: Bearer <token>` a las llamadas a la API (excepto /auth/**).
 * - Si el backend responde 401 con un token enviado, cierra la sesión y manda al login.
 *   (Un 401 de /auth/login significa "credenciales inválidas" y NO cierra nada.)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const esApi = req.url.startsWith(environment.apiUrl);
  const esAuth = req.url.startsWith(`${environment.apiUrl}/auth/`);
  const token = auth.token();

  const peticion =
    esApi && !esAuth && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && esApi && !esAuth) {
        auth.sesionExpirada();
      }
      return throwError(() => err);
    }),
  );
};
