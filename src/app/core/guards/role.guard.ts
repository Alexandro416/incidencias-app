import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/models';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Uso: `canActivate: [authGuard, roleGuard('ADMIN')]`. Si el rol no coincide, redirige a su panel. */
export const roleGuard =
  (rolRequerido: Rol): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
    if (auth.rol() === rolRequerido) return true;

    toast.warning('Esa sección no está disponible para tu tipo de cuenta.');
    return router.createUrlTree([auth.homeUrl()]);
  };
