import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoIncidencia,
  EstadoUpdateRequest,
  FiltrosIncidencia,
  Incidencia,
  IncidenciaRequest,
  ReporteEstado,
} from '../models/models';
import { handleHttpError } from '../utils/error.util';
import { normalizarIncidencia } from '../utils/estado.util';

@Injectable({ providedIn: 'root' })
export class IncidenciaService {
  private readonly http = inject(HttpClient);
  private readonly userUrl = `${environment.apiUrl}/incidencias`;
  private readonly adminUrl = `${environment.apiUrl}/admin/incidencias`;

  // ===================== CIUDADANO (rol USER) =====================

  crear(req: IncidenciaRequest): Observable<Incidencia> {
    return this.http.post<Incidencia>(this.userUrl, req).pipe(map(normalizarIncidencia), catchError(handleHttpError));
  }

  misIncidencias(): Observable<Incidencia[]> {
    return this.http
      .get<Incidencia[]>(`${this.userUrl}/mias`)
      .pipe(map((l) => l.map(normalizarIncidencia)), catchError(handleHttpError));
  }

  miIncidencia(id: number): Observable<Incidencia> {
    return this.http
      .get<Incidencia>(`${this.userUrl}/mias/${id}`)
      .pipe(map(normalizarIncidencia), catchError(handleHttpError));
  }

  /** Solo permitido si la incidencia está PENDIENTE (si no, el backend responde 409). */
  actualizarMia(id: number, req: IncidenciaRequest): Observable<Incidencia> {
    return this.http
      .put<Incidencia>(`${this.userUrl}/mias/${id}`, req)
      .pipe(map(normalizarIncidencia), catchError(handleHttpError));
  }

  /** Solo permitido si la incidencia está PENDIENTE (si no, el backend responde 409). */
  eliminarMia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.userUrl}/mias/${id}`).pipe(catchError(handleHttpError));
  }

  // ===================== ADMIN (rol ADMIN) =====================

  listarTodas(filtros: FiltrosIncidencia = {}): Observable<Incidencia[]> {
    let params = new HttpParams();
    if (filtros.distritoId != null) params = params.set('distritoId', filtros.distritoId);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http
      .get<Incidencia[]>(this.adminUrl, { params })
      .pipe(map((l) => l.map(normalizarIncidencia)), catchError(handleHttpError));
  }

  detalleAdmin(id: number): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.adminUrl}/${id}`).pipe(map(normalizarIncidencia), catchError(handleHttpError));
  }

  reporte(): Observable<ReporteEstado[]> {
    return this.http.get<ReporteEstado[]>(`${this.adminUrl}/reporte`).pipe(catchError(handleHttpError));
  }

  cambiarEstado(id: number, estado: EstadoIncidencia): Observable<Incidencia> {
    const body: EstadoUpdateRequest = { estado };
    return this.http
      .patch<Incidencia>(`${this.adminUrl}/${id}/estado`, body)
      .pipe(map(normalizarIncidencia), catchError(handleHttpError));
  }

  eliminarAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}
