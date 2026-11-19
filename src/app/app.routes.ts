import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Incidencias Urbanas Lima',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Ingresar · Incidencias Lima',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Incidencias Lima',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/registro.component').then((m) => m.RegistroComponent),
  },

  // ---------- Portal del ciudadano (rol USER) ----------
  {
    path: 'ciudadano',
    canActivate: [authGuard, roleGuard('USER')],
    loadComponent: () => import('./shared/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        title: 'Mis incidencias · Incidencias Lima',
        loadComponent: () =>
          import('./features/citizen/mis-incidencias.component').then((m) => m.MisIncidenciasComponent),
      },
      {
        path: 'nueva',
        title: 'Reportar incidencia · Incidencias Lima',
        loadComponent: () =>
          import('./features/citizen/incidencia-form.component').then((m) => m.IncidenciaFormComponent),
      },
      {
        path: 'editar/:id',
        title: 'Editar incidencia · Incidencias Lima',
        loadComponent: () =>
          import('./features/citizen/incidencia-form.component').then((m) => m.IncidenciaFormComponent),
      },
    ],
  },

  // ---------- Panel administrativo (rol ADMIN) ----------
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./shared/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        title: 'Panel · Incidencias Lima',
        loadComponent: () => import('./features/admin/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'distritos',
        title: 'Distritos · Incidencias Lima',
        loadComponent: () =>
          import('./features/admin/distritos-admin.component').then((m) => m.DistritosAdminComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
