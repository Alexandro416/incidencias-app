import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegistroRequest, Rol } from '../models/models';
import { handleHttpError } from '../utils/error.util';
import { ToastService } from './toast.service';

interface Session {
  token: string;
  email: string;
  rol: Rol;
  /** Epoch ms en que expira el token. */
  expiraEn: number;
}

const STORAGE_KEY = 'incidencias.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly base = `${environment.apiUrl}/auth`;
  private timer?: ReturnType<typeof setTimeout>;

  private readonly _session = signal<Session | null>(this.leer());

  readonly email = computed(() => this._session()?.email ?? null);
  readonly rol = computed(() => this._session()?.rol ?? null);
  readonly isLoggedIn = computed(() => this._session() !== null);
  readonly isAdmin = computed(() => this._session()?.rol === 'ADMIN');

  constructor() {
    const s = this._session();
    if (s) this.programarExpiracion(s);
  }

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, req).pipe(
      tap((r) => this.guardar(r)),
      catchError(handleHttpError),
    );
  }

  registro(req: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/registro`, req).pipe(
      tap((r) => this.guardar(r)),
      catchError(handleHttpError),
    );
  }

  logout(irAlInicio = true) {
    clearTimeout(this.timer);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    this._session.set(null);
    if (irAlInicio) this.router.navigate(['/']);
  }

  /** Llamado por el interceptor cuando el backend responde 401 con un token enviado. */
  sesionExpirada() {
    if (!this._session()) return;
    this.toast.warning('Tu sesión expiró. Inicia sesión nuevamente.');
    this.logout(false);
    this.router.navigate(['/login']);
  }

  token(): string | null {
    return this.isAuthenticated() ? this._session()!.token : null;
  }

  /** true si hay sesión y el token no ha expirado (si expiró, limpia la sesión). */
  isAuthenticated(): boolean {
    const s = this._session();
    if (!s) return false;
    if (s.expiraEn <= Date.now()) {
      this.logout(false);
      return false;
    }
    return true;
  }

  homeUrl(): string {
    return this.isAdmin() ? '/admin' : '/ciudadano';
  }

  // ---------- privado ----------
  private guardar(r: AuthResponse) {
    const s: Session = {
      token: r.token,
      email: r.email,
      rol: r.rol,
      expiraEn: Date.now() + r.expiraEnSegundos * 1000,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
    this._session.set(s);
    this.programarExpiracion(s);
  }

  private leer(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      if (!s?.token || !s.email || !s.rol || typeof s.expiraEn !== 'number' || s.expiraEn <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }

  private programarExpiracion(s: Session) {
    clearTimeout(this.timer);
    const ms = Math.min(s.expiraEn - Date.now(), 2_000_000_000);
    if (ms > 0) this.timer = setTimeout(() => this.sesionExpirada(), ms);
  }
}
